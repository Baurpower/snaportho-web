import assert from "node:assert/strict";
import {
  ORTHOBULLETS_ENRICHMENT_CONTRACT,
  ORTHOBULLETS_ENRICHMENT_RUN_KEY,
  applyOrthobulletsSidecar,
  buildEnrichmentBrief,
  bulletsToHtml,
  canonicalOrthobulletsTopicUrl,
  fieldsFromSnapshot,
  isBlankResource,
  isPendingPacketFileName,
  overlayOrthobulletsFields,
  overlaysFromVerifiedPacket,
  pendingPacketFileName,
  sealEnrichmentPacket,
  searchQueryForCard,
  validateBullets,
  type OrthobulletsEnrichmentPacket,
  type OrthobulletsEnrichmentSidecar,
} from "./orthobullets-enrichment-packet.ts";

assert.equal(isPendingPacketFileName("cohort-000001-agent-01-pending.json"), true);
assert.equal(isPendingPacketFileName("../escape-pending.json"), false);
assert.equal(pendingPacketFileName("cohort-000001-agent-01"), "cohort-000001-agent-01-pending.json");

assert.equal(isBlankResource(""), true);
assert.equal(isBlankResource("   "), true);
assert.equal(
  isBlankResource("Curated Orthobullets-aligned teaching bullets (original/edited text you own)."),
  true,
);
assert.equal(isBlankResource("<ul><li>Cancellous bone has high turnover.</li></ul>"), false);

assert.deepEqual(
  fieldsFromSnapshot({ Text: "Hello", Extra: "World" }),
  { Text: "Hello", Extra: "World" },
);
assert.deepEqual(
  fieldsFromSnapshot([{ name: "Text", rawValue: "{{c1::cancellous}} bone" }]),
  { Text: "{{c1::cancellous}} bone" },
);

const topic = canonicalOrthobulletsTopicUrl(
  "https://www.orthobullets.com/basic-science/9008/osteoporosis?hideLeftMenu=true",
);
assert.equal(topic.ok, true);
if (topic.ok) {
  assert.equal(topic.canonical, "https://www.orthobullets.com/basic-science/9008/osteoporosis");
}
assert.equal(canonicalOrthobulletsTopicUrl("https://www.orthobullets.com/question/123").ok, false);
assert.equal(canonicalOrthobulletsTopicUrl("http://www.orthobullets.com/trauma/1038/itfx").ok, false);
assert.equal(canonicalOrthobulletsTopicUrl("https://pubmed.ncbi.nlm.nih.gov/1").ok, false);

const bullets = [
  "Osteoporosis preferentially weakens cancellous bone because of its high-turnover trabecular surface.",
  "That is why vertebral bodies, femoral neck, distal radius, and tibial plateau fracture first.",
];
assert.deepEqual(validateBullets(bullets, { front: "Osteoporosis is common in cancellous bone", extra: "" }), []);
assert.ok(validateBullets(["too short", "also"], { front: "x", extra: "" }).includes("bullet_length:0"));
assert.ok(
  validateBullets(
    [bullets[0], bullets[0]],
    { front: "unrelated cloze about ACL graft choice", extra: "" },
  ).includes("bullet_duplicate:1"),
);
assert.ok(
  validateBullets(
    [
      "Osteoporosis is common in cancellous bone because of high turnover",
      "A second original teaching point about fracture sites",
    ],
    { front: "Osteoporosis is common in cancellous bone because of high turnover", extra: "" },
  ).some((error) => error.startsWith("bullet_copied_from_card")),
);

assert.equal(
  bulletsToHtml(["Alpha <script>", "Beta"]),
  "<ul><li>Alpha &lt;script&gt;</li><li>Beta</li></ul>",
);

const card = {
  noteId: "n1",
  noteVersionId: "nv1",
  stableGuid: "guid-a",
  contentChecksum: "aa".repeat(32),
  deckPath: "SnapOrtho::Basic Science",
  front: "Osteoporosis is common in cancellous bone.",
  extra: "Vertebral bodies and femoral neck fail first.",
  governedTags: ["SnapOrtho::Anatomy::Bone"],
  currentOrthobullets: "",
  currentOrthobulletsLink: "",
  searchQuery: searchQueryForCard("Osteoporosis is common in cancellous bone.", "SnapOrtho::Basic Science"),
};
assert.match(card.searchQuery, /Basic Science/);

const packet = sealEnrichmentPacket({
  schemaVersion: ORTHOBULLETS_ENRICHMENT_CONTRACT,
  runKey: ORTHOBULLETS_ENRICHMENT_RUN_KEY,
  sourceReleaseId: "rel",
  sourceReleaseVersion: "0.0.4",
  batchKey: "cohort-000001-agent-01",
  instructions: [],
  cards: [card],
} satisfies Omit<OrthobulletsEnrichmentPacket, "inputChecksum">);
assert.equal(packet.inputChecksum.length, 64);

const filledSidecar: OrthobulletsEnrichmentSidecar = {
  batchKey: packet.batchKey,
  inputChecksum: packet.inputChecksum,
  reviewer: { provider: "xai", model: "grok-4.6", reviewedAt: "2026-08-29T18:00:00.000Z" },
  cards: [{
    noteVersionId: "nv1",
    enrichmentStatus: "filled",
    topicTitle: "Osteoporosis",
    orthobulletsLink: "https://www.orthobullets.com/basic-science/9008/osteoporosis",
    bullets,
    pageEvidence: "Topic heading Osteoporosis; cancellous bone is high turnover.",
  }],
};
const reviewed = applyOrthobulletsSidecar(packet, filledSidecar);
assert.equal(reviewed.cards[0].enrichmentStatus, "filled");
assert.equal(reviewed.cards[0].orthobulletsLink, "https://www.orthobullets.com/basic-science/9008/osteoporosis");
assert.equal(reviewed.inputChecksum, packet.inputChecksum);

const overlays = overlaysFromVerifiedPacket(reviewed);
assert.equal(overlays.length, 1);
const patched = overlayOrthobulletsFields(
  { Text: card.front, Extra: card.extra },
  overlays[0],
);
assert.equal(patched.Text, card.front);
assert.match(patched.Orthobullets, /<ul><li>/);
assert.equal(patched.Orthobullets_Link, overlays[0].orthobulletsLink);

const skipped = applyOrthobulletsSidecar(packet, {
  ...filledSidecar,
  cards: [{
    noteVersionId: "nv1",
    enrichmentStatus: "skipped",
    skipReason: "no_matching_topic",
  }],
});
assert.equal(skipped.cards[0].enrichmentStatus, "skipped");
assert.equal(overlaysFromVerifiedPacket(skipped).length, 0);

assert.throws(
  () => applyOrthobulletsSidecar(packet, { ...filledSidecar, inputChecksum: "deadbeef" }),
  /sidecar_checksum_mismatch/,
);
assert.throws(
  () => applyOrthobulletsSidecar(packet, {
    ...filledSidecar,
    cards: [{
      noteVersionId: "nv1",
      enrichmentStatus: "filled",
      topicTitle: "Q",
      orthobulletsLink: "https://www.orthobullets.com/question/1",
      bullets,
      pageEvidence: "not a topic page",
    }],
  }),
  /link_blocked_path/,
);

const brief = buildEnrichmentBrief(packet);
assert.equal(brief.cards[0].noteVersionId, "nv1");
assert.ok(brief.cards[0].front.includes("Osteoporosis"));

console.log("orthobullets-enrichment-packet tests passed");
