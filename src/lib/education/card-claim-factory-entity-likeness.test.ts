import assert from "node:assert/strict";

import {
  assessEntityLikeness,
  normalizeProposedLabel,
  refineOntologyEntityType,
  runCardClaimFactory,
  type CardClaimFactoryCard,
  type EntityLikenessReason,
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

function like(raw: string): { entityLike: boolean; reasons: EntityLikenessReason[] } {
  const { preferredLabel, normalizedLabel } = normalizeProposedLabel(raw);
  return assessEntityLikeness({ preferredLabel, normalizedLabel });
}

function passes(raw: string): void {
  const result = like(raw);
  assert.equal(result.entityLike, true, `${raw}: expected pass, got ${result.reasons.join(",")}`);
  assert.deepEqual(result.reasons, []);
}

function blocked(raw: string, ...reasons: EntityLikenessReason[]): void {
  const result = like(raw);
  assert.equal(result.entityLike, false, `${raw}: expected block`);
  for (const reason of reasons) {
    assert.ok(result.reasons.includes(reason), `${raw}: missing ${reason} in ${result.reasons.join(",")}`);
  }
}

// Valid single-word medical nouns/entities keep passing.
passes("trunnionosis");
passes("Pseudomonas");
passes("Iliohypogastric");
passes("L4/L5");

// Valid multi-word entities keep passing.
passes("cup-cage reconstruction");
passes("Judet views");
passes("traction view");
passes("dual-mobility articulation");
passes("extensor mechanism lag");
passes("tibial tubercle transfer");
passes("glenoid bone loss");
passes("quadriceps snip");
passes("patellar clunk syndrome");
passes("heterotopic ossification");
passes("stress shielding");
passes("periprosthetic lucency");
passes("volar/dorsal interossei");
passes("lateral column");

assert.equal(refineOntologyEntityType("condition", "lateral femoral cutaneous nerve"), "anatomy_structure");
assert.equal(refineOntologyEntityType("imaging_finding", "tonnis"), "classification_system");
assert.equal(refineOntologyEntityType("complication", "infection"), "condition");

// Recognized acronyms keep passing.
passes("MRI");

// Valid longer medical concepts still pass (under the clause word-count cap).
passes("anterior cruciate ligament tear");
passes("proximal humerus fracture");

// Placeholders are blocked without naming any specific live answer.
blocked("EXT1", "placeholder_like");
blocked("FIELD2", "placeholder_like");
blocked("table 2", "placeholder_like");

// Bare numbers and ordinal fragments are blocked.
blocked("6", "numeric_or_ordinal_fragment");
blocked("4th and 5th", "numeric_or_ordinal_fragment");
blocked("2nd", "numeric_or_ordinal_fragment");

// Generic verbs and generic standalone terms are blocked (single word only).
blocked("inhibit", "generic_term_insufficient_context");
blocked("increase", "generic_term_insufficient_context");
blocked("flexion", "generic_term_insufficient_context");
blocked("Reconstruction", "generic_term_insufficient_context");
blocked("No difference", "response_fragment");
blocked("Not necessarily", "response_fragment");
blocked("higher", "response_fragment");
blocked("dark", "response_fragment");
blocked("anterior", "directional_fragment");
blocked("Boys", "demographic_fragment");
blocked("5 cm distal", "measurement_or_location_fragment");
blocked("20-30°", "measurement_or_location_fragment");
blocked("Simple dislocations occur without fractures", "clause_like_answer");
// ...while multi-word concepts containing those words still pass.
passes("cup-cage reconstruction");
passes("knee flexion contracture");

// Long clause-like answers are blocked.
blocked("Proximally as avulsions off the lateral epicondyle", "clause_like_answer");
blocked(
  "The ligaments of the elbow from lateral to medial LUCL --> Capsule --> MUCL",
  "clause_like_answer",
  "list_fragment",
);

// Malformed structure is blocked.
blocked("Ulnohumeral articulation MCL (esp. anterior bundle) LCL (esp. LUCL", "malformed_label");
blocked("fracture of the {{c1::femur", "malformed_label");

// List-like answers are blocked.
blocked("humerus, radius, ulna", "list_fragment");

// Deterministic: same input, same verdict.
assert.deepEqual(like("EXT1"), like("EXT1"));
assert.deepEqual(like("cup-cage reconstruction"), like("cup-cage reconstruction"));

// --- Factory integration: blocked candidates still produce claims ---------

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
    noteGuid: "guid-like-valid",
    text: "The preferred reconstruction is {{c1::cup-cage reconstruction}}.",
  }),
  makeCard({
    digit: "3",
    versionDigit: "4",
    ordinal: 0,
    noteGuid: "guid-like-placeholder",
    text: "The field labeled {{c1::EXT1}} is shown.",
  }),
  makeCard({
    digit: "5",
    versionDigit: "6",
    ordinal: 0,
    noteGuid: "guid-like-verb",
    text: "Osteoclasts {{c1::inhibit}} bone formation here.",
  }),
];

