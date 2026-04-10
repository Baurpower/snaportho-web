import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/db/memberships";
import { createCallAssignmentsForMembership } from "@/lib/db/calls";

type CreateMyCallsBody = {
  dates?: string[];
  callType?: "Primary" | "Backup";
  site?: string | null;
  isHomeCall?: boolean;
  notes?: string | null;
};

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.id) {
      return NextResponse.json(
        { error: "No active membership found for user" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const monthStart = searchParams.get("monthStart");
    const monthEnd = searchParams.get("monthEnd");

    let query = supabase
      .from("call_assignments")
      .select(
        `
          id,
          program_membership_id,
          call_type,
          call_date,
          site,
          is_home_call,
          notes
        `
      )
      .eq("program_membership_id", membership.id)
      .order("call_date", { ascending: true });

    if (monthStart) {
      query = query.gte("call_date", monthStart);
    }

    if (monthEnd) {
      query = query.lte("call_date", monthEnd);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to load personal calls" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      calls: (data ?? []).map((row) => ({
        id: row.id,
        date: row.call_date,
        callType: row.call_type,
        site: row.site ?? null,
        isHomeCall: !!row.is_home_call,
        notes: row.notes ?? null,
        membershipId: row.program_membership_id ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.id || !membership.program_id) {
      return NextResponse.json(
        { error: "No active membership found for user" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as CreateMyCallsBody;

    if (!Array.isArray(body.dates) || body.dates.length === 0) {
      return NextResponse.json({ error: "dates is required" }, { status: 400 });
    }

    if (!body.dates.every(isValidDateString)) {
      return NextResponse.json(
        { error: "each date must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (!body.callType || !["Primary", "Backup"].includes(body.callType)) {
      return NextResponse.json(
        { error: "callType must be Primary or Backup" },
        { status: 400 }
      );
    }

    const created = await createCallAssignmentsForMembership({
      programId: membership.program_id,
      membershipId: membership.id,
      createdBy: user.id,
      dates: body.dates,
      callType: body.callType,
      site: body.site ?? null,
      isHomeCall: body.isHomeCall ?? false,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ calls: created }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}