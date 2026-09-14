/* eslint-disable @typescript-eslint/ban-ts-comment -- device_token_id is added by the Anki analytics migration and may be absent from generated types until deployment. */
// @ts-nocheck
import { NextResponse } from "next/server";
import { z } from "zod";

import { recordAnkiProductEvent } from "@/lib/analytics/anki-usage";
import {
  authenticateBroBotAnkiRequest,
  isoNow,
  parseJsonBody,
} from "@/app/api/brobot-anki/_lib";
import { addonVersionFromClientHeader } from "@/lib/education/deck-addon-version";

const schema = z
  .object({
    addonVersion: z.string().trim().min(1).max(32),
    ankiVersion: z.string().trim().min(1).max(32),
    os: z.enum(["mac", "windows", "linux", "other"]),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await authenticateBroBotAnkiRequest(request);
  if ("response" in auth) return auth.response;
  if (auth.authMethod !== "device_token" || !auth.deviceTokenId) {
    return NextResponse.json({ error: "device authentication required" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, schema);
  if (!parsed.success) return parsed.response;

  const headerVersion = addonVersionFromClientHeader(request.headers.get("x-snaportho-client"));
  const addonVersion = headerVersion ?? parsed.data.addonVersion;
  const now = isoNow();

  void recordAnkiProductEvent({
    eventName: "anki_addon_opened",
    userId: auth.userId,
    surface: "anki_addon_heartbeat",
    appVersion: addonVersion,
    properties: {
      addon_version: addonVersion,
      anki_version: parsed.data.ankiVersion,
      os: parsed.data.os,
    },
  });

  try {
    const { data: existing, error: lookupError } = await auth.supabase
      .from("brobot_anki_addon_devices")
      .select("id")
      .eq("device_token_id", auth.deviceTokenId)
      .maybeSingle();
    if (lookupError) {
      console.error("[anki-heartbeat] device lookup failed", lookupError);
    } else if (existing?.id) {
      const { error: updateError } = await auth.supabase
        .from("brobot_anki_addon_devices")
        .update({
          addon_version: addonVersion,
          last_seen_at: now,
          is_active: true,
          updated_at: now,
        })
        .eq("id", existing.id);
      if (updateError) console.error("[anki-heartbeat] device update failed", updateError);
    } else {
      const { error: insertError } = await auth.supabase.from("brobot_anki_addon_devices").insert({
        user_id: auth.userId,
        device_token_id: auth.deviceTokenId,
        addon_version: addonVersion,
        last_seen_at: now,
        is_active: true,
      });
      if (insertError) console.error("[anki-heartbeat] device insert failed", insertError);
    }
  } catch (error) {
    console.error("[anki-heartbeat] device presence failed", error);
  }

  return NextResponse.json({ recorded: true });
}
