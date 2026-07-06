import assert from "node:assert/strict";

import { compileNeighborhood } from "../kg-compiler/compiler.ts";
import { analyzeGaps } from "../kg-compiler/gap-analyzer.ts";
import { buildWorkPlan } from "../kg-compiler/work-planner.ts";
import { reviewProposal } from "../kg-compiler/review-engine.ts";
import { buildAnkleProposalPacket } from "../kg-factory/proposal-builder.ts";
import { ANKLE_PILOT_KEY } from "../kg-ankle-pilot-spec.ts";
import { resolveTopic } from "../kg-compiler/topic-registry.ts";
import type { OntologyGap } from "../kg-compiler/types.ts";
import {
  buildAgentAssignmentPlan,
  buildUnmetAgentCapabilities,
} from "./agent-reports.ts";
import { RelationshipBuilderAgent } from "./agents/relationship-builder.ts";
import { MetadataBuilderAgent } from "./agents/metadata-builder.ts";
import { createGapAgent } from "./agents/gap-stub-agent.ts";
import { scoreGapMatch } from "./matching.ts";
import {
  validateProposalEnvelope,
  wrapProposal,
} from "./proposal-contract.ts";
import { validateWorkAssignment } from "./validation.ts";
import { getAgentRegistry, resetAgentRegistry } from "./registry.ts";
import {
  registerDefaultAgents,
  resetDefaultAgentRegistration,
} from "./register-default-agents.ts";
import { FRAMEWORK_CONTRACT_VERSION } from "./versioning.ts";

resetAgentRegistry();
registerDefaultAgents();

const registry = getAgentRegistry();
assert.ok(registry.list().length >= 13, "expected default agents registered including quality agents");

// ---------------------------------------------------------------------------
// Registry: exact match
// ---------------------------------------------------------------------------

const relAgent = registry.get("relationship-builder");
assert.ok(relAgent, "relationship-builder registered");
assert.ok(relAgent!.capabilities.autoApprovalPatterns?.includes("part_of"));

const topic = resolveTopic("ankle-fracture")!;
const snapshot = topic.loadSnapshot();
const packet = buildAnkleProposalPacket();
const gaps = analyzeGaps(snapshot, packet.proposals);

const relGap = gaps.find((g) => g.kind === "missing_relationship");
if (relGap) {
  const resolved = registry.resolveForGap(relGap);
  assert.equal(resolved?.identity.id, "relationship-builder", "exact relationship match");
  const candidates = registry.resolveCandidatesForGap(relGap);
  assert.equal(candidates[0]?.agent.identity.id, "relationship-builder");
}

const anatomyGap = gaps.find(
  (g) => g.kind === "missing_entity" && g.entityType === "anatomy_structure"
);
if (anatomyGap) {
  const resolved = registry.resolveForGap(anatomyGap);
  assert.equal(resolved?.identity.id, "anatomy-builder", "anatomy entity exact match");
}

// ---------------------------------------------------------------------------
// Registry: prefix opt-in only
// ---------------------------------------------------------------------------

const nonAnatomyEntityGap: OntologyGap = {
  id: "test-non-anatomy-entity",
  kind: "missing_entity",
  priority: "medium",
  confidence: 0.8,
  reason: "test condition entity",
  requiredReviewer: "none",
  maturityImpact: 0.1,
  ontologyRule: "condition.missing_entity",
  entityType: "condition",
  entitySlug: "test-condition",
};

const anatomyBuilder = registry.get("anatomy-builder")!;
const anatomyMatch = scoreGapMatch(anatomyBuilder.capabilities, nonAnatomyEntityGap);
assert.equal(anatomyMatch.matches, false, "prefix agent must not match non-prefix gaps");

const clinicalResolved = registry.resolveForGap(nonAnatomyEntityGap);
assert.equal(
  clinicalResolved?.identity.id,
  "clinical-entity-builder",
  "non-anatomy entity falls to clinical builder"
);

const anatomyPrefixGap: OntologyGap = {
  ...nonAnatomyEntityGap,
  id: "test-anatomy-entity",
  ontologyRule: "anatomy.missing_entity",
  entityType: "anatomy_structure",
  entitySlug: "test-anatomy",
};
assert.equal(
  registry.resolveForGap(anatomyPrefixGap)?.identity.id,
  "anatomy-builder",
  "prefix agent matches anatomy-prefixed gap"
);

// ---------------------------------------------------------------------------
// Registry: generic fallback last
// ---------------------------------------------------------------------------

resetAgentRegistry();
const testRegistry = getAgentRegistry();
testRegistry.register(
  createGapAgent({
    id: "specialized-entity",
    name: "Specialized Entity",
    description: "Handles condition entities only",
    handlesGapKinds: ["missing_entity"],
    handlesEntityTypes: ["condition"],
    produces: ["entities"],
    consumes: ["neighborhood_snapshot", "work_assignment"],
    requires: [],
    proposalTypes: ["create_canonical_entity"],
    confidenceRange: { min: 0.8, max: 0.9 },
    validationCategories: ["ontology"],
  })
);
testRegistry.register(
  createGapAgent({
    id: "generic-entity",
    name: "Generic Entity",
    description: "Generic fallback",
    handlesGapKinds: ["missing_entity"],
    isGenericFallback: true,
    produces: ["entities"],
    consumes: ["neighborhood_snapshot", "work_assignment"],
    requires: [],
    proposalTypes: ["create_canonical_entity"],
    confidenceRange: { min: 0.7, max: 0.8 },
    validationCategories: ["ontology"],
  })
);

