/**
 * Reference implementation — Publication Validator agent.
 * Wraps existing publication-validator without changing gates.
 */

import type { ProposalRecord } from "../../../../kg-automation-common.ts";
import { validatePublicationReadiness } from "../../kg-compiler/publication-validator.ts";
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
  id: "publication-validator",
  name: "Publication Validator",
  version: "1.0.0",
  description: "Evaluates maturity, blockers, and publication readiness gates.",
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
  produces: ["publication_report"],
  consumes: ["auto_review_report", "gap_report", "proposal_packets", "work_assignment"],
  handlesGapKinds: [],
  requires: ["review-assistant"],
  confidenceRange: { min: 0.95, max: 0.99 },
  validationCategories: ["publication", "safety"],
  proposalTypes: [],
};

export class PublicationValidatorAgent extends BaseKnowledgeFactoryAgent {
  readonly identity = IDENTITY;
  readonly capabilities = CAPABILITIES;

  canHandle(assignment: Pick<WorkAssignment, "gaps" | "type">): boolean {
    return assignment.type === "publication_validation";
  }

  protected async run(input: AgentInputBundle, _assignment: WorkAssignment) {
    const proposals: ProposalRecord[] = input.existingProposals ?? [];
    const gaps = input.gaps ?? [];
    const autoReview =
      input.autoReviewReport ??
      runAutoReview(input.compiler.topicKey, input.compiler.pilotKey, proposals).report;

    const publication = validatePublicationReadiness(
      input.compiler.topicKey,
      input.compiler.pilotKey,
      input.compiler.targetMaturityLevel,
      gaps,
      proposals,
      autoReview
    );

    return {
      proposals: [],
      outputs: {
        publicationReadiness: publication,
        ready: publication.ready,
        blockers: publication.blockers,
        currentLevel: publication.currentLevel,
      },
    };
  }
}