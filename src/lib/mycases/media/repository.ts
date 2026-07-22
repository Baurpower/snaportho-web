import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { MYCASES_MEDIA_BUCKET, MYCASES_MEDIA_SIGNED_URL_SECONDS, MyCasesMediaError, publicAsset, type MyCasesEducationalAssetRow } from "./types";
import type { SanitizedEducationalImage } from "./processor";

function isWebp(value: Buffer) {
  return value.length >= 12
    && value.toString("ascii", 0, 4) === "RIFF"
    && value.toString("ascii", 8, 12) === "WEBP";
}

function assertSanitizedImage(image: SanitizedEducationalImage) {
  const checksum = createHash("sha256").update(image.image).digest("hex");
  if (
    image.mediaType !== "image/webp"
    || !isWebp(image.image)
    || !isWebp(image.thumbnail)
    || checksum !== image.checksum
  ) {
    throw new MyCasesMediaError("invalid_sanitized_output", "The sanitized image output is invalid.", 500);
  }
}

function assertOwnedObjectKeys(row: MyCasesEducationalAssetRow) {
  const prefix = `${row.user_id}/${row.id}`;
  if (
    row.storage_object_key !== `${prefix}/image.webp`
    || row.thumbnail_object_key !== `${prefix}/thumbnail.webp`
  ) {
    throw new MyCasesMediaError("invalid_object_mapping", "Educational media storage mapping is invalid.", 500);
  }
}