const conditionGap: OntologyGap = {
  id: "cond-gap",
  kind: "missing_entity",
  priority: "high",
  confidence: 0.85,
  reason: "missing condition",
  requiredReviewer: "none",
  maturityImpact: 0.2,
  ontologyRule: "condition.entity",
  entityType: "condition",
};
const genericOnlyGap: OntologyGap = {
  ...conditionGap,
  id: "proc-gap",
  entityType: "procedure",
  ontologyRule: "procedure.entity",
};

assert.equal(
  testRegistry.resolveForGap(conditionGap)?.identity.id,
  "specialized-entity",
  "specialized wins over generic"
);
assert.equal(
  testRegistry.resolveForGap(genericOnlyGap)?.identity.id,
  "generic-entity",
  "generic matches when no specialist"
);

resetAgentRegistry();
resetDefaultAgentRegistration();
registerDefaultAgents();

// ---------------------------------------------------------------------------
// Registry: false-positive guards
// ---------------------------------------------------------------------------

const claimGap: OntologyGap = {
  id: "claim-gap-test",
  kind: "missing_claim",
  priority: "medium",
  confidence: 0.7,
  reason: "missing claim",
  requiredReviewer: "curator",
  maturityImpact: 0.15,
  ontologyRule: "claim.mortise",
  anchorEntitySlug: "mortise-stability",
};
assert.notEqual(
  registry.resolveForGap(claimGap)?.identity.id,
  "relationship-builder",
  "relationship agent must not match claim gaps"
);

const entityGap: OntologyGap = {
  id: "entity-gap-test",
  kind: "missing_entity",
  priority: "medium",
  confidence: 0.8,
  reason: "missing entity",
  requiredReviewer: "none",
  maturityImpact: 0.1,
  ontologyRule: "condition.entity",
  entityType: "condition",
};
const metadataAgent = registry.get("metadata-builder")!;
assert.equal(
  scoreGapMatch(metadataAgent.capabilities, entityGap).matches,
  false,
  "metadata agent must not match entity gaps"
);

// ---------------------------------------------------------------------------
// Work plan + assignment reports
// ---------------------------------------------------------------------------

const plan = buildWorkPlan("ankle-fracture", ANKLE_PILOT_KEY, gaps);
assert.ok(plan.registryDiscovery && plan.registryDiscovery.length >= 10);
assert.ok(plan.workItems.every((w) => w.agentId), "every work item has agentId");
assert.ok(plan.workItems.some((w) => w.agentId === "relationship-builder"));

const reviewItem = plan.workItems.find((w) => w.agentId === "review-assistant");
const pubItem = plan.workItems.find((w) => w.agentId === "publication-validator");
assert.ok(reviewItem);
assert.ok(pubItem);
assert.ok(pubItem!.dependencies.includes(reviewItem!.id));

const assignmentPlan = buildAgentAssignmentPlan(
  "ankle-fracture",
  ANKLE_PILOT_KEY,
  gaps,
  plan,
  registry
);
assert.ok(assignmentPlan.assignments.length >= 1);
assert.ok(assignmentPlan.assignments.some((a) => a.agentId === "relationship-builder"));

const unmet = buildUnmetAgentCapabilities("ankle-fracture", gaps, registry);
assert.ok(Array.isArray(unmet.unmetGaps));
assert.ok(unmet.registeredCapabilities.length >= 10);

// ---------------------------------------------------------------------------
// ProposalEnvelope + WorkAssignment validation
// ---------------------------------------------------------------------------

const wrapped = wrapProposal(packet.proposals[0]);
assert.equal(wrapped.schemaVersion, "1.0.0");
assert.ok(wrapped.confidenceExplanation.length > 0);
assert.ok(wrapped.reviewRecommendation.rationale.length > 0);
assert.ok(wrapped.reviewRecommendation.route);
assert.ok(typeof wrapped.reviewRecommendation.safetyScore === "number");
assert.equal(wrapped.proposal.metadata?.verified, undefined);

const envelopeValidation = validateProposalEnvelope(wrapped);
assert.equal(envelopeValidation.passed, true);

