/* eslint-disable @typescript-eslint/ban-ts-comment -- Additive Phase 3 tables are absent from generated database types until deployment. */
// @ts-nocheck Additive Phase 3 tables are absent from generated database types until deployment.
import { NextResponse } from "next/server";
import {
  deviceAuth,
  ANKI_DECK_MEDIA_BUCKET,
  ANKI_MEDIA_SIGNED_URL_SECONDS,
  AWS_STORAGE_PROVIDER,
  describeAnkiAwsDeliveryError,
  signAnkiAwsDownload,
} from "../../../../_lib";
// Content-addressed media delivery for the delta-apply step. Returns a short-lived signed
// URL for a sha256 that belongs to a published release; the add-on re-verifies the hash after
// download. Excluded (unlicensed) assets are never served.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; sha256: string }> },
) {
  const a = await deviceAuth(request);
  if ("response" in a) return a.response;
  const { id, sha256 } = await params;
  if (!/^[a-f0-9]{64}$/.test(sha256))
    return NextResponse.json({ error: "invalid media hash" }, { status: 400 });
  const { data: release, error: releaseError } = await a.supabase
    .from("anki_deck_releases")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (releaseError)
    return NextResponse.json(
      { error: "release lookup unavailable" },
      { status: 500 },
    );
  if (!release || release.status !== "published")
    return NextResponse.json(
      { error: "published release unavailable" },
      { status: 404 },
    );
  const { data: asset, error } = await a.supabase
    .from("anki_deck_media_assets")
    .select(
      "content_sha256,mime_type,byte_size,object_key,logical_filename,license_status,storage_provider,storage_bucket",
    )
    .eq("deck_release_id", id)
    .eq("content_sha256", sha256)
    .neq("license_status", "excluded")
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "media lookup unavailable" },
      { status: 500 },
    );
  if (!asset)
    return NextResponse.json({ error: "media not found" }, { status: 404 });
  let url: string | null = null;
  let deliveryErrorCode: string | null = null;
  if (asset.storage_provider === AWS_STORAGE_PROVIDER) {
    try {
      url = signAnkiAwsDownload(
        asset.object_key,
        ANKI_MEDIA_SIGNED_URL_SECONDS,
      );
    } catch (error) {
      const deliveryError = describeAnkiAwsDeliveryError(error);
      deliveryErrorCode = deliveryError.code;
      console.error("Unable to sign AWS Master Deck media", {
        code: deliveryError.code,
        environmentVariable: deliveryError.environmentVariable,
        releaseId: id,
        sha256,
        objectKey: asset.object_key,
      });
    }
  } else {
    const { data: signed } = await a.supabase.storage
      .from(ANKI_DECK_MEDIA_BUCKET)
      .createSignedUrl(asset.object_key, ANKI_MEDIA_SIGNED_URL_SECONDS, {
        download: asset.logical_filename,
      });
    url = signed?.signedUrl ?? null;
  }
  if (!url)
    return NextResponse.json(
      {
        error: "media temporarily unavailable",
        code: deliveryErrorCode ?? "media_delivery_unavailable",
      },
      { status: 503 },
    );
  return NextResponse.json({
    sha256: asset.content_sha256,
    mimeType: asset.mime_type,
    byteSize: asset.byte_size,
    logicalFilename: asset.logical_filename,
    url,
    expiresInSeconds: ANKI_MEDIA_SIGNED_URL_SECONDS,
    storageProvider: asset.storage_provider,
  });
}
