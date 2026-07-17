import assert from "node:assert/strict";

import type { ProposalRecord } from "../../kg-automation-common.ts";
import { buildFinalizedProposalPacket, sha256 } from "../../build-finalized-kg-staging-packet.ts";
import { preflightProposals } from "../../apply-pilot-approved.ts";
import { semanticMismatch, semanticProposalShape } from "./kg-proposal-membership.ts";
import { applyPostReviewInput, relationshipKey } from "./kg-finalization/post-review-input.ts";
import type { MergedNeighborhoodDraft } from "./kg-compiler/types.ts";

const base: MergedNeighborhoodDraft = {
  topicKey: "test-topic", pilotKey: "test-pilot", generatedAt: "ignored",
  entities: [
    { slug: "condition-a", entityType: "condition", preferredLabel: "Condition A", metadata: {}, source: "spec" },
    { slug: "procedure-b", entityType: "procedure", preferredLabel: "Procedure B", metadata: {}, source: "spec" },
    { slug: "anatomy-c", entityType: "anatomy_structure", preferredLabel: "Anatomy C", metadata: { shared_reference: true }, source: "spec" },
  ],
  relationships: [
    { subjectSlug: "condition-a", predicate: "treated_by", objectSlug: "procedure-b", source: "spec" },
    { subjectSlug: "condition-a", predicate: "involves_anatomy", objectSlug: "anatomy-c", source: "spec" },
  ],
  claims: [{ draftId: "claim-a", claimType: "fact", claimText: "old", primaryEntitySlug: "condition-a", importanceLevel: "L2", contentSource: "generated_draft", reviewStatus: "needs_review" }],
  decisionPoints: [{ draftId: "dp-a", subjectEntitySlug: "condition-a", patternType: "treatment", trigger: "old", action: "old", urgency: "routine", safetyCriticality: "none", requiresAttendingReview: false }],
  conflicts: [],
  stats: { entityCount: 3, relationshipCount: 2, claimCount: 1, decisionPointCount: 1, bridgeCount: 0, duplicateEntitiesResolved: 0, conflictingRelationships: 0, metadataMerged: 0, provenanceAttached: 0 },
};

const overlay = {
  entities_omit_from_staging: [],
  relationships_remove: ["condition-a|treated_by|procedure-b"],
  relationships_add: [{ subject_slug: "procedure-b", predicate: "involves_anatomy", object_slug: "anatomy-c" }],
  claims_revised: [], decision_points_revised: [],
};
const graph = await applyPostReviewInput(base, overlay, "missing-overlay.json");
assert.deepEqual(graph.relationships.map(relationshipKey).sort(), ["condition-a|involves_anatomy|anatomy-c", "procedure-b|involves_anatomy|anatomy-c"]);

const decisions = [
  { proposal_fingerprint: "rel|condition-a|treated_by|procedure-b", decision: "REJECT", reviewer: "clinical" },
  { proposal_fingerprint: "rel|procedure-b|involves_anatomy|anatomy-c", decision: "APPROVE_WITH_REVISION", reviewer: "clinical" },
];
const auto = [
  ...graph.entities.map((entity) => ({ proposal_fingerprint: `create|${entity.entityType}|${entity.slug}`.toLowerCase(), category: "AUTO_APPROVE" })),
  { proposal_fingerprint: "rel|condition-a|involves_anatomy|anatomy-c", category: "AUTO_APPROVE" },
];
const first = buildFinalizedProposalPacket({ graph, pilotKey: "test-pilot", batchKey: "test-batch", curriculumNodeSlug: "test-node", primaryEntitySlug: "condition-a", decisions, autoReviewDecisions: auto });
const second = buildFinalizedProposalPacket({ graph, pilotKey: "test-pilot", batchKey: "test-batch", curriculumNodeSlug: "test-node", primaryEntitySlug: "condition-a", decisions, autoReviewDecisions: auto });
assert.deepEqual(first, second, "packet generation must be deterministic");
assert.equal(first.errors.length, 0);
assert.equal(new Set(first.proposals.map((proposal) => proposal.proposal_fingerprint)).size, first.proposals.length);
assert.ok(!first.proposals.some((proposal) => proposal.proposal_fingerprint === "rel|condition-a|treated_by|procedure-b"));
assert.equal(first.proposals.find((proposal) => proposal.proposal_fingerprint === "rel|procedure-b|involves_anatomy|anatomy-c")?.review_status, "approved");
assert.equal(first.proposals.filter((proposal) => ["propose_educational_claim", "propose_decision_point"].includes(proposal.proposal_type)).length, 0);
assert.ok(first.proposals.some((proposal) => proposal.metadata.shared_reference === true), "shared entity metadata must remain available for global reuse");
assert.equal(sha256(JSON.stringify(first)), sha256(JSON.stringify(second)));

const approvedClaim = { ...first.proposals[0], proposal_type: "propose_educational_claim", review_status: "approved" } as ProposalRecord;
assert.ok(preflightProposals([approvedClaim], false).some((error) => error.includes("Approved propose_educational_claim")), "canonical apply must reject approved claims in proof mode");
const duplicate = first.proposals[0];
assert.ok(preflightProposals([duplicate, duplicate], false).some((error) => error.includes("Duplicate fingerprint")));

const semantic = first.proposals[0];
assert.equal(semanticMismatch(semantic, { ...semantic, review_status: "applied", metadata: { ...semantic.metadata, pilot: "second-batch", staging_batch_key: "batch-2" } }), null, "batch and lifecycle metadata must not alter semantic identity");
assert.match(semanticMismatch(semantic, { ...semantic, proposed_entity_label: "Different Identity" }) ?? "", /semantic content mismatch/, "same fingerprint with different canonical meaning must abort");
assert.equal((semanticProposalShape(semantic) as any).slug, semantic.metadata.slug);

console.log("kg-staging-lifecycle.test.ts: all assertions passed", { proposals: first.proposals.length });