const workAssignment = plan.workItems.find((w) => w.agentId === "relationship-builder")!;
const assignmentValidation = validateWorkAssignment({
  id: workAssignment.id,
  type: "gap_resolution",
  priority: workAssignment.priority,
  dependencies: workAssignment.dependencies,
  requiredInputs: workAssignment.requiredInputs as import("./contract.ts").ConsumesCapability[],
  requiredOutputs: workAssignment.requiredOutputs as import("./contract.ts").ProducesCapability[],
  estimatedComplexity: "medium",
  estimatedConfidence: workAssignment.estimatedConfidence,
  ontologyReferences: [],
  validationRules: workAssignment.validationRules,
  requiredReviewer: "none",
  publicationImpact: 0.1,
  gapIds: workAssignment.gapIds,
  gaps: gaps.filter((g) => workAssignment.gapIds.includes(g.id)),
  assignedAgentId: "relationship-builder",
});
assert.equal(assignmentValidation.passed, true);

// ---------------------------------------------------------------------------
// Review engine deterministic routing + ProposalEnvelope compatibility
// ---------------------------------------------------------------------------

const relProposal = packet.proposals.find((p) => p.proposal_type === "add_canonical_relationship");
if (relProposal) {
  const decision = reviewProposal(relProposal);
  assert.ok(decision.rationale.length > 0);
  assert.ok(typeof decision.confidence === "number");
  assert.ok(typeof decision.safetyCriticality === "number");
  const envelope = wrapProposal(relProposal);
  assert.ok(
    [
      "AUTO_APPROVED_LOW_RISK",
      "AUTO_REVISED",
      "HUMAN_REVIEW",
      "ATTENDING_REVIEW",
      "REJECT",
      "CONFLICTED",
    ].includes(envelope.reviewRecommendation.route)
  );
}

const conflictProposal = {
  ...packet.proposals[0],
  conflict_count: 3,
};
const conflictEnvelope = wrapProposal(conflictProposal);
assert.equal(conflictEnvelope.reviewRecommendation.route, "CONFLICTED");

// ---------------------------------------------------------------------------
// Compiler integration
// ---------------------------------------------------------------------------

const compileResult = await compileNeighborhood({ topic: "ankle-fracture" });
assert.ok(compileResult.plan.workPlan.agentIds?.includes("relationship-builder"));
assert.ok(compileResult.plan.workPlan.registryDiscovery?.length);
assert.ok(compileResult.workPlan.agentSummary["Relationship Builder"] >= 1);
assert.ok(compileResult.agentExecution, "stage 5 agent execution report present");
assert.ok(compileResult.agentExecution!.entries.length >= 8, "agents executed");
assert.ok(compileResult.agentExecution!.completedAgents >= 6, "majority of agents completed");
assert.equal(compileResult.plan.stages[4].status, "completed", "stage 5 completed");
assert.ok(compileResult.agentProposals && compileResult.agentProposals.length > 0);
assert.ok(compileResult.conflictReport);

// ---------------------------------------------------------------------------
// Reference agent lifecycle
// ---------------------------------------------------------------------------

const relBuilder = new RelationshipBuilderAgent();
const input = {
  neighborhood: snapshot,
  existingProposals: packet.proposals,
  gaps,
  compiler: {
    topicKey: "ankle-fracture",
    pilotKey: ANKLE_PILOT_KEY,
    displayName: "Ankle Fracture",
    primaryEntitySlug: "ankle-fracture",
    targetMaturityLevel: 7,
    compilerVersion: "1.0.0",
    frameworkVersion: FRAMEWORK_CONTRACT_VERSION,
    ontologyVersion: "2026-07-05",
    generatedAt: new Date().toISOString(),
  },
};
const assignment = plan.workItems.find((w) => w.agentId === "relationship-builder")!;
const result = await relBuilder.execute(input, {
  id: assignment.id,
  type: "gap_resolution",
  priority: assignment.priority,
  dependencies: assignment.dependencies,
  requiredInputs: assignment.requiredInputs as import("./contract.ts").ConsumesCapability[],
  requiredOutputs: assignment.requiredOutputs as import("./contract.ts").ProducesCapability[],
  estimatedComplexity: "medium",
  estimatedConfidence: assignment.estimatedConfidence,
  ontologyReferences: [],
  validationRules: assignment.validationRules,
  requiredReviewer: "none",
  publicationImpact: 0.1,
  gapIds: assignment.gapIds,
  gaps: gaps.filter((g) => assignment.gapIds.includes(g.id)),
  assignedAgentId: "relationship-builder",
});

assert.ok(["completed", "partial"].includes(result.status));
assert.ok(result.metrics.executionTimeMs >= 0);
assert.ok(result.auditTrail.entries.length >= 3);
assert.ok(result.proposals.every((p) => p.reviewRecommendation.route));

const metadataBuilder = new MetadataBuilderAgent();
assert.equal(
  metadataBuilder.canHandle({ type: "gap_resolution", gaps: [{ ...entityGap, kind: "missing_metadata", ontologyRule: "metadata.weight" }] }),
  true
);
assert.equal(metadataBuilder.canHandle({ type: "gap_resolution", gaps: [entityGap] }), false);

console.log("agent-framework.test.ts: all assertions passed");
console.log(
  JSON.stringify(
    {
      agents: registry.list().length,
      workItems: plan.workItems.length,
      unmetGaps: unmet.unmetCount,
      registryIds: plan.registryDiscovery?.map((a) => a.id),
    },
    null,
    2
  )
);