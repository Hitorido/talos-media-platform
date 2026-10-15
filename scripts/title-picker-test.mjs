import assert from 'node:assert/strict';
import { loadProviderTs } from './phase6.5-test-loader.mjs';
const { groupDownloads } = loadProviderTs('services/downloadGroups.ts');
const item = {
  mediaType: 'novel',
  mediaTitle: 'Example',
  coverUrl: '',
  createdAt: 1,
  unitNumber: 1,
};
const downloads = groupDownloads([
  { ...item, id: 'a', mediaId: 'one', providerId: 'a' },
  { ...item, id: 'b', mediaId: 'two', providerId: 'b' },
  { ...item, id: 'c', mediaId: 'three', mediaTitle: 'Example 2' },
]);
assert.equal(downloads.length, 2);
assert.equal(downloads.find((x) => x.title === 'Example').items.length, 2);
const { groupSearchResults } = loadProviderTs('services/searchGrouping.ts');
const anime = (id, title, relatedIds = []) => ({
  id,
  title,
  relatedIds,
  type: 'anime',
  providerId: 'anilist',
});
assert.equal(
  groupSearchResults([
    anime('1', 'Series', ['2']),
    anime('2', 'Movie', ['3']),
    anime('3', 'Season 2'),
  ]).length,
  1,
);
assert.equal(groupSearchResults([anime('1', 'Series'), anime('2', 'Series 2')]).length, 2);
assert.equal(
  groupSearchResults([anime('1', 'Same'), { ...anime('2', 'Same'), type: 'novel' }]).length,
  2,
);
console.log(
  'PASS source grouping, relationship-connected editions, unrelated sequel and adaptation isolation',
);
