import { load } from 'cheerio';
import { ProviderGatewayError, type ContentProviderAdapter } from '../types.js';
const origin = 'https://archiveofourown.org';
const backupOrigin = 'https://secure.ao3.org';
const providerId = 'ao3';
const id = (value: string) => {
  if (!/^[1-9][0-9]{0,11}$/.test(value))
    throw new ProviderGatewayError('Invalid AO3 identifier.', 400);
  return value;
};
const cache = new Map<string, { until: number; html: string }>();
/** Follow only AO3-owned work redirects, without login or adult-confirmation cookies. */
async function page(path: string) {
  const hit = cache.get(path);
  if (hit && hit.until > Date.now()) return load(hit.html);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    let url = new URL(path, origin);
    for (let hop = 0; hop < 4; hop++) {
      if (![origin, backupOrigin].includes(url.origin) || url.username || url.password)
        throw new ProviderGatewayError('Unexpected AO3 redirect.', 502);
      let response = await fetch(url, {
        signal: controller.signal,
        redirect: 'manual',
        headers: { Accept: 'text/html' },
      });
      // AO3's official alternate host remains available during some primary TLS outages.
      // Never use it to retry a refusal, login requirement, or rate limit.
      if (response.status >= 500 && url.origin === origin) {
        await response.body?.cancel();
        url = new URL(url.pathname + url.search, backupOrigin);
        response = await fetch(url, {
          signal: controller.signal,
          redirect: 'manual',
          headers: { Accept: 'text/html' },
        });
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        url = new URL(response.headers.get('location') || '', url);
        continue;
      }
      if (!response.ok)
        throw new ProviderGatewayError(`AO3 HTTP ${response.status}.`, response.status);
      const html = await response.text();
      if (html.length > 5_000_000) throw new ProviderGatewayError('AO3 response too large.', 502);
      const $ = load(html);
      if ($('form#new_user').length || ($('.adult').length && !$('#chapters').length))
        throw new ProviderGatewayError(
          'Open this work on AO3 to check its access requirements.',
          403,
          'CONTENT_LOCKED',
        );
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(path, { until: Date.now() + 60000, html });
      return $;
    }
    throw new ProviderGatewayError('Too many AO3 redirects.', 502);
  } finally {
    clearTimeout(timer);
  }
}
export const ao3Adapter: ContentProviderAdapter = {
  definition: {
    id: providerId,
    name: 'Archive of Our Own',
    mediaTypes: ['novel'],
    capabilities: ['search', 'details', 'chapters', 'textContent'],
    status: 'limited',
    statusNote:
      'Public works only. Login-required works are unavailable. No cover artwork supplied.',
    enabledByDefault: true,
  },
  async search(query) {
    const $ = await page('/works/search?work_search%5Bquery%5D=' + encodeURIComponent(query));
    return $('li.work.blurb')
      .toArray()
      .flatMap((el) => {
        const link = $(el).find('h4.heading a[href^="/works/"]').first();
        const sourceId = link.attr('href')?.match(/^\/works\/(\d+)$/)?.[1];
        if (!sourceId) return [];
        return [
          {
            id: sourceId,
            sourceId,
            providerId,
            mediaType: 'novel' as const,
            title: link.text().trim(),
            author: $(el).find('a[rel="author"]').text().trim(),
            chapterCount: Number($(el).find('dd.chapters').text().split('/')[0]) || undefined,
          },
        ];
      })
      .slice(0, 20);
  },
  async getDetails(sourceId) {
    const $ = await page('/works/' + id(sourceId));
    const title = $('#workskin .preface h2.title').first().text().trim();
    if (!title)
      throw new ProviderGatewayError('Public AO3 work unavailable.', 403, 'CONTENT_LOCKED');
    const totals = $('dd.chapters').first().text().trim().split('/');
    return {
      providerId,
      sourceId,
      mediaType: 'novel',
      title,
      author: $('#workskin a[rel="author"]').first().text().trim(),
      description: $('#workskin .preface .summary .userstuff').first().text().trim(),
      genres: $('dd.fandom a.tag')
        .toArray()
        .map((el) => $(el).text()),
      language: $('dd.language').text().trim() === 'English' ? 'en' : undefined,
      status: totals[0] === totals[1] ? 'completed' : 'ongoing',
    };
  },
  async getChapters(sourceId) {
    const $ = await page('/works/' + id(sourceId));
    if (!$('#chapters').length)
      throw new ProviderGatewayError('Public AO3 chapters unavailable.', 403, 'CONTENT_LOCKED');
    const options = $('#selected_id option').toArray();
    if (!options.length)
      return [
        { id: 'oneshot', mediaId: sourceId, providerId, title: 'Complete work', chapterNumber: 1 },
      ];
    return options.map((el, i) => ({
      id: id($(el).attr('value') || ''),
      mediaId: sourceId,
      providerId,
      title: $(el).text().trim(),
      chapterNumber: i + 1,
    }));
  },
  async getNovelContent(sourceId, chapterId) {
    const chapters = await ao3Adapter.getChapters!(sourceId);
    const index = chapters.findIndex((ch) => ch.id === chapterId);
    if (index < 0) throw new ProviderGatewayError('Chapter does not belong to this work.', 404);
    const $ = await page(
      '/works/' + id(sourceId) + (chapterId === 'oneshot' ? '' : '/chapters/' + id(chapterId)),
    );
    const body = $('#chapters .userstuff[role="article"], #chapters > .userstuff').first();
    body.find('script,style,.landmark').remove();
    const paragraphs = body
      .find('p')
      .toArray()
      .map((el) => $(el).text().trim())
      .filter(Boolean);
    if (!paragraphs.length) throw new ProviderGatewayError('Public AO3 text unavailable.', 502);
    return {
      providerId,
      mediaId: sourceId,
      chapterId,
      title: chapters[index].title,
      paragraphs,
      previousChapterId: chapters[index - 1]?.id,
      nextChapterId: chapters[index + 1]?.id,
    };
  },
};
