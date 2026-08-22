import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramCalendarAdmin } from "@/lib/google/program-calendar-api";

export async function POST() {
  const context = await requireProgramCalendarAdmin();
  if (!context)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("program_calendar_sources")
    .update({ mode: "paused", updated_at: new Date().toISOString() })
    .eq("program_id", context.access.accessContext.programId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, mode: "paused" });
}
