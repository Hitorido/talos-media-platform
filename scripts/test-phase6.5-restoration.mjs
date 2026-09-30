/**
 * Test Phase 6.5 provider restoration
 * Verify all required providers are registered
 */

import { initializeProviders, providerRegistry, RESTORED_SOURCE_IDS } from '../providers/index.js';

console.log('=== Phase 6.5 Provider Restoration Test ===\n');

initializeProviders();

const allProviders = providerRegistry.list();
console.log(`Total registered providers: ${allProviders.length}\n`);

console.log('=== RESTORED_SOURCE_IDS ===');
console.log(RESTORED_SOURCE_IDS);
console.log('');

console.log('=== Checking restored providers are registered ===');
for (const id of RESTORED_SOURCE_IDS) {
  const provider = providerRegistry.get(id);
  if (provider) {
    console.log(`✅ ${id}: ${provider.definition.name} (${provider.definition.status})`);
  } else {
    console.log(`❌ ${id}: NOT REGISTERED`);
  }
}

console.log('\n=== Checking no Consumet providers are active ===');
const consumetProviders = allProviders.filter(p => p.definition.id.includes('consumet'));
if (consumetProviders.length === 0) {
  console.log('✅ No Consumet providers found in registry');
} else {
  console.log(`❌ Found ${consumetProviders.length} Consumet providers:`);
  consumetProviders.forEach(p => console.log(`  - ${p.definition.id}`));
}

console.log('\n=== Provider list ===');
allProviders.forEach(p => {
  console.log(`${p.definition.id}: ${p.definition.name} (${p.definition.mediaTypes.join(', ')}) - ${p.definition.status}`);
});

console.log('\n=== Test Complete ===');
