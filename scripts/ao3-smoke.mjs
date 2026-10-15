import assert from 'node:assert/strict';
import { ao3Adapter as p } from '../backend/dist/providers/ao3/adapter.js';
const results = await p.search('The Villainess Malfoy');
assert.ok(results.some((x) => x.sourceId === '93709791'));
const details = await p.getDetails('93709791');
const chapters = await p.getChapters('93709791');
const text = await p.getNovelContent('93709791', chapters[0].id);
assert.match(details.title, /Villainess Malfoy/);
assert.ok(chapters.length >= 36);
assert.equal(new Set(chapters.map((x) => x.id)).size, chapters.length);
assert.ok(text.paragraphs.length > 10);
await assert.rejects(p.getDetails('../private'), (e) => e.statusCode === 400);
await assert.rejects(p.getNovelContent('93709791', '1'), (e) => e.statusCode === 404);
console.log(
  `PASS AO3 ${details.title}: ${chapters.length} chapters, ${text.paragraphs.length} paragraphs, invalid IDs and chapter membership`,
);
