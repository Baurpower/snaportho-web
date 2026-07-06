import type { ProposalRecord } from "../../../kg-automation-common.ts";
import type {
  MergedNeighborhoodDraft,
  NeighborhoodClaim,
  NeighborhoodDecisionPoint,
  NeighborhoodEntity,
  NeighborhoodRelationship,
  NeighborhoodSnapshot,
} from "./types.ts";

export type ConflictReport = {
  generatedAt: string;
  topicKey: string;
  totalConflicts: number;
  relationshipMetadataConflicts: number;
  claimTextConflicts: number;
  decisionPointConflicts: number;
  proposalSourceConflicts: number;
  items: Array<{
    kind: string;
    description: string;
    severity: "low" | "medium" | "high";
    subject?: string;
    proposalIds?: string[];
  }>;
};

function entityFromProposal(p: ProposalRecord): NeighborhoodEntity | null {
  if (p.proposal_type !== "create_canonical_entity") return null;
  const slug = String(p.metadata?.slug ?? "");
  if (!slug) return null;
  return {
    slug,
    entityType: String(p.proposed_entity_type ?? "unknown"),
    preferredLabel: String(p.proposed_entity_label ?? slug),
    description: String(p.metadata?.description ?? ""),
    metadata: { ...(p.metadata ?? {}), _provenance_fingerprint: p.proposal_fingerprint },
    source: "proposal",
  };
}

function relationshipFromProposal(p: ProposalRecord): NeighborhoodRelationship | null {
  if (p.proposal_type !== "add_canonical_relationship") return null;
  const subjectSlug = String(p.metadata?.subject_slug ?? "");
  const objectSlug = String(p.metadata?.object_slug ?? "");
  const predicate = String(p.proposed_predicate ?? "");
  if (!subjectSlug || !objectSlug || !predicate) return null;
  return {
    subjectSlug,
    predicate,
    objectSlug,
    metadata: {
      ...((p.metadata?.relationship_metadata as Record<string, unknown>) ?? {}),
      _provenance_fingerprint: p.proposal_fingerprint,
    },
    source: "proposal",
  };
}

function claimFromProposal(p: ProposalRecord): NeighborhoodClaim | null {
  if (p.proposal_type !== "propose_educational_claim") return null;
  return {
    draftId: String(p.metadata?.draft_id ?? p.proposal_fingerprint),
    claimType: String(p.metadata?.claim_type ?? "fact"),
    claimText: String(p.metadata?.claim_text ?? ""),
    primaryEntitySlug: String(p.metadata?.primary_entity_slug ?? ""),
    importanceLevel: (p.metadata?.importance_level as NeighborhoodClaim["importanceLevel"]) ?? "L2",
    contentSource: String(p.metadata?.content_source ?? "generated_draft"),
    reviewStatus: p.review_status,
    metadata: { ...p.metadata, _provenance_fingerprint: p.proposal_fingerprint },
  };
}

function dpFromProposal(p: ProposalRecord): NeighborhoodDecisionPoint | null {
  if (p.proposal_type !== "propose_decision_point") return null;
  return {
    draftId: String(p.metadata?.draft_id ?? p.proposal_fingerprint),
    subjectEntitySlug: String(p.metadata?.subject_entity_slug ?? ""),
    patternType: String(p.metadata?.pattern_type ?? ""),
    trigger: String(p.metadata?.trigger ?? ""),
    action: String(p.metadata?.action ?? ""),
    urgency: String(p.metadata?.urgency ?? "routine"),
    safetyCriticality: String(p.metadata?.safety_criticality ?? "none"),
    requiresAttendingReview: Boolean(p.metadata?.requires_attending_review),
  };
}

