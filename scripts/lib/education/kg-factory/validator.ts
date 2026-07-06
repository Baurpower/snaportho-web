import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { validateRelationshipTriple } from "../kg-relationship-registry.ts";
import type { ValidationIssue, ValidationReport } from "./types.ts";

function issue(
  severity: ValidationIssue["severity"],
  code: string,
  message: string,
  proposal?: ProposalRecord,
  autoRepaired = false
): ValidationIssue {
  return {
    severity,
    code,
    message,
    proposal_fingerprint: proposal?.proposal_fingerprint,
    autoRepaired,
  };
}

export function validateProposalPacket(
  pilotKey: string,
  proposals: ProposalRecord[]
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const fingerprints = new Set<string>();
  const entityKeys = new Set<string>();
  const relationshipKeys = new Set<string>();

  for (const proposal of proposals) {
    if (fingerprints.has(proposal.proposal_fingerprint)) {
      issues.push(issue("error", "DUPLICATE_FINGERPRINT", "Duplicate proposal fingerprint", proposal));
    }
    fingerprints.add(proposal.proposal_fingerprint);

    if (
      proposal.proposal_type === "propose_educational_claim" ||
      proposal.proposal_type === "propose_decision_point"
    ) {
      if (proposal.metadata?.verified === true) {
        issues.push(
          issue("error", "DRAFT_LEAK", "Clinical assertion marked verified before human review", proposal)
        );
      }
      if (proposal.metadata?.content_source === "verified") {
        issues.push(
          issue("error", "DRAFT_LEAK", "content_source must not be verified at proposal stage", proposal)
        );
      }
    }

    if (proposal.proposal_type === "create_canonical_entity") {
      const key = `${proposal.proposed_entity_type}:${proposal.proposed_entity_label?.toLowerCase()}`;
      if (entityKeys.has(key)) {
        issues.push(issue("warning", "DUPLICATE_ENTITY", `Duplicate entity proposal ${key}`, proposal));
      }
      entityKeys.add(key);
      if (!proposal.metadata?.slug) {
        issues.push(issue("warning", "MISSING_SLUG", "Entity missing slug metadata", proposal));
      }
    }

    if (proposal.proposal_type === "add_canonical_relationship") {
      const key = `${proposal.metadata?.subject_slug}:${proposal.proposed_predicate}:${proposal.metadata?.object_slug}`;
      if (relationshipKeys.has(key)) {
        issues.push(issue("error", "DUPLICATE_RELATIONSHIP", `Duplicate relationship ${key}`, proposal));
      }
      relationshipKeys.add(key);

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
            issue("error", "ONTOLOGY_VIOLATION", result.errors.join("; "), proposal)
          );
        }
      }

      const relMeta = proposal.metadata?.relationship_metadata as Record<string, unknown> | undefined;
      if (!relMeta?.anatomy_role && !relMeta?.clinical_importance) {
        issues.push(issue("warning", "MISSING_REL_METADATA", "Relationship missing weighting metadata", proposal));
      }
    }

    if (proposal.proposal_type === "propose_educational_claim") {
      const text = String(proposal.metadata?.claim_text ?? "");
      const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
      if (sentences.length > 3 || text.length > 320) {
        issues.push(issue("warning", "CLAIM_NOT_ATOMIC", "Claim may need splitting", proposal));
      }
    }

    if (!proposal.evidence_summary && !proposal.source_signal_ids?.length) {
      issues.push(issue("warning", "MISSING_PROVENANCE", "Proposal lacks provenance signals", proposal));
    }
  }

  const errors = issues.filter((i) => i.severity === "error");

  return {
    generatedAt: new Date().toISOString(),
    pilotKey,
    issues,
    passed: errors.length === 0,
  };
}