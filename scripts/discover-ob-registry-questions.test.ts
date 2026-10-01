import assert from 'node:assert/strict';
import { classifyRegistryUpsert, extractTopicId, mapPacketToRegistryRow } from './discover-ob-registry-questions';

assert.equal(extractTopicId('https://www.orthobullets.com/trauma/1037/femoral-neck-fractures'), '1037');
assert.equal(extractTopicId('https://www.orthobullets.com/trauma/1037/femoral-neck-fractures?x=1'), '1037');
assert.equal(extractTopicId(null), null);
assert.equal(extractTopicId(undefined), null);
assert.equal(extractTopicId('not-a-url'), null);
assert.equal(extractTopicId('https://www.orthobullets.com/trauma/abc/slug'), null);

const mapped = mapPacketToRegistryRow({
  nativeQuestionId: '1062',
  specialty: 'trauma',
  topicUrl: 'https://www.orthobullets.com/trauma/1037/femoral-neck-fractures',
  topic: 'Imaging',
});
assert.deepEqual(mapped, {
  externalQuestionId: '1062',
  topicRaw: 'Imaging',
  topicNormalized: 'imaging',
  topicId: '1037',
});

const blank = mapPacketToRegistryRow({ nativeQuestionId: '1', topicUrl: null, topic: '   ' });
assert.deepEqual(blank, { externalQuestionId: '1', topicRaw: null, topicNormalized: null, topicId: null });

const long = mapPacketToRegistryRow({ nativeQuestionId: '1', topicUrl: null, topic: 'x'.repeat(500) });
assert.equal(long.topicRaw?.length, 300);
assert.equal(long.topicNormalized?.length, 300);

const incoming = mapPacketToRegistryRow({ nativeQuestionId: '1', topic: 'Trauma', topicUrl: 'https://www.orthobullets.com/trauma/1037/x' });
assert.equal(classifyRegistryUpsert(null, incoming), 'created');
assert.equal(classifyRegistryUpsert({ id: 'a', isActive: false, topicRaw: null, topicNormalized: null, topicId: null }, incoming), 'reactivated');
assert.equal(classifyRegistryUpsert({ id: 'a', isActive: true, topicRaw: null, topicNormalized: null, topicId: null }, incoming), 'updated');
assert.equal(classifyRegistryUpsert({ id: 'a', isActive: true, topicRaw: 'Existing', topicNormalized: 'existing', topicId: '99' }, incoming), 'unchanged');

console.log('discover-ob-registry-questions.test.ts: all assertions passed');
