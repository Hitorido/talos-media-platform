/**
 * Test script to verify Narou (Japanese web novel) API functionality
 */

const NAROU_API = 'https://api.syosetu.com/novelapi/api/';

async function testNarouAPI() {
  console.log('=== Narou API Test ===\n');

  try {
    // Test basic search with JSON output
    console.log('🔍 Test: Basic Novel Search');
    const params = new URLSearchParams({
      out: 'json',
      lim: '3',
      word: '転生' // Common isekai/reincarnation keyword
    });

    const response = await fetch(`${NAROU_API}?${params.toString()}`);
    console.log(`Status: ${response.status}`);

    const text = await response.text();
    console.log('Response length:', text.length);

    // Parse JSON (Narou API returns array with first element as count)
    const data = JSON.parse(text);
    console.log('Total items:', data[0]);
    console.log('Sample data:', JSON.stringify(data.slice(1, 2), null, 2));

    if (data[0] > 0) {
      console.log(`✅ Found ${data[0]} novels`);
      if (data.length > 1) {
        const firstNovel = data[1];
        console.log(`First novel: ${firstNovel.title}`);
        console.log(`Ncode: ${firstNovel.ncode}`);
        console.log(`Writer: ${firstNovel.writer}`);
        console.log(`Story length: ${firstNovel.general_all_no} chapters`);
      }
    } else {
      console.log('❌ No results found');
    }

    console.log('\n=== Narou API Evaluation ===');
    console.log('✅ Pros:');
    console.log('   - Official API from Shosetsuka ni Narou');
    console.log('   - Public access, no authentication required');
    console.log('   - Provides comprehensive metadata');
    console.log('   - JSON/YAML/PHP output formats');
    console.log('⚠️  Concerns:');
    console.log('   - Japanese language content only');
    console.log('   - No chapter text content via API');
    console.log('   - 5-minute to 2-hour data delay');
    console.log('   - R18 content requires separate API');
    console.log('   - Geographic/language limitations');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNarouAPI();
