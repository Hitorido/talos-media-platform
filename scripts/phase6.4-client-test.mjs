import assert from 'node:assert/strict';
import { create } from 'zustand';
import { loadTs, frontendApi } from './phase6.4-test-loader.mjs';
const originalEnv = process.env.EXPO_PUBLIC_API_URL;
const originalFetch = globalThis.fetch;
try {
  for (const [os, host, configured, expected] of [
    ['web', null, '', 'http://localhost:5000'],
    ['android', null, '', 'http://10.0.2.2:5000'],
    ['ios', '192.168.1.20:8081', '', 'http://192.168.1.20:5000'],
    [
      'android',
      null,
      'https://talos-media-platform.onrender.com/',
      'https://talos-media-platform.onrender.com',
    ],
  ]) {
    process.env.EXPO_PUBLIC_API_URL = configured;
    const config = loadTs('lib/apiConfig.ts', {
      'expo-constants': { __esModule: true, default: { expoConfig: { hostUri: host } } },
      'react-native': { Platform: { OS: os } },
    });
    assert.equal(config.getApiBaseUrl(), expected);
  }
  console.log('PASS existing local/platform/cloud URL switching');
  const { client } = frontendApi();
  client.setApiAuthTokenProvider(() => 'test-token');
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, undefined);
    return new Response(JSON.stringify({ success: true, data: { ok: true } }));
  };
  assert.equal((await client.apiRequest('/health', { token: null })).ok, true);
  globalThis.fetch = async () => {
    throw new TypeError('offline');
  };
  await assert.rejects(client.apiRequest('/health'), (e) => e.status === 0);
  globalThis.fetch = async () => new Response('Bad gateway', { status: 502 });
  await assert.rejects(client.apiRequest('/health'), (e) => e.status === 502);
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (_, options) => {
    assert.equal(options.signal.aborted, true);
    throw new Error('aborted');
  };
  await assert.rejects(
    client.apiRequest('/health', { signal: controller.signal }),
    (e) => e.status === 0,
  );
  console.log('PASS explicit unauthenticated requests, offline, HTTP errors, cancellation');
  const secure = new Map();
  let removedLegacy = false;
  let base = 'http://localhost:5000';
  const storageDependencies = {
    'expo-secure-store': {
      getItemAsync: async (k) => secure.get(k) ?? null,
      setItemAsync: async (k, v) => {
        secure.set(k, v);
      },
      deleteItemAsync: async (k) => {
        secure.delete(k);
      },
    },
    'react-native': { Platform: { OS: 'android' } },
    '@/lib/apiConfig': { getApiBaseUrl: () => base },
    '@/services/persistenceService': {
      removePersistedState: async (key) => {
        assert.equal(key, 'auth');
        removedLegacy = true;
      },
    },
  };
  const storage = loadTs('services/authTokenStorage.ts', storageDependencies);
  await storage.writeAuthToken('test-token');
  const restartedStorage = loadTs('services/authTokenStorage.ts', storageDependencies);
  assert.equal(await restartedStorage.readAuthToken(), 'test-token');
  assert.ok(removedLegacy);
  base = 'https://talos-media-platform.onrender.com';
  assert.equal(await restartedStorage.readAuthToken(), null);
  base = 'http://localhost:5000';
  let status = 200;
  const api = {
    ...client,
    loginAccount: async () => ({ token: 'test-token', user: { id: 'test-user' } }),
    fetchCurrentUser: async (token) => {
      assert.equal(token, 'test-token');
      if (status !== 200) throw new client.ApiError('test', status);
      return { user: { id: 'test-user' } };
    },
    logoutAccount: async () => {},
  };
  const makeStore = () =>
    loadTs('stores/authStore.ts', {
      zustand: { create },
      '@/services/api': api,
      '@/services/authTokenStorage': restartedStorage,
    }).useAuthStore;
  const store = makeStore();
  await store.getState().hydrate();
  await store.getState().refreshMe();
  assert.equal(store.getState().user.id, 'test-user');
  status = 0;
  await store.getState().refreshMe();
  assert.equal(store.getState().token, 'test-token');
  status = 503;
  await store.getState().refreshMe();
  assert.equal(store.getState().token, 'test-token');
  status = 401;
  await store.getState().refreshMe();
  assert.equal(store.getState().token, null);
  assert.equal(await storage.readAuthToken(), null);
  await store.getState().login({});
  await store.getState().logout();
  assert.equal(await storage.readAuthToken(), null);
  console.log(
    'PASS mocked native storage restart, environment isolation, auth restore, offline retention, 401 clearing, logout',
  );
  console.log(
    'NOTE native SecureStore and device restart still require a physical device/emulator',
  );
} finally {
  globalThis.fetch = originalFetch;
  if (originalEnv === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalEnv;
}
