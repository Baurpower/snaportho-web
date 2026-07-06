/**
 * Unified self-validation framework for factory agents and proposals.
 */

import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { validateRelationshipTriple } from "../kg-relationship-registry.ts";
import { validateProposalPacket } from "../kg-factory/validator.ts";
import type { ValidationCategory, ValidationIssue, ValidationResult } from "./contract.ts";

const CATEGORIES: ValidationCategory[] = [
  "schema",
  "ontology",
  "relationship",
  "duplicate",
  "metadata",
  "provenance",
  "safety",
  "publication",
];

function issue(
  category: ValidationCategory,
  code: string,
  message: string,
  severity: ValidationIssue["severity"],
  recoverable: ValidationIssue["recoverability"],
  proposalFingerprint?: string
): ValidationIssue {
  return { category, code, message, severity, recoverable, proposalFingerprint };
}

function emptyCategorySummary(): ValidationResult["categories"] {
  return Object.fromEntries(
    CATEGORIES.map((c) => [c, { passed: true, issueCount: 0 }])
  ) as ValidationResult["categories"];
}

function summarize(issues: ValidationIssue[]): ValidationResult {
  const categories = emptyCategorySummary();
  for (const i of issues) {
    categories[i.category].issueCount += 1;
    if (i.severity === "error" || i.severity === "critical") {
      categories[i.category].passed = false;
    }
  }
  return {
    passed: !issues.some((i) => i.severity === "error" || i.severity === "critical"),
    issues,
    categories,
  };
}

export function validateProposal(proposal: ProposalRecord): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!proposal.proposal_fingerprint) {
    issues.push(issue("schema", "MISSING_FINGERPRINT", "Proposal missing fingerprint", "error", "blocked"));
  }

  if (
    proposal.proposal_type === "propose_educational_claim" ||
    proposal.proposal_type === "propose_decision_point"
  ) {
    if (proposal.metadata?.verified === true || proposal.metadata?.content_source === "verified") {
      issues.push(
        issue(
          "publication",
          "DRAFT_LEAK",
          "Draft assertion marked verified before human review",
          "critical",
          "blocked",
          proposal.proposal_fingerprint
        )
      );
    }
    if (proposal.proposal_type === "propose_decision_point" && proposal.metadata?.requires_attending_review) {
      issues.push(
        issue(
          "safety",
          "DP_ATTENDING_FLAG",
          "Decision point requires attending review gate",
          "info",
          "escalate",
          proposal.proposal_fingerprint
        )
      );
    }
  }

  if (proposal.proposal_type === "add_canonical_relationship") {
    const subjType = String(proposal.metadata?.subject_entity_type ?? "");
    const objType = String(proposal.metadata?.object_entity_type ?? "");
    const predicate = String(proposal.proposed_predicate ?? "");
    if (subjType && objType && predicate) {
      const result = validateRelationshipTriple({
        subjectEndpointType: "canonical_entity",
        subjectEntityType: subjType,
        predicate,
        objectEndpointType: "canonical_entity",
        objectEntityType: objType,
      });
      if (!result.valid) {
        issues.push(
          issue(
            "ontology",
            "ONTOLOGY_VIOLATION",
            result.errors.join("; "),
            "error",
            "escalate",
            proposal.proposal_fingerprint
          )
        );
      }
    }
    const relMeta = proposal.metadata?.relationship_metadata as Record<string, unknown> | undefined;
    if (!relMeta?.anatomy_role && !relMeta?.clinical_importance) {
      issues.push(
        issue(
          "metadata",
          "MISSING_REL_METADATA",
          "Relationship missing weighting metadata",
          "warning",
          "retry",
          proposal.proposal_fingerprint
        )
      );
    }
  }

  if (!proposal.evidence_summary && !(proposal.source_signal_ids?.length)) {
    issues.push(
      issue(
        "provenance",
        "MISSING_PROVENANCE",
        "Proposal lacks provenance signals",
        "warning",
        "retry",
        proposal.proposal_fingerprint
      )
    );
  }

  return summarize(issues);
}

export function validateProposalBatch(
  pilotKey: string,
  proposals: ProposalRecord[]
): ValidationResult {
  const packet = validateProposalPacket(pilotKey, proposals);
  const issues: ValidationIssue[] = packet.issues.map((i) =>
    issue(
      i.code.startsWith("ONTOLOGY") ? "ontology" : i.code.includes("DRAFT") ? "publication" : "schema",
      i.code,
      i.message,
      i.severity === "error" ? "error" : "warning",
      i.severity === "error" ? "escalate" : "retry",
      i.proposal_fingerprint
    )
  );

  const fingerprints = new Set<string>();
  for (const p of proposals) {
    if (fingerprints.has(p.proposal_fingerprint)) {
      issues.push(
        issue("duplicate", "DUPLICATE_FINGERPRINT", "Duplicate proposal fingerprint", "error", "skip", p.proposal_fingerprint)
      );
    }
    fingerprints.add(p.proposal_fingerprint);
    const single = validateProposal(p);
    issues.push(...single.issues);
  }

  return summarize(issues);
}

export function validateWorkAssignment(assignment: import("./contract.ts").WorkAssignment): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!assignment.id) {
    issues.push(issue("schema", "MISSING_ASSIGNMENT_ID", "Work assignment missing id", "error", "blocked"));
  }
  if (!assignment.assignedAgentId) {
    issues.push(
      issue("schema", "MISSING_AGENT", "Work assignment missing assignedAgentId", "error", "blocked")
    );
  }
  if (assignment.type === "gap_resolution" && assignment.gaps.length === 0) {
    issues.push(
      issue("schema", "EMPTY_GAPS", "Gap resolution assignment has no gaps", "warning", "skip")
    );
  }
  if (assignment.requiredInputs.length === 0 && assignment.type === "gap_resolution") {
    issues.push(
      issue("schema", "NO_REQUIRED_INPUTS", "Gap assignment missing required inputs", "warning", "retry")
    );
  }

  return summarize(issues);
}

export function validateRequiredInputs(
  required: import("./contract.ts").ConsumesCapability[],
  input: import("./contract.ts").AgentInputBundle
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const present: Record<string, boolean> = {
    neighborhood_snapshot: Boolean(input.neighborhood),
    ontology_requirements: Boolean(input.ontologyRequirements),
    evidence_packets: Boolean(
      input.evidencePackets?.length ||
        input.knowledgeEvidencePacket ||
        input.evidenceContext?.relevantEvidenceItemIds.length
    ),
    proposal_packets: Boolean(input.existingProposals?.length),
    canonical_objects: input.neighborhood.entities.length > 0,
    work_assignment: true,
    merged_neighborhood_draft: Boolean(input.mergedNeighborhoodDraft),
    auto_review_report: Boolean(input.autoReviewReport),
    gap_report: Boolean(input.gaps?.length),
    quality_metrics: Boolean(input.qualityMetrics && Object.keys(input.qualityMetrics).length > 0),
  };

  for (const req of required) {
    if (!present[req]) {
      issues.push(
        issue(
          "schema",
          "MISSING_INPUT",
          `Required input not provided: ${req}`,
          "error",
          "blocked"
        )
      );
    }
  }

  return summarize(issues);
}