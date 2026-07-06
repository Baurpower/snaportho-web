/**
 * Conflict Resolver — escalates merge and proposal conflicts (v1 conservative).
 */

import type { ProposalRecord } from "../../../../kg-automation-common.ts";
import type { AgentCapability, AgentIdentity, AgentInputBundle, WorkAssignment } from "../contract.ts";
import { BaseKnowledgeFactoryAgent } from "../lifecycle.ts";
import {
  FRAMEWORK_CONTRACT_VERSION,
  MIN_COMPILER_VERSION,
  PROPOSAL_SCHEMA_VERSION,
  SUPPORTED_ONTOLOGY_VERSION,
} from "../versioning.ts";

const IDENTITY: AgentIdentity = {
  id: "conflict-resolver",
  name: "Conflict Resolver",
  version: "1.0.0",
  description: "Detects irreconcilable proposal conflicts and escalates for human resolution.",
  owner: "knowledge-factory",
  supportedOntologyVersion: SUPPORTED_ONTOLOGY_VERSION,
  versions: {
    contractVersion: FRAMEWORK_CONTRACT_VERSION,
    ontologyVersion: SUPPORTED_ONTOLOGY_VERSION,
    minCompilerVersion: MIN_COMPILER_VERSION,
    proposalSchemaVersion: PROPOSAL_SCHEMA_VERSION,
  },
};

const CAPABILITIES: AgentCapability = {
  produces: ["quality_metrics"],
  consumes: ["proposal_packets", "merged_neighborhood_draft", "work_assignment"],
  handlesGapKinds: [],
  requires: ["duplicate-detector"],
  confidenceRange: { min: 0.8, max: 0.95 },
  validationCategories: ["safety", "publication"],
  proposalTypes: [],
};

export class ConflictResolverAgent extends BaseKnowledgeFactoryAgent {
  readonly identity = IDENTITY;
  readonly capabilities = CAPABILITIES;

  canHandle(assignment: Pick<WorkAssignment, "gaps" | "type" | "assignedAgentId">): boolean {
    return assignment.type === "quality_scoring" && assignment.assignedAgentId === "conflict-resolver";
  }

  protected async run(input: AgentInputBundle, _assignment: WorkAssignment) {
    const proposals = input.existingProposals ?? [];
    const mergeConflicts = input.mergedNeighborhoodDraft?.conflicts ?? [];

    const proposalConflicts = proposals
      .filter((p) => p.conflict_count >= 2)
      .map((p) => ({
        kind: "proposal_source_conflict",
        proposalId: p.proposal_fingerprint,
        conflictCount: p.conflict_count,
        severity: p.conflict_count >= 3 ? "high" : "medium",
        route: "CONFLICTED",
      }));

    const escalations = [
      ...mergeConflicts.map((c) => ({
        kind: c.kind,
        description: c.description,
        severity: "medium" as const,
        route: "CONFLICTED" as const,
      })),
      ...proposalConflicts,
    ];

    const safetyConflicts = proposals.filter(
      (p) =>
        p.proposal_type === "propose_decision_point" ||
        (p.proposal_type === "add_canonical_relationship" &&
          ["indicates_treatment", "must_protect_during", "at_risk_structure"].includes(
            String(p.proposed_predicate ?? "")
          ))
    ).length;

    return {
      proposals: [] as ProposalRecord[],
      outputs: {
        qualityMetrics: {
          conflictResolver: {
            mergeConflicts: mergeConflicts.length,
            proposalConflicts: proposalConflicts.length,
            safetySensitive: safetyConflicts,
            totalEscalations: escalations.length,
          },
        },
        conflictReport: {
          generatedAt: new Date().toISOString(),
          escalations,
          safetyConflicts,
          autoResolvable: 0,
          requiresHumanReview: escalations.length,
        },
      },
    };
  }
}