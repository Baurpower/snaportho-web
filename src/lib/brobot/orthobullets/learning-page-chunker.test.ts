import assert from 'node:assert/strict';

import { chunkLearningPage, estimateTokens, learningPageCacheKey, stableLearningPageHash } from './learning-page-chunker';

assert.equal(estimateTokens(''), 0);
assert.equal(estimateTokens('1234567'), 2);
assert.equal(stableLearningPageHash('A   B'), stableLearningPageHash('A B'));

const sections = Array.from({ length: 8 }, (_, index) => ({
  id: `s-${index}`,
  heading: `Section ${index}`,
  level: 2,
  text: `${`Clinical sentence ${index}. `.repeat(90)}Complication ${index}.`,
}));
const chunks = chunkLearningPage({ pageId: 'page-1', title: 'Hip approaches', sections, maxSourceTokens: 500 });
assert.ok(chunks.length > 1);
assert.ok(chunks.every((chunk) => chunk.totalChunks === chunks.length));
assert.deepEqual([...new Set(chunks.flatMap((chunk) => chunk.sectionIds))].sort(), sections.map((section) => section.id).sort());
assert.deepEqual(chunkLearningPage({ pageId: 'page-1', title: 'Hip approaches', sections, maxSourceTokens: 500 }), chunks);

const oversized = chunkLearningPage({
  pageId: 'page-2',
  title: 'Oversized',
  sections: [{ id: 'large', heading: 'Direct anterior approach', text: 'Sentence with anatomy and risk. '.repeat(1000) }],
  maxSourceTokens: 400,
});
assert.ok(oversized.length > 1);
assert.ok(oversized.every((chunk) => chunk.estimatedInputTokens <= 410));

const cacheA = learningPageCacheKey({ sourceUrl: 'https://rock.aaos.org/topic/hip?x=1', contentHash: 'abc', mode: 'full', model: 'm' });
const cacheB = learningPageCacheKey({ sourceUrl: 'https://rock.aaos.org/topic/hip?x=2', contentHash: 'abc', mode: 'full', model: 'm' });
assert.equal(cacheA, cacheB);
assert.notEqual(cacheA, learningPageCacheKey({ sourceUrl: 'https://rock.aaos.org/topic/hip', contentHash: 'changed', mode: 'full', model: 'm' }));

console.log('learning-page-chunker tests passed');
