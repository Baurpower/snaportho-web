import assert from 'node:assert/strict';

import { isProductEventName } from './product-events.ts';
import {
  ANKI_ATTENDING_PROMPT,
  ANKI_OITE_PROMPT,
  classifyAnkiBroBotPrompt,
  summarizeAnkiUsage,
} from './anki-usage-summary.ts';

assert.equal(isProductEventName('anki_addon_downloaded'), true);
assert.equal(isProductEventName('anki_addon_first_downloaded'), true);
assert.equal(isProductEventName('anki_device_linked'), true);
assert.equal(isProductEventName('anki_addon_opened'), true);
assert.equal(isProductEventName('anki_brobot_prompt_used'), true);
assert.equal(classifyAnkiBroBotPrompt(ANKI_ATTENDING_PROMPT), 'attending');
assert.equal(
  classifyAnkiBroBotPrompt(`Use this Anki card as the primary context for my question.\n\nCard front: secret\n\nMy question: ${ANKI_ATTENDING_PROMPT}`),
  'attending'
);
assert.equal(classifyAnkiBroBotPrompt(ANKI_OITE_PROMPT), 'oite');
assert.equal(classifyAnkiBroBotPrompt('Why is the peroneal division more vulnerable?'), 'freeform');
assert.equal(classifyAnkiBroBotPrompt(null), 'freeform');

const now = new Date('2026-09-12T15:00:00.000Z');
const summary = summarizeAnkiUsage({
  now,
  windowDays: 7,
  allTimeDownloaders: 12,
  tokens: [
    { user_id: 'user-1', last_used_at: '2026-09-12T12:00:00.000Z', revoked_at: null },
    { user_id: 'user-2', last_used_at: '2026-08-01T12:00:00.000Z', revoked_at: null },
    { user_id: 'user-3', last_used_at: '2026-09-12T12:00:00.000Z', revoked_at: '2026-09-12T13:00:00.000Z' },
  ],
  events: [
    {
      event_name: 'anki_addon_first_downloaded',
      occurred_at: '2026-09-10T10:00:00.000Z',
      user_id: 'user-1',
      app_version: '1.0.4',
      properties: {},
    },
    {
      event_name: 'anki_addon_downloaded',
      occurred_at: '2026-09-10T10:00:00.000Z',
      user_id: 'user-1',
      app_version: '1.0.4',
      properties: {},
    },
    {
      event_name: 'anki_addon_downloaded',
      occurred_at: '2026-09-11T10:00:00.000Z',
      user_id: 'user-1',
      app_version: '1.0.4',
      properties: {},
    },
    {
      event_name: 'anki_device_linked',
      occurred_at: '2026-09-10T11:00:00.000Z',
      user_id: 'user-1',
      app_version: '1.0.4',
      properties: { device_token_id: 'tok-1' },
    },
    {
      event_name: 'anki_deck_imported',
      occurred_at: '2026-09-10T12:00:00.000Z',
      user_id: 'user-1',
      app_version: '1.0.4',
      properties: { release_id: 'rel-1' },
    },
    {
      event_name: 'anki_brobot_prompt_used',
      occurred_at: '2026-09-11T12:00:00.000Z',
      user_id: 'user-1',
      app_version: '1.0.4',
      properties: { prompt_kind: 'attending' },
    },
    {
      event_name: 'anki_addon_opened',
      occurred_at: '2026-09-12T08:00:00.000Z',
      user_id: 'user-1',
      app_version: '1.0.4',
      properties: { os: 'mac' },
    },
    {
      event_name: 'anki_setup_failed',
      occurred_at: '2026-09-11T09:00:00.000Z',
      user_id: 'user-4',
      app_version: '1.0.4',
      properties: { code: 'download_unavailable' },
    },
  ],
});

assert.equal(summary.uniqueDownloadersAllTime, 12);
assert.equal(summary.uniqueDownloadersInWindow, 1);
assert.equal(summary.totalDownloadsInWindow, 2);
assert.equal(summary.uniqueLinkedInWindow, 1);
assert.equal(summary.uniqueDeckImportsInWindow, 1);
assert.equal(summary.uniqueBroBotUsersInWindow, 1);
assert.equal(summary.activatedWithin7d, 1);
assert.equal(summary.activationRate, 1);
assert.equal(summary.linkedDevices, 2);
assert.equal(summary.activeUsers1d, 1);
assert.equal(summary.promptKindCounts.attending, 1);
assert.equal(summary.versionMix[0]?.version, '1.0.4');
assert.equal(summary.setupFailures[0]?.code, 'download_unavailable');
assert.equal(JSON.stringify(summary).includes('secret'), false);
assert.equal(JSON.stringify(summary).includes(ANKI_ATTENDING_PROMPT), false);

const firstDay = summary.daily.find((row) => row.day === '2026-09-10');
assert.ok(firstDay);
assert.equal(firstDay?.downloads, 1);
assert.equal(firstDay?.links, 1);

console.log('anki usage analytics tests passed');
