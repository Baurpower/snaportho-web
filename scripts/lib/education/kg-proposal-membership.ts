import type { ProposalRecord } from "../../kg-automation-common.ts";

export type ProposalBatchMembership = {
  id: string;
  proposal_id: string;
  batch_key: string;
  topic_slug: string;
  packet_hash: string | null;
  graph_hash: string | null;
  packet_state: "approved" | "rejected" | "superseded";
  apply_disposition: "pending" | "inserted" | "updated" | "merged" | "already_applied" | "no_op" | "failed" | "rolled_back";
  canonical_target_table: "canonical_entities" | "canonical_relationships" | "curriculum_node_entities" | null;
  canonical_target_id: string | null;
  included_at: string;
  applied_at: string | null;
};

function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, normalized(item)]));
  }
  return value ?? null;
}

export function semanticProposalShape(proposal: ProposalRecord): Record<string, unknown> {
  const metadata = proposal.metadata ?? {};
  const common = {
    proposal_type: proposal.proposal_type,
    source_signal_type: proposal.source_signal_type,
    proposed_entity_type: proposal.proposed_entity_type,
    proposed_predicate: proposal.proposed_predicate,
    proposed_bridge_type: proposal.proposed_bridge_type,
  };
  if (proposal.proposal_type === "create_canonical_entity") {
    return normalized({ ...common, slug: metadata.slug, label: proposal.proposed_entity_label }) as Record<string, unknown>;
  }
  if (proposal.proposal_type === "add_canonical_relationship") {
    return normalized({ ...common, subject_slug: metadata.subject_slug, object_slug: metadata.object_slug }) as Record<string, unknown>;
  }
  if (proposal.proposal_type === "link_curriculum_node_to_entity") {
    return normalized({ ...common, curriculum_node_slug: metadata.curriculum_node_slug, primary_entity_slug: metadata.primary_entity_slug }) as Record<string, unknown>;
  }
  return normalized({
    ...common,
    proposed_existing_entity_id: proposal.proposed_existing_entity_id,
    proposed_subject_entity_id: proposal.proposed_subject_entity_id,
    proposed_object_entity_id: proposal.proposed_object_entity_id,
    proposed_alias: proposal.proposed_alias,
  }) as Record<string, unknown>;
}

export function semanticMismatch(existing: ProposalRecord, incoming: ProposalRecord): string | null {
  if (existing.proposal_fingerprint !== incoming.proposal_fingerprint) return "fingerprint mismatch";
  const left = JSON.stringify(semanticProposalShape(existing));
  const right = JSON.stringify(semanticProposalShape(incoming));
  return left === right ? null : `semantic content mismatch: existing=${left} incoming=${right}`;
}
