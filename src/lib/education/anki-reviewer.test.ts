/* eslint-disable @typescript-eslint/ban-ts-comment -- Runtime tests deliberately exercise invalid payload shapes. */
// @ts-nocheck Runtime tests deliberately exercise invalid payload shapes.
import assert from "node:assert/strict";
// @ts-expect-error direct test import
import {
  mappingReviewSchema,
  changeProposalSchema,
  workspaceProposalSchema,
  workspaceReviewSchema,
  workspaceProposalEvidenceHash,
  validateSubmissionContext,
  assignmentComplete,
  safeReviewerMetadata,
  REVIEWER_CONTRACT_VERSION,
} from "./anki-reviewer.ts";
const id = (d: string) =>
  `${d.repeat(8)}-${d.repeat(4)}-4${d.repeat(3)}-8${d.repeat(3)}-${d.repeat(12)}`;
const base = {
  contractVersion: REVIEWER_CONTRACT_VERSION,
  canonicalCardId: id("1"),
  canonicalCardVersionId: id("2"),
  baseContentHash: "a".repeat(64),
  canonicalEntityId: id("3"),
  mappingRole: "teaches",
  decision: "approved",
  confidence: 0.96,
  noMappingClassification: null,
  ambiguityResolution: "resolved",
  reasonCodes: ["reviewed"],
  notes: "",
  evidenceHashes: ["b".repeat(64)],
  idempotencyKey: id("4"),
  clientVersion: "0.1.0",
  localIdentity: {
    noteGuid: "guid",
    cardOrdinal: 0,
    contentHash: "a".repeat(64),
  },
};
assert.equal(mappingReviewSchema.safeParse(base).success, true);
assert.equal(
  mappingReviewSchema.safeParse({
    ...base,
    canonicalEntityId: null,
    mappingRole: null,
  }).success,
  false,
);
assert.equal(
  mappingReviewSchema.safeParse({ ...base, reviewerIdentity: "forged" })
    .success,
  false,
);
const ctx = {
    userId: id("5"),
    deviceLinkId: id("6"),
    deviceTokenId: id("7"),
    roles: ["mapping_reviewer", "clinical_editor"],
    active: true,
    reviewerStatus: "active",
    qualificationSnapshot: { verified: true },
  },
  item = {
    assignmentReviewerId: id("5"),
    assignmentStatus: "assigned",
    itemStatus: "pending",
    canonicalCardId: id("1"),
    canonicalCardVersionId: id("2"),
    baseContentHash: "a".repeat(64),
    noteGuid: "guid",
    cardOrdinal: 0,
    cardActive: true,
    currentVersionId: id("2"),
    entityActive: true,
    evidenceHashes: ["b".repeat(64)],
    acceptedProposalExists: false,
  };
assert.equal(
  validateSubmissionContext(ctx, item, base, "mapping_reviewer"),
  null,
);
assert.equal(
  validateSubmissionContext(
    { ...ctx, userId: id("8") },
    item,
    base,
    "mapping_reviewer",
  ),
  "permission_changed",
);
assert.equal(
  validateSubmissionContext(
    ctx,
    { ...item, currentVersionId: id("9") },
    base,
    "mapping_reviewer",
  ),
  "server_version_changed",
);
assert.equal(
  validateSubmissionContext(
    ctx,
    item,
    {
      ...base,
      localIdentity: { ...base.localIdentity, contentHash: "c".repeat(64) },
    },
    "mapping_reviewer",
  ),
  "local_content_changed",
);
assert.equal(
  validateSubmissionContext(
    ctx,
    { ...item, entityActive: false },
    base,
    "mapping_reviewer",
  ),
  "entity_inactive",
);
assert.equal(
  assignmentComplete([
    "decision_saved",
    "change_proposed",
    "submitted",
    "skipped",
  ]),
  true,
);
assert.equal(assignmentComplete(["pending"]), false);
assert.equal(safeReviewerMetadata({ reasonCodes: ["ok"] }), true);
assert.equal(safeReviewerMetadata({ front: "body" }), false);
const proposal = {
  contractVersion: REVIEWER_CONTRACT_VERSION,
  canonicalCardId: id("1"),
  canonicalCardVersionId: id("2"),
  baseContentHash: "a".repeat(64),
  changeType: "content_edit",
  status: "draft",
  editedFields: [{ name: "Front", value: "edited" }],
  tags: [],
  proposedDeckPath: null,
  reasonCodes: ["clarity"],
  notes: "",
  newContentHash: "d".repeat(64),
  idempotencyKey: id("4"),
  clientVersion: "0.1.0",
  localIdentity: base.localIdentity,
};
assert.equal(changeProposalSchema.safeParse(proposal).success, true);
assert.equal(
  changeProposalSchema.safeParse({ ...proposal, status: "incorporated" })
    .success,
  false,
);
console.log("anki-reviewer.test.ts: all assertions passed");
const workspace = {
  contractVersion: REVIEWER_CONTRACT_VERSION,
  proposalKind: "edit_existing_card",
  sourceSurface: "reviewer",
  baseCard: {
    canonicalCardId: id("1"),
    canonicalCardVersionId: id("2"),
    contentHash: "a".repeat(64),
  },
  localIdentity: base.localIdentity,
  editedFields: [{ name: "Front", value: "edited" }],
  centralTagChanges: { add: ["SnapOrtho::Foot"], remove: [] },
  proposedDeckPath: "SnapOrtho::Foot",
  mappingChanges: [
    {
      action: "add",
      canonicalEntityId: id("3"),
      mappingRole: "teaches",
      useExpansionSuggestion: false,
      rationale: "direct review",
      confidence: 0.99,
    },
  ],
  kgExpansionSuggestion: null,
  notes: "",
  idempotencyKey: id("4"),
  clientVersion: "0.3.0",
};
assert.equal(workspaceProposalSchema.safeParse(workspace).success, true);
assert.equal(
  workspaceProposalSchema.safeParse({ ...workspace, personalTags: ["mine"] })
    .success,
  false,
);
assert.equal(
  workspaceProposalSchema.safeParse({
    ...workspace,
    proposalKind: "create_missing_card",
  }).success,
  false,
);
assert.equal(
  workspaceProposalSchema.safeParse({
    ...workspace,
    proposalKind: "create_missing_card",
    baseCard: null,
  }).success,
  true,
);
console.log("anki-reviewer.test.ts: all assertions passed");
const evidence = workspaceProposalEvidenceHash(workspace);
assert.match(evidence, /^[a-f0-9]{64}$/);
assert.equal(workspaceProposalEvidenceHash(workspace), evidence);
assert.notEqual(
  workspaceProposalEvidenceHash({ ...workspace, notes: "changed" }),
  evidence,
);
assert.equal(
  workspaceReviewSchema.safeParse({
    contractVersion: REVIEWER_CONTRACT_VERSION,
    decision: "approve_for_incorporation",
    proposalEvidenceHash: evidence,
    reasonCodes: ["direct_review"],
    notes: "",
    idempotencyKey: id("9"),
    clientVersion: "0.4.0",
  }).success,
  true,
);
assert.equal(
  workspaceReviewSchema.safeParse({
    contractVersion: REVIEWER_CONTRACT_VERSION,
    decision: "publish",
    proposalEvidenceHash: evidence,
    reasonCodes: [],
    notes: "",
    idempotencyKey: id("9"),
    clientVersion: "0.4.0",
  }).success,
  false,
);
