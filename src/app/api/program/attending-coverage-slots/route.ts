import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  canManageProgramAttendings,
} from "@/lib/workspace/call/attendings";
import { normalizeProgramAttendingCoverageSlotInput } from "@/lib/workspace/call/attendings-shared";

type CoverageSlotRow = {
  id: string;
  program_id: string;
  name: string;
  abbreviation: string;
  color: string | null;
  is_active: boolean;
  sort_order: number | null;
  description: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json({ slots: [] }, { status: 200 });
    }

    // Read permission for members
    const { data, error } = await supabase
      .from("program_attending_coverage_slots")
      .select("id, program_id, name, abbreviation, color, is_active, sort_order, description, created_at, updated_at")
      .eq("program_id", membership.program_id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const slots = ((data ?? []) as CoverageSlotRow[]).map((row) => ({
      id: row.id,
      programId: row.program_id,
      name: row.name,
      abbreviation: row.abbreviation,
      color: row.color,
      isActive: row.is_active,
      sortOrder: row.sort_order ?? 0,
      description: row.description,
    }));

    return NextResponse.json({ slots }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load coverage slots." },
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

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const membership = await getActiveMembershipForUser(user.id);

    if (!membership?.program_id) {
      return NextResponse.json({ error: "No active program membership found." }, { status: 400 });
    }

    const permission = canManageProgramAttendings({
      rosterRole: membership.roster?.role ?? null,
      membershipRole: membership.role ?? null,
      isRosterAdmin: membership.roster?.isAdmin ?? false,
    });

    if (!permission.canManage) {
      return NextResponse.json(
        { error: "You do not have permission to manage coverage slots." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const input = normalizeProgramAttendingCoverageSlotInput(body);

    if (!input) {
      return NextResponse.json(
        { error: "A valid name and abbreviation are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("program_attending_coverage_slots")
      .insert({
        program_id: membership.program_id,
        name: input.name,
        abbreviation: input.abbreviation,
        color: input.color ?? null,
        is_active: input.isActive ?? true,
        sort_order: input.sortOrder ?? 0,
        description: input.description ?? null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id, program_id, name, abbreviation, color, is_active, sort_order, description, created_at, updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to create slot." }, { status: 500 });
    }

    const slot = {
      id: data.id,
      programId: data.program_id,
      name: data.name,
      abbreviation: data.abbreviation,
      color: data.color,
      isActive: data.is_active,
      sortOrder: data.sort_order ?? 0,
      description: data.description,
    };

    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create coverage slot." },
      { status: 500 }
    );
  }
}
