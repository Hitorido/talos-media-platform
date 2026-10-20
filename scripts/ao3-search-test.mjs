import assert from 'node:assert/strict';
import { ao3Adapter as p } from '../backend/dist/providers/ao3/adapter.js';
const results = await p.search('Villainess Malfoy');
console.log('AO3 search results:', results.length);
console.log('First result:', results[0]);
assert.ok(results.length > 0, 'AO3 search should return results');
assert.ok(results.some((x) => x.sourceId === '93709791'), 'Should find Villainess Malfoy');
console.log('PASS AO3 search works');
