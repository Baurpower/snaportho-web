import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { validateRelationshipTriple } from "../kg-relationship-registry.ts";
import type { DryRunMutation } from "./types.ts";

export function dryRunApplyProposals(proposals: ProposalRecord[]): DryRunMutation[] {
  const mutations: DryRunMutation[] = [];
  const approved = proposals.filter((p) => p.review_status === "approved" && p.is_active);

  for (const proposal of approved) {
    if (proposal.proposal_type === "create_canonical_entity") {
      mutations.push({
        kind: "entity_create",
        proposal_fingerprint: proposal.proposal_fingerprint,
        description: `Create ${proposal.proposed_entity_type}: ${proposal.proposed_entity_label}`,
        payload: {
          entity_type: proposal.proposed_entity_type,
          preferred_label: proposal.proposed_entity_label,
          slug: proposal.metadata?.slug,
          metadata: proposal.metadata,
        },
      });
    }

    if (proposal.proposal_type === "add_canonical_relationship") {
      const subjType = String(proposal.metadata?.subject_entity_type ?? "");
      const objType = String(proposal.metadata?.object_entity_type ?? "");
      const predicate = String(proposal.proposed_predicate ?? "");
      const valid = validateRelationshipTriple({
        subjectEndpointType: "canonical_entity",
        subjectEntityType: subjType,
        predicate,
        objectEndpointType: "canonical_entity",
        objectEntityType: objType,
      });
      mutations.push({
        kind: valid.valid ? "relationship_create" : "relationship_rejected",
        proposal_fingerprint: proposal.proposal_fingerprint,
        description: `${proposal.metadata?.subject_slug} -[${predicate}]-> ${proposal.metadata?.object_slug}`,
        payload: {
          predicate,
          subject_slug: proposal.metadata?.subject_slug,
          object_slug: proposal.metadata?.object_slug,
          relationship_metadata: proposal.metadata?.relationship_metadata,
          validation_errors: valid.errors,
        },
      });
    }

    if (proposal.proposal_type === "link_curriculum_node_to_entity") {
      mutations.push({
        kind: "bridge_create",
        proposal_fingerprint: proposal.proposal_fingerprint,
        description: `Bridge ${proposal.metadata?.curriculum_node_slug} -> ${proposal.metadata?.primary_entity_slug}`,
        payload: {
          curriculum_node_slug: proposal.metadata?.curriculum_node_slug,
          bridge_type: proposal.proposed_bridge_type,
        },
      });
    }

    if (proposal.proposal_type === "propose_educational_claim") {
      mutations.push({
        kind: "claim_create_draft",
        proposal_fingerprint: proposal.proposal_fingerprint,
        description: `Insert draft claim ${proposal.metadata?.draft_id}`,
        payload: {
          ...proposal.metadata,
          content_source: "generated_draft",
          review_status: "unreviewed",
        },
      });
    }

    if (proposal.proposal_type === "propose_decision_point") {
      mutations.push({
        kind: "decision_point_create_draft",
        proposal_fingerprint: proposal.proposal_fingerprint,
        description: `Insert draft DP ${proposal.metadata?.draft_id}`,
        payload: {
          ...proposal.metadata,
          content_source: "generated_draft",
          review_status: "unreviewed",
        },
      });
    }
  }

  return mutations;
}