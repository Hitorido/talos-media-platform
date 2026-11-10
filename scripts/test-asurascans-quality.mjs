// Test script to investigate AsuraScans image loading pattern
// This script checks if they use data-src or JavaScript-based image replacement

async function testAsuraScansImages() {
  console.log('Testing AsuraScans image loading pattern...\n');

  try {
    // Test a specific chapter reader page (where images are actually loaded)
    const testUrl = 'https://asuracomic.net/solo-leveling-chapter-1';
    console.log(`Fetching: ${testUrl}`);
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Check for data-src attributes
    const dataSrcMatches = html.match(/data-src=["']([^"']+)["']/g);
    if (dataSrcMatches) {
      console.log('Found data-src attributes:');
      dataSrcMatches.forEach(match => console.log('  ', match));
    } else {
      console.log('No data-src attributes found');
    }

    // Check for data-full-src attributes
    const fullSrcMatches = html.match(/data-full-src=["']([^"']+)["']/g);
    if (fullSrcMatches) {
      console.log('\nFound data-full-src attributes:');
      fullSrcMatches.forEach(match => console.log('  ', match));
    } else {
      console.log('No data-full-src attributes found');
    }

    // Check for lazy loading patterns
    const lazyMatches = html.match(/lazy[-\s]?src=["']([^"']+)["']/gi);
    if (lazyMatches) {
      console.log('\nFound lazy-src attributes:');
      lazyMatches.forEach(match => console.log('  ', match));
    } else {
      console.log('No lazy-src attributes found');
    }

    // Check for img tags
    const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    if (imgMatches) {
      console.log('\nFound img tags:');
      imgMatches.slice(0, 5).forEach(match => console.log('  ', match));
    }

    // Check for image URLs in HTML
    const jsImageMatches = html.match(/(https?:\/\/[^"'\s]+\.(jpg|jpeg|png|webp))/gi);
    if (jsImageMatches) {
      console.log('\nFound image URLs in HTML:');
      const uniqueUrls = [...new Set(jsImageMatches)];
      uniqueUrls.slice(0, 10).forEach(url => console.log('  ', url));
    }

    console.log('\n--- Test complete ---');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAsuraScansImages();
