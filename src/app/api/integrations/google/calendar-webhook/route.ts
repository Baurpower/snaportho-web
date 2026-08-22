import { after, NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hashChannelToken,
  syncProgramCalendarSource,
} from "@/lib/google/program-calendar-sync";

export async function POST(request: NextRequest) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceId = request.headers.get("x-goog-resource-id");
  const channelToken = request.headers.get("x-goog-channel-token");
  const messageNumber = request.headers.get("x-goog-message-number");
  if (!channelId || !resourceId || !channelToken)
    return new NextResponse(null, { status: 404 });
  const admin = createAdminClient();
  const { data: channel } = await admin
    .from("program_calendar_channels")
    .select(
      "id, source_id, resource_id, channel_token_hash, status, program_calendar_sources(configuration_version, mode)",
    )
    .eq("channel_id", channelId)
    .eq("resource_id", resourceId)
    .eq("status", "active")
    .maybeSingle();
  if (!channel || channel.channel_token_hash !== hashChannelToken(channelToken))
    return new NextResponse(null, { status: 404 });
  const sourceRelation = channel.program_calendar_sources as unknown as
    | { configuration_version: number; mode: string }
    | Array<{ configuration_version: number; mode: string }>
    | null;
  const source = Array.isArray(sourceRelation)
    ? sourceRelation[0]
    : sourceRelation;
  if (!source || source.mode === "disconnected")
    return new NextResponse(null, { status: 204 });
  const now = new Date().toISOString();
  await admin
    .from("program_calendar_channels")
    .update({
      last_message_number: messageNumber ? Number(messageNumber) : null,
      updated_at: now,
    })
    .eq("id", channel.id);
  await admin
    .from("program_calendar_sources")
    .update({ last_notification_at: now })
    .eq("id", channel.source_id);
  const { error } = await admin.from("program_calendar_jobs").insert({
    source_id: channel.source_id,
    configuration_version: source.configuration_version,
    job_type: "incremental_sync",
    status: "pending",
    trigger: "google_push",
    available_at: now,
  });
  if (error && error.code !== "23505")
    console.error("[program-calendar/webhook] enqueue failed", error.message);
  after(async () => {
    try {
      await syncProgramCalendarSource({
        sourceId: channel.source_id,
        runType: "incremental",
        trigger: "google_push",
      });
      await admin
        .from("program_calendar_jobs")
        .update({ status: "succeeded", updated_at: new Date().toISOString() })
        .eq("source_id", channel.source_id)
        .eq("job_type", "incremental_sync")
        .eq("status", "pending");
    } catch (syncError) {
      console.error(
        "[program-calendar/webhook] deferred sync failed",
        syncError,
      );
    }
  });
  return new NextResponse(null, { status: 204 });
}