async function assertOwnedCase(userId: string, caseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mycases_cases").select("id").eq("id", caseId).eq("user_id", userId).is("deleted_at", null).maybeSingle();
  if (error) throw new MyCasesMediaError("case_lookup_failed", "Unable to verify the case.", 500);
  if (!data) throw new MyCasesMediaError("case_not_found", "Case not found.", 404);
}
export async function listOwnedAssets(userId: string, caseId: string) {
  await assertOwnedCase(userId, caseId); const admin = createAdminClient();
  const { data, error } = await admin.from("mycases_educational_assets").select("*").eq("user_id", userId).eq("case_id", caseId).is("deleted_at", null).neq("processing_status", "deleted").order("created_at", { ascending:false });
  if (error) throw new MyCasesMediaError("asset_list_failed", "Unable to load educational media.", 500);
  return (data as MyCasesEducationalAssetRow[]).map(publicAsset);
}
export async function getOwnedAssetRow(userId: string, assetId: string, includeDeleted = false) {
  const admin = createAdminClient(); let query = admin.from("mycases_educational_assets").select("*").eq("id", assetId).eq("user_id", userId);
  if (!includeDeleted) query = query.is("deleted_at", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw new MyCasesMediaError("asset_lookup_failed", "Unable to load educational media.", 500);
  return data as MyCasesEducationalAssetRow | null;
}
export async function createOwnedAsset(userId: string, caseId: string, caption: string | null, image: SanitizedEducationalImage) {
  assertSanitizedImage(image);
  await assertOwnedCase(userId, caseId); const admin = createAdminClient();
  const { data: duplicate, error: duplicateError } = await admin.from("mycases_educational_assets").select("id").eq("user_id", userId).eq("case_id", caseId).eq("checksum_sha256", image.checksum).is("deleted_at", null).neq("processing_status", "deleted").maybeSingle();
  if (duplicateError) throw new MyCasesMediaError("duplicate_check_failed", "Unable to check the sanitized image.", 500);
  if (duplicate) throw new MyCasesMediaError("duplicate_image", "This sanitized image is already attached to the case.", 409);
  const id = randomUUID(); const imageKey = `${userId}/${id}/image.webp`; const thumbnailKey = `${userId}/${id}/thumbnail.webp`; const uploaded: string[] = [];
  try {
    const imageUpload = await admin.storage.from(MYCASES_MEDIA_BUCKET).upload(imageKey, image.image, { contentType:"image/webp", upsert:false, cacheControl:"300" });
    if (imageUpload.error) throw new MyCasesMediaError("image_upload_failed", "Unable to store the sanitized image.", 502); uploaded.push(imageKey);
    const thumbnailUpload = await admin.storage.from(MYCASES_MEDIA_BUCKET).upload(thumbnailKey, image.thumbnail, { contentType:"image/webp", upsert:false, cacheControl:"300" });
    if (thumbnailUpload.error) throw new MyCasesMediaError("thumbnail_upload_failed", "Unable to store the sanitized thumbnail.", 502); uploaded.push(thumbnailKey);
    const { data, error } = await admin.from("mycases_educational_assets").insert({ id, user_id:userId, case_id:caseId, caption, storage_object_key:imageKey, thumbnail_object_key:thumbnailKey, media_type:image.mediaType, byte_size:image.image.length, width:image.width, height:image.height, checksum_sha256:image.checksum, processing_status:"ready" }).select("*").single();
    if (error) throw new MyCasesMediaError(error.code === "23505" ? "duplicate_image" : "metadata_insert_failed", error.code === "23505" ? "This sanitized image is already attached to the case." : "Unable to save educational media.", error.code === "23505" ? 409 : 500);
    return publicAsset(data as MyCasesEducationalAssetRow);
  } catch (error) { if (uploaded.length) await admin.storage.from(MYCASES_MEDIA_BUCKET).remove(uploaded); throw error; }
}
export async function createOwnedAssetView(userId: string, assetId: string, download = false) {
  const row = await getOwnedAssetRow(userId, assetId); if (!row || row.processing_status !== "ready") throw new MyCasesMediaError("asset_not_found", "Educational media is unavailable.", 404);
  assertOwnedObjectKeys(row);
  const admin = createAdminClient(); const [image, thumbnail] = await Promise.all([admin.storage.from(MYCASES_MEDIA_BUCKET).createSignedUrl(row.storage_object_key, MYCASES_MEDIA_SIGNED_URL_SECONDS, { download }), admin.storage.from(MYCASES_MEDIA_BUCKET).createSignedUrl(row.thumbnail_object_key, MYCASES_MEDIA_SIGNED_URL_SECONDS, { download:false })]);
  if (image.error || thumbnail.error) throw new MyCasesMediaError("signed_url_failed", "Unable to open educational media.", 502);
  return { imageUrl:image.data.signedUrl, thumbnailUrl:thumbnail.data.signedUrl, expiresAt:new Date(Date.now()+MYCASES_MEDIA_SIGNED_URL_SECONDS*1000).toISOString() };
}
export async function createOwnedAssetThumbnailView(userId: string, assetId: string) {
  const row = await getOwnedAssetRow(userId, assetId);
  if (!row || row.processing_status !== "ready") throw new MyCasesMediaError("asset_not_found", "Educational media is unavailable.", 404);
  assertOwnedObjectKeys(row);
  const admin = createAdminClient();
  const thumbnail = await admin.storage.from(MYCASES_MEDIA_BUCKET).createSignedUrl(row.thumbnail_object_key, MYCASES_MEDIA_SIGNED_URL_SECONDS);
  if (thumbnail.error) throw new MyCasesMediaError("signed_url_failed", "Unable to open educational media.", 502);
  return { thumbnailUrl:thumbnail.data.signedUrl, expiresAt:new Date(Date.now()+MYCASES_MEDIA_SIGNED_URL_SECONDS*1000).toISOString() };
}
export async function updateOwnedAssetCaption(userId: string, assetId: string, caption: string | null) {
  const admin = createAdminClient(); const { data, error } = await admin.from("mycases_educational_assets").update({ caption }).eq("id", assetId).eq("user_id", userId).is("deleted_at", null).select("*").maybeSingle();
  if (error) throw new MyCasesMediaError("caption_update_failed", "Unable to update the caption.", 500); if (!data) throw new MyCasesMediaError("asset_not_found", "Educational media is unavailable.", 404); return publicAsset(data as MyCasesEducationalAssetRow);
}
export async function deleteOwnedAsset(userId: string, assetId: string) {
  const row = await getOwnedAssetRow(userId, assetId, true); if (!row) return { deleted:true }; const admin = createAdminClient();
  assertOwnedObjectKeys(row);
  const { error: deletingError } = await admin.from("mycases_educational_assets").update({ processing_status:"deleting" }).eq("id", assetId).eq("user_id", userId);
  if (deletingError) throw new MyCasesMediaError("delete_state_failed", "Media deletion could not be started. Retry deletion.", 500);
  const removal = await admin.storage.from(MYCASES_MEDIA_BUCKET).remove([row.storage_object_key, row.thumbnail_object_key]);
  if (removal.error) throw new MyCasesMediaError("storage_delete_failed", "Media deletion is incomplete. Retry deletion.", 502);
  const { error } = await admin.from("mycases_educational_assets").update({ processing_status:"deleted", deleted_at:new Date().toISOString() }).eq("id", assetId).eq("user_id", userId);
  if (error) throw new MyCasesMediaError("tombstone_failed", "Media was removed but its deletion record could not be finalized.", 500); return { deleted:true };
}

/**
 * Server-admin cleanup gate for a future permanent case/account deletion flow.
 * The caller must authenticate/authorize the principal before invoking it and
 * must not delete the case or auth user unless this function completes.
 */
export async function cleanupOwnedMediaBeforePrincipalDeletion(userId: string, caseId?: string) {
  const admin = createAdminClient();
  let query = admin
    .from("mycases_educational_assets")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .neq("processing_status", "deleted")
    .order("created_at", { ascending: true });
  if (caseId) query = query.eq("case_id", caseId);
  const { data, error } = await query;
  if (error) throw new MyCasesMediaError("cleanup_list_failed", "Media cleanup could not be started.", 500);
  let deletedCount = 0;
  for (const row of data ?? []) {
    await deleteOwnedAsset(userId, row.id);
    deletedCount += 1;
  }
  return { deletedCount };
}
