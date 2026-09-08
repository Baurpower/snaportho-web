import assert from 'node:assert/strict';
import { validatedEmailCampaignAttribution } from './attribution';

const valid = validatedEmailCampaignAttribution({ source: 'branch', medium: 'email', campaign: 'brobot_activation_v1', content: 'activation_2', branchClickId: 'click-123' });
assert.deepEqual(valid, { source: 'branch', medium: 'email', campaign: 'brobot_activation_v1', content: 'activation_2', branchClickId: 'click-123' });
assert.equal(validatedEmailCampaignAttribution({ source: 'branch', medium: 'email', campaign: 'brobot_habit_v1', content: 'activation_2' }), null);
assert.equal(validatedEmailCampaignAttribution({ source: 'attacker', medium: 'email', campaign: 'brobot_activation_v1', content: 'activation_2' }), null);
assert.equal(validatedEmailCampaignAttribution({ source: 'branch', medium: 'email', campaign: 'unknown', content: 'unknown' }), null);
console.log('Email campaign attribution allow-list tests passed.');
