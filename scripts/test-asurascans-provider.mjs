/**
 * Test script to verify Asura Scans provider functionality
 * Tests the actual Talos flow: Search → Details → Chapters → Pages
 */

import { searchAsura, getAsuraDetails, getAsuraChapters, getAsuraPages } from '../backend/src/providers/asurascans/scraper.ts';

async function testAsuraScansProvider() {
  console.log('=== Asura Scans Provider Talos Flow Test ===\n');

  try {
    // Test 1: Search
    console.log('🔍 Test 1: Search');
    const searchResults = await searchAsura('solo');
    console.log(`Found ${searchResults.length} series`);
    
    if (searchResults.length === 0) {
      console.log('❌ No search results found');
      return;
    }
    
    const firstSeries = searchResults[0];
    console.log(`✅ First result: ${firstSeries.title}`);
    console.log(`   Slug: ${firstSeries.slug}`);
    console.log(`   Cover: ${firstSeries.coverUrl ? 'Yes' : 'No'}`);

    // Test 2: Details
    console.log('\n🔍 Test 2: Get Details');
    const details = await getAsuraDetails(firstSeries.slug);
    console.log(`✅ Details retrieved: ${details.title}`);
    console.log(`   Description: ${details.description ? 'Yes' : 'No'}`);
    console.log(`   Status: ${details.status}`);

    // Test 3: Chapters
    console.log('\n🔍 Test 3: Get Chapters');
    const chapters = await getAsuraChapters(firstSeries.slug);
    console.log(`✅ Found ${chapters.length} chapters`);
    
    if (chapters.length === 0) {
      console.log('❌ No chapters found');
      return;
    }
    
    const firstChapter = chapters[0];
    console.log(`   First chapter: ${firstChapter.title}`);
    console.log(`   Chapter number: ${firstChapter.chapterNumber}`);

    // Test 4: Pages
    console.log('\n🔍 Test 4: Get Pages');
    const pages = await getAsuraPages(firstChapter.slug);
    console.log(`✅ Found ${pages.length} pages`);
    
    if (pages.length === 0) {
      console.log('❌ No pages found');
      return;
    }
    
    console.log(`   First page: ${pages[0].substring(0, 50)}...`);
    console.log(`   Last page: ${pages[pages.length - 1].substring(0, 50)}...`);

    console.log('\n=== Asura Scans Provider Test Results ===');
    console.log('✅ Search: PASS');
    console.log('✅ Details: PASS');
    console.log('✅ Chapters: PASS');
    console.log('✅ Pages: PASS');
    console.log('\n✅ Asura Scans provider is VERIFIED WORKING for manhwa content');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n=== Asura Scans Provider Test Results ===');
    console.log('❌ Asura Scans provider test FAILED');
  }
}

testAsuraScansProvider();
