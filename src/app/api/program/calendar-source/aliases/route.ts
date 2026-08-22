import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProgramCalendarAdmin } from "@/lib/google/program-calendar-api";
import { normalizeCalendarPersonName } from "@/lib/google/program-calendar-source";

export async function GET() {
  const context = await requireProgramCalendarAdmin(
    "canReviewProgramCalendarImports",
  );
  if (!context)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const programId = context.access.accessContext.programId;
  const [{ data: aliases, error }, { data: roster }] = await Promise.all([
    admin
      .from("program_calendar_person_aliases")
      .select(
        "id, normalized_alias, roster_id, program_membership_id, active_from, active_to",
      )
      .eq("program_id", programId)
      .order("normalized_alias"),
    admin
      .from("program_roster")
      .select("id, full_name, program_membership_id, isAdmin, role")
      .eq("program_id", programId)
      .order("full_name"),
  ]);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ aliases: aliases ?? [], roster: roster ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await requireProgramCalendarAdmin(
    "canReviewProgramCalendarImports",
  );
  if (!context)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json();
  if (typeof body.alias !== "string" || typeof body.rosterId !== "string")
    return NextResponse.json(
      { error: "alias and rosterId are required" },
      { status: 400 },
    );
  const admin = createAdminClient();
  const programId = context.access.accessContext.programId;
  const { data: roster } = await admin
    .from("program_roster")
    .select("id, program_membership_id")
    .eq("id", body.rosterId)
    .eq("program_id", programId)
    .maybeSingle();
  if (!roster)
    return NextResponse.json(
      { error: "Roster member not found" },
      { status: 400 },
    );
  const { data, error } = await admin
    .from("program_calendar_person_aliases")
    .upsert(
      {
        program_id: programId,
        normalized_alias: normalizeCalendarPersonName(body.alias),
        roster_id: roster.id,
        program_membership_id: roster.program_membership_id ?? null,
        active_from: body.activeFrom ?? null,
        active_to: body.activeTo ?? null,
        created_by_user_id: context.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "program_id,normalized_alias,roster_id" },
    )
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alias: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const context = await requireProgramCalendarAdmin(
    "canReviewProgramCalendarImports",
  );
  if (!context)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("program_calendar_person_aliases")
    .delete()
    .eq("id", id)
    .eq("program_id", context.access.accessContext.programId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
