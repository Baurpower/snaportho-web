/* eslint-disable @typescript-eslint/ban-ts-comment -- Additive Phase 3 tables are absent from generated database types until deployment. */
// @ts-nocheck Additive Phase 3 tables are absent from generated database types until deployment.
import { NextResponse } from "next/server";
import {
  deviceAuth,
  ANKI_DECK_MEDIA_BUCKET,
  ANKI_MEDIA_SIGNED_URL_SECONDS,
} from "../../../../_lib";

// Serves the published bootstrap_apkg artifact for first install. Device auth only.
// Returns a short-lived signed URL; the client verifies artifact checksum after download.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await deviceAuth(request);
  if ("response" in a) return a.response;
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "release id required" }, { status: 400 });
  }

  const { data: release, error: releaseError } = await a.supabase
    .from("anki_deck_releases")
    .select("id,status,release_version")
    .eq("id", id)
    .maybeSingle();
  if (releaseError) {
    return NextResponse.json(
      { error: "release lookup unavailable" },
      { status: 500 },
    );
  }
  if (!release || release.status !== "published") {
    return NextResponse.json(
      { error: "published release unavailable" },
      { status: 404 },
    );
  }

  const { data: artifact, error } = await a.supabase
    .from("anki_deck_release_artifacts")
    .select(
      "object_key,artifact_checksum,byte_size,media_type,status,artifact_schema_version",
    )
    .eq("deck_release_id", id)
    .eq("artifact_type", "bootstrap_apkg")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "artifact lookup unavailable" },
      { status: 500 },
    );
  }
  if (!artifact?.object_key) {
    return NextResponse.json(
      { error: "bootstrap artifact not found" },
      { status: 404 },
    );
  }

  const filename = `SnapOrtho-Master-${release.release_version}.apkg`;
  const { data: signed, error: signError } = await a.supabase.storage
    .from(ANKI_DECK_MEDIA_BUCKET)
    .createSignedUrl(artifact.object_key, ANKI_MEDIA_SIGNED_URL_SECONDS, {
      download: filename,
    });
  if (signError || !signed) {
    return NextResponse.json(
      { error: "bootstrap artifact temporarily unavailable" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    releaseId: release.id,
    artifactType: "bootstrap_apkg",
    artifactSchemaVersion: artifact.artifact_schema_version,
    checksum: artifact.artifact_checksum,
    byteSize: artifact.byte_size,
    mediaType: artifact.media_type ?? "application/apkg",
    url: signed.signedUrl,
    expiresInSeconds: ANKI_MEDIA_SIGNED_URL_SECONDS,
    filename,
  });
}