const run = runCardClaimFactory({ cards, entities, now });

// All cards still produce claims.
assert.equal(run.proposedClaims.length, 3);
assert.equal(run.metrics.proposedClaims, 3);

// The valid card fills and auto-approves as before.
const validAssignment = run.assignments.find((row) => row.noteGuid === "guid-like-valid")!;
assert.equal(validAssignment.queue, "auto_approved");
assert.ok(run.proposedEntities.some((entity) => entity.normalizedLabel === "cup-cage reconstruction"));

// Blocked candidates: unresolved target, no teaches link, specific reasons.
for (const [noteGuid, reason] of [
  ["guid-like-placeholder", "placeholder_like"],
  ["guid-like-verb", "generic_term_insufficient_context"],
] as const) {
  const assignment = run.assignments.find((row) => row.noteGuid === noteGuid)!;
  assert.equal(assignment.queue, "missing_entity");
  assert.ok(assignment.reasonCodes.includes(reason), `${noteGuid}: ${assignment.reasonCodes.join(",")}`);
  assert.equal(run.autoApprovedLinks.some((link) => link.canonicalCardId === assignment.canonicalCardId), false);
  const claim = run.proposedClaims.find((row) => row.fingerprintHash === assignment.fingerprintHash)!;
  assert.ok(claim);
  assert.equal(claim.entityTargetType, "unresolved");
}

assert.equal(run.metrics.entityLikenessBlocked, 2);
assert.equal(run.metrics.openMissingEntity, 2);
assert.ok(run.gaps.every((gap) => gap.disposition === "open" || gap.claimId !== null));
const blockedGaps = run.gaps.filter((gap) =>
  gap.reasonCodes.includes("placeholder_like") || gap.reasonCodes.includes("generic_term_insufficient_context"),
);
assert.equal(blockedGaps.length, 2);
for (const gap of blockedGaps) {
  const assessment = (gap.metadata as Record<string, unknown>).proposalAssessment as Record<string, unknown>;
  assert.ok(assessment);
  assert.equal(assessment.entityLike, false);
  assert.ok(Array.isArray(assessment.entityLikenessReasons));
}

// Evaluation + review packet surface the likeness diagnostic.
const evaluation = buildFactoryEvaluation(run, { mode: "fixture", entities, generatedAt: FIXED_NOW });
assert.equal(evaluation.blockedProposals.length, 2);
for (const blocked of evaluation.blockedProposals) {
  assert.equal(blocked.entityLike, false);
  assert.ok(blocked.entityLikenessReasons.length >= 1);
  assert.ok(blocked.claimId);
  assert.ok(blocked.rawClozeAnswer.length > 0);
}
for (const entity of evaluation.proposedEntities) {
  assert.equal(entity.entityLike, true);
  assert.deepEqual(entity.entityLikenessReasons, []);
}
const packet = buildOntologyReviewPacket(evaluation);
assert.equal(packet.blockedCandidates.length, 2);
for (const candidate of packet.blockedCandidates) {
  assert.equal(candidate.recommendedAction, "needs_review");
  assert.equal(candidate.entityLike, false);
}
for (const item of packet.items) {
  assert.equal(item.entityLike, true);
}

console.log("card-claim-factory-entity-likeness.test.ts: all assertions passed");
