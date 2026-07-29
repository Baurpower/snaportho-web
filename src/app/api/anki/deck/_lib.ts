/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any -- Additive Phase 3 tables are absent from generated database types until deployment. Remove after regenerating Supabase types. */
// @ts-nocheck Additive Phase 3 tables are absent from generated database types until deployment.
import { NextResponse } from "next/server";
import { authenticateBroBotAnkiRequest } from "@/app/api/brobot-anki/_lib";
import { assembleDeckSyncManifest } from "@/lib/education/anki-deck-manifest-assemble";
import {
  addonVersionFromClientHeader,
  addonVersionAtLeast,
} from "@/lib/education/deck-addon-version";
import {
  AWS_STORAGE_PROVIDER,
  describeAnkiAwsDeliveryError,
  signAnkiAwsDownload,
} from "@/lib/education/anki-aws-storage";
export { addonVersionAtLeast };
export const ANKI_DECK_MEDIA_BUCKET = "anki-deck-media";
// Full media packages can be ~1GB. A fresh URL can also resume a partial Range download.
export const ANKI_MEDIA_SIGNED_URL_SECONDS = 6 * 60 * 60;
export {
  AWS_STORAGE_PROVIDER,
  describeAnkiAwsDeliveryError,
  signAnkiAwsDownload,
};
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
// Add-on version gate. The client sends `X-SnapOrtho-Client: reviewer-addon/<version>`.
export function clientAddonVersion(request: Request): string | null {
  return addonVersionFromClientHeader(
    request.headers.get("x-snaportho-client"),
  );
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
  const { data: publishedTagManifest } = await supabase
    .from("rendered_anki_tag_manifests")
    .select("id,manifest_key,output_checksum,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const renderedTags: any[] = [];
  if (publishedTagManifest && versionIds.length) {
    for (let offset = 0; offset < versionIds.length; offset += 100) {
      const { data: rows, error: renderedTagError } = await supabase
        .from("rendered_anki_tag_manifest_cards")
        .select("canonical_card_version_id,rendered_tags")
        .eq("manifest_id", publishedTagManifest.id)
        .in("canonical_card_version_id", versionIds.slice(offset, offset + 100));
      if (renderedTagError) return null;
      renderedTags.push(...(rows ?? []));
    }
  }
  const media: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data: page, error: mediaError } = await supabase
      .from("anki_deck_media_assets")
      .select(
        "canonical_card_version_id,logical_filename,content_sha256,mime_type,byte_size,object_key,license_status,storage_provider,storage_bucket",
      )
      .eq("deck_release_id", releaseId)
      .neq("license_status", "excluded")
      .order("logical_filename")
      .range(from, from + pageSize - 1);
    if (mediaError) return null;
    media.push(...(page ?? []));
    if (!page || page.length < pageSize) break;
  }
  return assembleDeckSyncManifest({
    release,
    members: members ?? [],
    versions: versions ?? [],
    mappings: mappings ?? [],
    media,
    renderedTags,
  });
}
