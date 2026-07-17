import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  MergedNeighborhoodDraft,
  NeighborhoodClaim,
  NeighborhoodDecisionPoint,
  NeighborhoodEntity,
  NeighborhoodRelationship,
} from "../kg-compiler/types.ts";

export async function readJsonIfExists<T>(filePath: string, fallback: T): Promise<T> {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function readMergedNeighborhoodDraft(input: string): Promise<MergedNeighborhoodDraft> {
  const statCandidates = input.endsWith(".json")
    ? [input]
    : ["merged-neighborhood-draft.json", "ontology-merged-draft.json"].map((file) => path.join(input, file));
  const filePath = statCandidates.find((candidate) => existsSync(candidate));
  if (!filePath) {
    throw new Error(`No compiler draft found at ${input}. Expected merged-neighborhood-draft.json or ontology-merged-draft.json.`);
  }
  return JSON.parse(await readFile(filePath, "utf8")) as MergedNeighborhoodDraft;
}

export async function applyPostReviewInput(
  draft: MergedNeighborhoodDraft,
  postReviewPackage: Record<string, unknown>,
  postReviewInputPath: string
): Promise<MergedNeighborhoodDraft> {
  const overlayPath = postReviewPackage.source_overlay ? String(postReviewPackage.source_overlay) : postReviewInputPath;
  const overlay = existsSync(overlayPath)
    ? await readJsonIfExists<Record<string, unknown>>(overlayPath, {})
    : postReviewPackage;
  const entitiesOmit = new Set(
    ((postReviewPackage.entities_omit_from_staging as Array<Record<string, unknown>> | undefined) ?? []).map((item) => String(item.slug))
  );
  const entitiesAdd = ((postReviewPackage.entities_add as Array<Record<string, unknown>> | undefined) ?? []).map(normalizeEntity);

  const relationshipRemovalKeys = new Set<string>();
  for (const removal of ((postReviewPackage.relationships_remove as unknown[]) ?? (overlay.relationship_removals as unknown[]) ?? [])) {
    if (typeof removal === "string") relationshipRemovalKeys.add(removal.replace(/^rel\|/, ""));
    else relationshipRemovalKeys.add(relationshipKey(normalizeRelationship(removal as Record<string, unknown>)));
  }
  const rejectedItems = Array.isArray(overlay.rejected) ? (overlay.rejected as Array<Record<string, unknown>>) : [];
  for (const rejected of rejectedItems) {
    if (rejected.proposal_fingerprint && String(rejected.proposal_fingerprint).startsWith("rel|")) {
      relationshipRemovalKeys.add(String(rejected.proposal_fingerprint).replace(/^rel\|/, ""));
    }
  }

  const normalizedAdds = (postReviewPackage.relationships_add as Array<Record<string, unknown>> | undefined) ?? [];
  const overlayAdds = overlay === postReviewPackage
    ? []
    : ((overlay.relationship_additions as Array<Record<string, unknown>> | undefined) ?? []);
  const relationshipAdds = (normalizedAdds.length > 0 ? normalizedAdds : overlayAdds).map(normalizeRelationship);

  const revisedClaims = new Map(
    ((overlay.revised_claims as Array<Record<string, unknown>> | undefined) ?? []).map((claim) => [String(claim.draft_id ?? claim.draftId), claim])
  );
  const revisedDecisionPoints = new Map(
    ((overlay.revised_decision_points as Array<Record<string, unknown>> | undefined) ?? []).map((point) => [String(point.draft_id ?? point.draftId), point])
  );

  const entities = [
    ...draft.entities.filter((entity) => !entitiesOmit.has(entity.slug)),
    ...entitiesAdd.filter((entity) => !draft.entities.some((existing) => existing.slug === entity.slug)),
  ];
  const relationships = [
    ...draft.relationships.filter((relationship) => !entitiesOmit.has(relationship.subjectSlug) && !entitiesOmit.has(relationship.objectSlug)),
    ...relationshipAdds,
  ].filter((relationship) => !relationshipRemovalKeys.has(relationshipKey(relationship)));
  const dedupedRelationships = [...new Map(relationships.map((relationship) => [relationshipKey(relationship), relationship])).values()];

  return {
    ...draft,
    entities,
    relationships: dedupedRelationships,
    claims: draft.claims.map((claim) => reviseClaim(claim, revisedClaims.get(claim.draftId))),
    decisionPoints: draft.decisionPoints.map((point) => reviseDecisionPoint(point, revisedDecisionPoints.get(point.draftId))),
    stats: {
      ...draft.stats,
      entityCount: entities.length,
      relationshipCount: dedupedRelationships.length,
      claimCount: draft.claims.length,
      decisionPointCount: draft.decisionPoints.length,
    },
  };
}

export function relationshipKey(relationship: Pick<NeighborhoodRelationship, "subjectSlug" | "predicate" | "objectSlug">): string {
  return `${relationship.subjectSlug}|${relationship.predicate}|${relationship.objectSlug}`;
}

function normalizeEntity(raw: Record<string, unknown>): NeighborhoodEntity {
  return {
    slug: String(raw.slug),
    entityType: String(raw.entityType ?? raw.entity_type),
    preferredLabel: String(raw.preferredLabel ?? raw.preferred_label ?? raw.slug),
    description: raw.description ? String(raw.description) : undefined,
    metadata: (raw.metadata as Record<string, unknown> | undefined) ?? {},
    source: "proposal",
  };
}

function normalizeRelationship(raw: Record<string, unknown>): NeighborhoodRelationship {
  return {
    subjectSlug: String(raw.subjectSlug ?? raw.subject_slug),
    predicate: String(raw.predicate),
    objectSlug: String(raw.objectSlug ?? raw.object_slug),
    metadata: {
      ...((raw.relationship_metadata as Record<string, unknown> | undefined) ?? {}),
      ...(raw.review_status ? { review_status: raw.review_status } : {}),
      ...(raw.relationship_strength ? { relationship_strength: raw.relationship_strength } : {}),
      ...(raw.overlay_note ? { overlay_note: raw.overlay_note } : {}),
      source: "post_review_overlay",
    },
    source: "proposal",
  };
}

function reviseClaim(claim: NeighborhoodClaim, revision?: Record<string, unknown>): NeighborhoodClaim {
  if (!revision) return claim;
  return {
    ...claim,
    claimText: String(revision.claim_text ?? revision.claimText ?? claim.claimText),
    reviewStatus: "needs_review",
    metadata: { ...(claim.metadata ?? {}), post_review_revision_applied: true },
  };
}

function reviseDecisionPoint(point: NeighborhoodDecisionPoint, revision?: Record<string, unknown>): NeighborhoodDecisionPoint {
  if (!revision) return point;
  return {
    ...point,
    trigger: String(revision.trigger ?? point.trigger),
    action: String(revision.action ?? point.action),
    urgency: String(revision.urgency ?? point.urgency),
  };
}
