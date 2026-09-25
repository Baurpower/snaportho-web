import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  runCardClaimFactory,
  type CardClaimFactoryCard,
} from "./card-claim-factory";
import * as evaluationModule from "./card-claim-factory-evaluation";
import {
  auditCanonicalSimilarity,
  auditProposedNearDuplicates,
  buildFactoryEvaluation,
  buildOntologyReviewPacket,
  buildPromotionPlan,
  normalizeSnapshot,
} from "./card-claim-factory-evaluation";
import { canonicalContentHash, type EntityIndexRow } from "./deck-semantic-mapping";
import { deterministicUuid } from "./deck-foundation";

const FIXED_NOW = "2026-09-23T00:00:00.000Z";
const now = () => FIXED_NOW;

const id = (seed: string) => deterministicUuid(`ckf-fixture|${seed}`);
const norm = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9+\-/ ]+/g, " ").replace(/\s+/g, " ").trim();
const plain = (text: string) => text.replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/gi, "$1");

const entityDefs = [
  { seed: "ent-pelvic-discontinuity", preferredLabel: "Pelvic discontinuity", entityType: "condition", aliases: ["pelvic dissociation"] },
  { seed: "ent-talus-fracture", preferredLabel: "Talus fracture", entityType: "condition", aliases: ["talar fracture", "fracture of the talus"] },
  { seed: "ent-achilles", preferredLabel: "Achilles tendon", entityType: "anatomy_structure", aliases: ["calcaneal tendon"] },
  { seed: "ent-femoral-neck", preferredLabel: "Femoral neck fracture", entityType: "condition", aliases: ["femur neck fracture", "subcapital femur fracture"] },
  { seed: "ent-rotator-cuff", preferredLabel: "Rotator cuff tear", entityType: "condition", aliases: ["cuff tear", "rotator cuff rupture"] },
  { seed: "ent-acl", preferredLabel: "Anterior cruciate ligament", entityType: "anatomy_structure", aliases: ["ACL", "ACL tear"] },
  { seed: "ent-meniscal", preferredLabel: "Meniscal tear", entityType: "condition", aliases: ["meniscus tear", "torn meniscus"] },
  { seed: "ent-ankle-sprain", preferredLabel: "Ankle sprain", entityType: "condition", aliases: ["sprained ankle", "lateral ankle sprain"] },
  { seed: "ent-tibial-plateau", preferredLabel: "Tibial plateau fracture", entityType: "condition", aliases: ["plateau fracture", "lateral tibial plateau fracture"] },
  { seed: "ent-distal-radius", preferredLabel: "Distal radius fracture", entityType: "condition", aliases: ["Colles fracture"] },
  { seed: "ent-hip-oa", preferredLabel: "Hip osteoarthritis", entityType: "condition", aliases: ["coxarthrosis"] },
  { seed: "ent-scaphoid", preferredLabel: "Scaphoid fracture", entityType: "condition", aliases: ["scaphoid waist fracture"] },
  { seed: "ent-gh-dislocation", preferredLabel: "Glenohumeral dislocation", entityType: "condition", aliases: ["shoulder dislocation", "anterior shoulder dislocation"] },
];

const entities: EntityIndexRow[] = entityDefs.map((entry) => ({
  id: id(entry.seed),
  preferredLabel: entry.preferredLabel,
  normalizedLabel: norm(entry.preferredLabel),
  entityType: entry.entityType,
  aliases: entry.aliases,
  sourceAliases: [],
  active: true,
  lifecycleStatus: "canonical",
}));

const canonicalAnswers = entityDefs.flatMap((entry) => [entry.preferredLabel, ...entry.aliases.filter((alias) => alias !== "ACL")]);

function makeCard(seed: string, ordinal: number, noteGuid: string, text: string): CardClaimFactoryCard {
  const fields = [
    { name: "Text", rawValue: text, plainText: plain(text) },
    { name: "Extra", rawValue: "", plainText: "" },
  ];
  const tags = ["ortho-test"];
  return {
    canonicalCardId: id(`${seed}|card`),
    canonicalCardVersionId: id(`${seed}|version`),
    noteGuid,
    cardOrdinal: ordinal,
    contentHash: canonicalContentHash({ fields, tags, cardOrdinal: ordinal }),
    tags,
    fields,
    active: true,
    currentVersion: true,
    inclusionStatus: "included",
  };
}

