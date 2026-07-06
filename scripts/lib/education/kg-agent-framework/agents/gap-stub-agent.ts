/**
 * Executable gap-resolution agents — resolve gaps to pilot proposals deterministically.
 */

import type { ProposalRecord, ProposalType } from "../../../../kg-automation-common.ts";
import type { GapKind } from "../../kg-compiler/types.ts";
import type { AgentCapability, AgentIdentity, AgentInputBundle, WorkAssignment } from "../contract.ts";
import { resolveProposalsForGaps } from "../gap-proposal-matcher.ts";
import { BaseKnowledgeFactoryAgent } from "../lifecycle.ts";
import { scoreGapMatch } from "../matching.ts";
import {
  FRAMEWORK_CONTRACT_VERSION,
  MIN_COMPILER_VERSION,
  PROPOSAL_SCHEMA_VERSION,
  SUPPORTED_ONTOLOGY_VERSION,
} from "../versioning.ts";

export type GapAgentConfig = {
  id: string;
  name: string;
  description: string;
  handlesGapKinds: GapKind[];
  handlesEntityTypes?: string[];
  handlesOntologyRulePrefixes?: string[];
  isGenericFallback?: boolean;
  produces: AgentCapability["produces"];
  consumes: AgentCapability["consumes"];
  requires: string[];
  proposalTypes: ProposalType[];
  confidenceRange: { min: number; max: number };
  validationCategories: AgentCapability["validationCategories"];
  autoApprovalPatterns?: string[];
  escalationPatterns?: string[];
};

export function createGapAgent(config: GapAgentConfig): BaseKnowledgeFactoryAgent {
  const identity: AgentIdentity = {
    id: config.id,
    name: config.name,
    version: "1.1.0",
    description: config.description,
    owner: "knowledge-factory",
    supportedOntologyVersion: SUPPORTED_ONTOLOGY_VERSION,
    versions: {
      contractVersion: FRAMEWORK_CONTRACT_VERSION,
      ontologyVersion: SUPPORTED_ONTOLOGY_VERSION,
      minCompilerVersion: MIN_COMPILER_VERSION,
      proposalSchemaVersion: PROPOSAL_SCHEMA_VERSION,
    },
  };

  const capabilities: AgentCapability = {
    produces: config.produces,
    consumes: config.consumes,
    handlesGapKinds: config.handlesGapKinds,
    handlesEntityTypes: config.handlesEntityTypes,
    handlesOntologyRulePrefixes: config.handlesOntologyRulePrefixes,
    isGenericFallback: config.isGenericFallback,
    requires: config.requires,
    confidenceRange: config.confidenceRange,
    validationCategories: config.validationCategories,
    proposalTypes: config.proposalTypes,
    autoApprovalPatterns: config.autoApprovalPatterns,
    escalationPatterns: config.escalationPatterns,
  };

  class GapAgent extends BaseKnowledgeFactoryAgent {
    readonly identity = identity;
    readonly capabilities = capabilities;

    canHandle(assignment: Pick<WorkAssignment, "gaps" | "type">): boolean {
      if (assignment.type !== "gap_resolution") return false;
      return assignment.gaps.some((g) => scoreGapMatch(capabilities, g).matches);
    }

    protected async run(input: AgentInputBundle, assignment: WorkAssignment) {
      const pool = input.existingProposals ?? [];
      const proposals = resolveProposalsForGaps(
        assignment.gaps,
        pool,
        config.proposalTypes
      ) as ProposalRecord[];

      const gapsAddressed = assignment.gaps.filter((gap) =>
        proposals.some((p) => {
          const matched = resolveProposalsForGaps([gap], pool, config.proposalTypes);
          return matched.some((m) => m.proposal_fingerprint === p.proposal_fingerprint);
        })
      ).length;

      return {
        proposals,
        outputs: {
          gapsScheduled: assignment.gaps.length,
          gapsAddressed,
          proposalsMatched: proposals.length,
          gapsUnmatched: assignment.gaps.length - gapsAddressed,
          agentId: config.id,
          executable: true,
          evidencePacketId: input.evidenceContext?.evidencePacketId,
          evidenceItemIds: input.evidenceContext?.relevantEvidenceItemIds ?? [],
        },
      };
    }
  }

  return new GapAgent();
}