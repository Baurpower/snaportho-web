import assert from "node:assert/strict";
import { assembleDeckSyncManifest } from "./anki-deck-manifest-assemble.ts";

const versionId = "11111111-1111-4111-8111-111111111111";
const manifest = assembleDeckSyncManifest({
  release: {
    id: "22222222-2222-4222-8222-222222222222",
    release_key: "master",
    release_version: "1",
    status: "published",
    manifest_checksum: "a".repeat(64),
    minimum_addon_version: "0.9.5",
  },
  members: [{
    canonical_card_id: "33333333-3333-4333-8333-333333333333",
    canonical_card_version_id: versionId,
    note_guid: "guid",
    card_ordinal: 0,
    content_hash: "b".repeat(64),
    deck_path: "SnapOrtho",
    ordering_key: "1",
    inclusion_status: "included",
  }],
  versions: [{
    id: versionId,
    canonical_card_id: "33333333-3333-4333-8333-333333333333",
    field_snapshot: [{ name: "Front", value: "Question" }, { name: "Back", value: "Answer" }],
    tag_snapshot: ["SnapOrtho::Legacy::Old", "source::keep"],
  }],
  mappings: [],
  media: [],
  renderedTags: [{
    canonical_card_version_id: versionId,
    rendered_tags: [
      "SnapOrtho::Anatomy::Achilles_Tendon",
      "SnapOrtho::Workflow::Needs_Metadata_Review",
    ],
  }],
});

assert.deepEqual(manifest.cards[0].centralTags, [
  "SnapOrtho::Anatomy::Achilles_Tendon",
  "SnapOrtho::Workflow::Needs_Metadata_Review",
]);
assert.notEqual(manifest.cards[0].contentHash, "b".repeat(64));
console.log("anki-deck-manifest-assemble.test.ts: all assertions passed");
