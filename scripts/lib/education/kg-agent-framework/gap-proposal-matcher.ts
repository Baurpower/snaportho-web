/**
 * Match ontology gaps to existing pilot proposals (deterministic v1 resolver).
 */

import type { ProposalRecord, ProposalType } from "../../../kg-automation-common.ts";
import type { OntologyGap } from "../kg-compiler/types.ts";

export function proposalMatchesEntityGap(proposal: ProposalRecord, gap: OntologyGap): boolean {
  if (proposal.proposal_type !== "create_canonical_entity") return false;
  if (gap.entitySlug && proposal.metadata?.slug === gap.entitySlug) return true;
  if (gap.entityType && proposal.proposed_entity_type === gap.entityType) {
    if (gap.anchorEntitySlug) return true;
    if (gap.ontologyRule.startsWith("anatomy.") && gap.entityType === "anatomy_structure") {
      return String(proposal.metadata?.slug ?? "").length > 0;
    }
  }
  return false;
}

export function proposalMatchesRelationshipGap(proposal: ProposalRecord, gap: OntologyGap): boolean {
  if (proposal.proposal_type !== "add_canonical_relationship") return false;
  const subj = String(proposal.metadata?.subject_slug ?? "");
  const obj = String(proposal.metadata?.object_slug ?? "");
  const pred = String(proposal.proposed_predicate ?? "");
  if (gap.subjectSlug && gap.predicate && gap.objectSlug) {
    return subj === gap.subjectSlug && pred === gap.predicate && obj === gap.objectSlug;
  }
  if (gap.predicate && gap.anchorEntitySlug) {
    return pred === gap.predicate && (subj === gap.anchorEntitySlug || obj === gap.anchorEntitySlug);
  }
  return false;
}

export function proposalMatchesClaimGap(proposal: ProposalRecord, gap: OntologyGap): boolean {
  if (proposal.proposal_type !== "propose_educational_claim") return false;
  const anchor = String(proposal.metadata?.primary_entity_slug ?? "");
  if (gap.anchorEntitySlug && anchor !== gap.anchorEntitySlug) return false;
  if (gap.claimType) {
    const types = gap.claimType.split("|");
    return types.includes(String(proposal.metadata?.claim_type ?? ""));
  }
  return Boolean(gap.anchorEntitySlug);
}

export function proposalMatchesDecisionPointGap(proposal: ProposalRecord, gap: OntologyGap): boolean {
  if (proposal.proposal_type !== "propose_decision_point") return false;
  const subject = String(proposal.metadata?.subject_entity_slug ?? "");
  if (gap.anchorEntitySlug && subject !== gap.anchorEntitySlug) return false;
  if (gap.decisionPointPattern) {
    return String(proposal.metadata?.pattern_type ?? "") === gap.decisionPointPattern;
  }
  return Boolean(gap.anchorEntitySlug);
}

export function proposalMatchesMetadataGap(proposal: ProposalRecord, gap: OntologyGap): boolean {
  if (proposal.proposal_type !== "add_canonical_relationship") return false;
  const subj = String(proposal.metadata?.subject_slug ?? "");
  const obj = String(proposal.metadata?.object_slug ?? "");
  const pred = String(proposal.proposed_predicate ?? "");
  if (gap.subjectSlug && gap.predicate && gap.objectSlug) {
    return subj === gap.subjectSlug && pred === gap.predicate && obj === gap.objectSlug;
  }
  return false;
}

export function proposalMatchesAssetGap(proposal: ProposalRecord, gap: OntologyGap): boolean {
  if (
    proposal.proposal_type !== "retarget_card_to_entity" &&
    proposal.proposal_type !== "retarget_question_to_entity"
  ) {
    return false;
  }
  if (gap.ontologyRule.includes("anki") && proposal.proposal_type !== "retarget_card_to_entity") {
    return false;
  }
  if (gap.ontologyRule.includes("question") && proposal.proposal_type !== "retarget_question_to_entity") {
    return false;
  }
  if (gap.anchorEntitySlug) {
    return (
      proposal.metadata?.primary_entity_slug === gap.anchorEntitySlug ||
      proposal.metadata?.slug === gap.anchorEntitySlug
    );
  }
  return true;
}

export function proposalMatchesProvenanceGap(proposal: ProposalRecord, gap: OntologyGap): boolean {
  if (proposal.proposal_type === "add_provenance_record") {
    if (gap.anchorEntitySlug) {
      return proposal.metadata?.anchor_entity_slug === gap.anchorEntitySlug;
    }
    return true;
  }
  if (gap.anchorEntitySlug) {
    const slug = String(proposal.metadata?.slug ?? proposal.metadata?.primary_entity_slug ?? "");
    return slug === gap.anchorEntitySlug && !proposal.evidence_summary;
  }
  return !proposal.evidence_summary && !proposal.source_signal_ids?.length;
}

const GAP_MATCHERS: Partial<Record<OntologyGap["kind"], (p: ProposalRecord, g: OntologyGap) => boolean>> = {
  missing_entity: proposalMatchesEntityGap,
  missing_relationship: proposalMatchesRelationshipGap,
  missing_claim: proposalMatchesClaimGap,
  missing_decision_point: proposalMatchesDecisionPointGap,
  missing_metadata: proposalMatchesMetadataGap,
  missing_asset_link: proposalMatchesAssetGap,
  missing_provenance: proposalMatchesProvenanceGap,
};

export function resolveProposalsForGaps(
  gaps: OntologyGap[],
  proposals: ProposalRecord[],
  allowedTypes: ProposalType[]
): ProposalRecord[] {
  const matched = new Map<string, ProposalRecord>();

  for (const gap of gaps) {
    const matcher = GAP_MATCHERS[gap.kind];
    if (!matcher) continue;
    for (const proposal of proposals) {
      if (!allowedTypes.includes(proposal.proposal_type)) continue;
      if (matcher(proposal, gap)) {
        matched.set(proposal.proposal_fingerprint, proposal);
      }
    }
  }

  return [...matched.values()].sort((a, b) =>
    a.proposal_fingerprint.localeCompare(b.proposal_fingerprint)
  );
}

export function mergeProposalSets(...sets: ProposalRecord[][]): ProposalRecord[] {
  const byFingerprint = new Map<string, ProposalRecord>();
  for (const set of sets) {
    for (const p of set) {
      byFingerprint.set(p.proposal_fingerprint, p);
    }
  }
  return [...byFingerprint.values()].sort((a, b) =>
    a.proposal_fingerprint.localeCompare(b.proposal_fingerprint)
  );
}