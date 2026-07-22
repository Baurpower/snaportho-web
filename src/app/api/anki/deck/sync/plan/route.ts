/* eslint-disable @typescript-eslint/no-explicit-any -- Release manifest rows await generated Supabase types. */
import { NextResponse } from "next/server";
import { z } from "zod";
import { deviceAuth, loadReleaseManifest } from "../../_lib";
import { buildSyncPlan } from "@/lib/education/anki-deck-incorporation";
const h = z.string().regex(/^[a-f0-9]{64}$/),
  installed = z
    .object({
      canonicalCardId: z.string().uuid(),
      canonicalCardVersionId: z.string().uuid(),
      installedContentHash: h,
      localCentralContentHash: h,
      noteGuid: z.string().min(1).max(200),
      cardOrdinal: z.number().int().min(0),
      mediaHashes: z.array(h).max(100),
    })
    .strict(),
  schema = z
    .object({
      contractVersion: z.literal("snaportho-anki-sync-request.v1"),
      targetReleaseId: z.string().uuid(),
      installedCards: z.array(installed).max(100000),
    })
    .strict();
export async function POST(request: Request) {
  const a = await deviceAuth(request);
  if ("response" in a) return a.response;
  let raw;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid sync request" },
      { status: 400 },
    );
  const manifest = await loadReleaseManifest(
    a.supabase,
    parsed.data.targetReleaseId,
  );
  if (!manifest || manifest.releaseStatus !== "published")
    return NextResponse.json(
      { error: "published target release unavailable" },
      { status: 404 },
    );
  const target = manifest.cards
      .filter((c: any) => c.inclusionStatus === "included")
      .map((c: any) => ({
        canonicalCardId: c.canonicalCardId,
        canonicalCardVersionId: c.canonicalCardVersionId,
        contentHash: c.contentHash,
        noteGuid: c.noteGuid,
        cardOrdinal: c.cardOrdinal,
        deckPath: c.deckPath,
        centralTags: c.centralTags,
        mediaHashes: c.mediaHashes,
      })),
    plan = buildSyncPlan(parsed.data.installedCards, target);
  return NextResponse.json({
    ...plan,
    targetReleaseId: manifest.releaseId,
    targetManifestChecksum: manifest.manifestChecksum,
    actions: plan.actions.map((action) => ({
      ...action,
      requiresExplicitConfirmation: action.action === "conflict",
    })),
  });
}
