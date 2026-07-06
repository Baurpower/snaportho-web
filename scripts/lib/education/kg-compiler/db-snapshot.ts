/**
 * Load neighborhood snapshot from canonical DB state (staging proof path).
 */

import type { ProposalRecord } from "../../../kg-automation-common.ts";
import { createServiceRoleClient, isMissingRelationError } from "../../../kg-automation-common.ts";
import { ANKLE_PILOT_KEY } from "../kg-ankle-pilot-spec.ts";
import type {
  NeighborhoodClaim,
  NeighborhoodDecisionPoint,
  NeighborhoodEntity,
  NeighborhoodRelationship,
  NeighborhoodSnapshot,
} from "./types.ts";

export type DbSnapshotLoadResult = {
  loaded: boolean;
  source: "database" | "spec_fallback";
  reason?: string;
  snapshot: NeighborhoodSnapshot;
  dbCounts: {
    entities: number;
    relationships: number;
    claims: number;
    decisionPoints: number;
    proposals: number;
    approvedProposals: number;
  };
};

function slugFromEntity(row: {
  slug?: string | null;
  metadata?: Record<string, unknown>;
  preferred_label?: string;
}): string {
  const fromMeta = String(row.metadata?.slug ?? "");
  const fromLabel = String(row.preferred_label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return row.slug ?? (fromMeta || fromLabel);
}

export async function loadDbNeighborhoodSnapshot(
  topic: {
    topicKey: string;
    pilotKey: string;
    displayName: string;
    primaryEntitySlug: string;
    targetMaturityLevel: number;
    sources: Record<string, string>;
    loadSnapshot: () => NeighborhoodSnapshot;
  },
  proposals: ProposalRecord[]
): Promise<DbSnapshotLoadResult> {
  const fallback = topic.loadSnapshot();

  try {
    const supabase = createServiceRoleClient();

    const { data: entities, error: entityError } = await supabase
      .from("canonical_entities")
      .select("id,entity_type,preferred_label,slug,metadata,description")
      .contains("metadata", { pilot: topic.pilotKey })
      .eq("is_active", true);

    if (entityError) throw entityError;

    if (!entities?.length) {
      return {
        loaded: false,
        source: "spec_fallback",
        reason: "No canonical_entities with pilot metadata in database",
        snapshot: fallback,
        dbCounts: {
          entities: 0,
          relationships: 0,
          claims: 0,
          decisionPoints: 0,
          proposals: proposals.length,
          approvedProposals: proposals.filter((p) => p.review_status === "approved").length,
        },
      };
    }

    const entityIds = entities.map((e: { id: string }) => e.id);
    const idToSlug = new Map<string, string>();

    const neighborhoodEntities: NeighborhoodEntity[] = entities.map(
      (row: {
        id: string;
        entity_type: string;
        preferred_label: string;
        slug?: string;
        metadata?: Record<string, unknown>;
        description?: string;
      }) => {
        const slug = slugFromEntity(row);
        idToSlug.set(row.id, slug);
        return {
          slug,
          entityType: row.entity_type,
          preferredLabel: row.preferred_label,
          description: row.description ?? undefined,
          metadata: { ...(row.metadata ?? {}), canonical_entity_id: row.id },
          source: "database" as const,
        };
      }
    );

    const { data: relRows, error: relError } = await supabase
      .from("canonical_relationships")
      .select("subject_entity_id,object_entity_id,predicate,metadata")
      .eq("subject_entity_type", "canonical_entity")
      .eq("object_entity_type", "canonical_entity")
      .in("subject_entity_id", entityIds)
      .eq("is_active", true);

    if (relError) throw relError;

    const relationships: NeighborhoodRelationship[] = (relRows ?? [])
      .map(
        (row: {
          subject_entity_id: string;
          object_entity_id: string;
          predicate: string;
          metadata?: Record<string, unknown>;
        }) => {
          const subjectSlug = idToSlug.get(row.subject_entity_id);
          const objectSlug = idToSlug.get(row.object_entity_id);
          if (!subjectSlug || !objectSlug) return null;
          return {
            subjectSlug,
            predicate: row.predicate,
            objectSlug,
            metadata: row.metadata,
            source: "database" as const,
          };
        }
      )
      .filter(Boolean) as NeighborhoodRelationship[];

    let claims: NeighborhoodClaim[] = [];
    let decisionPoints: NeighborhoodDecisionPoint[] = [];

    try {
      const { data: claimRows } = await supabase
        .from("educational_claims")
        .select("id,primary_entity_id,claim_text,claim_type,importance_level,content_source,review_status,metadata")
        .in("primary_entity_id", entityIds)
        .eq("is_active", true);

      claims = (claimRows ?? []).map(
        (row: {
          id: string;
          primary_entity_id: string;
          claim_text: string;
          claim_type: string;
          importance_level: NeighborhoodClaim["importanceLevel"];
          content_source: string;
          review_status: string;
          metadata?: Record<string, unknown>;
        }) => ({
          draftId: String(row.metadata?.draft_id ?? row.id),
          claimType: row.claim_type,
          claimText: row.claim_text,
          primaryEntitySlug: idToSlug.get(row.primary_entity_id) ?? "unknown",
          importanceLevel: row.importance_level,
          contentSource: row.content_source,
          reviewStatus: row.review_status,
          metadata: row.metadata,
        })
      );

      const { data: dpRows } = await supabase
        .from("decision_points")
        .select("id,subject_entity_id,pattern_type,trigger_text,action_text,urgency,safety_criticality,metadata,review_status")
        .in("subject_entity_id", entityIds)
        .eq("is_active", true);

      decisionPoints = (dpRows ?? []).map(
        (row: {
          id: string;
          subject_entity_id: string;
          pattern_type: string;
          trigger_text: string;
          action_text: string;
          urgency: string;
          safety_criticality: string;
          metadata?: Record<string, unknown>;
          review_status: string;
        }) => ({
          draftId: String(row.metadata?.draft_id ?? row.id),
          subjectEntitySlug: idToSlug.get(row.subject_entity_id) ?? "unknown",
          patternType: row.pattern_type,
          trigger: row.trigger_text,
          action: row.action_text,
          urgency: row.urgency,
          safetyCriticality: row.safety_criticality,
          requiresAttendingReview: Boolean(row.metadata?.requires_attending_review),
        })
      );
    } catch {
      // claims/DP tables may be empty pre-apply
    }

    const { count: proposalCount } = await supabase
      .from("kg_automation_proposals")
      .select("id", { count: "exact", head: true })
      .contains("metadata", { pilot: topic.pilotKey })
      .eq("is_active", true);

    const { count: approvedCount } = await supabase
      .from("kg_automation_proposals")
      .select("id", { count: "exact", head: true })
      .contains("metadata", { pilot: topic.pilotKey })
      .eq("is_active", true)
      .in("review_status", ["approved", "applied"]);

    const snapshot: NeighborhoodSnapshot = {
      topicKey: topic.topicKey,
      pilotKey: topic.pilotKey,
      displayName: topic.displayName,
      primaryEntitySlug: topic.primaryEntitySlug,
      targetMaturityLevel: topic.targetMaturityLevel,
      entities: neighborhoodEntities,
      relationships,
      claims,
      decisionPoints,
      assets: fallback.assets,
      sources: topic.sources,
    };

    return {
      loaded: true,
      source: "database",
      snapshot,
      dbCounts: {
        entities: neighborhoodEntities.length,
        relationships: relationships.length,
        claims: claims.length,
        decisionPoints: decisionPoints.length,
        proposals: proposalCount ?? 0,
        approvedProposals: approvedCount ?? 0,
      },
    };
  } catch (error) {
    if (isMissingRelationError(error, "canonical_entities")) {
      return {
        loaded: false,
        source: "spec_fallback",
        reason: "canonical_entities unavailable",
        snapshot: fallback,
        dbCounts: {
          entities: 0,
          relationships: 0,
          claims: 0,
          decisionPoints: 0,
          proposals: proposals.length,
          approvedProposals: proposals.filter((p) => p.review_status === "approved").length,
        },
      };
    }
    throw error;
  }
}

export { ANKLE_PILOT_KEY };