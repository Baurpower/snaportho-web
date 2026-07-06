/**
 * Reference implementation — Metadata Builder agent.
 * Wraps relationship/entity metadata gap resolution without changing medical content.
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
  id: "metadata-builder",
  name: "Metadata Builder",
  version: "1.1.0",
  description: "Produces relationship and entity metadata weighting patches.",
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
  produces: ["metadata"],
  consumes: ["neighborhood_snapshot", "canonical_objects", "work_assignment", "proposal_packets"],
  handlesGapKinds: ["missing_metadata"],
  requires: ["relationship-builder"],
  confidenceRange: { min: 0.75, max: 0.9 },
  validationCategories: ["metadata", "schema"],
  proposalTypes: ["add_canonical_relationship"],
};

export class MetadataBuilderAgent extends BaseKnowledgeFactoryAgent {
  readonly identity = IDENTITY;
  readonly capabilities = CAPABILITIES;

  canHandle(assignment: Pick<WorkAssignment, "gaps" | "type">): boolean {
    if (assignment.type !== "gap_resolution") return false;
    return assignment.gaps.some((g) => scoreGapMatch(CAPABILITIES, g).matches);
  }

  protected async run(input: AgentInputBundle, assignment: WorkAssignment) {
    const gapFields = new Set(assignment.gaps.map((g) => g.metadataField).filter(Boolean));

    const proposals = resolveProposalsForGaps(
      assignment.gaps,
      input.existingProposals ?? [],
      ["add_canonical_relationship"]
    ) as ProposalRecord[];

    return {
      proposals,
      outputs: {
        metadataFieldsTargeted: [...gapFields],
        gapsAddressed: assignment.gaps.length,
        proposalsMatched: proposals.length,
        gapsUnmatched: assignment.gaps.length - proposals.length,
        executable: true,
      },
    };
  }
}