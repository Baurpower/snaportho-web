/**
 * Reference implementation — Relationship Builder agent.
 * Wraps existing proposal filtering/validation; does not change medical content.
 */

import type { ProposalRecord } from "../../../../kg-automation-common.ts";
import type { AgentCapability, AgentIdentity, AgentInputBundle, WorkAssignment } from "../contract.ts";
import { BaseKnowledgeFactoryAgent } from "../lifecycle.ts";
import { resolveProposalsForGaps } from "../gap-proposal-matcher.ts";
import { scoreGapMatch } from "../matching.ts";
import {
  FRAMEWORK_CONTRACT_VERSION,
  MIN_COMPILER_VERSION,
  PROPOSAL_SCHEMA_VERSION,
  SUPPORTED_ONTOLOGY_VERSION,
} from "../versioning.ts";

const IDENTITY: AgentIdentity = {
  id: "relationship-builder",
  name: "Relationship Builder",
  version: "1.1.0",
  description: "Produces ontology-valid canonical relationship proposals from neighborhood gaps.",
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
  produces: ["relationships"],
  consumes: ["neighborhood_snapshot", "work_assignment", "proposal_packets", "canonical_objects"],
  handlesGapKinds: ["missing_relationship"],
  requires: ["clinical-entity-builder", "anatomy-builder"],
  confidenceRange: { min: 0.8, max: 0.98 },
  autoApprovalPatterns: [
    "part_of",
    "contains",
    "articulates_with",
    "inserts_on",
    "prerequisite_for",
    "has_classification",
    "has_grade",
    "injured_in",
    "involves_anatomy",
  ],
  escalationPatterns: [
    "at_risk_structure",
    "indicates_treatment",
    "must_protect_during",
    "treated_by",
    "uses_fixation",
    "explains_instability",
  ],
  validationCategories: ["ontology", "relationship", "metadata", "duplicate", "provenance"],
  proposalTypes: ["add_canonical_relationship"],
};

export class RelationshipBuilderAgent extends BaseKnowledgeFactoryAgent {
  readonly identity = IDENTITY;
  readonly capabilities = CAPABILITIES;

  canHandle(assignment: Pick<WorkAssignment, "gaps" | "type">): boolean {
    if (assignment.type !== "gap_resolution") return false;
    return assignment.gaps.some((g) => scoreGapMatch(CAPABILITIES, g).matches);
  }

  protected async run(input: AgentInputBundle, assignment: WorkAssignment) {
    const proposals = resolveProposalsForGaps(
      assignment.gaps,
      input.existingProposals ?? [],
      ["add_canonical_relationship"]
    ) as ProposalRecord[];

    return {
      proposals,
      outputs: {
        gapsAddressed: assignment.gaps.length,
        proposalsMatched: proposals.length,
        gapsUnmatched: assignment.gaps.length - proposals.length,
        executable: true,
      },
    };
  }
}