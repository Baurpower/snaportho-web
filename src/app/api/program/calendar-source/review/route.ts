import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramCalendarAdmin } from "@/lib/google/program-calendar-api";

export async function GET(request: NextRequest) {
  const context = await requireProgramCalendarAdmin(
    "canReviewProgramCalendarImports",
  );
  if (!context)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const status = request.nextUrl.searchParams.get("status") ?? "blocked";
  if (!["blocked", "warning", "valid", "ignored"].includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const admin = createAdminClient();
  const { data: source } = await admin
    .from("program_calendar_sources")
    .select("id")
    .eq("program_id", context.access.accessContext.programId)
    .maybeSingle();
  if (!source) return NextResponse.json({ events: [] });
  const { data, error } = await admin
    .from("program_calendar_import_events")
    .select(
      "id, provider_event_id, original_title, normalized_title, start_date, end_date_exclusive, matched_roster_id, matched_membership_id, validation_status, validation_issues, provider_status, last_seen_at",
    )
    .eq("source_id", source.id)
    .eq("validation_status", status)
    .order("start_date")
    .limit(250);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}
