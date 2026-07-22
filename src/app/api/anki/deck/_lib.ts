/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any -- Additive Phase 3 tables are absent from generated database types until deployment. Remove after regenerating Supabase types. */
// @ts-nocheck Additive Phase 3 tables are absent from generated database types until deployment.
import { NextResponse } from "next/server";
import { authenticateBroBotAnkiRequest } from "@/app/api/brobot-anki/_lib";
import { computeCentralSyncHash } from "@/lib/education/anki-deck-incorporation";
export async function deviceAuth(request: Request) {
  const auth = await authenticateBroBotAnkiRequest(request);
  if ("response" in auth) return { response: auth.response };
  if (auth.authMethod !== "device_token")
    return {
      response: NextResponse.json(
        { error: "device authentication required" },
        { status: 401 },
      ),
    };
  return auth;
}
export async function loadReleaseManifest(supabase: any, releaseId: string) {
  const { data: release, error } = await supabase
    .from("anki_deck_releases")
    .select(
      "id,release_key,release_version,status,manifest_schema_version,manifest_checksum,minimum_addon_version,published_at",
    )
    .eq("id", releaseId)
    .maybeSingle();
  if (error || !release) return null;
  const { data: members, error: memberError } = await supabase
    .from("anki_deck_release_cards")
    .select(
      "canonical_card_id,canonical_card_version_id,note_guid,card_ordinal,native_card_id_hint,content_hash,deck_path,ordering_key,inclusion_status",
    )
    .eq("deck_release_id", releaseId)
    .order("ordering_key");
  if (memberError) return null;
  const versionIds = (members ?? []).map(
    (m: any) => m.canonical_card_version_id,
  );
  const { data: versions } = versionIds.length
    ? await supabase
        .from("canonical_card_versions")
        .select(
          "id,canonical_card_id,content_hash,field_snapshot,tag_snapshot,source_note_id,version_number",
        )
        .in("id", versionIds)
    : { data: [] };
  const { data: mappings } = versionIds.length
    ? await supabase
        .from("anki_card_entity_version_mappings")
        .select(
          "canonical_card_version_id,canonical_entity_id,reviewer_mapping_role",
        )
        .in("canonical_card_version_id", versionIds)
        .eq("production_eligible", true)
        .eq("lifecycle_status", "approved")
    : { data: [] };
  const { data: media } = await supabase
    .from("anki_deck_media_assets")
    .select(
      "canonical_card_version_id,logical_filename,content_sha256,mime_type,byte_size,object_key,license_status",
    )
    .eq("deck_release_id", releaseId)
    .neq("license_status", "excluded");
  const versionById = new Map((versions ?? []).map((v: any) => [v.id, v])),
    entities = new Map<string, any[]>(),
    mediaByVersion = new Map<string, string[]>();
  for (const m of mappings ?? []) {
    const rows = entities.get(m.canonical_card_version_id) ?? [];
    rows.push({
      canonicalEntityId: m.canonical_entity_id,
      mappingRole: m.reviewer_mapping_role,
    });
    entities.set(m.canonical_card_version_id, rows);
  }
  for (const asset of media ?? []) {
    if (!asset.canonical_card_version_id) continue;
    const rows = mediaByVersion.get(asset.canonical_card_version_id) ?? [];
    rows.push(asset.content_sha256);
    mediaByVersion.set(asset.canonical_card_version_id, rows);
  }
  return {
    contractVersion: "snaportho-deck-sync-manifest.v1",
    releaseId: release.id,
    releaseKey: release.release_key,
    releaseVersion: release.release_version,
    releaseStatus: release.status,
    manifestChecksum: release.manifest_checksum,
    minimumAddonVersion: release.minimum_addon_version,
    cards: (members ?? []).map((m: any) => {
      const v = versionById.get(m.canonical_card_version_id),
        fields = v?.field_snapshot ?? [],
        tags = v?.tag_snapshot ?? [];
      return {
        canonicalCardId: m.canonical_card_id,
        canonicalCardVersionId: m.canonical_card_version_id,
        noteGuid: m.note_guid,
        cardOrdinal: m.card_ordinal,
        nativeCardIdHint: m.native_card_id_hint,
        canonicalContentHash: m.content_hash,
        contentHash: computeCentralSyncHash(fields, tags, m.card_ordinal),
        deckPath: m.deck_path,
        orderingKey: m.ordering_key,
        inclusionStatus: m.inclusion_status,
        fieldSnapshot: fields,
        centralTags: tags.filter((t: string) => t.startsWith("SnapOrtho::")),
        mappings: entities.get(m.canonical_card_version_id) ?? [],
        mediaHashes: mediaByVersion.get(m.canonical_card_version_id) ?? [],
      };
    }),
    media: media ?? [],
  };
}
