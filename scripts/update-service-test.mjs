import assert from 'node:assert/strict';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
let version = '0.6.5-beta';
let requests = 0;
const originalFetch = globalThis.fetch;
const service = loadProviderTs('services/updateService.ts', {
  'expo-constants': { __esModule: true, default: { expoConfig: { get version() { return version; } } } },
  'react-native': { Linking: { openURL() {} } },
});
try {
  globalThis.fetch = async () => { requests++; return { ok: true, json: async () => ({ latestVersion: '0.6.6-beta', downloadUrl: 'https://github.com/Hitorido/talos-media-platform/releases/latest' }) }; };
  assert.equal((await service.checkForUpdate()).latestVersion, '0.6.6-beta');
  assert.equal(await service.checkForUpdate(), null);
  assert.equal(requests, 1, 'Only one automatic prompt per session');
  assert.ok(await service.checkForUpdate(true), 'Manual check remains available');
  service._resetUpdateSession(); version = '0.6.6-beta';
  assert.equal(await service.checkForUpdate(), null, 'Current version gets no prompt');
  service._resetUpdateSession();
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal(await service.checkForUpdate(), null, 'Offline startup does not fail');
  console.log('PASS update availability, session suppression, manual check and offline handling');
} finally { globalThis.fetch = originalFetch; }

