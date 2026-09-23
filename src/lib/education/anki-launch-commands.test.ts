import assert from "node:assert/strict";

import {
  buildLaunchCommandRow,
  guidOrdinalResolution,
  isAnkiLaunchCreateRequest,
  toLaunchRequest,
} from "./anki-launch-commands";
import { isClaimOverlapLaunchRequestV1 } from "./contracts/claim-overlap-learner-v1";

const create = {
  contractVersion: "claim-overlap.v1",
  noteGuid: "note-primary",
  cardOrdinal: 0,
  rank: 1,
};
assert.equal(isAnkiLaunchCreateRequest(create), true);
assert.equal(isAnkiLaunchCreateRequest({ ...create, deckName: "SnapOrtho" }), false);
assert.equal(guidOrdinalResolution(0), "not_found");
assert.equal(guidOrdinalResolution(2), "ambiguous");
assert.equal(guidOrdinalResolution(1), "ok");

const row = buildLaunchCommandRow({
  userId: "11111111-1111-4111-8111-111111111111",
  card: {
    canonicalCardId: "22222222-2222-4222-8222-222222222222",
    canonicalCardVersionId: "33333333-3333-4333-8333-333333333333",
    noteGuid: "note-primary",
    cardOrdinal: 0,
  },
  idempotencySeed: "seed",
  now: new Date("2026-09-19T12:00:00.000Z"),
});
assert.equal(row.recommendation_item_id, null);
assert.equal(row.contract_version, "claim-overlap.v1");
assert.equal(row.idempotency_key.length, 64);
assert.equal(row.status, "pending");

const command = toLaunchRequest({
  id: "44444444-4444-4444-8444-444444444444",
  canonical_card_id: row.canonical_card_id,
  canonical_card_version_id: row.canonical_card_version_id,
  note_guid: row.note_guid,
  card_ordinal: row.card_ordinal,
  requested_at: row.requested_at,
  expires_at: row.expires_at,
});
assert.equal(isClaimOverlapLaunchRequestV1(command), true);
assert.equal(command.recommendationItemId, null);

console.log("anki-launch-commands.test.ts: all assertions passed");
