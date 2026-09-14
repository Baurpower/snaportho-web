/* eslint-disable @typescript-eslint/ban-ts-comment -- Additive Phase 3 tables are absent from generated database types until deployment. */
// @ts-nocheck Additive Phase 3 tables are absent from generated database types until deployment.
import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAnkiProductEvent } from "@/lib/analytics/anki-usage";
import { deviceAuth } from "../../_lib";
const h = z.string().regex(/^[a-f0-9]{64}$/);
const schema = z
  .object({
    targetReleaseId: z.string().uuid(),
    syncPlanChecksum: h,
    installedManifestChecksum: h,
    status: z.enum(["planned", "applied", "partial", "failed", "rolled_back"]),
    conflictCount: z.number().int().min(0).max(1_000_000),
  })
  .strict();
// Append-only ledger of what each device planned/applied. This is the product's
// "who is on which deck version" telemetry; every sync attempt is one immutable event.
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
      { error: "invalid acknowledgement" },
      { status: 400 },
    );
  const { data: release, error: releaseError } = await a.supabase
    .from("anki_deck_releases")
    .select("id,status")
    .eq("id", parsed.data.targetReleaseId)
    .maybeSingle();
  if (releaseError)
    return NextResponse.json(
      { error: "release lookup unavailable" },
      { status: 500 },
    );
  if (!release)
    return NextResponse.json({ error: "unknown release" }, { status: 404 });
  const { data, error } = await a.supabase
    .from("anki_deck_sync_acknowledgements")
    .insert({
      user_id: a.userId,
      device_token_id: a.deviceTokenId,
      deck_release_id: parsed.data.targetReleaseId,
      sync_plan_checksum: parsed.data.syncPlanChecksum,
      installed_manifest_checksum: parsed.data.installedManifestChecksum,
      status: parsed.data.status,
      conflict_count: parsed.data.conflictCount,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json(
      { error: "could not record acknowledgement" },
      { status: 500 },
    );
  if (parsed.data.status === "applied") {
    void recordAnkiProductEvent({
      eventName: "anki_deck_update_applied",
      userId: a.userId,
      surface: "anki_deck_sync_ack",
      properties: {
        release_id: parsed.data.targetReleaseId,
        conflict_count: parsed.data.conflictCount,
      },
    });
  } else if (parsed.data.status === "failed") {
    void recordAnkiProductEvent({
      eventName: "anki_setup_failed",
      userId: a.userId,
      surface: "anki_deck_sync_ack",
      properties: {
        code: "deck_update_failed",
        release_id: parsed.data.targetReleaseId,
        conflict_count: parsed.data.conflictCount,
      },
    });
  }
  return NextResponse.json({ recorded: true, id: data.id });
}
