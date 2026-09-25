import assert from "node:assert/strict";

import {
  assessContextualSpecificity,
  runCardClaimFactory,
  type CardClaimFactoryCard,
} from "./card-claim-factory";
import {
  buildFactoryEvaluation,
  buildOntologyReviewPacket,
} from "./card-claim-factory-evaluation";
import { canonicalContentHash, type EntityIndexRow } from "./deck-semantic-mapping";

const FIXED_NOW = "2026-09-23T00:00:00.000Z";
const now = () => FIXED_NOW;

const id = (digit: string) =>
  `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;

function specific(
  preferredLabel: string,
  normalizedLabel: string,
  cardContextText: string,
): void {
  const result = assessContextualSpecificity({ preferredLabel, normalizedLabel, cardContextText });
  assert.equal(result.contextuallySpecific, true, `${preferredLabel}: expected specific`);
  assert.deepEqual(result.specificityReasons, []);
  assert.equal(result.specificityAnchor, null);
}

function uncertain(preferredLabel: string, normalizedLabel: string, cardContextText: string): void {
  const result = assessContextualSpecificity({ preferredLabel, normalizedLabel, cardContextText });
  assert.equal(result.contextuallySpecific, "uncertain", `${preferredLabel}: expected uncertain`);
  assert.deepEqual(result.specificityReasons, []);
}

// Atomic single-token labels are inherently specific: nothing compositional
// for the card to narrow.
specific("Pseudomonas", "pseudomonas", "What organism causes this infection? Pseudomonas.");
specific("Iliohypogastric", "iliohypogastric", "Which nerve is at risk? Iliohypogastric.");

// Intrinsic markers (digits, slashes, hyphens) anchor specificity.
specific("L4/L5", "l4/l5", "Herniations occur at L4/L5 and L5/S1 levels with leg pain.");
specific("cup-cage reconstruction", "cup-cage reconstruction", "The cup-cage reconstruction requires careful evaluation.");
specific("volar/dorsal interossei", "volar/dorsal interossei", "Decompress the volar/dorsal interossei now.");
specific("MRI", "mri", "Next step? MRI.");

// A short plain label on a card teaching a clearly narrower concept is blocked.
{
  const result = assessContextualSpecificity({
    preferredLabel: "surgical margins",
    normalizedLabel: "surgical margins",
    cardContextText: "Local recurrence of primary malignant bone tumors are most directly related to surgical margins.",
  });
  assert.equal(result.contextuallySpecific, false);
  assert.deepEqual(result.specificityReasons, ["context_insufficient_for_specific_entity"]);
  assert.equal(result.specificityAnchor, "primary malignant bone tumors");
}

// A short plain label whose question stays at the same level of generality
// is left alone, never aggressively blocked.
uncertain(
  "Lateral column",
  "lateral column",
  "Which column of the foot should not be fused ? Lateral column",
);
uncertain(
  "traction view",
  "traction view",
  "The traction view requires careful evaluation in scenario 1.",
);

// Deterministic: same input, same verdict.
assert.deepEqual(
  assessContextualSpecificity({
    preferredLabel: "surgical margins",
    normalizedLabel: "surgical margins",
    cardContextText: "Local recurrence of primary malignant bone tumors are most directly related to surgical margins.",
  }),
  assessContextualSpecificity({
    preferredLabel: "surgical margins",
    normalizedLabel: "surgical margins",
    cardContextText: "Local recurrence of primary malignant bone tumors are most directly related to surgical margins.",
  }),
);

// --- Factory integration: blocked candidates keep claims, lose links ------

const entities: EntityIndexRow[] = [];

function makeCard(input: {
  digit: string;
  versionDigit: string;
  ordinal: number;
  noteGuid: string;
  text: string;
}): CardClaimFactoryCard {
  const fields = [
    { name: "Text", rawValue: input.text, plainText: input.text.replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/gi, "$1") },
    { name: "Extra", rawValue: "", plainText: "" },
  ];
  const seed = { fields, tags: ["recon"], cardOrdinal: input.ordinal };
  return {
    canonicalCardId: id(input.digit),
    canonicalCardVersionId: id(input.versionDigit),
    noteGuid: input.noteGuid,
    cardOrdinal: input.ordinal,
    contentHash: canonicalContentHash(seed),
    tags: seed.tags,
    fields,
    active: true,
    currentVersion: true,
    inclusionStatus: "included",
  };
}

const cards = [
  makeCard({
    digit: "1",
    versionDigit: "2",
    ordinal: 0,
    noteGuid: "guid-spec-generic",
    text: "Local recurrence of primary malignant bone tumors is related to {{c1::surgical margins}}.",
  }),
  makeCard({
    digit: "3",
    versionDigit: "4",
    ordinal: 0,
    noteGuid: "guid-spec-ok",
    text: "Which column of the foot should not be fused? {{c1::Lateral column}}",
  }),
];

const run = runCardClaimFactory({ cards, entities, now });

// Both cards still produce claims.
assert.equal(run.proposedClaims.length, 2);

// The generic label is blocked: unresolved target, no teaches link, specific reason.
const blockedAssignment = run.assignments.find((row) => row.noteGuid === "guid-spec-generic")!;
assert.equal(blockedAssignment.queue, "missing_entity");
assert.ok(blockedAssignment.reasonCodes.includes("context_insufficient_for_specific_entity"));
assert.equal(
  run.autoApprovedLinks.some((link) => link.canonicalCardId === blockedAssignment.canonicalCardId),
  false,
);
const blockedClaim = run.proposedClaims.find((row) => row.fingerprintHash === blockedAssignment.fingerprintHash)!;
assert.ok(blockedClaim);
assert.equal(blockedClaim.entityTargetType, "unresolved");

// The same-level label still fills and auto-approves.
const okAssignment = run.assignments.find((row) => row.noteGuid === "guid-spec-ok")!;
assert.equal(okAssignment.queue, "auto_approved");
assert.ok(run.proposedEntities.some((entity) => entity.normalizedLabel === "lateral column"));

assert.equal(run.metrics.contextSpecificityBlocked, 1);
const blockedEntity = run.proposedEntities.find((entity) => entity.normalizedLabel === "lateral column")!;
assert.equal(blockedEntity.contextuallySpecific, "uncertain");
assert.deepEqual(blockedEntity.specificityReasons, []);

// Evaluation + review packet surface the specificity diagnostic.
const evaluation = buildFactoryEvaluation(run, { mode: "fixture", entities, generatedAt: FIXED_NOW });
assert.equal(evaluation.blockedProposals.length, 1);
const blocked = evaluation.blockedProposals[0]!;
assert.equal(blocked.contextuallySpecific, false);
assert.deepEqual(blocked.specificityReasons, ["context_insufficient_for_specific_entity"]);
assert.equal(blocked.specificityAnchor, "primary malignant bone tumors");
assert.ok(blocked.claimId);
const packet = buildOntologyReviewPacket(evaluation);
assert.equal(packet.blockedCandidates.length, 1);
assert.equal(packet.blockedCandidates[0]!.recommendedAction, "needs_review");
assert.equal(packet.blockedCandidates[0]!.contextuallySpecific, false);
assert.equal(packet.blockedCandidates[0]!.specificityAnchor, "primary malignant bone tumors");
assert.equal(packet.items[0]!.contextuallySpecific, "uncertain");

console.log("card-claim-factory-context-specificity.test.ts: all assertions passed");
