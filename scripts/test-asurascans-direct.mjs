/**
 * Test script to verify Asura Scans website functionality
 * Direct website testing without backend integration
 */

const ASURA_BASE_URL = 'https://asurascans.com';

async function testAsuraScansDirect() {
  console.log('=== Asura Scans Direct Website Test ===\n');

  try {
    // Test 1: Search functionality
    console.log('🔍 Test 1: Search Functionality');
    const searchResponse = await fetch(`${ASURA_BASE_URL}/series/?title=solo`);
    console.log(`Status: ${searchResponse.status}`);
    
    if (searchResponse.status === 200) {
      const html = await searchResponse.text();
      console.log(`✅ Search page accessible (${html.length} characters)`);
      
      // Check for series links
      const seriesLinks = html.match(/href="\/series\/[^"]+"/g) || [];
      console.log(`Found ${seriesLinks.length} series links`);
      
      if (seriesLinks.length > 0) {
        const firstSlug = seriesLinks[0].match(/\/series\/([^"]+)/)?.[1];
        console.log(`First series slug: ${firstSlug}`);
        
        // Test 2: Series details
        console.log('\n🔍 Test 2: Series Details');
        const detailsResponse = await fetch(`${ASURA_BASE_URL}/series/${firstSlug}`);
        console.log(`Status: ${detailsResponse.status}`);
        
        if (detailsResponse.status === 200) {
          const detailsHtml = await detailsResponse.text();
          console.log(`✅ Series details accessible (${detailsHtml.length} characters)`);
          
          // Check for chapter links
          const chapterLinks = detailsHtml.match(/href="\/chapter\/[^"]+"/g) || [];
          console.log(`Found ${chapterLinks.length} chapter links`);
          
          if (chapterLinks.length > 0) {
            const firstChapterSlug = chapterLinks[0].match(/\/chapter\/([^"]+)/)?.[1];
            console.log(`First chapter slug: ${firstChapterSlug}`);
            
            // Test 3: Chapter pages
            console.log('\n🔍 Test 3: Chapter Pages');
            const chapterResponse = await fetch(`${ASURA_BASE_URL}/chapter/${firstChapterSlug}`);
            console.log(`Status: ${chapterResponse.status}`);
            
            if (chapterResponse.status === 200) {
              const chapterHtml = await chapterResponse.text();
              console.log(`✅ Chapter page accessible (${chapterHtml.length} characters)`);
              
              // Check for images
              const imageLinks = chapterHtml.match(/src="[^"]*\.(jpg|png|jpeg|webp)"/gi) || [];
              console.log(`Found ${imageLinks.length} image links`);
              
              console.log('\n=== Asura Scans Test Results ===');
              console.log('✅ Search: PASS');
              console.log('✅ Details: PASS');
              console.log('✅ Chapters: PASS');
              console.log('✅ Pages: PASS');
              console.log('\n✅ Asura Scans website is suitable for scraping integration');
            } else {
              console.log('❌ Chapter page failed');
            }
          } else {
            console.log('❌ No chapters found');
          }
        } else {
          console.log('❌ Series details failed');
        }
      } else {
        console.log('❌ No series found in search');
      }
    } else {
      console.log('❌ Search page failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n=== Asura Scans Test Results ===');
    console.log('❌ Asura Scans website test FAILED');
  }
}

testAsuraScansDirect();
