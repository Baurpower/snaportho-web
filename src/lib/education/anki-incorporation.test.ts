import assert from "node:assert/strict";
import {
  ANKI_INCORPORATION_CONTRACT,
  buildIncorporationCandidate,
  validateAgentPlan,
} from "./anki-incorporation.ts";

const id = "11111111-1111-4111-8111-111111111111";
const hash = "a".repeat(64);
const proposal = {
  id,
  proposalEvidenceHash: hash,
  proposalKind: "edit_existing_card" as const,
  canonicalCardId: id,
  baseVersionId: id,
  editedFields: [
    { name: "Extra", value: "same" },
    { name: "SnapOrtho_ID", value: "local" },
  ],
  centralTagChanges: {
    add: ["SnapOrtho::Level::MS4"],
    remove: ["BasicScience"],
  },
  proposedDeckPath: null,
  mappingChanges: [],
  kgExpansionSuggestion: null,
};
const candidate = buildIncorporationCandidate(proposal, {
  cardOrdinal: 0,
  currentVersionId: id,
  currentFields: [
    { name: "Text", rawValue: "Question" },
    { name: "Extra", rawValue: "same" },
    { name: "SnapOrtho_ID", rawValue: "" },
  ],
  currentTags: [],
  currentDeckPath: "SnapOrtho::Bones",
  activeEntityIds: new Set(),
});
assert.equal(candidate.result, "ready");
assert.deepEqual(
  candidate.operations.map((operation) => operation.kind),
  ["add_tag"],
);
assert.equal(candidate.finalState.deckPath, "SnapOrtho::Bones");
assert.equal(candidate.ignoredOperations.length, 3);
assert.deepEqual(
  validateAgentPlan(candidate, {
    contractVersion: ANKI_INCORPORATION_CONTRACT,
    proposalId: id,
    proposalEvidenceHash: hash,
    result: "incorporate",
    acceptedOperationIds: candidate.operations.map((operation) => operation.id),
    ignoredOperationIds: [],
    issues: [],
  }),
  [],
);

const unsafe = buildIncorporationCandidate(
  { ...proposal, kgExpansionSuggestion: { label: "Invented" } },
  {
    cardOrdinal: 0,
    currentVersionId: id,
    currentFields: [{ name: "Text", rawValue: "Question" }],
    currentTags: [],
    currentDeckPath: "SnapOrtho::Bones",
    activeEntityIds: new Set(),
  },
);
assert.equal(unsafe.result, "needs_attention");

console.log("anki-incorporation.test.ts: all assertions passed");