function fiftyCardFixture(): CardClaimFactoryCard[] {
  const stems = [
    (answer: string, i: number) => `The {{c1::${answer}}} requires careful evaluation in scenario ${i}.`,
    (answer: string, i: number) => `Recognition of {{c1::${answer}}} guides subsequent management in scenario ${i}.`,
    (answer: string, i: number) => `Detailed assessment of {{c1::${answer}}} remains essential in scenario ${i}.`,
  ];
  const cards: CardClaimFactoryCard[] = [];
  for (let i = 0; i < 33; i += 1) {
    const stem = stems[i % stems.length] ?? stems[0]!;
    const answer = canonicalAnswers[i % canonicalAnswers.length] ?? "";
    cards.push(makeCard(`canonical-${i}`, 0, `guid-canonical-${i}`, stem(answer, i)));
  }
  const fillAnswers = [
    "cup-cage reconstruction", "Judet views", "traction view", "dual-mobility articulation",
    "extensor mechanism lag", "tibial tubercle transfer", "glenoid bone loss",
    "quadriceps snip", "patellar clunk syndrome", "heterotopic ossification",
    "stress shielding", "periprosthetic lucency", "trunnionosis",
  ];
  fillAnswers.forEach((answer, i) => {
    cards.push(makeCard(`fill-${i}`, 0, `guid-fill-${i}`, `The {{c1::${answer}}} requires careful evaluation in scenario ${100 + i}.`));
  });
  cards.push(makeCard("fill-dup", 0, "guid-fill-dup", `The {{c1::${fillAnswers[0]}}} on the left requires careful evaluation in scenario 200.`));
  for (const [i, answer] of ["IV", "PE", "2"].entries()) {
    cards.push(makeCard(`short-${i}`, 0, `guid-short-${i}`, `The {{c1::${answer}}} requires careful evaluation in scenario ${300 + i}.`));
  }
  return cards;
}

const cards = fiftyCardFixture();
assert.equal(cards.length, 50);
const entitiesSnapshot = structuredClone(entities);
const output = runCardClaimFactory({ cards, entities, now });
const evaluation = buildFactoryEvaluation(output, { mode: "fixture", entities, generatedAt: FIXED_NOW });

// §13: regression invariants for the 50-card fixture baseline.
assert.equal(evaluation.cardsProcessed, 50);
assert.equal(evaluation.claimsProduced, 50);
assert.equal(evaluation.canonicalEntityMatches, 33);
assert.equal(evaluation.ontologyGapFilledCards, 14);
assert.equal(evaluation.proposedEntitiesCreated, 13);
assert.equal(evaluation.proposedEntitiesReused, 1);
assert.equal(evaluation.cardsAttachedToProposedEntities, 14);
assert.equal(evaluation.autoApproved, 47);
assert.equal(evaluation.manualReview, 3);
assert.equal(evaluation.unresolved.total, 3);
assert.equal(evaluation.unresolved.shortLabelInsufficientContext, 3);
assert.equal(evaluation.unresolved.other, 0);
assert.equal(evaluation.mode, "fixture");
assert.equal(evaluation.runId, output.factoryRunId);

// §14: IV / PE / 2 remain explicit regression cases.
for (const raw of ["IV", "PE", "2"]) {
  const row = evaluation.unresolvedCards.find((item) => item.rawClozeAnswer === raw);
  assert.ok(row, `unresolved card for ${raw}`);
  assert.equal(row.unresolvedReason, "short_label_insufficient_context");
  assert.ok(row.reasonCodes.includes("short_label_insufficient_context"));
}

// Exact proposal duplicate: the cup-cage pair shares one proposed entity.
{
  const cupCage = evaluation.proposedEntities.filter((entity) => entity.normalizedLabel === "cup-cage reconstruction");
  assert.equal(cupCage.length, 1);
  assert.equal(cupCage[0]!.numberOfCards, 2);
  assert.equal(cupCage[0]!.claimIds.length, 2);
  assert.equal(cupCage[0]!.teachesLinksCreated, 2);
}

