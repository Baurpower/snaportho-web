import assert from "node:assert/strict";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import {
  MILLERS_ENRICHMENT_CONTRACT,
  MILLERS_ENRICHMENT_RUN_KEY,
  MILLERS_FIELD,
  applyMillersSidecar,
  buildMillersHtml,
  citationText,
  fieldsFromSnapshot,
  isBlankResource,
  isPendingPacketFileName,
  isReviewedPacketFileName,
  overlaysFromReviewedPacket,
  pendingPacketFileName,
  searchQueryForCard,
  sealEnrichmentPacket,
  validateFilledCard,
  type MillersEnrichmentCard,
  type MillersEnrichmentPacket,
} from "./millers-enrichment-packet.ts";

// --- filenames -------------------------------------------------------------
assert.equal(pendingPacketFileName("0.0.8-2026-09-01"), "millers-0.0.8-2026-09-01-pending.json");
assert.equal(isPendingPacketFileName("millers-x-pending.json"), true);
assert.equal(isPendingPacketFileName("../escape-pending.json"), false);
assert.equal(isReviewedPacketFileName("millers-x-reviewed.json"), true);
assert.equal(isReviewedPacketFileName("millers-x-pending.json"), false);

// --- blank detection -------------------------------------------------------
assert.equal(isBlankResource(""), true);
assert.equal(isBlankResource("<div>&nbsp; </div>"), true);
assert.equal(isBlankResource("<p>content</p>"), false);

// --- field snapshot normalization -----------------------------------------
const fields = fieldsFromSnapshot([{ name: "Text", rawValue: "Q" }, { name: "Millers", value: "" }]);
assert.equal(fields.Text, "Q");
assert.equal(MILLERS_FIELD, "Millers");
assert.equal(fields.Millers, "");

// --- query building --------------------------------------------------------
const q = searchQueryForCard("ACL graft choice", "hamstring vs BTB", "SnapOrtho::Sports::Knee");
assert.ok(q.includes("ACL graft choice"));
assert.ok(q.includes("Sports Knee"));
assert.ok(!q.includes("SnapOrtho"));

// --- citation + html -------------------------------------------------------
assert.equal(citationText(412), "Miller's Review of Orthopaedics, 8th ed. — p. 412");
assert.equal(citationText(412, 415), "Miller's Review of Orthopaedics, 8th ed. — pp. 412–415");
const html = buildMillersHtml("Bone remodels via coupled resorption & formation.", 42);
assert.ok(html.includes("<em>Miller&#39;s Review of Orthopaedics, 8th ed. — p. 42</em>".replace("&#39;", "'")) || html.includes("p. 42"));
assert.ok(html.includes("Bone remodels"));
assert.ok(!html.includes("<script"));

// --- validation ------------------------------------------------------------
const goodCard: MillersEnrichmentCard = {
  noteId: "n1", noteVersionId: "v1", stableGuid: "g1", contentChecksum: "c1",
  deckPath: "SnapOrtho::Basic", front: "bone", extra: "", governedTags: [],
  currentMillers: "", searchQuery: "bone", candidates: [],
  enrichmentStatus: "filled", summary: "Bone is a dynamic tissue that remodels continuously through life.", printedPage: 42,
};
assert.deepEqual(validateFilledCard(goodCard), { ok: true });
assert.equal(validateFilledCard({ ...goodCard, summary: "too short" }).ok, false);
assert.equal(validateFilledCard({ ...goodCard, printedPage: undefined }).ok, false);
assert.equal(validateFilledCard({ ...goodCard, printedPage: 42, printedPageEnd: 40 }).ok, false);

// --- overlay extraction (skips non-filled, validates filled) ---------------
const packet: MillersEnrichmentPacket = {
  schemaVersion: MILLERS_ENRICHMENT_CONTRACT, runKey: MILLERS_ENRICHMENT_RUN_KEY,
  sourceReleaseId: "r1", sourceReleaseVersion: "0.0.8", corpusChecksum: "cc", batchKey: "b",
  inputChecksum: "x", instructions: [], cards: [
    goodCard,
    { ...goodCard, stableGuid: "g2", enrichmentStatus: "skipped", skipReason: "no_matching_content" },
  ],
};
const overlays = overlaysFromReviewedPacket(packet);
assert.equal(overlays.length, 1);
assert.equal(overlays[0].stableGuid, "g1");
assert.ok(overlays[0].millers.includes("p. 42"));

// --- seal determinism (excludes generated output) --------------------------
const s1 = sealEnrichmentPacket({ ...packet, inputChecksum: undefined as any });
const s2 = sealEnrichmentPacket({ ...packet, inputChecksum: undefined as any, cards: packet.cards.map((c) => ({ ...c, summary: "different prose entirely here now" })) });
assert.equal(s1.inputChecksum, s2.inputChecksum, "checksum must ignore generated summary");

// --- sidecar apply ---------------------------------------------------------
const sealed = sealEnrichmentPacket({
  schemaVersion: MILLERS_ENRICHMENT_CONTRACT, runKey: MILLERS_ENRICHMENT_RUN_KEY,
  sourceReleaseId: "r1", sourceReleaseVersion: "0.0.8", corpusChecksum: "cc", batchKey: "b1",
  instructions: [], cards: [
    { noteId: "n1", noteVersionId: "v1", stableGuid: "g1", contentChecksum: "c1", deckPath: "SnapOrtho::Basic",
      front: "bone", extra: "", governedTags: [], currentMillers: "", searchQuery: "bone",
      candidates: [{ sectionPath: "Basic › Bone", printedPage: 42, pdfPage: 60, score: 1, snippet: "s" }] },
    { noteId: "n2", noteVersionId: "v2", stableGuid: "g2", contentChecksum: "c2", deckPath: "SnapOrtho::Basic",
      front: "muscle", extra: "", governedTags: [], currentMillers: "", searchQuery: "muscle",
      candidates: [{ sectionPath: "Basic › Muscle", printedPage: 57, pdfPage: 75, score: 1, snippet: "s" }] },
  ],
});
const sidecar = {
  batchKey: "b1", inputChecksum: sealed.inputChecksum,
  operator: { provider: "claude-code", model: "opus-4.8", generatedAt: new Date().toISOString() },
  cards: [
    { stableGuid: "g1", status: "filled" as const, summary: "Bone is a living tissue that continually remodels.", printedPage: 42 },
    { stableGuid: "g2", status: "skipped" as const, skipReason: "no_matching_content" as const },
  ],
};
const applied = applyMillersSidecar(sealed, sidecar);
assert.equal(applied.cards[0].enrichmentStatus, "filled");
assert.equal(applied.cards[1].enrichmentStatus, "skipped");
assert.equal(applied.generator?.provider, "claude-code");
// invented page (not in candidates) must be rejected
assert.throws(() => applyMillersSidecar(sealed, { ...sidecar, cards: [
  { stableGuid: "g1", status: "filled" as const, summary: "Bone is a living tissue that continually remodels.", printedPage: 500 },
  { stableGuid: "g2", status: "skipped" as const, skipReason: "no_matching_content" as const },
] }), /sidecar_page_not_in_candidates/);
// wrong checksum rejected
assert.throws(() => applyMillersSidecar(sealed, { ...sidecar, inputChecksum: "nope" }), /sidecar_checksum_mismatch/);

console.log("millers-enrichment-packet.test.ts OK");
