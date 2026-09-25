import assert from "node:assert/strict";

import { canonicalContentHash } from "./deck-semantic-mapping";
import {
  CARD_CLAIM_DRY_RUN_LIMIT_DEFAULT,
  CARD_CLAIM_FULL_DECK_CONFIRM,
  mapExistingClaimRow,
  mapFieldSnapshot,
  mapPublishedDeckRow,
  parseCardClaimDryRunGuard,
  queueDistribution,
  specialtyStratum,
  stratifyCards,
  type PublishedDeckLoaderRow,
} from "./card-claim-deck-loader";

assert.deepEqual(
  parseCardClaimDryRunGuard(new Map()),
  { limit: CARD_CLAIM_DRY_RUN_LIMIT_DEFAULT, fullDeck: false },
);
assert.deepEqual(parseCardClaimDryRunGuard(new Map([["--limit", "25"]])), { limit: 25, fullDeck: false });
assert.deepEqual(
  parseCardClaimDryRunGuard(new Map([["--confirm", CARD_CLAIM_FULL_DECK_CONFIRM]])),
  { limit: null, fullDeck: true },
);
assert.throws(() => parseCardClaimDryRunGuard(new Map([["--apply", "true"]])), /no_apply_mode/);
assert.throws(
  () => parseCardClaimDryRunGuard(new Map([["--confirm", CARD_CLAIM_FULL_DECK_CONFIRM], ["--limit", "10"]])),
  /full_deck_dry_run_does_not_take_limit/,
);
assert.throws(() => parseCardClaimDryRunGuard(new Map([["--limit", "0"]])), /limit_must_be/);
assert.throws(() => parseCardClaimDryRunGuard(new Map([["--confirm", "SEND"]])), /unknown_confirm_token/);

const fields = mapFieldSnapshot([
  { name: "Text", rawValue: "The preferred reconstruction is {{c1::cup-cage}}." },
  { name: "Extra", value: "revision THA" },
]);
assert.equal(fields[0]?.name, "Text");
assert.equal(fields[1]?.rawValue, "revision THA");

const row: PublishedDeckLoaderRow = {
  canonical_card_id: "11111111-1111-4111-8111-111111111111",
  canonical_card_version_id: "22222222-2222-4222-8222-222222222222",
  current_version_id: "22222222-2222-4222-8222-222222222222",
  note_guid: "guid-cup-cage",
  card_ordinal: 0,
  content_hash: "",
  inclusion_status: "included",
  card_active: true,
  version_active: true,
  field_snapshot: [
    { name: "Text", rawValue: "The preferred reconstruction is {{c1::cup-cage}}." },
  ],
  tag_snapshot: ["Adult_Recon"],
};
row.content_hash = canonicalContentHash({
  fields: mapFieldSnapshot(row.field_snapshot),
  tags: ["Adult_Recon"],
  cardOrdinal: 0,
});
const card = mapPublishedDeckRow(row);
assert.equal(card.noteGuid, "guid-cup-cage");
assert.equal(card.currentVersion, true);
assert.equal(card.active, true);
assert.equal(card.inclusionStatus, "included");
assert.throws(
  () => mapPublishedDeckRow({ ...row, content_hash: "a".repeat(64) }),
  /content_hash_mismatch/,
);

assert.equal(mapExistingClaimRow({
  id: row.canonical_card_id,
  current_version_id: null,
  fingerprint_hash: "b".repeat(64),
}), null);
assert.equal(mapExistingClaimRow({
  id: row.canonical_card_id,
  current_version_id: row.canonical_card_version_id,
  fingerprint_hash: "b".repeat(64),
})?.claimId, row.canonical_card_id);

assert.deepEqual(queueDistribution([
  { queue: "auto_approved" },
  { queue: "missing_entity" },
  { queue: "auto_approved" },
]), { auto_approved: 2, missing_entity: 1 });

assert.equal(specialtyStratum(["Adult_Recon::THA"]), "recon");
assert.equal(specialtyStratum(["Trauma::Femur"]), "trauma");
const mixed = stratifyCards([
  { tags: ["Trauma"], id: "t1" },
  { tags: ["Trauma"], id: "t2" },
  { tags: ["Sports"], id: "s1" },
  { tags: ["Peds"], id: "p1" },
], 3);
assert.equal(mixed.length, 3);
assert.equal(new Set(mixed.map((row) => specialtyStratum(row.tags))).size >= 2, true);

console.log("card-claim-deck-loader.test.ts: all assertions passed");
