// Opt-in authenticated persistence test. Password/token are memory-only.
// Creates one account; no account/progress deletion API exists, so those records remain.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { frontendApi } from './phase6.4-test-loader.mjs';
if (!process.env.EXPO_PUBLIC_API_URL || !process.argv.includes('--write-test-account'))
  throw new Error('Set EXPO_PUBLIC_API_URL and pass --write-test-account');
const { config, client, api } = frontendApi();
const request = client.apiRequest;
let token = null;
client.setApiAuthTokenProvider(() => token);
const suffix = randomBytes(6).toString('hex');
const credentials = {
  email: `talos64-${suffix}@example.com`,
  username: `talos64_${suffix}`,
  password: randomBytes(24).toString('base64url'),
};
const item = {
  mediaId: `phase64-${suffix}`,
  providerId: 'narou',
  sourceId: 'phase64-test',
  mediaType: 'novel',
  title: 'Phase 6.4 API test',
  coverUrl: 'https://example.com/test.png',
};
let historyId;
let created = false;
console.log('TARGET', config.getApiBaseUrl());
try {
  const registered = await api.registerAccount(credentials);
  created = true;
  token = registered.token;
  assert.ok(token);
  console.log('PASS registration; test account', credentials.username);
  const login = async () => {
    const data = await api.loginAccount({
      emailOrUsername: credentials.email,
      password: credentials.password,
    });
    assert.equal(data.user.id, registered.user.id);
    token = data.token;
  };
  await login();
  console.log('PASS login');
  assert.equal((await api.fetchCurrentUser()).user.id, registered.user.id);
  console.log('PASS authenticated me');
  await api.updateProfile({ bio: 'Phase 6.4 persistence test' });
  await login();
  assert.equal((await request('/api/user/profile')).user.profile.bio, 'Phase 6.4 persistence test');
  console.log('PASS profile persists');
  await api.upsertLibraryItem({ ...item, isFavorite: true });
  await login();
  assert.ok((await api.fetchLibrary()).library.some((x) => x.mediaId === item.mediaId));
  assert.ok((await api.fetchFavorites()).favorites.some((x) => x.mediaId === item.mediaId));
  console.log('PASS library and favorites persist after reauthentication');
  await request(`/api/favorites/${item.mediaId}`, { method: 'DELETE' });
  await login();
  assert.equal((await api.fetchFavorites()).favorites.length, 0);
  console.log('PASS favorite removal persists');
  const history = await request('/api/history', {
    method: 'POST',
    body: {
      ...item,
      itemId: 'chapter1',
      itemTitle: 'Test chapter',
      itemType: 'chapter',
      progress: 0.5,
    },
  });
  historyId = history.entry.id;
  await login();
  assert.ok((await api.fetchHistory()).history.some((x) => x.id === historyId));
  console.log('PASS history persists');
  await request('/api/progress/reading', {
    method: 'PUT',
    body: {
      mediaId: item.mediaId,
      chapterId: 'chapter1',
      chapterNumber: 1,
      chapterTitle: 'Test chapter',
      pageNumber: 2,
      totalPages: 4,
      progress: 0.5,
    },
  });
  await request('/api/progress/watching', {
    method: 'PUT',
    body: {
      mediaId: item.mediaId,
      episodeId: 'episode1',
      episodeNumber: 1,
      episodeTitle: 'API test only',
      positionSeconds: 30,
      durationSeconds: 60,
    },
  });
  await login();
  const progress = await api.fetchProgress(item.mediaId);
  assert.equal(progress.reading[0].progress, 0.5);
  assert.equal(progress.watching[0].positionSeconds, 30);
  console.log('PASS reading and watch progress persist');
} catch (e) {
  console.log('FAIL authenticated workflow', e.status ?? '', e.message);
  process.exitCode = 1;
} finally {
  if (created) {
    for (const [label, cleanup] of [
      [
        'history',
        async () => {
          if (historyId) await request(`/api/history/${historyId}`, { method: 'DELETE' });
        },
      ],
      ['library', async () => api.removeLibraryItem(item.mediaId)],
      ['profile', async () => api.updateProfile({ bio: '' })],
    ]) {
      try {
        await cleanup();
        console.log('CLEANUP', label);
      } catch (e) {
        console.log('CLEANUP FAILED', label, e.status ?? '', e.message);
        process.exitCode = 1;
      }
    }
    try {
      const login = await api.loginAccount({
        emailOrUsername: credentials.email,
        password: credentials.password,
      });
      token = login.token;
      assert.equal((await api.fetchLibrary()).library.length, 0);
      assert.equal((await api.fetchFavorites()).favorites.length, 0);
      assert.equal((await api.fetchHistory()).history.length, 0);
      console.log('PASS cleanup persists after reauthentication');
    } catch (e) {
      console.log('FAIL cleanup verification', e.status ?? '', e.message);
      process.exitCode = 1;
    }
    console.log(
      'RESIDUAL: dedicated account and any reading/watch progress; no deletion endpoints exist',
    );
  }
}
