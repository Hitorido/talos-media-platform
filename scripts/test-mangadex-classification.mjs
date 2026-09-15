/**
 * Test script to verify MangaDex provider classification for manga, manhwa, and manhua
 */

const MANGADEX_API = 'https://api.mangadex.org';

const MANGADEX_HEADERS = {
  'User-Agent': 'MangaAnimeNovelReader/1.0',
  'Accept': 'application/json',
};

async function mangadexFetch(url) {
  const response = await fetch(url, { headers: MANGADEX_HEADERS });
  if (!response.ok) {
    throw new Error(`MangaDex request failed (${response.status})`);
  }
  return await response.json();
}

function pickLocalized(value) {
  if (!value) return '';
  return value.en ?? Object.values(value).find(Boolean) ?? '';
}

function classifyManga(manga) {
  const genres = manga.attributes.tags.map(tag => pickLocalized(tag.attributes.name)).filter(Boolean);
  const originalLanguage = (manga.attributes.originalLanguage || '').toLowerCase();
  let comicFormat = 'manga';

  if (genres.some(genre => genre.toLowerCase().includes('manhwa')) || originalLanguage === 'ko') {
    comicFormat = 'manhwa';
  } else if (
    genres.some(genre => genre.toLowerCase().includes('manhua')) ||
    originalLanguage === 'zh' ||
    originalLanguage.startsWith('zh')
  ) {
    comicFormat = 'manhua';
  }

  return {
    title: pickLocalized(manga.attributes.title),
    originalLanguage,
    genres,
    comicFormat
  };
}

async function testClassification(query, expectedFormat) {
  console.log(`\n🔍 Testing: "${query}" (expected: ${expectedFormat})`);

  const params = new URLSearchParams();
  params.set('title', query);
  params.set('limit', '3');
  params.append('includes[]', 'cover_art');
  params.set('order[relevance]', 'desc');

  const payload = await mangadexFetch(`${MANGADEX_API}/manga?${params.toString()}`);

  if (!payload.data || payload.data.length === 0) {
    console.log(`❌ No results found`);
    return false;
  }

  const results = payload.data.slice(0, 3);
  let matchFound = false;

  for (const manga of results) {
    const classification = classifyManga(manga);
    const isMatch = classification.comicFormat === expectedFormat;
    const status = isMatch ? '✅' : '⚠️';

    console.log(`${status} ${classification.title}`);
    console.log(`   Format: ${classification.comicFormat}`);
    console.log(`   Language: ${classification.originalLanguage}`);
    console.log(`   Genres: ${classification.genres.slice(0, 3).join(', ')}`);

    if (isMatch) matchFound = true;
  }

  return matchFound;
}

async function runTests() {
  console.log('=== MangaDex Classification Test ===');
  console.log('Testing manga, manhwa, and manhua detection');

  try {
    // Test manga (Japanese)
    const mangaTest = await testClassification('One Piece', 'manga');

    // Test manhwa (Korean)
    const manhwaTest = await testClassification('Solo Leveling', 'manhwa');

    // Test manhua (Chinese)
    const manhuaTest = await testClassification('Tales of Demons and Gods', 'manhua');

    console.log('\n=== Test Results ===');
    console.log(`Manga classification: ${mangaTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Manhwa classification: ${manhwaTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Manhua classification: ${manhuaTest ? '✅ PASS' : '❌ FAIL'}`);

    if (mangaTest && manhwaTest && manhuaTest) {
      console.log('\n✅ All classification tests passed!');
      console.log('MangaDex can serve as verified provider for manga, manhwa, and manhua.');
    } else {
      console.log('\n⚠️ Some classification tests failed.');
      console.log('MangaDex may need adjustments for proper classification.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();
