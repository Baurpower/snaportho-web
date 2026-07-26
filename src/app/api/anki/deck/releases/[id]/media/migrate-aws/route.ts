/* eslint-disable @typescript-eslint/ban-ts-comment -- Additive Anki tables are absent from generated database types. */
// @ts-nocheck This temporary operational route is removed after the release migration.
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAnkiAwsObject } from "@/lib/education/anki-aws-storage";
import { AWS_STORAGE_PROVIDER, deviceAuth } from "../../../../_lib";

const itemSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  objectKey: z.string().regex(/^deck-releases\/[a-f0-9-]+\/media\/[a-f0-9]{64}$/),
  byteSize: z.number().int().positive(),
});
const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await deviceAuth(request);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid migration batch" }, { status: 400 });
  }
  if (
    parsed.data.items.some(
      (item) =>
        !item.objectKey.startsWith(`deck-releases/${id}/media/`) ||
        !item.objectKey.endsWith(item.sha256),
    )
  ) {
    return NextResponse.json({ error: "invalid object key scope" }, { status: 400 });
  }

  const hashes = parsed.data.items.map((item) => item.sha256);
  const { data: rows, error: lookupError } = await auth.supabase
    .from("anki_deck_media_assets")
    .select("id,content_sha256,byte_size,license_status")
    .eq("deck_release_id", id)
    .in("content_sha256", hashes)
    .neq("license_status", "excluded");
  if (lookupError) {
    return NextResponse.json({ error: "media lookup unavailable" }, { status: 500 });
  }
  const byHash = new Map((rows ?? []).map((row) => [row.content_sha256, row]));
  for (const item of parsed.data.items) {
    const row = byHash.get(item.sha256);
    if (!row || Number(row.byte_size) !== item.byteSize) {
      return NextResponse.json(
        { error: "media metadata mismatch", sha256: item.sha256 },
        { status: 409 },
      );
    }
  }

  let storageBucket = "";
  try {
    const verified = await Promise.all(
      parsed.data.items.map((item) =>
        verifyAnkiAwsObject({
          objectKey: item.objectKey,
          expectedByteSize: item.byteSize,
          expectedSha256: item.sha256,
        }),
      ),
    );
    storageBucket = verified[0]?.bucket ?? "";
  } catch (error) {
    console.error("Unable to verify migrated Anki media", {
      releaseId: id,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "aws media verification failed" }, { status: 409 });
  }

  for (const item of parsed.data.items) {
    const { error: updateError } = await auth.supabase
      .from("anki_deck_media_assets")
      .update({
        object_key: item.objectKey,
        storage_provider: AWS_STORAGE_PROVIDER,
        storage_bucket: storageBucket,
      })
      .eq("id", byHash.get(item.sha256).id)
      .eq("content_sha256", item.sha256)
      .eq("byte_size", item.byteSize);
    if (updateError) {
      return NextResponse.json(
        { error: "media migration update failed", sha256: item.sha256 },
        { status: 500 },
      );
    }
  }
  return NextResponse.json({ migrated: parsed.data.items.length });
}
