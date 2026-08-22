import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramCalendarAdmin } from "@/lib/google/program-calendar-api";
import {
  createProgramCalendarWatch,
  syncProgramCalendarSource,
} from "@/lib/google/program-calendar-sync";

export async function POST() {
  const context = await requireProgramCalendarAdmin();
  if (!context)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { data: source } = await admin
    .from("program_calendar_sources")
    .select("id")
    .eq("program_id", context.access.accessContext.programId)
    .maybeSingle();
  if (!source)
    return NextResponse.json(
      { error: "Configure and preview a calendar source first" },
      { status: 400 },
    );
  const { count } = await admin
    .from("program_calendar_import_events")
    .select("id", { count: "exact", head: true })
    .eq("source_id", source.id)
    .eq("validation_status", "blocked");
  if ((count ?? 0) > 0)
    return NextResponse.json(
      { error: `${count} source event(s) require review before activation` },
      { status: 409 },
    );
  await admin
    .from("program_calendar_sources")
    .update({
      mode: "active",
      sync_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", source.id);
  try {
    const result = await syncProgramCalendarSource({
      sourceId: source.id,
      runType: "full",
      trigger: "activation",
      forceFull: true,
      allowDestructiveFullApply: true,
    });
    let watch = null;
    if (process.env.GOOGLE_PROGRAM_CALENDAR_WEBHOOK_URL)
      watch = await createProgramCalendarWatch(source.id);
    return NextResponse.json({ ...result, watch });
  } catch (error) {
    await admin
      .from("program_calendar_sources")
      .update({ mode: "error" })
      .eq("id", source.id);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activation failed" },
      { status: 500 },
    );
  }
}
