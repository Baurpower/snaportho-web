import assert from 'node:assert/strict';

import { getAnswerModelForRoute } from './model-config';

assert.equal(
  getAnswerModelForRoute({
    mode: 'or_prep',
    ambiguity: 'low',
    responseDepth: 'standard',
    subintent: 'surgical_steps',
  }),
  process.env.BROBOT_STRONG_MODEL || 'gpt-4o'
);

assert.equal(
  getAnswerModelForRoute({
    mode: 'general',
    ambiguity: 'low',
    responseDepth: 'standard',
    subintent: 'overview',
  }),
  process.env.BROBOT_CHAT_MODEL || process.env.BROBOT_FAST_MODEL || 'gpt-4o-mini'
);

assert.equal(
  getAnswerModelForRoute({
    mode: 'general',
    ambiguity: 'moderate',
    responseDepth: 'deep',
    subintent: 'overview',
  }),
  process.env.BROBOT_STRONG_MODEL || 'gpt-4o'
);
