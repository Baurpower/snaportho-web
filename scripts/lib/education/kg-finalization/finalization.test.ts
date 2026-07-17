import assert from "node:assert/strict";
import { validateRelationshipTriple } from "../kg-relationship-registry.ts";
import { evaluateReadinessGates } from "./readiness-gates.ts";
import { dedupeRootCauses } from "./root-cause-deduper.ts";
import { blocksStaging } from "./severity.ts";
import { canonicalSemanticKey, inheritReviewDecision } from "./review-inheritance.ts";
import { ConnectivityAgent } from "./connectivity-agent.ts";
import { GraphFinalizationPipeline } from "./pipeline.ts";
import type { GraphFinalizationAgentReport, GraphFinalizationInput, PriorReviewDecision } from "./types.ts";

const baseInput: GraphFinalizationInput = {
  neighborhoodId: "test",
  entities: [],
  relationships: [],
  claims: [],
  decisionPoints: [],
  canonicalRegistry: [],
  aliases: [],
  predicateRegistry: {},
  sourceManifest: [],
  priorReviewDecisions: [{ proposal_fingerprint: "relationship|a|treated_by|b", decision: "APPROVE", applied: true }],
  neighborhoodMetadata: { reviewOverlayApplied: true },
};

const report = (partial: Partial<GraphFinalizationAgentReport>): GraphFinalizationAgentReport => ({
  agent: partial.agent ?? "TestAgent",
  generatedAt: new Date().toISOString(),
  result: partial.result ?? { approved: [], modified: [], rejected: [], escalations: [], warnings: [], metrics: {} as never },
  artifacts: partial.artifacts ?? {},
});

const provenanceReport = report({
  agent: "SourceProvenanceAgent",
  artifacts: {
    unsupported_objects: [
      { fingerprint: "claim|1", objectKind: "claim", missingDraftFields: [], missingPublicationFields: ["source_identifier"] },
      { fingerprint: "claim|2", objectKind: "claim", missingDraftFields: [], missingPublicationFields: ["source_identifier"] },
    ],
  },
});
const rootCauses = dedupeRootCauses([provenanceReport]);
assert.equal(rootCauses.length, 1);
assert.equal(rootCauses[0].affected_objects, 2);
assert.equal(rootCauses[0].staging_blocker, false);
assert.equal(rootCauses[0].publication_blocker, true);

assert.equal(blocksStaging({ severity: "LOW", disposition: "WARNING" }), false);
assert.equal(blocksStaging({ severity: "HIGH", disposition: "ACTION_REQUIRED" }), true);

const gates = evaluateReadinessGates(baseInput, [provenanceReport], rootCauses);
assert.equal(gates.ready_for_staged_manufacturing, true);
assert.equal(gates.ready_for_publication, false);

const prior: PriorReviewDecision = { proposal_fingerprint: "relationship|a|treated_by|b", decision: "APPROVE", applied: true };
const candidate = {
  fingerprint: "relationship|a|treated_by|b",
  alternateFingerprints: [],
  proposalType: "relationship",
  canonicalSubject: "a",
  canonicalPredicate: "treated_by",
  canonicalObject: "b",
  riskClass: "needs_review",
  evidenceClass: "spec",
};
assert.equal(inheritReviewDecision(candidate, new Map([[prior.proposal_fingerprint, prior]]), new Map()).mode, "exact");

const semantic = new Map([[canonicalSemanticKey(candidate), prior]]);
assert.equal(inheritReviewDecision({ ...candidate, fingerprint: "relationship|alias-a|treated_by|b" }, new Map(), semantic).mode, "semantic");
assert.equal(
  inheritReviewDecision({ ...candidate, fingerprint: "relationship|a|treated_by|broad-b", canonicalObject: "broad-b" }, new Map(), semantic).mode,
  "none"
);

assert.equal(
  validateRelationshipTriple({
    subjectEndpointType: "canonical_entity",
    subjectEntityType: "condition",
    predicate: "not_a_predicate",
    objectEndpointType: "canonical_entity",
    objectEntityType: "procedure",
  }).valid,
  false
);
assert.equal(
  validateRelationshipTriple({
    subjectEndpointType: "canonical_entity",
    subjectEntityType: "condition",
    predicate: "at_risk_structure",
    objectEndpointType: "canonical_entity",
    objectEntityType: "anatomy_structure",
  }).valid,
  true
);

const orphanReport = report({
  agent: "ConnectivityAgent",
  artifacts: { orphan_report: [{ fingerprint: "entity|condition|placeholder", slug: "placeholder", stagingBlocker: true }] },
});
assert.equal(dedupeRootCauses([orphanReport])[0].staging_blocker, true);

const connectivityInput: GraphFinalizationInput = {
  ...baseInput,
  entities: [
    {
      slug: "abductor-pollicis-brevis",
      entityType: "anatomy_structure",
      preferredLabel: "Abductor Pollicis Brevis",
      description: "Thenar muscle.",
      metadata: { review_status: "needs_review" },
      source: "spec",
    },
    {
      slug: "mystery-placeholder",
      entityType: "anatomy_structure",
      preferredLabel: "Mystery Placeholder",
      metadata: {},
      source: "proposal",
    },
  ],
  claims: [
    {
      draftId: "claim-apb",
      claimType: "exam",
      claimText: "Thenar motor examination can reference APB.",
      primaryEntitySlug: "abductor-pollicis-brevis",
      importanceLevel: "L2",
      contentSource: "test",
      reviewStatus: "needs_review",
    },
  ],
};
const connectivityReport = ConnectivityAgent.run(connectivityInput, { startedAt: new Date().toISOString(), reports: [], fatal: false });
assert.equal(connectivityReport.artifacts.orphan_report.some((item) => item.slug === "abductor-pollicis-brevis"), false);
assert.equal(connectivityReport.artifacts.orphan_report.find((item) => item.slug === "mystery-placeholder")?.stagingBlocker, true);

const explicitSharedReferenceInput: GraphFinalizationInput = {
  ...connectivityInput,
  claims: [],
};
const explicitSharedReport = ConnectivityAgent.run(explicitSharedReferenceInput, { startedAt: new Date().toISOString(), reports: [], fatal: false });
const apbOrphan = explicitSharedReport.artifacts.orphan_report.find((item) => item.slug === "abductor-pollicis-brevis");
assert.equal(apbOrphan?.finalDisposition, "cross_neighborhood_reference");
assert.equal(apbOrphan?.stagingBlocker, false);
assert.equal(apbOrphan?.publicationBlocker, true);

const testPipeline = new GraphFinalizationPipeline([ConnectivityAgent]);
const pipelineResult = testPipeline.run(explicitSharedReferenceInput);
assert.equal(
  (pipelineResult.reports[0].artifacts.orphan_report as Array<Record<string, unknown>>).find((item) => item.slug === "abductor-pollicis-brevis")?.stagingBlocker,
  false
);

console.log("kg-finalization calibration tests passed");
