import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramCalendarAdmin } from "@/lib/google/program-calendar-api";
import {
  getProgramCalendarConnection,
  listProgramGoogleCalendars,
} from "@/lib/google/program-calendar-sync";

export async function POST(request: NextRequest) {
  const context = await requireProgramCalendarAdmin();
  if (!context)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json();
  if (
    typeof body.calendarId !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.effectiveStart) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.effectiveEnd) ||
    body.effectiveEnd < body.effectiveStart
  ) {
    return NextResponse.json(
      { error: "calendarId and a valid effective date range are required" },
      { status: 400 },
    );
  }
  const programId = context.access.accessContext.programId;
  const connection = await getProgramCalendarConnection(programId);
  if (!connection)
    return NextResponse.json(
      { error: "Program Google Calendar is not connected" },
      { status: 400 },
    );
  const selected = (await listProgramGoogleCalendars(connection)).find(
    (calendar) => calendar.id === body.calendarId,
  );
  if (!selected)
    return NextResponse.json(
      { error: "Selected calendar is not readable by the connected account" },
      { status: 400 },
    );
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("program_calendar_sources")
    .select("configuration_version")
    .eq("program_id", programId)
    .maybeSingle();
  const { data, error } = await admin
    .from("program_calendar_sources")
    .upsert(
      {
        program_id: programId,
        connection_id: connection.id,
        provider: "google",
        provider_calendar_id: selected.id,
        provider_calendar_summary: selected.summary,
        mode: "preview",
        effective_start: body.effectiveStart,
        effective_end: body.effectiveEnd,
        timezone: body.timezone ?? selected.timeZone ?? "America/Los_Angeles",
        sync_token: null,
        configuration_version: (existing?.configuration_version ?? 0) + 1,
        created_by_user_id: context.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "program_id" },
    )
    .select(
      "id, mode, provider_calendar_summary, effective_start, effective_end, timezone",
    )
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}
