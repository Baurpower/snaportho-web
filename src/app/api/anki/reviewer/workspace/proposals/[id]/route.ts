/* eslint-disable @typescript-eslint/no-explicit-any -- Workspace and entity rows await generated Supabase types. */
import { NextResponse } from "next/server";
import { reviewerAuth } from "../../../_lib";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await reviewerAuth(request);
  if ("response" in a) return a.response;
  const { id } = await params,
    { data, error } = await a.auth.supabase
      .from("anki_editor_workspace_proposals")
      .select(
        "id,reviewer_user_id,proposal_kind,source_surface,canonical_card_id,base_canonical_card_version_id,base_content_hash,note_guid,card_ordinal,local_content_hash,edited_fields,central_tag_changes,proposed_deck_path,mapping_changes,kg_expansion_suggestion,reviewer_notes,status,proposal_evidence_hash,client_version,created_at,reviewed_at,incorporated_at",
      )
      .eq("id", id)
      .maybeSingle();
  if (error || !data)
    return NextResponse.json(
      { error: "proposal not found" },
      { status: error ? 500 : 404 },
    );
  let currentVersionId: null | string = null,
    cardActive: null | boolean = null;
  if (data.canonical_card_id) {
    const { data: card } = await a.auth.supabase
      .from("canonical_cards")
      .select("current_version_id,is_active")
      .eq("id", data.canonical_card_id)
      .maybeSingle();
    currentVersionId = card?.current_version_id ?? null;
    cardActive = card?.is_active ?? false;
  }
  const entityIds = (data.mapping_changes ?? []).flatMap((m: any) =>
    m.canonicalEntityId ? [m.canonicalEntityId] : [],
  );
  const { data: entities } = entityIds.length
    ? await a.auth.supabase
        .from("canonical_entities")
        .select(
          "id,preferred_label,entity_type,status,is_active,replacement_entity_id",
        )
        .in("id", entityIds)
    : { data: [] };
  const stale = Boolean(
    data.base_canonical_card_version_id &&
    currentVersionId !== data.base_canonical_card_version_id,
  );
  const inactiveEntities = (entities ?? [])
    .filter((e: any) => !e.is_active || e.status !== "canonical")
    .map((e: any) => e.id);
  return NextResponse.json({
    proposal: data,
    validation: {
      ready: !stale && cardActive !== false && !inactiveEntities.length,
      staleCardVersion: stale,
      cardActive,
      inactiveEntityIds: inactiveEntities,
      currentVersionId,
    },
    entities: (entities ?? []).map((e: any) => ({
      id: e.id,
      label: e.preferred_label,
      entityType: e.entity_type,
      status: e.status,
      isActive: e.is_active,
      replacementEntityId: e.replacement_entity_id,
    })),
  });
}