// Near-duplicate audit: flagged but never merged (dedicated small case).
{
  const nearDupEntities: EntityIndexRow[] = [
    {
      id: deterministicUuid("near|base"),
      preferredLabel: "Talus fracture",
      normalizedLabel: "talus fracture",
      entityType: "condition",
      aliases: [],
      sourceAliases: [],
      active: true,
      lifecycleStatus: "canonical",
    },
  ];
  const nearCards = [
    makeCard("near-a", 0, "guid-near-a", "The {{c1::ACL tear}} requires careful evaluation in near scenario one."),
    makeCard("near-b", 0, "guid-near-b", "The {{c1::Anterior cruciate ligament tear}} requires careful evaluation in near scenario two."),
  ];
  const nearOutput = runCardClaimFactory({ cards: nearCards, entities: nearDupEntities, now });
  assert.equal(nearOutput.proposedEntities.length, 2);
  const flags = auditProposedNearDuplicates(nearOutput.proposedEntities);
  const kinds = [...flags.values()].flat().map((flag) => flag.reason);
  assert.ok(kinds.includes("acronym_expansion_pair"), JSON.stringify([...flags.values()]));
  // Not merged: two entities, each still the target of its own claim.
  for (const entity of nearOutput.proposedEntities) {
    assert.ok(nearOutput.proposedClaims.some((claim) => claim.primaryEntityId === entity.entityId));
  }
}

// Possible canonical duplicate: surfaced, resolution unchanged.
{
  const dupEntities: EntityIndexRow[] = [
    {
      id: deterministicUuid("canon|rotator"),
      preferredLabel: "Rotator cuff tear",
      normalizedLabel: "rotator cuff tear",
      entityType: "condition",
      aliases: [],
      sourceAliases: [],
      active: true,
      lifecycleStatus: "canonical",
    },
  ];
  const dupCards = [
    makeCard("plural-a", 0, "guid-plural-a", "The {{c1::Rotator cuff tears}} requires careful evaluation in plural scenario one."),
  ];
  const dupOutput = runCardClaimFactory({ cards: dupCards, entities: dupEntities, now });
  assert.equal(dupOutput.proposedEntities.length, 1);
  const proposed = dupOutput.proposedEntities[0]!;
  const dupFlags = auditCanonicalSimilarity(proposed, dupEntities);
  assert.ok(dupFlags.some((flag) => flag.matchReason === "singular_plural_variant"));
  // Claim still targets the proposal, not the canonical entity.
  const claim = dupOutput.proposedClaims.find((item) => item.primaryEntityId === proposed.entityId);
  assert.ok(claim);
  assert.equal(claim.entityTargetType, "proposed");
}

// No false mutation: audits and packet leave the factory result untouched.
{
  const before = JSON.stringify(output);
  auditCanonicalSimilarity(output.proposedEntities[0]!, entities);
  auditProposedNearDuplicates(output.proposedEntities);
  buildOntologyReviewPacket(evaluation);
  normalizeSnapshot(output, "fixture");
  assert.equal(JSON.stringify(output), before);
  assert.deepEqual(entities, entitiesSnapshot);
}

// Review packet: full card -> claim -> entity provenance per item.
{
  const packet = buildOntologyReviewPacket(evaluation);
  assert.equal(packet.runId, evaluation.runId);
  assert.equal(packet.items.length, 13);
  for (const item of packet.items) {
    assert.ok(item.claimIds.length >= 1);
    assert.ok(item.sourceCards.length >= 1);
    assert.ok(item.sourceCards.every((card) => card.rawClozeAnswer.length > 0));
    assert.ok(item.canonicalMatchAttempts.length >= 1);
    assert.ok(["approve_new_entity", "merge_with_existing", "add_alias_to_existing", "needs_review", "reject"].includes(item.recommendedAction));
    assert.ok(item.recommendationReasons.length >= 1);
  }
  const reused = packet.items.find((item) => item.sourceCards.length > 1)!;
  assert.ok(reused);
}

