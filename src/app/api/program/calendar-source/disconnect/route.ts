import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramCalendarAdmin } from "@/lib/google/program-calendar-api";
import { disconnectProgramCalendarSource } from "@/lib/google/program-calendar-sync";

export async function POST() {
  const context = await requireProgramCalendarAdmin();
  if (!context) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data: source } = await admin
    .from("program_calendar_sources")
    .select("id")
    .eq("program_id", context.access.accessContext.programId)
    .maybeSingle();
  if (!source) {
    return NextResponse.json(
      { error: "Calendar source not configured" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await disconnectProgramCalendarSource(source.id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Disconnect failed" },
      { status: 500 },
    );
  }
}
