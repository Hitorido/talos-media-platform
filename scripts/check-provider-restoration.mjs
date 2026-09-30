/**
 * Simple Phase 6.5 provider restoration check
 * Just reads the providers/index.ts file to verify structure
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const providersIndex = readFileSync(join(process.cwd(), 'providers/index.ts'), 'utf-8');

console.log('=== Phase 6.5 Provider Restoration Check ===\n');

// Check for RESTORED_SOURCE_IDS
if (providersIndex.includes('RESTORED_SOURCE_IDS')) {
  console.log('✅ RESTORED_SOURCE_IDS constant found');
  const match = providersIndex.match(/RESTORED_SOURCE_IDS = \[([^\]]+)\]/);
  if (match) {
    const ids = match[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
    console.log(`   Found ${ids.length} restored source IDs: ${ids.join(', ')}`);
  }
} else {
  console.log('❌ RESTORED_SOURCE_IDS constant not found');
}

// Check for specific provider registrations
const requiredProviders = [
  'weebcentral',
  'mangapill',
  'mangatown',
  'gdscans',
  'demonicscans',
  'kaliscan',
  'mangajinx',
  'novelarrow',
  'novelcodex',
  'novelping',
  'royalroad',
  'donghuastream',
  'animeparadise',
];

console.log('\n=== Checking required provider registrations ===');
for (const id of requiredProviders) {
  if (providersIndex.includes(`'${id}'`) || providersIndex.includes(`"${id}"`)) {
    console.log(`✅ ${id} found in index`);
  } else {
    console.log(`❌ ${id} NOT found in index`);
  }
}

// Check for Consumet references
console.log('\n=== Checking Consumet removal ===');
const consumetCount = (providersIndex.match(/consumet/gi) || []).length;
if (consumetCount === 0) {
  console.log('✅ No Consumet references in providers/index.ts');
} else {
  console.log(`⚠️  Found ${consumetCount} Consumet references in providers/index.ts`);
}

console.log('\n=== Check Complete ===');
