import assert from "node:assert/strict";
import {
  acceptedDraftsToProposalParts,
  buildKgDraftSuggestions,
  significantTokens,
} from "./anki-kg-draft";
import {
  stripNonClinicalMarkup,
  type EntityIndexRow,
} from "./deck-semantic-mapping";

const id = (x: string) =>
  `${x.repeat(8)}-${x.repeat(4)}-4${x.repeat(3)}-8${x.repeat(3)}-${x.repeat(12)}`;

const entities: EntityIndexRow[] = [
  {
    id: id("a"),
    preferredLabel: "Bone",
    normalizedLabel: "bone",
    entityType: "anatomy_structure",
    aliases: ["osseous tissue"],
    sourceAliases: [],
    active: true,
    lifecycleStatus: "canonical",
  },
  {
    id: id("b"),
    preferredLabel: "Achilles tendon",
    normalizedLabel: "achilles tendon",
    entityType: "anatomy_structure",
    aliases: ["calcaneal tendon"],
    sourceAliases: [],
    active: true,
    lifecycleStatus: "canonical",
  },
];

{
  const tokens = significantTokens("Four functions of bone support protection");
  assert.ok(tokens.includes("bone") || tokens.includes("support"));
}

{
  const plain = stripNonClinicalMarkup(
    "Four functions of bone: {{c1::support}} {{c2::protection::answer hint}}",
  );
  assert.equal(plain, "Four functions of bone: support protection");
}

{
  const draft = buildKgDraftSuggestions({
    canonicalCardId: id("c"),
    canonicalCardVersionId: id("d"),
    contentHash: "a".repeat(64),
    fields: [
      {
        name: "Text",
        rawValue: "Four functions of bone: 1) {{c1::support}} 2) protection",
      },
    ],
    entities,
  });
  assert.equal(draft.contractVersion, "snaportho-anki-kg-draft.v1");
  const bone = draft.suggestions.find(
    (s) => s.kind === "link_existing" && s.label === "Bone",
  );
  assert.ok(bone, "expected Bone link from card text");
  assert.equal(bone!.canonicalEntityId, id("a"));
  assert.ok(bone!.defaultSelected || bone!.confidence >= 0.7);
  assert.equal(bone!.mappingRole, "teaches");
  assert.deepEqual(draft.cardEvidence.answerConcepts, ["support"]);
}

{
  const draft = buildKgDraftSuggestions({
    canonicalCardId: id("c"),
    canonicalCardVersionId: id("d"),
    contentHash: "a".repeat(64),
    fields: [{ name: "Text", rawValue: "Something with no entity matches xyzzy" }],
    entities,
    refineComment: "should map a new concept called mineral homeostasis of skeleton",
  });
  assert.ok(
    draft.suggestions.some((s) => s.kind === "no_mapping"),
  );
  assert.ok(!draft.suggestions.some((s) => s.kind === "new_entity"));
  assert.equal(draft.suggestions[0]?.defaultSelected, false);
}

{
  const draft = buildKgDraftSuggestions({
    canonicalCardId: id("c"),
    canonicalCardVersionId: id("d"),
    contentHash: "a".repeat(64),
    fields: [
      {
        name: "Text",
        rawValue:
          "Functions of bone: 1) 2) 3) 4) Include the actual answers",
      },
    ],
    entities: [],
    refineComment: "also map protection and mineral storage",
  });
  assert.deepEqual(
    draft.suggestions.map((s) => s.kind),
    ["no_mapping"],
  );
  assert.equal(draft.suggestions[0]?.confidence, 0);
  assert.deepEqual(draft.ontologyGaps, []);
}

{
  const draft = buildKgDraftSuggestions({
    canonicalCardId: id("c"),
    canonicalCardVersionId: id("d"),
    contentHash: "a".repeat(64),
    fields: [
      {
        name: "Text",
        rawValue:
          "Four functions of bone:<br>{{c1::Attachment for muscles}}<br>{{c2::Protect organs}}<br>{{c3::Mineral reservoir}}<br>{{c4::Hematopoiesis}}",
      },
    ],
    entities,
  });
  assert.equal(draft.cardEvidence.stem, "Four functions of bone:");
  assert.deepEqual(draft.cardEvidence.answerConcepts, [
    "Attachment for muscles",
    "Protect organs",
    "Mineral reservoir",
    "Hematopoiesis",
  ]);
  assert.deepEqual(
    draft.ontologyGaps.map((gap) => gap.phrase),
    [
      "Attachment for muscles",
      "Protect organs",
      "Mineral reservoir",
      "Hematopoiesis",
    ],
  );
}

{
  const parts = acceptedDraftsToProposalParts([
    {
      id: "1",
      kind: "link_existing",
      confidence: 0.95,
      mappingRole: "teaches",
      canonicalEntityId: id("a"),
      label: "Bone",
      reasonCodes: ["x"],
      defaultSelected: true,
    },
  ]);
  assert.equal(parts.mappingChanges.length, 1);
  assert.equal(parts.mappingChanges[0]!.canonicalEntityId, id("a"));
  assert.equal(parts.kgExpansionSuggestion, null);
}

console.log("anki-kg-draft.test.ts: all assertions passed");
