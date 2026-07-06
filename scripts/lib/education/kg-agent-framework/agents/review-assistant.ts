/**
 * Reference implementation — Review Assistant agent.
 * Wraps Review Engine / Intelligent Curator without changing routing behavior.
 */

import type { ProposalRecord } from "../../../../kg-automation-common.ts";
import { runAutoReview } from "../../kg-compiler/review-engine.ts";
import type { AgentCapability, AgentIdentity, AgentInputBundle, WorkAssignment } from "../contract.ts";
import { BaseKnowledgeFactoryAgent } from "../lifecycle.ts";
import {
  FRAMEWORK_CONTRACT_VERSION,
  MIN_COMPILER_VERSION,
  PROPOSAL_SCHEMA_VERSION,
  SUPPORTED_ONTOLOGY_VERSION,
} from "../versioning.ts";

const IDENTITY: AgentIdentity = {
  id: "review-assistant",
  name: "Review Assistant",
  version: "1.0.0",
  description: "Runs explainable auto-review and produces review routing recommendations.",
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
  produces: ["review_report"],
  consumes: ["proposal_packets", "work_assignment"],
  handlesGapKinds: [],
  requires: [],
  confidenceRange: { min: 0.9, max: 0.99 },
  validationCategories: ["safety", "publication", "ontology"],
  proposalTypes: [],
};

export class ReviewAssistantAgent extends BaseKnowledgeFactoryAgent {
  readonly identity = IDENTITY;
  readonly capabilities = CAPABILITIES;

  canHandle(assignment: Pick<WorkAssignment, "gaps" | "type">): boolean {
    return assignment.type === "review";
  }

  protected async run(input: AgentInputBundle, _assignment: WorkAssignment) {
    const proposals: ProposalRecord[] = input.existingProposals ?? [];
    const { curated, report } = runAutoReview(
      input.compiler.topicKey,
      input.compiler.pilotKey,
      proposals
    );

    return {
      proposals: curated,
      outputs: {
        autoReviewReport: report,
        humanReviewPercent: report.humanReviewPercent,
        autoApprovedPercent: report.autoApprovedPercent,
      },
    };
  }
}