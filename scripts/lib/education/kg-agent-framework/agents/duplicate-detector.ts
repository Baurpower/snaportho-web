/**
 * Duplicate Detector — flags duplicate entities and ambiguous mappings (v1 conservative).
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
  id: "duplicate-detector",
  name: "Duplicate Detector",
  version: "1.0.0",
  description: "Detects duplicate entity labels and ambiguous fingerprint collisions in proposal batches.",
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
  consumes: ["proposal_packets", "neighborhood_snapshot", "work_assignment"],
  handlesGapKinds: [],
  requires: [],
  confidenceRange: { min: 0.7, max: 0.95 },
  validationCategories: ["duplicate", "schema"],
  proposalTypes: ["flag_duplicate_entity", "flag_ambiguous_mapping"],
};

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export class DuplicateDetectorAgent extends BaseKnowledgeFactoryAgent {
  readonly identity = IDENTITY;
  readonly capabilities = CAPABILITIES;

  canHandle(assignment: Pick<WorkAssignment, "gaps" | "type">): boolean {
    return assignment.type === "quality_scoring" && assignment.assignedAgentId === "duplicate-detector";
  }

  protected async run(input: AgentInputBundle, _assignment: WorkAssignment) {
    const proposals = input.existingProposals ?? [];
    const flags: ProposalRecord[] = [];
    const labelIndex = new Map<string, string[]>();
    const fingerprintSet = new Set<string>();

    for (const p of proposals) {
      if (fingerprintSet.has(p.proposal_fingerprint)) {
        flags.push({
          ...p,
          proposal_type: "flag_ambiguous_mapping",
          proposal_fingerprint: `dup:fp:${p.proposal_fingerprint}`,
          evidence_summary: `Duplicate fingerprint: ${p.proposal_fingerprint}`,
        });
      }
      fingerprintSet.add(p.proposal_fingerprint);

      if (p.proposal_type === "create_canonical_entity" && p.proposed_entity_label) {
        const key = normalizeLabel(p.proposed_entity_label);
        const slugs = labelIndex.get(key) ?? [];
        slugs.push(String(p.metadata?.slug ?? p.proposal_fingerprint));
        labelIndex.set(key, slugs);
      }
    }

    for (const [label, slugs] of labelIndex) {
      if (slugs.length > 1) {
        flags.push({
          proposal_fingerprint: `dup:label:${label.replace(/\s+/g, "-")}`,
          proposal_type: "flag_duplicate_entity",
          source_signal_type: "duplicate_detector",
          source_signal_ids: slugs,
          specialty_id: null,
          proposed_entity_type: null,
          proposed_entity_label: label,
          proposed_existing_entity_id: null,
          proposed_subject_entity_id: null,
          proposed_predicate: null,
          proposed_object_entity_id: null,
          proposed_alias: null,
          proposed_bridge_type: null,
          confidence: 0.85,
          confidence_tier: "high",
          confidence_reason: "duplicate_label_match",
          evidence_summary: `Duplicate labels map to slugs: ${slugs.join(", ")}`,
          supporting_card_count: 0,
          supporting_question_count: 0,
          supporting_curriculum_node_count: 0,
          supporting_source_count: slugs.length,
          conflict_count: slugs.length - 1,
          review_status: "needs_review",
          reviewed_by: null,
          reviewed_at: null,
          reviewer_notes: null,
          applied_at: null,
          superseded_by: null,
          metadata: { duplicate_slugs: slugs },
          comments: null,
          is_active: true,
        });
      }
    }

    return {
      proposals: flags,
      outputs: {
        qualityMetrics: {
          duplicateDetector: {
            proposalsScanned: proposals.length,
            flagsEmitted: flags.length,
            duplicateLabels: [...labelIndex.entries()].filter(([, s]) => s.length > 1).length,
          },
        },
        duplicateReport: {
          flagsEmitted: flags.length,
          duplicateLabels: [...labelIndex.entries()]
            .filter(([, s]) => s.length > 1)
            .map(([label, slugs]) => ({ label, slugs })),
        },
      },
    };
  }
}