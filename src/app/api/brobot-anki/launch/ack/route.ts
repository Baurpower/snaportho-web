import { NextResponse } from "next/server";

import { authenticateBroBotAnkiRequest } from "../../_lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidLaunchAck } from "@/lib/education/anki-launch-commands";

export async function POST(request: Request) {
  const auth = await authenticateBroBotAnkiRequest(request);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null);
  if (!isValidLaunchAck(body)) return NextResponse.json({ error: "invalid_ack" }, { status: 400 });
  const admin = createAdminClient();
  const { data: command, error: commandError } = await admin
    .from("educational_anki_launch_commands")
    .select("id,status")
    .eq("id", body.launchCommandId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (commandError) return NextResponse.json({ error: commandError.message }, { status: 500 });
  if (!command) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { error: ackError } = await admin.from("educational_anki_launch_acknowledgements").upsert({
    user_id: auth.userId,
    launch_command_id: body.launchCommandId,
    status: body.status,
    reason_code: body.reasonCode,
    resolved_native_card_id: body.resolvedNativeCardId,
    observed_content_hash: body.observedContentHash,
    acknowledged_at: body.acknowledgedAt,
  }, { onConflict: "launch_command_id" });
  if (ackError) return NextResponse.json({ error: ackError.message }, { status: 500 });
  await admin
    .from("educational_anki_launch_commands")
    .update({ status: "acknowledged" })
    .eq("id", body.launchCommandId)
    .eq("user_id", auth.userId);
  return NextResponse.json({ ok: true });
}
