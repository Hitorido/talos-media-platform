/**
 * Asura Scans scraper implementation
 * Normal web scraping with rate limiting and error handling
 * Cloud-ready: uses environment variables for configuration
 */

const ASURA_BASE_URL = process.env.ASURA_BASE_URL || 'https://asurascans.com';
const ASURA_TIMEOUT = parseInt(process.env.ASURA_TIMEOUT || '10000', 10);
const ASURA_RATE_LIMIT_MS = parseInt(process.env.ASURA_RATE_LIMIT_MS || '1000', 10);

interface AsuraSeries {
  id: string;
  title: string;
  slug: string;
  coverUrl: string;
  description: string;
  status: string;
  type: string;
  genres: string[];
  author: string;
}

interface AsuraChapter {
  id: string;
  title: string;
  chapterNumber: number;
  slug: string;
  releaseDate: string;
}

class AsuraRateLimiter {
  private lastRequest = 0;
  
  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < ASURA_RATE_LIMIT_MS) {
      const waitTime = ASURA_RATE_LIMIT_MS - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequest = Date.now();
  }
}

const rateLimiter = new AsuraRateLimiter();

async function fetchAsura(endpoint: string): Promise<string> {
  await rateLimiter.wait();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ASURA_TIMEOUT);
  
  try {
    const response = await fetch(`${ASURA_BASE_URL}${endpoint}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Asura Scans request failed: ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function searchAsura(query: string): Promise<AsuraSeries[]> {
  const html = await fetchAsura(`/series/?title=${encodeURIComponent(query)}`);
  
  // Parse HTML - simplified extraction
  const series: AsuraSeries[] = [];
  const titleRegex = /<h2[^>]*><a[^>]*>([^<]+)<\/a>/g;
  const linkRegex = /href="\/series\/([^"]+)"/g;
  const coverRegex = /<img[^>]*src="([^"]+)"[^>]*alt="[^"]*"/g;
  
  const titles = html.match(titleRegex) || [];
  const links = html.match(linkRegex) || [];
  const covers = html.match(coverRegex) || [];
  
  for (let i = 0; i < Math.min(titles.length, links.length, covers.length); i++) {
    series.push({
      id: links[i].match(/\/series\/([^"]+)/)?.[1] || `asura-${i}`,
      title: titles[i].match(/>([^<]+)</)?.[1] || '',
      slug: links[i].match(/\/series\/([^"]+)/)?.[1] || '',
      coverUrl: covers[i].match(/src="([^"]+)"/)?.[1] || '',
      description: '',
      status: 'Ongoing',
      type: 'Manhwa',
      genres: [],
      author: 'Asura Scans'
    });
  }
  
  return series;
}

export async function getAsuraDetails(slug: string): Promise<AsuraSeries> {
  const html = await fetchAsura(`/series/${slug}`);
  
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const coverMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*poster/);
  const descMatch = html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/);
  
  return {
    id: slug,
    title: titleMatch?.[1] || '',
    slug,
    coverUrl: coverMatch?.[1] || '',
    description: descMatch?.[1] || '',
    status: 'Ongoing',
    type: 'Manhwa',
    genres: [],
    author: 'Asura Scans'
  };
}

export async function getAsuraChapters(slug: string): Promise<AsuraChapter[]> {
  const html = await fetchAsura(`/series/${slug}`);
  
  const chapters: AsuraChapter[] = [];
  const chapterRegex = /<a[^>]*href="\/chapter\/([^"]+)"[^>]*>([^<]+)<\/a>/g;
  
  const matches = html.match(chapterRegex) || [];
  matches.forEach((match, index) => {
    const slugMatch = match.match(/\/chapter\/([^"]+)/);
    const titleMatch = match.match(/>([^<]+)</);
    if (slugMatch && titleMatch) {
      chapters.push({
        id: slugMatch[1],
        title: titleMatch[1],
        chapterNumber: index + 1,
        slug: slugMatch[1],
        releaseDate: new Date().toISOString()
      });
    }
  });
  
  return chapters.reverse();
}

export async function getAsuraPages(chapterSlug: string): Promise<string[]> {
  const html = await fetchAsura(`/chapter/${chapterSlug}`);
  
  const pages: string[] = [];
  const imageRegex = /<img[^>]*src="([^"]+)"[^>]*class="[^"]*reading-mode/;
  
  const matches = html.match(imageRegex) || [];
  matches.forEach(match => {
    const urlMatch = match.match(/src="([^"]+)"/);
    if (urlMatch) {
      pages.push(urlMatch[1]);
    }
  });
  
  return pages;
}