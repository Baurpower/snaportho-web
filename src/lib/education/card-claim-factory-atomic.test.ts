import assert from "node:assert/strict";

import {
  assignUnitConcepts,
  clozeAnswersByNumber,
  runCardClaimFactory,
  unitTestedAnswer,
  type CardClaimFactoryCard,
} from "./card-claim-factory";
import { canonicalContentHash, type EntityIndexRow } from "./deck-semantic-mapping";

const id = (digit: string) =>
  `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;

const entities: EntityIndexRow[] = [
  {
    id: id("3"),
    preferredLabel: "Talus fracture",
    normalizedLabel: "talus fracture",
    entityType: "condition",
    aliases: [],
    sourceAliases: [],
    active: true,
    lifecycleStatus: "canonical",
  },
  {
    id: id("5"),
    preferredLabel: "Achilles tendon",
    normalizedLabel: "achilles tendon",
    entityType: "anatomy_structure",
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
}): CardClaimFactoryCard {
  const fields = [
    { name: "Text", rawValue: input.text, plainText: input.text.replace(/<[^>]+>/g, " ") },
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

// Unit-concept assignment: evidence is non-exclusive, the rest is unmatched.
{
  const assigned = assignUnitConcepts(
    [
      { normalizedConceptLabel: "talus fracture" },
      { normalizedConceptLabel: "achilles tendon" },
      { normalizedConceptLabel: "nowhere entity" },
    ] as never,
    [
      { unitId: "u1", matchText: "talus fracture involves the talar dome" },
      { unitId: "u2", matchText: "achilles tendon rupture shows a positive thompson test" },
    ],
  );
  assert.deepEqual(assigned.byUnit.get("u1")!.map((concept) => concept.normalizedConceptLabel), ["talus fracture"]);
  assert.deepEqual(assigned.byUnit.get("u2")!.map((concept) => concept.normalizedConceptLabel), ["achilles tendon"]);
  assert.deepEqual(assigned.unmatched.map((concept) => concept.normalizedConceptLabel), ["nowhere entity"]);
  const repeated = assignUnitConcepts([{ normalizedConceptLabel: "talus fracture" }] as never, [
    { unitId: "u1", matchText: "talus fracture involves the talar dome" },
    { unitId: "u2", matchText: "talus fracture involves the talar dome" },
  ]);
  assert.equal(repeated.byUnit.get("u1")!.length, 1);
  assert.equal(repeated.byUnit.get("u2")!.length, 1);
  assert.equal(repeated.unmatched.length, 0);
  // Substring matches must not count: "talus" alone is not "talus fracture".
  const short = assignUnitConcepts([{ normalizedConceptLabel: "talus fracture" }] as never, [
    { unitId: "u1", matchText: "talus bone contusion without fracture line" },
  ]);
  assert.equal(short.byUnit.get("u1")!.length, 0);
  assert.equal(short.unmatched.length, 1);
}

// Cloze answers by number keep sibling tested answers distinct.
{
  const answers = clozeAnswersByNumber("A {{c1::talar dome}} and B {{c2::positive Thompson test}}.");
  assert.equal(answers.get(1), "talar dome");
  assert.equal(answers.get(2), "positive Thompson test");
}

// Repeated c1 clozes across blocks each resolve their own block-local answer.
{
  const answers = unitTestedAnswer(
    {
      unitId: "u",
      fieldName: "Text",
      blockIndex: 2,
      clozeNumbers: [1],
      clozeAnswers: [{ number: 1, answer: "Coracoid" }],
      occurrenceIndex: 0,
      answer: "Coracoid",
      filledBlock: "Medial - Coracoid",
      contextHeader: "",
      hasImage: false,
      evidenceLocator: "Text:b2:c1",
      questionWithoutAnswer: false,
    },
    1,
  );
  assert.equal(answers, "Coracoid");
}

// Sub-unit items refine a shared block-level answer list.
{
  const base = {
    unitId: "u",
    fieldName: "Text",
    blockIndex: 1,
    clozeNumbers: [1],
    clozeAnswers: [{ number: 1, answer: "Breast; Lung; Thyroid" }],
    filledBlock: "Carcinomas that spread to bone: Lung",
    contextHeader: "",
    hasImage: false,
    evidenceLocator: "Text:b1:c1:i1",
    questionWithoutAnswer: false,
  };
  assert.equal(unitTestedAnswer({ ...base, occurrenceIndex: 1, answer: "Lung" }, 1), "Lung");
  assert.equal(unitTestedAnswer({ ...base, occurrenceIndex: 0, answer: "Breast" }, 1), "Breast");
}

// Multi-unit card: one claim per unit, index + unit provenance on each claim.
const multiCard = makeCard({
  digit: "1",
  versionDigit: "2",
  ordinal: 0,
  noteGuid: "multi-note",
  text: "Talus fracture involves the {{c1::talar dome}}.<br>Achilles tendon rupture shows a {{c2::positive Thompson test}}.",
});
const multi = runCardClaimFactory({ cards: [multiCard], entities: structuredClone(entities), now: () => "2026-09-27T00:00:00.000Z" });
{
  assert.equal(multi.proposedClaims.length, 2);
  const [first, second] = [...multi.proposedClaims].sort((a, b) => a.claimIndex - b.claimIndex);
  assert.equal(first.claimIndex, 1);
  assert.equal(second.claimIndex, 2);
  assert.equal(first.claimsInVersion, 2);
  assert.equal(second.claimsInVersion, 2);
  assert.notEqual(first.sourceUnitId, second.sourceUnitId);
  assert.ok(first.sourceUnitId.length > 0);
  assert.ok(first.rewriteMethod.length > 0);
  // Sibling ordinal 0 tests c1; the c2 unit falls back to its own answer.
  assert.equal(first.objectText, "talar dome");
  assert.equal(second.objectText, "positive Thompson test");
  const assignment = multi.assignments[0];
  assert.equal(assignment.claimIds.length, 2);
  assert.deepEqual(new Set(assignment.claimIds), new Set([first.claimId, second.claimId]));
  // Per-claim entity links resolve to the unit-local canonical entity.
  const firstLinks = multi.entityLinks.filter((link) => link.claimId === first.claimId);
  const secondLinks = multi.entityLinks.filter((link) => link.claimId === second.claimId);
  assert.ok(firstLinks.some((link) => link.entityKind === "canonical" && link.entityId === id("3")));
  assert.ok(secondLinks.some((link) => link.entityKind === "canonical" && link.entityId === id("5")));
  assert.ok(firstLinks.every((link) => link.evidenceLocator.length > 0));
  assert.equal(firstLinks[0].role, "teaches_about");
  assert.equal(assignment.queue, "auto_approved");
  assert.deepEqual(assignment.reasonCodes, ["machine_consensus", "multi_claim_card"]);
  assert.equal(multi.autoApprovedLinks.length, 2);
  assert.equal(multi.metrics.multiClaimCards, 1);
  assert.equal(multi.metrics.maxClaimsPerCard, 2);
}

// Multi-entity unit: every resolved entity gets a link, and the approved
// claim still carries review flags.
{
  const card = makeCard({
    digit: "e",
    versionDigit: "f",
    ordinal: 0,
    noteGuid: "multi-entity-note",
    text: "Talus fracture with {{c1::Achilles tendon}} involvement.",
  });
  const output = runCardClaimFactory({ cards: [card], entities: structuredClone(entities) });
  assert.equal(output.proposedClaims.length, 1);
  const claim = output.proposedClaims[0];
  const links = output.entityLinks.filter((link) => link.claimId === claim.claimId);
  assert.equal(links.filter((link) => link.entityKind === "canonical").length, 2);
  const codes = output.qualityFlags.filter((flag) => flag.claimId === claim.claimId).map((flag) => flag.code);
  assert.ok(codes.includes("multi_entity_claim"));
  assert.ok(codes.includes("competing_entities_present"));
  assert.equal(output.assignments[0].queue, "auto_approved");
}

// Repeated-c1 list card: each unit tests its own answer, never the first.
{
  const card = makeCard({
    digit: "1",
    versionDigit: "2",
    ordinal: 0,
    noteGuid: "repeat-note",
    text: "Borders?<div>Superior - {{c1::Supraspinatus}}</div><div>Inferior - {{c1::Subscapularis}}</div>",
  });
  const output = runCardClaimFactory({ cards: [card], entities: structuredClone(entities) });
  const objects = [...output.proposedClaims]
    .sort((a, b) => a.claimIndex - b.claimIndex)
    .map((claim) => claim.objectText);
  assert.deepEqual(objects, ["Supraspinatus", "Subscapularis"]);
}

// Same fingerprint, different assertions: never silently merged.
{
  const cardA = makeCard({
    digit: "1", versionDigit: "2", ordinal: 0, noteGuid: "collision-a",
    text: "Talus fracture involves the {{c1::talar dome}}.",
  });
  const cardB = makeCard({
    digit: "3", versionDigit: "4", ordinal: 0, noteGuid: "collision-b",
    text: "In talus fracture care, assess the {{c1::talar dome}} first.",
  });
  const output = runCardClaimFactory({ cards: [cardA, cardB], entities: structuredClone(entities) });
  assert.equal(output.proposedClaims.length, 2);
  const [first, second] = output.proposedClaims;
  assert.equal(first.fingerprintHash, second.fingerprintHash);
  assert.notEqual(first.claimId, second.claimId);
  assert.notEqual(first.claimText, second.claimText);
  for (const row of output.assignments) {
    const claim = output.proposedClaims.find((entry) => entry.claimId === row.claimIds[0])!;
    assert.ok(claim.claimText.toLowerCase().includes("talar dome"));
  }
}

// Same note, same assertion twice: shared claim, second unit is a duplicate.
{
  const card = makeCard({
    digit: "5", versionDigit: "6", ordinal: 0, noteGuid: "repeat-assertion",
    text: "Talus fracture involves the {{c1::talar dome}}.<br>Talus fracture involves the {{c1::talar dome}}.",
  });
  const output = runCardClaimFactory({ cards: [card], entities: structuredClone(entities) });
  assert.equal(output.proposedClaims.length, 1);
  assert.deepEqual(output.unitOutcomes.map((row) => row.queue), ["auto_approved", "duplicate_sibling"]);
  assert.equal(output.unitOutcomes[0].claimId, output.unitOutcomes[1].claimId);
}

// Zero-claim image card: terminal accounting, no claims, extractor reason kept.
{
  const imageCard = makeCard({
    digit: "6",
    versionDigit: "7",
    ordinal: 0,
    noteGuid: "image-note",
    text: '<img src="xray.png">',
  });
  const output = runCardClaimFactory({ cards: [imageCard], entities: structuredClone(entities) });
  assert.equal(output.proposedClaims.length, 0);
  assert.equal(output.assignments[0].queue, "zero_claims");
  assert.deepEqual(output.assignments[0].claimIds, []);
  assert.equal(output.metrics.zeroClaimCards, 1);
}

// Sibling cards keep distinct tested answers for shared units.
{
  const text = "Talus fracture involves the {{c1::talar dome}}.<br>Achilles tendon rupture shows a {{c2::positive Thompson test}}.";
  const siblingA = makeCard({ digit: "1", versionDigit: "2", ordinal: 0, noteGuid: "sib-note", text });
  const siblingB = makeCard({ digit: "8", versionDigit: "9", ordinal: 1, noteGuid: "sib-note", text });
  const output = runCardClaimFactory({ cards: [siblingA, siblingB], entities: structuredClone(entities) });
  const claimsA = output.proposedClaims.filter((claim) =>
    output.assignments.find((row) => row.canonicalCardId === siblingA.canonicalCardId)?.claimIds.includes(claim.claimId),
  );
  const objectsA = claimsA.map((claim) => claim.objectText).sort();
  assert.deepEqual(objectsA, ["positive Thompson test", "talar dome"]);
  const firstUnitA = claimsA.find((claim) => claim.claimIndex === 1)!;
  assert.equal(firstUnitA.objectText, "talar dome");
}

// Claim ceiling: candidates recorded for review, none emitted.
{
  const blocks = Array.from({ length: 13 }, (_, i) => `Fact ${i + 1} is {{c${i + 1}::answer ${i + 1}}}.`).join("<br>");
  const ceilingCard = makeCard({ digit: "a", versionDigit: "b", ordinal: 0, noteGuid: "ceiling-note", text: blocks });
  const output = runCardClaimFactory({ cards: [ceilingCard], entities: structuredClone(entities) });
  assert.equal(output.proposedClaims.length, 0);
  assert.equal(output.assignments[0].queue, "multi_claim_review");
  assert.ok(output.assignments[0].reasonCodes.includes("claim_ceiling_exceeded"));
}

// Determinism: identical output across runs.
{
  const first = runCardClaimFactory({ cards: [multiCard], entities: structuredClone(entities), now: () => "2026-09-27T00:00:00.000Z" });
  const second = runCardClaimFactory({ cards: [multiCard], entities: structuredClone(entities), now: () => "2026-09-27T00:00:00.000Z" });
  assert.deepEqual(second, first);
}

// Proposed entities carry supporting claim ids.
{
  const fillCard = makeCard({
    digit: "c",
    versionDigit: "d",
    ordinal: 0,
    noteGuid: "fill-note",
    text: "Quadriceps snip is indicated for {{c1::stiff total knee arthroplasty}} exposure.",
  });
  const output = runCardClaimFactory({ cards: [fillCard], entities: structuredClone(entities) });
  for (const entity of output.proposedEntities) {
    assert.ok(entity.sourceClaimIds.length > 0);
    for (const claimId of entity.sourceClaimIds) {
      assert.ok(output.proposedClaims.some((claim) => claim.claimId === claimId));
    }
  }
  assert.equal(output.assignments[0].queue, "auto_approved");
  assert.equal(output.proposedEntities.length, 1);
}

console.log("card-claim-factory-atomic.test.ts: all assertions passed");
