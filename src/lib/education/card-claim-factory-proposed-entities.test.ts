import assert from "node:assert/strict";

import {
  buildPromotionPacket,
  clozeAnswerMatchVariants,
  findShortAnswerExpansion,
  lookupCanonicalShortForm,
  normalizeProposedLabel,
  proposeOntologyEntity,
  resolveShortClozeAnswer,
  runCardClaimFactory,
  type CardClaimFactoryCard,
} from "./card-claim-factory";
import { canonicalContentHash, type EntityIndexRow } from "./deck-semantic-mapping";

const FIXED_NOW = "2026-09-23T00:00:00.000Z";
const now = () => FIXED_NOW;

const id = (digit: string) =>
  `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;

const entities: EntityIndexRow[] = [
  {
    id: id("3"),
    preferredLabel: "Pelvic discontinuity",
    normalizedLabel: "pelvic discontinuity",
    entityType: "condition",
    aliases: [],
    sourceAliases: [],
    active: true,
    lifecycleStatus: "canonical",
  },
  {
    id: id("5"),
    preferredLabel: "Anterior cruciate ligament",
    normalizedLabel: "anterior cruciate ligament",
    entityType: "anatomy_structure",
    aliases: ["ACL"],
    sourceAliases: [],
    active: true,
    lifecycleStatus: "canonical",
  },
  {
    id: id("6"),
    preferredLabel: "Deep vein thrombosis",
    normalizedLabel: "deep vein thrombosis",
    entityType: "condition",
    aliases: [],
    sourceAliases: [],
    active: true,
    lifecycleStatus: "canonical",
  },
];

function makeCard(input: {
  digit: string;
  versionDigit: string;
  ordinal: number;
  noteGuid: string;
  text: string;
  extra?: string;
}): CardClaimFactoryCard {
  const fields = [
    { name: "Text", rawValue: input.text, plainText: input.text.replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/gi, "$1") },
    { name: "Extra", rawValue: input.extra ?? "", plainText: input.extra ?? "" },
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

// Canonical match: a known entity resolves canonically and creates nothing proposed.
{
  const card = makeCard({
    digit: "1",
    versionDigit: "2",
    ordinal: 0,
    noteGuid: "guid-canonical",
    text: "The {{c1::pelvic discontinuity}} requires careful evaluation in scenario 1.",
  });
  const run = runCardClaimFactory({ cards: [card], entities, now });
  assert.equal(run.assignments[0]?.queue, "auto_approved");
  assert.equal(run.proposedEntities.length, 0);
  assert.equal(run.metrics.canonicalEntityMatches, 1);
  assert.equal(run.metrics.proposedEntitiesCreated, 0);
  const claim = run.proposedClaims[0];
  assert.equal(claim?.entityTargetType, "canonical");
  assert.equal(claim?.primaryEntityId, id("3"));
  const link = run.autoApprovedLinks[0];
  assert.equal(link?.metadata.entityTargetType, "canonical");
  assert.equal(run.gaps.length, 0);
}

// Basic gap fill: unknown valid answer generates a structured proposed entity.
{
  const card = makeCard({
    digit: "1",
    versionDigit: "2",
    ordinal: 0,
    noteGuid: "guid-fill",
    text: "The {{c1::cup-cage reconstruction}} requires careful evaluation in scenario 2.",
  });
  const run = runCardClaimFactory({ cards: [card], entities, now });
  assert.equal(run.assignments[0]?.queue, "auto_approved");
  assert.ok(run.assignments[0]?.reasonCodes.includes("ontology_gap_filled"));
  assert.equal(run.proposedEntities.length, 1);
  const entity = run.proposedEntities[0]!;
  assert.equal(entity.source, "card_cloze");
  assert.equal(entity.rawClozeText, "cup-cage reconstruction");
  assert.equal(entity.normalizedLabel, "cup-cage reconstruction");
  assert.equal(entity.resolutionReason, "no_canonical_match");
  assert.equal(entity.status, "proposed");
  assert.equal(entity.confidence, 1);
  assert.equal(entity.generatedAt, FIXED_NOW);
  assert.deepEqual(entity.sourceCardIds, [card.canonicalCardId]);
  assert.ok(entity.canonicalMatchAttempts.length >= 1);
  assert.equal(run.metrics.proposedEntitiesCreated, 1);
  assert.equal(run.metrics.proposedEntitiesReused, 0);
  assert.equal(run.metrics.cardsAttachedToProposedEntities, 1);
  const claim = run.proposedClaims[0];
  assert.equal(claim?.entityTargetType, "proposed");
  assert.equal(claim?.primaryEntityId, entity.entityId);
}

// Parenthetical answers must check the full, outer, and acronym forms against
// canonical aliases before creating a proposal. This is the normalization path
// used by the full factory, not only the short-answer helper.
{
  const fhl = {
    id: id("7"),
    preferredLabel: "Flexor hallucis longus muscle",
    normalizedLabel: "flexor hallucis longus muscle",
    entityType: "anatomy_structure",
    aliases: ["FHL"],
    sourceAliases: [],
    active: true,
    lifecycleStatus: "canonical",
  } satisfies EntityIndexRow;
  assert.deepEqual(
    clozeAnswerMatchVariants("Flexor hallucis longus (FHL)"),
    ["flexor hallucis longus fhl", "flexor hallucis longus", "fhl"],
  );
  const card = makeCard({
    digit: "1",
    versionDigit: "2",
    ordinal: 0,
    noteGuid: "guid-parenthetical-alias",
    text: "The {{c1::Flexor hallucis longus (FHL)}} requires careful evaluation in scenario 9.",
  });
  const run = runCardClaimFactory({ cards: [card], entities: [fhl], now });
  assert.equal(run.assignments[0]?.queue, "auto_approved");
  assert.ok(run.assignments[0]?.reasonCodes.includes("canonical_alias_match"));
  assert.equal(run.proposedEntities.length, 0);
  assert.equal(run.proposedClaims[0]?.entityTargetType, "canonical");
  assert.equal(run.proposedClaims[0]?.primaryEntityId, fhl.id);
}

// Deterministic ID: identical type + normalized label match across runs.
{
  const first = proposeOntologyEntity({
    clozeAnswer: "Cup-Cage Reconstruction.",
    missingLabels: [],
    claimType: "treatment_indication",
    cardId: id("1"),
    now,
  });
  const second = proposeOntologyEntity({
    clozeAnswer: "  cup-cage   reconstruction ",
    missingLabels: [],
    claimType: "treatment_indication",
    cardId: id("2"),
    now,
  });
  assert.ok(first && second);
  assert.equal(first.entityId, second.entityId);
  assert.equal(first.normalizedLabel, "cup-cage reconstruction");
}

// Proposed entity reuse: two cards, one entity, both claims attached.
{
  const cardA = makeCard({
    digit: "1",
    versionDigit: "2",
    ordinal: 0,
    noteGuid: "guid-reuse-a",
    text: "The {{c1::cup-cage reconstruction}} requires careful evaluation in scenario 3.",
  });
  const cardB = makeCard({
    digit: "6",
    versionDigit: "7",
    ordinal: 0,
    noteGuid: "guid-reuse-b",
    text: "The {{c1::Cup-Cage Reconstruction.}} on the left requires careful evaluation in scenario 4.",
  });
  const run = runCardClaimFactory({ cards: [cardA, cardB], entities, now });
  assert.equal(run.proposedEntities.length, 1);
  const entity = run.proposedEntities[0]!;
  assert.deepEqual([...entity.sourceCardIds].sort(), [cardA.canonicalCardId, cardB.canonicalCardId].sort());
  assert.equal(run.metrics.proposedEntitiesCreated, 1);
  assert.equal(run.metrics.proposedEntitiesReused, 1);
  assert.equal(run.metrics.cardsAttachedToProposedEntities, 2);
  assert.equal(run.proposedClaims.length, 2);
  for (const claim of run.proposedClaims) assert.equal(claim.primaryEntityId, entity.entityId);
  assert.equal(run.autoApprovedLinks.length, 2);
  const gaps = run.gaps.filter((gap) => gap.disposition === "resolved");
  assert.equal(gaps.length, 2);
  assert.deepEqual(
    gaps.map((gap) => (gap.metadata as Record<string, unknown>).entityReuse).sort(),
    ["new", "reused"],
  );
}

// Normalization: equivalent formatting collapses to one normalized label.
{
  const variants = [
    "  Cup-Cage   Reconstruction. ",
    '"cup-cage reconstruction"',
    "cup\u2013cage reconstruction",
    "Cup-Cage Reconstruction (hint: cage)",
  ];
  const normalized = variants.map((variant) => normalizeProposedLabel(variant).normalizedLabel);
  for (const label of normalized) assert.equal(label, "cup-cage reconstruction");
  // Clinical wording is preserved, not rewritten: distinct terms stay distinct.
  assert.notEqual(
    normalizeProposedLabel("femoral neck fracture").normalizedLabel,
    normalizeProposedLabel("femoral shaft fracture").normalizedLabel,
  );
  // No plural folding without an ontology convention for it.
  assert.notEqual(
    normalizeProposedLabel("meniscal tear").normalizedLabel,
    normalizeProposedLabel("meniscal tears").normalizedLabel,
  );
}

// Short valid acronym via canonical alias: resolves canonically, no proposal.
{
  assert.equal(lookupCanonicalShortForm("acl", entities)?.id, id("5"));
  const card = makeCard({
    digit: "1",
    versionDigit: "2",
    ordinal: 0,
    noteGuid: "guid-acl-alias",
    text: "The {{c1::ACL}} requires careful evaluation in scenario 5.",
  });
  const run = runCardClaimFactory({ cards: [card], entities, now });
  assert.equal(run.assignments[0]?.queue, "auto_approved");
  assert.ok(run.assignments[0]?.reasonCodes.includes("canonical_alias_match"));
  assert.equal(run.proposedEntities.length, 0);
  assert.equal(run.proposedClaims[0]?.entityTargetType, "canonical");
  assert.equal(run.proposedClaims[0]?.primaryEntityId, id("5"));
}

// Short valid acronym with explicit expansion: proposed entity at 0.6, no hallucination.
{
  assert.equal(
    findShortAnswerExpansion("Injury to deep vein thrombosis (DVT) requires evaluation.", "DVT"),
    "Injury to deep vein thrombosis",
  );
  const resolution = resolveShortClozeAnswer({
    normalizedAnswer: "dvt",
    cardContextText: "Injury to lower limb vessels (DVT) requires evaluation.",
    entities: [],
  });
  assert.equal(resolution.kind, "proposed");
  if (resolution.kind === "proposed") {
    assert.equal(resolution.preferredLabel, "Injury to lower limb vessels");
    assert.equal(resolution.derivation, "short_acronym_expansion");
    assert.equal(resolution.confidence, 0.6);
  }
  // Recognized unambiguous acronym without context still resolves at 0.6.
  const recognized = resolveShortClozeAnswer({ normalizedAnswer: "mri", cardContextText: "plain", entities: [] });
  assert.equal(recognized.kind, "proposed");
  if (recognized.kind === "proposed") assert.equal(recognized.confidence, 0.6);
}

// Short ambiguous answer stays unresolved with the specific reason.
{
  for (const answer of ["PE", "IV", "2", "RA"]) {
    const resolution = resolveShortClozeAnswer({ normalizedAnswer: answer.toLowerCase(), cardContextText: "plain stem", entities });
    assert.equal(resolution.kind, "unresolved", answer);
  }
  const card = makeCard({
    digit: "1",
    versionDigit: "2",
    ordinal: 0,
    noteGuid: "guid-short",
    text: "The {{c1::PE}} requires careful evaluation in scenario 6.",
  });
  const run = runCardClaimFactory({ cards: [card], entities, now });
  assert.equal(run.assignments[0]?.queue, "missing_entity");
  assert.ok(run.assignments[0]?.reasonCodes.includes("short_label_insufficient_context"));
  assert.equal(run.proposedEntities.length, 0);
  assert.equal(run.autoApprovedLinks.length, 0);
  assert.equal(run.metrics.shortLabelInsufficientContext, 1);
  assert.equal(run.metrics.openMissingEntity, 1);
  // The claim is still produced even though the entity is unresolved.
  assert.equal(run.proposedClaims.length, 1);
  assert.equal(run.proposedClaims[0]?.entityTargetType, "unresolved");
}

// Gap-filled cards still create claims; teaches link carries explicit approval provenance.
{
  const card = makeCard({
    digit: "1",
    versionDigit: "2",
    ordinal: 0,
    noteGuid: "guid-link",
    text: "The {{c1::cup-cage reconstruction}} requires careful evaluation in scenario 7.",
  });
  const run = runCardClaimFactory({ cards: [card], entities, now });
  assert.equal(run.proposedClaims.length, 1);
  const link = run.autoApprovedLinks[0]!;
  assert.equal(link.mappingRole, "teaches");
  assert.equal(link.reviewStatus, "auto_approved");
  assert.equal(link.metadata.approvalReason, "ontology_gap_filled_from_cloze_answer");
  assert.equal(link.metadata.proposedEntityId, run.proposedEntities[0]!.entityId);
  assert.equal(link.metadata.sourceCardId, card.canonicalCardId);
  assert.equal(link.metadata.claimId, link.claimId);
  const gap = run.gaps.find((row) => row.disposition === "resolved")!;
  assert.ok(gap);
  const metadata = gap.metadata as Record<string, unknown>;
  assert.equal(metadata.sourceCardId, card.canonicalCardId);
  assert.equal(metadata.rawClozeText, "cup-cage reconstruction");
  assert.equal(metadata.proposedEntityId, run.proposedEntities[0]!.entityId);
  assert.equal(metadata.claimId, link.claimId);
  assert.equal(metadata.approvalReason, "ontology_gap_filled_from_cloze_answer");
  assert.equal(metadata.entityReuse, "new");
  assert.equal(typeof metadata.confidence, "number");
  assert.ok(Array.isArray(metadata.canonicalMatchAttempts));
}

// Canonical safety: inputs untouched, dry-run only, no promotion path.
{
  const snapshot = structuredClone(entities);
  const card = makeCard({
    digit: "1",
    versionDigit: "2",
    ordinal: 0,
    noteGuid: "guid-safety",
    text: "The {{c1::cup-cage reconstruction}} requires careful evaluation in scenario 8.",
  });
  const run = runCardClaimFactory({ cards: [card], entities, now });
  assert.deepEqual(entities, snapshot);
  assert.equal(run.dryRun, true);
  const canonicalIds = new Set(entities.map((entity) => entity.id));
  for (const entity of run.proposedEntities) {
    assert.equal(entity.status, "proposed");
    assert.ok(!canonicalIds.has(entity.entityId));
  }
  const packet = buildPromotionPacket(run.proposedEntities[0]!, [run.proposedClaims[0]!.claimId]);
  assert.equal(packet.proposedEntityId, run.proposedEntities[0]!.entityId);
  assert.deepEqual(packet.supportingCardIds, [card.canonicalCardId]);
}

console.log("card-claim-factory-proposed-entities.test.ts: all assertions passed");
