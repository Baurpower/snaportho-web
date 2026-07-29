import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
// Static contract test for the deck-update endpoints (version gate, media, sync-ack, queue, bootstrap).
// Mirrors anki-deck-sync-api.test.ts: reads the route sources and asserts safety + shape.
const root = path.resolve(import.meta.dirname, "../../..");
const read = (f: string) => readFileSync(path.join(root, f), "utf8");
const plan = read("src/app/api/anki/deck/sync/plan/route.ts");
const media = read("src/app/api/anki/deck/releases/[id]/media/[sha256]/route.ts");
const ack = read("src/app/api/anki/deck/sync/ack/route.ts");
const queue = read("src/app/api/anki/reviewer/queue/route.ts");
const bootstrap = read(
  "src/app/api/anki/deck/releases/[id]/artifact/bootstrap_apkg/route.ts",
);
const gate = read("src/lib/education/deck-addon-version.ts");
const assemble = read("src/lib/education/anki-deck-manifest-assemble.ts");
const deckLib = read("src/app/api/anki/deck/_lib.ts");
const notetype = read("src/lib/education/anki-bootstrap-notetype.ts");
const awsStorage = read("src/lib/education/anki-aws-storage.ts");
const awsMigration = read(
  "supabase/migrations/20260726_180000_anki_aws_media_storage.sql",
);

// Version gate: sync/plan blocks stale add-ons with 426 upgrade_required.
for (const x of [/addonVersionAtLeast/, /426/, /upgrade_required/]) assert.match(plan, x);
assert.match(gate, /export function addonVersionAtLeast/);

// Media: signed URL, published-release only, never serves excluded assets, verifies hash format.
for (const x of [/createSignedUrl/, /"published"/, /license_status/, /excluded/, /\[a-f0-9\]\{64\}/])
  assert.match(media, x);
// Media + queue + bootstrap are read-only: no canonical mutation.
for (const source of [media, queue, bootstrap])
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(/);

// Sync-ack: append-only ledger insert into the acknowledgements table with device identity.
for (const x of [/anki_deck_sync_acknowledgements/, /\.insert\(/, /device_token_id/, /user_id/])
  assert.match(ack, x);
// Ack must not touch canonical content tables.
assert.doesNotMatch(ack, /canonical_cards|canonical_card_versions|\.update\(/);

// Queue: backed by the missing-eligible-links view, returns the add-on's card shape.
for (const x of [/v_anki_deck_release_cards_missing_eligible_links/, /noteGuid/, /cardOrdinal/, /reason/])
  assert.match(queue, x);

// Bootstrap artifact: published release + bootstrap_apkg artifact + signed URL.
for (const x of [
  /bootstrap_apkg/,
  /anki_deck_release_artifacts/,
  /createSignedUrl/,
  /"published"/,
  /deviceAuth/,
  /checksum/,
])
  assert.match(bootstrap, x);
assert.doesNotMatch(bootstrap, /canonical_cards|canonical_card_versions/);
for (const source of [media, bootstrap]) {
  assert.match(source, /AWS_STORAGE_PROVIDER/);
  assert.match(source, /signAnkiAwsDownload/);
  assert.match(source, /describeAnkiAwsDeliveryError/);
  assert.match(source, /status: 503/);
}
for (const x of [
  /cloudfront-signer/,
  /HeadObjectCommand/,
  /@aws-sdk\/lib-storage/,
  /cloudfront_config_missing/,
  /cloudfront_private_key_invalid/,
  /cloudfront_signing_failed/,
])
  assert.match(awsStorage, x);
for (const x of [/pageSize = 1000/, /\.range\(/, /\.order\("logical_filename"\)/])
  assert.match(read("src/app/api/anki/deck/_lib.ts"), x);
for (const x of [/storage_provider/, /aws_s3/, /delivery_metadata/])
  assert.match(awsMigration, x);

// Shared manifest assembly + note-type contract exist for the builder path.
assert.match(assemble, /export function assembleDeckSyncManifest/);
for (const source of [
  /rendered_anki_tag_manifests/,
  /rendered_anki_tag_manifest_cards/,
  /renderedTags/,
]) assert.match(deckLib, source);
assert.match(assemble, /renderedTagsByVersion/);
assert.match(notetype, /SnapOrtho Master/);
assert.match(notetype, /SnapOrtho_Installed_Hash/);

console.log("anki-deck-update-api.test.ts: all assertions passed");
