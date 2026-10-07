import assert from 'node:assert/strict';
import { resolveObModelProfile } from './ob-model-profile';

const muse = resolveObModelProfile('muse-spark', { MODEL_API_KEY: 'secret' });
assert.equal(muse.baseURL, 'https://api.meta.ai/v1');
assert.equal(muse.models.generator, 'muse-spark-1.3');
assert.equal(muse.models.resolution, 'muse-spark-1.3');
assert.equal(muse.promptPricePer1kUsd, 0.00125);
assert.equal(muse.completionPricePer1kUsd, 0.00425);
assert.equal('apiKey' in muse, true);

const custom = resolveObModelProfile('custom-compatible', {
  OB_MODEL_API_KEY: 'secret', OB_MODEL_BASE_URL: 'https://models.example.test/v1/', OB_MODEL_ID: 'medical-model',
  OB_MODEL_PROMPT_PER_1K_USD: '0', OB_MODEL_COMPLETION_PER_1K_USD: '0.002',
});
assert.equal(custom.baseURL, 'https://models.example.test/v1');
assert.equal(custom.models.validator, 'medical-model');
assert.equal(custom.completionPricePer1kUsd, 0.002);
assert.throws(() => resolveObModelProfile('custom-compatible', {
  OB_MODEL_API_KEY: 'secret', OB_MODEL_BASE_URL: 'http://remote.test/v1', OB_MODEL_ID: 'x',
  OB_MODEL_PROMPT_PER_1K_USD: '0', OB_MODEL_COMPLETION_PER_1K_USD: '0',
}), /HTTPS/);
assert.throws(() => resolveObModelProfile('custom-compatible', {
  OB_MODEL_API_KEY: 'secret', OB_MODEL_BASE_URL: 'https://remote.test/v1', OB_MODEL_ID: 'x',
}), /OB_MODEL_PROMPT_PER_1K_USD/);
assert.throws(() => resolveObModelProfile('muse-spark', {}), /MODEL_API_KEY/);

const mini = resolveObModelProfile('gpt5-mini', { OPENAI_API_KEY: 'secret' });
assert.equal(mini.provider, 'openai');
assert.equal(mini.baseURL, null);
assert.equal(mini.models.generator, 'gpt-5-mini');
assert.equal(mini.models.validator, 'gpt-5-mini');
assert.equal(mini.promptPricePer1kUsd, 0.00025);
assert.equal(mini.completionPricePer1kUsd, 0.002);
assert.equal(mini.pricingVersion, 'openai-gpt5-mini-2026-10-06');
assert.throws(() => resolveObModelProfile('gpt5-mini', {}), /OPENAI_API_KEY/);

console.log('ob-model-profile.test.ts: all assertions passed');
