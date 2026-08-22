import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramCalendarAdmin } from "@/lib/google/program-calendar-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await requireProgramCalendarAdmin(
    "canReviewProgramCalendarImports",
  );
  if (!context)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const programId = context.access.accessContext.programId;
  const { data: connection } = await admin
    .from("program_calendar_connections")
    .select("id, provider_account_email, status, token_expiry")
    .eq("program_id", programId)
    .eq("provider", "google")
    .maybeSingle();
  const { data: source } = await admin
    .from("program_calendar_sources")
    .select(
      "id, provider_calendar_id, provider_calendar_summary, mode, effective_start, effective_end, timezone, initial_sync_completed_at, last_sync_started_at, last_success_at, last_notification_at, last_error_class, last_error_message, last_error_at, consecutive_failure_count, configuration_version",
    )
    .eq("program_id", programId)
    .maybeSingle();
  const counts = { blocked: 0, warning: 0, valid: 0, ignored: 0 };
  let latestRun = null;
  let channel = null;
  if (source) {
    for (const status of Object.keys(counts) as Array<keyof typeof counts>) {
      const { count } = await admin
        .from("program_calendar_import_events")
        .select("id", { count: "exact", head: true })
        .eq("source_id", source.id)
        .eq("validation_status", status);
      counts[status] = count ?? 0;
    }
    const { data: run } = await admin
      .from("program_calendar_sync_runs")
      .select("*")
      .eq("source_id", source.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestRun = run;
    const { data: activeChannel } = await admin
      .from("program_calendar_channels")
      .select("status, expires_at")
      .eq("source_id", source.id)
      .eq("status", "active")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    channel = activeChannel;
  }
  return NextResponse.json({
    connected: Boolean(connection),
    connection,
    source,
    counts,
    latestRun,
    channel,
  });
}
