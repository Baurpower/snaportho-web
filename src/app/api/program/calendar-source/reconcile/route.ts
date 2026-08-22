import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramCalendarAdmin } from "@/lib/google/program-calendar-api";

export async function POST() {
  const context = await requireProgramCalendarAdmin();
  if (!context)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { data: source } = await admin
    .from("program_calendar_sources")
    .select("id, configuration_version")
    .eq("program_id", context.access.accessContext.programId)
    .maybeSingle();
  if (!source)
    return NextResponse.json(
      { error: "Calendar source not configured" },
      { status: 400 },
    );
  const { error } = await admin.from("program_calendar_jobs").insert({
    source_id: source.id,
    configuration_version: source.configuration_version,
    job_type: "incremental_sync",
    status: "pending",
    trigger: "manual",
    available_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error && error.code !== "23505")
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ queued: true }, { status: 202 });
}
