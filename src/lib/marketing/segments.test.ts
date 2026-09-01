import assert from 'node:assert/strict';
import { isEligibleForCampaign, type CampaignProfile } from './segments.ts';

const now = Date.now();
const base: CampaignProfile = { userId: 'u', email: 'u@example.com', confirmed: true, receiveEmails: true, firstName: null, profileComplete: false, currentlyEntitled: false, firstUseAt: null, lastUseAt: null, priorSteps: new Set(), priorStepAt: new Map(), optedOutTopics: new Set() };
assert.equal(isEligibleForCampaign(base, 'activation_1', now), true);
assert.equal(isEligibleForCampaign({ ...base, receiveEmails: false }, 'activation_1', now), false);
assert.equal(isEligibleForCampaign({ ...base, optedOutTopics: new Set(['brobot_learning']) }, 'activation_1', now), false);
assert.equal(isEligibleForCampaign({ ...base, currentlyEntitled: true }, 'activation_1', now), false);
assert.equal(isEligibleForCampaign({ ...base, firstUseAt: now - 1000, lastUseAt: now - 1000 }, 'conversion_1', now), true);
assert.equal(isEligibleForCampaign({ ...base, priorSteps: new Set(['activation_1']), priorStepAt: new Map([['activation_1', now - 4 * 86400000]]) }, 'activation_2', now), true);
assert.equal(isEligibleForCampaign({ ...base, priorSteps: new Set(['activation_1']), priorStepAt: new Map([['activation_1', now - 86400000]]) }, 'activation_2', now), false);
console.log('marketing segment tests passed');
