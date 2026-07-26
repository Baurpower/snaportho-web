import assert from "node:assert/strict";
import { buildKgImprovement, extractSubjectLabel } from "./anki-kg-improvement";

const id = (value: string) =>
  `${value.repeat(8)}-${value.repeat(4)}-4${value.repeat(3)}-8${value.repeat(3)}-${value.repeat(12)}`;

assert.equal(extractSubjectLabel("Four functions of bone:"), "Bone");
assert.equal(extractSubjectLabel("Four functions of bone: 1) 2) 3) 4)"), "Bone");
assert.equal(
  extractSubjectLabel(
    "Long bones are formed by ossification. Flat bones are formed by ossification.",
  ),
  "Bone",
);

const fields = [
  {
    name: "Text",
    rawValue:
      "Four functions of bone:<br>{{c1::Attachment for muscles}}<br>{{c2::Protect organs}}<br>{{c3::Mineral reservoir}}<br>{{c4::Hematopoiesis}}",
  },
];

{
  const improvement = buildKgImprovement({
    canonicalCardId: id("a"),
    canonicalCardVersionId: id("b"),
    fields,
    entities: [
      {
        id: id("c"),
        preferredLabel: "Bone",
        normalizedLabel: "bone",
        entityType: "anatomy_structure",
        aliases: [],
      },
    ],
    existingClaims: [],
    existingEntityIds: [],
  });
  assert.equal(improvement.subject.resolution, "existing");
  assert.equal(
    improvement.operations.filter((operation) => operation.kind === "propose_entity").length,
    0,
  );
  assert.equal(
    improvement.operations.filter((operation) => operation.kind === "propose_claim").length,
    4,
  );
  assert.equal(improvement.reviewTier, "clinical_review");
  assert.match(improvement.summary, /connect this card to Bone/i);
}

{
  const improvement = buildKgImprovement({
    canonicalCardId: id("e"),
    canonicalCardVersionId: id("f"),
    fields: [
      {
        name: "Text",
        rawValue:
          "Long bones are formed by ossification: {{c1::endochondral}}.<br>Flat bones are formed by ossification: {{c2::intramembranous}}.",
      },
    ],
    entities: [
      {
        id: id("c"),
        preferredLabel: "Bone",
        normalizedLabel: "bone",
        entityType: "anatomy_structure",
        aliases: [],
      },
    ],
    existingClaims: [],
    existingEntityIds: [id("c")],
  });
  const claims = improvement.operations
    .filter((operation) => operation.kind === "propose_claim")
    .map((operation) => operation.claimText);
  assert.deepEqual(claims, [
    "Long bones are formed by endochondral ossification.",
    "Flat bones are formed by intramembranous ossification.",
  ]);
  assert.equal(improvement.title, "Improve knowledge about Bone");
  assert.equal(
    improvement.operations.filter((operation) => operation.kind === "propose_entity").length,
    0,
  );
}

{
  const improvement = buildKgImprovement({
    canonicalCardId: id("a"),
    canonicalCardVersionId: id("b"),
    fields,
    entities: [],
    existingClaims: [],
    existingEntityIds: [],
  });
  assert.equal(improvement.subject.resolution, "proposed");
  assert.equal(
    improvement.operations.filter((operation) => operation.kind === "propose_entity").length,
    1,
  );
  assert.equal(improvement.reviewTier, "ontology_review");
  assert.ok(
    improvement.operations
      .filter((operation) => operation.kind === "propose_claim")
      .every((operation) => operation.kind !== "propose_claim" || operation.primaryEntityId === null),
  );
}

{
  const improvement = buildKgImprovement({
    canonicalCardId: id("a"),
    canonicalCardVersionId: id("b"),
    fields,
    entities: [
      {
        id: id("c"),
        preferredLabel: "Bone",
        normalizedLabel: "bone",
        entityType: "anatomy_structure",
        aliases: [],
      },
    ],
    existingClaims: [
      {
        id: id("d"),
        primaryEntityId: id("c"),
        claimText: "Bone protects organs.",
        claimType: "fact",
        reviewStatus: "approved",
      },
    ],
    existingEntityIds: [id("c")],
  });
  assert.equal(
    improvement.operations.filter(
      (operation) =>
        operation.kind === "propose_claim" && operation.claimText === "Bone protects organs.",
    ).length,
    0,
  );
  assert.match(
    improvement.qualityGates.find((gate) => gate.gate === "duplicate_check")!.reason,
    /suppressed/,
  );
}

console.log("anki-kg-improvement.test.ts: all assertions passed");
