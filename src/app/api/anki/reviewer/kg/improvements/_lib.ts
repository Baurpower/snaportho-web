/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  analyzeKgCardEvidence,
  type KgCardEvidence,
} from "@/lib/education/anki-kg-draft";
import {
  buildKgImprovement,
  extractSubjectLabel,
  type ExistingClaim,
  type ImprovementEntity,
  type KgImprovement,
} from "@/lib/education/anki-kg-improvement";
import { normalizeClinicalText } from "@/lib/education/deck-semantic-mapping";

export type ImprovementContext = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  contentHash: string;
  fields: Array<{
    name: string;
    rawValue: string;
    plainText: string;
  }>;
  improvement: KgImprovement;
};

export async function buildImprovementContext(
  supabase: any,
  localIdentity: {
    noteGuid: string;
    cardOrdinal: number;
    contentHash: string;
  },
): Promise<ImprovementContext | null> {
  const { data: notes } = await supabase
    .from("anki_notes")
    .select("id")
    .eq("anki_note_guid", localIdentity.noteGuid)
    .eq("is_active", true)
    .limit(5);
  if (!notes?.length) return null;
  const { data: cards } = await supabase
    .from("anki_cards")
    .select("id")
    .in(
      "note_id",
      notes.map((note: any) => note.id),
    )
    .eq("card_ord", localIdentity.cardOrdinal)
    .eq("is_active", true)
    .limit(5);
  if (!cards?.length || cards.length !== 1) return null;
  const { data: canonical } = await supabase
    .from("canonical_cards")
    .select("id,current_version_id,is_active")
    .eq("anki_card_id", cards[0].id)
    .maybeSingle();
  if (!canonical?.is_active) return null;
  const { data: version } = await supabase
    .from("canonical_card_versions")
    .select("id,content_hash,field_snapshot")
    .eq("id", canonical.current_version_id)
    .eq("canonical_card_id", canonical.id)
    .maybeSingle();
  if (!version) return null;
  const fields = (Array.isArray(version.field_snapshot)
    ? version.field_snapshot
    : []
  ).map((field: any) => ({
    name: String(field?.name ?? "unknown"),
    rawValue: String(field?.rawValue ?? field?.value ?? ""),
    plainText: String(field?.plainText ?? ""),
  }));
  const evidence: KgCardEvidence = analyzeKgCardEvidence(fields);
  const subject = extractSubjectLabel(evidence.stem);
  const escaped = subject.replace(/[\\%_]/g, (character) => `\\${character}`);
  const entityMap = new Map<string, any>();
  const aliasesByEntity = new Map<string, string[]>();
  if (subject.length >= 2) {
    const { data: entities } = await supabase
      .from("canonical_entities")
      .select("id,preferred_label,normalized_label,entity_type,description,status,is_active")
      .eq("is_active", true)
      .eq("status", "canonical")
      .ilike("preferred_label", `%${escaped}%`)
      .limit(20);
    for (const entity of entities ?? []) entityMap.set(entity.id, entity);
    const { data: aliases } = await supabase
      .from("source_aliases")
      .select("entity_id,alias_value")
      .eq("is_active", true)
      .eq("entity_type", "canonical_entity")
      .ilike("alias_value", `%${escaped}%`)
      .limit(20);
    for (const alias of aliases ?? []) {
      const id = String(alias.entity_id ?? "");
      const value = String(alias.alias_value ?? "");
      if (!id || !value) continue;
      aliasesByEntity.set(id, [...(aliasesByEntity.get(id) ?? []), value]);
    }
    const missingIds = [...aliasesByEntity.keys()].filter((id) => !entityMap.has(id));
    if (missingIds.length) {
      const { data: aliasEntities } = await supabase
        .from("canonical_entities")
        .select("id,preferred_label,normalized_label,entity_type,description,status,is_active")
        .in("id", missingIds)
        .eq("is_active", true)
        .eq("status", "canonical");
      for (const entity of aliasEntities ?? []) entityMap.set(entity.id, entity);
    }
  }
  const { data: links } = await supabase
    .from("card_canonical_entity_links")
    .select("canonical_entity_id")
    .eq("canonical_card_id", canonical.id)
    .eq("is_active", true);
  const existingEntityIds = [
    ...new Set((links ?? []).map((link: any) => String(link.canonical_entity_id))),
  ].filter(Boolean) as string[];
  const missingLinkedIds = existingEntityIds.filter((id) => !entityMap.has(id));
  if (missingLinkedIds.length) {
    const { data: linkedEntities } = await supabase
      .from("canonical_entities")
      .select("id,preferred_label,normalized_label,entity_type,description,status,is_active")
      .in("id", missingLinkedIds)
      .eq("is_active", true)
      .eq("status", "canonical");
    for (const entity of linkedEntities ?? []) entityMap.set(entity.id, entity);
  }
  const entities: ImprovementEntity[] = [...entityMap.values()].map((entity) => ({
    id: entity.id,
    preferredLabel: entity.preferred_label,
    normalizedLabel:
      entity.normalized_label ?? normalizeClinicalText(entity.preferred_label ?? ""),
    entityType: entity.entity_type,
    aliases: aliasesByEntity.get(entity.id) ?? [],
    description: entity.description ?? undefined,
  }));
  const entityIds = entities.map((entity) => entity.id);
  const hierarchyParentByChild = new Map<string, string>();
  const hierarchyEntityMap = new Map(entityMap);
  let frontier = [...new Set(entityIds)];
  for (let depth = 0; depth < 6 && frontier.length; depth += 1) {
    const { data: relations } = await supabase
      .from("canonical_relationships")
      .select("subject_entity_id,object_entity_id")
      .eq("subject_entity_type", "canonical_entity")
      .in("subject_entity_id", frontier)
      .eq("predicate", "part_of")
      .eq("object_entity_type", "canonical_entity")
      .eq("review_status", "approved")
      .eq("lifecycle_status", "active")
      .eq("is_active", true);
    const grouped = new Map<string, string[]>();
    for (const relation of relations ?? []) {
      const child = String(relation.subject_entity_id);
      const parent = String(relation.object_entity_id);
      grouped.set(child, [...(grouped.get(child) ?? []), parent]);
    }
    const parents = [...grouped.entries()]
      .filter(([, ids]) => new Set(ids).size === 1)
      .map(([child, ids]) => {
        const parent = ids[0]!;
        hierarchyParentByChild.set(child, parent);
        return parent;
      });
    const missingParents = [...new Set(parents)].filter(
      (id) => !hierarchyEntityMap.has(id),
    );
    if (missingParents.length) {
      const { data: parentEntities } = await supabase
        .from("canonical_entities")
        .select("id,preferred_label,normalized_label,entity_type,description,status,is_active")
        .in("id", missingParents)
        .eq("is_active", true)
        .eq("status", "canonical");
      for (const entity of parentEntities ?? [])
        hierarchyEntityMap.set(entity.id, entity);
    }
    frontier = [...new Set(parents)];
  }
  const hierarchyPaths: Record<
    string,
    Array<{ id: string; label: string; entityType: string }>
  > = {};
  for (const entityId of entityIds) {
    const leafToRoot: Array<{ id: string; label: string; entityType: string }> = [];
    const seen = new Set<string>();
    let current: string | undefined = entityId;
    while (current && !seen.has(current) && leafToRoot.length < 7) {
      seen.add(current);
      const entity = hierarchyEntityMap.get(current);
      if (!entity) break;
      leafToRoot.push({
        id: current,
        label: String(entity.preferred_label),
        entityType: String(entity.entity_type),
      });
      current = hierarchyParentByChild.get(current);
    }
    hierarchyPaths[entityId] = leafToRoot.reverse();
  }
  let existingClaims: ExistingClaim[] = [];
  if (entityIds.length) {
    const { data: claims } = await supabase
      .from("educational_claims")
      .select("id,primary_entity_id,claim_text,claim_type,review_status")
      .in("primary_entity_id", entityIds)
      .eq("is_active", true)
      .in("review_status", ["approved", "in_review"]);
    existingClaims = (claims ?? []).map((claim: any) => ({
      id: claim.id,
      primaryEntityId: claim.primary_entity_id,
      claimText: claim.claim_text,
      claimType: claim.claim_type,
      reviewStatus: claim.review_status,
    }));
  }
  const improvement = buildKgImprovement({
    canonicalCardId: canonical.id,
    canonicalCardVersionId: version.id,
    fields,
    entities,
    existingClaims,
    existingEntityIds,
    hierarchyPaths,
  });
  return {
    canonicalCardId: canonical.id,
    canonicalCardVersionId: version.id,
    contentHash: version.content_hash,
    fields,
    improvement,
  };
}