function normalizeClaimText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function buildConflictReport(
  snapshot: NeighborhoodSnapshot,
  merged: MergedNeighborhoodDraft,
  proposals: ProposalRecord[]
): ConflictReport {
  const items = merged.conflicts.map((c) => ({
    kind: c.kind,
    description: c.description,
    severity: c.kind.includes("safety") ? ("high" as const) : ("medium" as const),
  }));

  for (const p of proposals) {
    if (p.conflict_count >= 2) {
      items.push({
        kind: "proposal_source_conflict",
        description: `Proposal ${p.proposal_fingerprint} has ${p.conflict_count} source conflicts`,
        severity: p.conflict_count >= 3 ? "high" : "medium",
        proposalIds: [p.proposal_fingerprint],
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    topicKey: snapshot.topicKey,
    totalConflicts: items.length,
    relationshipMetadataConflicts: items.filter((i) => i.kind === "relationship_metadata_conflict").length,
    claimTextConflicts: items.filter((i) => i.kind === "claim_text_conflict").length,
    decisionPointConflicts: items.filter((i) => i.kind === "decision_point_conflict").length,
    proposalSourceConflicts: items.filter((i) => i.kind === "proposal_source_conflict").length,
    items,
  };
}

export function mergeNeighborhoodDraft(
  snapshot: NeighborhoodSnapshot,
  proposals: ProposalRecord[]
): MergedNeighborhoodDraft {
  const entityMap = new Map<string, NeighborhoodEntity>();
  const relationshipMap = new Map<string, NeighborhoodRelationship>();
  const claimMap = new Map<string, NeighborhoodClaim>();
  const claimTextIndex = new Map<string, string>();
  const dpMap = new Map<string, NeighborhoodDecisionPoint>();
  const dpPatternIndex = new Map<string, string>();
  const conflicts: MergedNeighborhoodDraft["conflicts"] = [];
  let duplicateEntitiesResolved = 0;
  let conflictingRelationships = 0;
  let metadataMerged = 0;
  let provenanceAttached = 0;
  let bridgeCount = 0;

  for (const entity of snapshot.entities) {
    entityMap.set(entity.slug, { ...entity });
  }
  for (const rel of snapshot.relationships) {
    relationshipMap.set(`${rel.subjectSlug}|${rel.predicate}|${rel.objectSlug}`, { ...rel });
  }
  for (const claim of snapshot.claims) {
    claimMap.set(claim.draftId, { ...claim });
    if (claim.claimText) {
      claimTextIndex.set(normalizeClaimText(claim.claimText), claim.draftId);
    }
  }
  for (const dp of snapshot.decisionPoints) {
    dpMap.set(dp.draftId, { ...dp });
    dpPatternIndex.set(`${dp.subjectEntitySlug}|${dp.patternType}`, dp.draftId);
  }

  for (const proposal of proposals) {
    if (proposal.evidence_summary || proposal.source_signal_ids?.length) {
      provenanceAttached += 1;
    }

    if (proposal.proposal_type === "link_curriculum_node_to_entity") {
      bridgeCount += 1;
    }

    const entity = entityFromProposal(proposal);
    if (entity) {
      const existing = entityMap.get(entity.slug);
      if (existing) {
        duplicateEntitiesResolved += 1;
        const mergedMeta = { ...existing.metadata, ...entity.metadata };
        if (
          existing.preferredLabel !== entity.preferredLabel &&
          existing.source !== "spec"
        ) {
          conflicts.push({
            kind: "entity_label_conflict",
            description: `Conflicting labels for ${entity.slug}: "${existing.preferredLabel}" vs "${entity.preferredLabel}"`,
          });
        }
        entityMap.set(entity.slug, {
          ...existing,
          metadata: mergedMeta,
          source: existing.source === "spec" ? "spec" : "proposal",
        });
        metadataMerged += 1;
      } else {
        entityMap.set(entity.slug, entity);
      }
    }

    const rel = relationshipFromProposal(proposal);
    if (rel) {
      const key = `${rel.subjectSlug}|${rel.predicate}|${rel.objectSlug}`;
      const existing = relationshipMap.get(key);
      if (existing) {
        const metaConflict =
          existing.metadata?.clinical_importance != null &&
          rel.metadata?.clinical_importance != null &&
          existing.metadata.clinical_importance !== rel.metadata.clinical_importance;
        if (metaConflict) {
          conflictingRelationships += 1;
          conflicts.push({
            kind: "relationship_metadata_conflict",
            description: `Conflicting metadata on ${key}`,
          });
        }
        relationshipMap.set(key, {
          ...existing,
          metadata: { ...existing.metadata, ...rel.metadata },
          source: existing.source === "spec" ? "spec" : "proposal",
        });
        metadataMerged += 1;
      } else {
        relationshipMap.set(key, rel);
      }
    }

    const claim = claimFromProposal(proposal);
    if (claim) {
      const normalized = normalizeClaimText(claim.claimText);
      const existingDraft = claimTextIndex.get(normalized);
      if (existingDraft && existingDraft !== claim.draftId) {
        conflicts.push({
          kind: "claim_text_conflict",
          description: `Duplicate claim text: ${existingDraft} vs ${claim.draftId}`,
        });
      } else {
        claimTextIndex.set(normalized, claim.draftId);
      }
      if (!claimMap.has(claim.draftId)) {
        claimMap.set(claim.draftId, claim);
      }
    }

    const dp = dpFromProposal(proposal);
    if (dp) {
      const patternKey = `${dp.subjectEntitySlug}|${dp.patternType}`;
      const existingDp = dpPatternIndex.get(patternKey);
      if (existingDp && existingDp !== dp.draftId) {
        conflicts.push({
          kind: "decision_point_conflict",
          description: `Conflicting DP pattern ${patternKey}: ${existingDp} vs ${dp.draftId}`,
        });
      } else {
        dpPatternIndex.set(patternKey, dp.draftId);
      }
      if (!dpMap.has(dp.draftId)) {
        dpMap.set(dp.draftId, dp);
      }
    }
  }

  return {
    topicKey: snapshot.topicKey,
    pilotKey: snapshot.pilotKey,
    generatedAt: new Date().toISOString(),
    entities: [...entityMap.values()],
    relationships: [...relationshipMap.values()],
    claims: [...claimMap.values()],
    decisionPoints: [...dpMap.values()],
    conflicts,
    stats: {
      entityCount: entityMap.size,
      relationshipCount: relationshipMap.size,
      claimCount: claimMap.size,
      decisionPointCount: dpMap.size,
      bridgeCount,
      duplicateEntitiesResolved,
      conflictingRelationships,
      metadataMerged,
      provenanceAttached,
    },
  };
}