// Promotion plan: explicit decision -> deterministic planned mutations, never executed.
{
  const packet = buildOntologyReviewPacket(evaluation);
  const item = packet.items.find((entry) => entry.recommendedAction === "approve_new_entity") ?? packet.items[0]!;
  const decision = { action: "create_canonical_entity" as const, reviewer: "reviewer@example.com", decidedAt: FIXED_NOW, rationale: "novel" };
  const first = buildPromotionPlan(item, decision, entities);
  const second = buildPromotionPlan(item, decision, entities);
  assert.equal(first.status, "ready");
  assert.deepEqual(first, second);
  assert.ok(first.mutations.some((mutation) => mutation.kind === "insert_canonical_entity"));
  assert.ok(first.mutations.some((mutation) => mutation.kind === "retarget_claims"));
  assert.ok(first.preconditions.every((precondition) => precondition.met));
}

// Missing reviewer decision -> blocked plan with no mutations.
{
  const packet = buildOntologyReviewPacket(evaluation);
  const blocked = buildPromotionPlan(packet.items[0]!, { action: "create_canonical_entity", reviewer: "  ", decidedAt: FIXED_NOW }, entities);
  assert.equal(blocked.status, "blocked");
  assert.deepEqual(blocked.mutations, []);
  assert.ok(blocked.blockers.includes("reviewer_decision_present"));
}

// Alias collision -> blocked plan.
{
  const packet = buildOntologyReviewPacket(evaluation);
  const cupCage = packet.items.find((entry) => entry.normalizedLabel === "cup-cage reconstruction")!;
  // Alias collision: "cup-cage reconstruction" is already owned by another
  // canonical entity, so adding it as an alias of a different target blocks.
  const ownedAliasEntities: EntityIndexRow[] = [
    {
      id: deterministicUuid("collide|owner"),
      preferredLabel: "Owner concept",
      normalizedLabel: "owner concept",
      entityType: "condition",
      aliases: ["cup-cage reconstruction"],
      sourceAliases: [],
      active: true,
      lifecycleStatus: "canonical",
    },
    {
      id: deterministicUuid("collide|target"),
      preferredLabel: "Target concept",
      normalizedLabel: "target concept",
      entityType: "condition",
      aliases: [],
      sourceAliases: [],
      active: true,
      lifecycleStatus: "canonical",
    },
  ];
  const collided = buildPromotionPlan(cupCage, {
    action: "add_alias",
    targetCanonicalEntityId: deterministicUuid("collide|target"),
    reviewer: "reviewer@example.com",
    decidedAt: FIXED_NOW,
  }, ownedAliasEntities);
  assert.equal(collided.status, "blocked");
  assert.deepEqual(collided.mutations, []);
  assert.ok(collided.blockers.includes("alias_not_owned_elsewhere"));
}

// No executor exists anywhere in the review/promotion surface.
assert.equal((evaluationModule as unknown as Record<string, unknown>).executePromotionPlan, undefined);
assert.equal((evaluationModule as unknown as Record<string, unknown>).applyPromotionPlan, undefined);

// Canonical safety across the whole evaluation/review flow.
assert.deepEqual(entities, entitiesSnapshot);

// Snapshot determinism: identical semantic snapshot across runs, no timestamps.
{
  const again = runCardClaimFactory({ cards: fiftyCardFixture(), entities: structuredClone(entities), now });
  assert.deepEqual(normalizeSnapshot(again, "fixture"), normalizeSnapshot(output, "fixture"));
  const serialized = JSON.stringify(normalizeSnapshot(output, "fixture"));
  assert.ok(!serialized.includes("generatedAt"));
}

// Committed snapshot: the same fixture must reproduce the checked-in artifact.
{
  const committed = JSON.parse(readFileSync(
    new URL("./__snapshots__/fifty-card-fixture.snapshot.json", import.meta.url),
    "utf8",
  ));
  assert.deepEqual(normalizeSnapshot(output, "fixture"), committed);
}

console.log("card-claim-factory-evaluation.test.ts: all assertions passed");
