import assert from "node:assert/strict";

import { compileNeighborhood } from "./compiler.ts";

const result = await compileNeighborhood({ topic: "ankle-fracture" });

assert.equal(result.plan.topicKey, "ankle-fracture");
assert.equal(result.plan.constraints.databaseModified, false);
assert.equal(result.plan.constraints.autoPublished, false);

assert.ok(result.neighborhoodPlan.nodes.length >= 15, "expected resolved neighborhood entities");
assert.ok(result.neighborhoodPlan.roles.neighboring_anatomy.length >= 5, "expected anatomy hub");
assert.ok(result.neighborhoodPlan.roles.primary_condition.includes("ankle-fracture"));

assert.ok(result.gaps.length > 0, "compiler should identify ontology gaps");
const gapKinds = new Set(result.gaps.map((g) => g.kind));
assert.ok(gapKinds.has("missing_metadata") || gapKinds.has("missing_relationship") || gapKinds.has("missing_claim"));
assert.ok(
  result.gaps.some((g) => g.kind === "missing_relationship" && g.predicate === "has_grade") ||
    result.gaps.some((g) => g.ontologyRule === "classification.grade.link_all"),
  "should detect missing grade links"
);
assert.ok(
  result.gaps.some((g) => g.kind === "missing_claim" && g.anchorEntitySlug === "mortise-stability") ||
    result.gaps.some((g) => g.reason.toLowerCase().includes("mortise")),
  "should detect missing mortise instability claim"
);

assert.ok(result.workPlan.workItems.length >= 3, "expected work plan with multiple agents");
assert.ok(result.workPlan.agentSummary["Relationship Builder"] >= 1);
assert.ok(result.workPlan.executionOrder.includes("work-review-assistant"));
assert.ok(result.workPlan.executionOrder.includes("work-publication-validator"));
assert.ok(result.workPlan.executionOrder.includes("work-duplicate-detector"));
assert.ok(result.agentExecution, "agent execution completed");
assert.equal(result.plan.stages[4].status, "completed");

assert.ok(result.mergedDraft.stats.entityCount >= 15);
assert.ok(result.mergedDraft.stats.relationshipCount >= 20);
assert.ok(result.mergedDraft.stats.claimCount >= 5);
assert.ok(result.mergedDraft.stats.decisionPointCount >= 2);

assert.ok(result.autoReview.summary.AUTO_APPROVE > 0, "expected auto-approved proposals");
assert.ok(result.autoReview.summary.EXPERT_REVIEW >= 2, "expected expert review for DPs");
assert.ok(result.autoReview.humanReviewPercent < 100, "human review should not be 100%");
assert.ok(result.autoReview.autoApprovedPercent > 0, "expected some auto-approval");

assert.ok(result.humanReviewItems.length > 0);
assert.ok(result.humanReviewItems.length < result.plan.review.totalProposals);

assert.ok(result.publication.currentLevel >= 4, "spec-level maturity should be >= 4");
assert.equal(result.publication.requiredLevel, 7);
assert.equal(result.publication.ready, false, "pilot should not be publication-ready yet");
assert.ok(result.publication.blockers.length > 0);

const requiredAgents = result.plan.workPlan.agentsRequired;
assert.ok(requiredAgents.includes("Relationship Builder"));
assert.ok(requiredAgents.includes("Review Assistant"));
assert.ok(requiredAgents.includes("Publication Validator"));

console.log("kg-compiler/compiler.test.ts: all assertions passed");
console.log(
  JSON.stringify(
    {
      gaps: result.gaps.length,
      autoApproved: result.autoReview.summary.AUTO_APPROVE,
      humanReviewPercent: result.autoReview.humanReviewPercent,
      maturity: result.publication.currentLevel,
      blockers: result.publication.blockers.length,
    },
    null,
    2
  )
);