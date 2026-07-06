/**
 * Quality Scorer — neighborhood quality metrics per CKO §8 dimensions.
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
  id: "quality-scorer",
  name: "Quality Scorer",
  version: "1.0.0",
  description: "Computes per-dimension neighborhood quality scores from gaps and proposals.",
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
  consumes: ["neighborhood_snapshot", "gap_report", "proposal_packets", "work_assignment"],
  handlesGapKinds: [],
  requires: ["duplicate-detector"],
  confidenceRange: { min: 0.85, max: 0.98 },
  validationCategories: ["schema", "publication"],
  proposalTypes: [],
};

export class QualityScorerAgent extends BaseKnowledgeFactoryAgent {
  readonly identity = IDENTITY;
  readonly capabilities = CAPABILITIES;

  canHandle(assignment: Pick<WorkAssignment, "gaps" | "type" | "assignedAgentId">): boolean {
    return assignment.type === "quality_scoring" && assignment.assignedAgentId === "quality-scorer";
  }

  protected async run(input: AgentInputBundle, _assignment: WorkAssignment) {
    const snapshot = input.neighborhood;
    const gaps = input.gaps ?? [];
    const proposals = input.existingProposals ?? [];

    const entityProposals = proposals.filter((p) => p.proposal_type === "create_canonical_entity").length;
    const relProposals = proposals.filter((p) => p.proposal_type === "add_canonical_relationship").length;
    const claimProposals = proposals.filter((p) => p.proposal_type === "propose_educational_claim").length;
    const dpProposals = proposals.filter((p) => p.proposal_type === "propose_decision_point").length;

    const gapByKind = gaps.reduce(
      (acc, g) => {
        acc[g.kind] = (acc[g.kind] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalGaps = gaps.length || 1;
    const dimensionScores = {
      clinical: Math.min(1, entityProposals / Math.max(snapshot.entities.length, 1)),
      relationship: Math.min(1, relProposals / Math.max(snapshot.relationships.length + 1, 1)),
      educational: Math.min(1, claimProposals / Math.max(snapshot.claims.length + 1, 1)),
      reasoning: Math.min(1, dpProposals / Math.max(snapshot.decisionPoints.length + 1, 1)),
      anatomical: Math.min(
        1,
        1 - (gapByKind.missing_entity ?? 0) / totalGaps
      ),
      review: Math.min(1, proposals.filter((p) => p.review_status === "approved").length / Math.max(proposals.length, 1)),
      graph: Math.min(1, 1 - (gapByKind.missing_relationship ?? 0) / totalGaps),
      asset: Math.min(1, 1 - (gapByKind.missing_asset_link ?? 0) / totalGaps),
    };

    const overall =
      Object.values(dimensionScores).reduce((s, v) => s + v, 0) / Object.keys(dimensionScores).length;

    return {
      proposals: [] as ProposalRecord[],
      outputs: {
        qualityMetrics: {
          qualityScorer: {
            dimensionScores,
            overallScore: Math.round(overall * 1000) / 1000,
            gapsRemaining: gaps.length,
            proposalsAnalyzed: proposals.length,
          },
        },
      },
    };
  }
}