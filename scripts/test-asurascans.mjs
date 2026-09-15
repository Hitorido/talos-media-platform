/**
 * Test script to verify Asura Scans accessibility
 */

const ASURA_SCANS_BASE = 'https://asurascans.com';

async function testAsuraScans() {
  console.log('=== Asura Scans Accessibility Test ===\n');

  try {
    // Test 1: Basic site access
    console.log('🔍 Test 1: Basic Site Access');
    const siteResponse = await fetch(ASURA_SCANS_BASE);
    console.log(`Status: ${siteResponse.status}`);
    console.log(`Content-Type: ${siteResponse.headers.get('content-type')}`);

    if (siteResponse.status === 200) {
      console.log('✅ Site is accessible');
      const pageText = await siteResponse.text();
      console.log(`Page length: ${pageText.length} characters`);
      
      // Test 2: Check for Cloudflare or other protections
      console.log('\n🔍 Test 2: Protection Detection');
      const headers = Object.fromEntries(siteResponse.headers.entries());
      console.log('Response headers:', JSON.stringify(headers, null, 2));

      // Check for common protection indicators
      const protectionIndicators = {
        'Cloudflare': headers['cf-ray'] || headers['server']?.includes('cloudflare'),
        'Challenge': pageText.includes('challenge') || pageText.includes('captcha'),
        'JavaScript Required': pageText.includes('javascript') && pageText.includes('enabled'),
        'Redirect': siteResponse.redirected,
        'Cookie Requirements': headers['set-cookie']?.length > 0
      };

      console.log('Protection indicators:', protectionIndicators);

      const hasProtection = Object.values(protectionIndicators).some(v => v === true);
      if (hasProtection) {
        console.log('⚠️  Protection detected - may require special handling');
      } else {
        console.log('✅ No obvious protection - normal access possible');
      }

      console.log('\n=== Asura Scans Evaluation ===');
      console.log('Status: Operational website (asurascans.com)');
      console.log('Protection Assessment:', hasProtection ? 'Has protections' : 'Normal access');
      console.log('Integration Feasibility:', hasProtection ? 'Requires investigation' : 'Potentially viable');
    } else {
      console.log('❌ Site access failed');
      return;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAsuraScans();
