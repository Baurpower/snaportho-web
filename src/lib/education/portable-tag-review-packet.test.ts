import assert from "node:assert/strict";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import {
  GROK_TAG_REVIEW_RUN_KEY,
  PORTABLE_TAG_REVIEW_PACKET_VERSION,
  isPendingPacketFileName,
  joinOfficialNotesToReleaseCards,
  pendingPacketFileName,
  portablePacketChecksumInput,
  reviewedPacketFileName,
  sealPortablePacket,
  verifiedPacketFileName,
  type PortableTagReviewPacket,
} from "./portable-tag-review-packet.ts";

const notes = [
  { noteId: "n1", noteVersionId: "nv1", stableGuid: "guid-a", contentChecksum: "aa" },
  { noteId: "n2", noteVersionId: "nv2", stableGuid: "guid-b", contentChecksum: "bb" },
  { noteId: "n3", noteVersionId: "nv3", stableGuid: "guid-missing", contentChecksum: "cc" },
];
const cards = [
  { noteGuid: "guid-a", canonicalCardId: "c1", canonicalCardVersionId: "v1", contentHash: "h1" },
  { noteGuid: "guid-b", canonicalCardId: "c2", canonicalCardVersionId: "v2", contentHash: "h2" },
  { noteGuid: "guid-b", canonicalCardId: "c2b", canonicalCardVersionId: "v2b", contentHash: "h2b" },
];
const joined = joinOfficialNotesToReleaseCards(notes, cards);
assert.equal(joined.joined.length, 2);
assert.deepEqual(joined.missingGuids, ["guid-missing"]);
assert.deepEqual(joined.duplicateGuids, ["guid-b"]);
assert.equal(joined.joined[0].canonicalCardVersionId, "v1");
assert.equal(joined.joined[1].canonicalCardVersionId, "v2");

assert.equal(pendingPacketFileName("cohort-000001-agent-01"), "cohort-000001-agent-01-pending.json");
assert.equal(reviewedPacketFileName("cohort-000001-agent-01"), "cohort-000001-agent-01-reviewed.json");
assert.equal(verifiedPacketFileName("cohort-000001-agent-01"), "cohort-000001-agent-01-verified.json");
assert.equal(isPendingPacketFileName("cohort-000001-agent-01-pending.json"), true);
assert.equal(isPendingPacketFileName("../escape-pending.json"), false);
assert.equal(isPendingPacketFileName("cohort-000001-agent-01.json"), false);

const emptyCandidates = {
  anatomy: [],
  diagnosis: [],
  treatment: [],
  specialty: [],
};
const baseCard = {
  canonicalCardId: "c1",
  canonicalCardVersionId: "v1",
  contentHash: "h1",
  front: "What is the ACL?",
  back: "Anterior cruciate ligament",
  deckPath: "SnapOrtho::Sports",
  existingTags: ["ACL"],
  candidates: emptyCandidates,
  assertions: [],
};
const legacyPacket = {
  schemaVersion: PORTABLE_TAG_REVIEW_PACKET_VERSION,
  runId: "run",
  runKey: GROK_TAG_REVIEW_RUN_KEY,
  batchId: "batch",
  batchKey: "cohort-000001-agent-01",
  leaseOwner: "lease",
  taxonomyVersion: "0.1.0",
  taxonomyVersionId: "tax",
  taxonomyLimit: 20,
  instructions: [],
  cards: [baseCard],
} satisfies Omit<PortableTagReviewPacket, "inputChecksum">;
const sealedLegacy = sealPortablePacket(legacyPacket);
assert.equal(sealedLegacy.inputChecksum.length, 64);
assert.deepEqual(
  portablePacketChecksumInput(sealedLegacy).cards[0],
  {
    canonicalCardId: "c1",
    canonicalCardVersionId: "v1",
    contentHash: "h1",
    front: "What is the ACL?",
    back: "Anterior cruciate ligament",
    deckPath: "SnapOrtho::Sports",
    existingTags: ["ACL"],
    candidates: emptyCandidates,
  },
);

const officialPacket = {
  ...legacyPacket,
  cards: [{
    ...baseCard,
    noteId: "n1",
    noteVersionId: "nv1",
    stableGuid: "guid-a",
    priorAssertions: [{
      facet: "anatomy",
      termId: "term-1",
      preferredLabel: "ACL",
      confidence: 0.99,
      decision: "accepted",
    }],
  }],
} satisfies Omit<PortableTagReviewPacket, "inputChecksum">;
const sealedOfficial = sealPortablePacket(officialPacket);
assert.notEqual(sealedOfficial.inputChecksum, sealedLegacy.inputChecksum);
assert.equal(
  (portablePacketChecksumInput(sealedOfficial).cards[0] as { noteId?: string }).noteId,
  "n1",
);
assert.equal(
  "priorAssertions" in portablePacketChecksumInput(sealedOfficial).cards[0],
  false,
);

const mutated = structuredClone(sealedOfficial);
mutated.cards[0].front = "changed";
assert.notEqual(
  sealPortablePacket(mutated).inputChecksum,
  sealedOfficial.inputChecksum,
);

console.log("portable-tag-review-packet.test.ts: all assertions passed");
