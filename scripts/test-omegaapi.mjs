/**
 * Test script to verify OmegaAPI functionality and safety
 */

const OMEGA_API_BASE = 'https://omegaapi.vercel.app/api/v1';

async function testOmegaAPI() {
  console.log('=== OmegaAPI Safety and Functionality Test ===\n');

  try {
    // Test 1: Health check
    console.log('🔍 Test 1: Health Check');
    const healthResponse = await fetch(`${OMEGA_API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log(`Status: ${healthResponse.status}`);
    console.log(`Health Data:`, JSON.stringify(healthData, null, 2));

    if (healthData.success && healthData.data.upstream) {
      console.log(`✅ Upstream status: ${healthData.data.upstream.status}`);
      console.log(`✅ Upstream latency: ${healthData.data.upstream.latencyMs}ms`);
    } else {
      console.log('❌ Health check failed');
      return;
    }

    // Test 2: Basic series listing
    console.log('\n🔍 Test 2: Series Listing');
    const seriesResponse = await fetch(`${OMEGA_API_BASE}/series?perPage=3`);
    const seriesData = await seriesResponse.json();
    console.log(`Status: ${seriesResponse.status}`);

    if (seriesData.success && seriesData.data) {
      console.log(`✅ Found ${seriesData.data.length} series`);
      if (seriesData.data.length > 0) {
        const firstSeries = seriesData.data[0];
        console.log(`First series: ${firstSeries.title}`);
        console.log(`Type: ${firstSeries.type}`);
        console.log(`Slug: ${firstSeries.slug}`);
      }
    } else {
      console.log('❌ Series listing failed');
      return;
    }

    // Test 3: Search functionality
    console.log('\n🔍 Test 3: Search Functionality');
    const searchResponse = await fetch(`${OMEGA_API_BASE}/search?q=solo`);
    const searchData = await searchResponse.json();
    console.log(`Status: ${searchResponse.status}`);

    if (searchData.success && searchData.data) {
      console.log(`✅ Search returned ${searchData.data.length} results`);
      if (searchData.data.length > 0) {
        console.log(`First result: ${searchData.data[0].title}`);
      }
    } else {
      console.log('❌ Search failed');
      return;
    }

    // Test 4: Genre filtering
    console.log('\n🔍 Test 4: Genre Filtering');
    const genreResponse = await fetch(`${OMEGA_API_BASE}/genres`);
    const genreData = await genreResponse.json();
    console.log(`Status: ${genreResponse.status}`);

    if (genreData.success && genreData.data) {
      console.log(`✅ Found ${genreData.data.length} genres`);
      console.log(`Sample genres: ${genreData.data.slice(0, 5).join(', ')}`);
    } else {
      console.log('❌ Genre listing failed');
      return;
    }

    console.log('\n=== OmegaAPI Test Results ===');
    console.log('✅ All basic API tests passed');
    console.log('⚠️  However, there are concerns:');
    console.log('   - Unauthorized proxy to OmegaScans');
    console.log('   - Adult/mature content warning');
    console.log('   - Unclear upstream authorization');
    console.log('   - MIT license applies to code, not service relationship');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOmegaAPI();
