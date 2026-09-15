/**
 * Test script to verify MangaUpdates API functionality
 */

const MANGAUPDATES_API = 'https://api.mangaupdates.com/series';

async function testMangaUpdates() {
  console.log('=== MangaUpdates API Test ===\n');

  try {
    // Test series search (POST required per documentation)
    console.log('🔍 Test: Series Search');
    const response = await fetch(MANGAUPDATES_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        search: 'One Piece',
        per_page: 3
      })
    });

    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.status === 200 && data.results) {
      console.log(`✅ Found ${data.results.length} series`);
      if (data.results.length > 0) {
        console.log(`First result: ${data.results[0].title}`);
      }
    } else {
      console.log('❌ Search failed or returned unexpected format');
    }

    console.log('\n=== MangaUpdates API Evaluation ===');
    console.log('⚠️  Concerns:');
    console.log('   - POST requests required for search');
    console.log('   - Primarily metadata and release tracking');
    console.log('   - No chapter content access');
    console.log('   - Requires credit to MangaUpdates');
    console.log('   - Acceptable use policy restrictions');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMangaUpdates();
