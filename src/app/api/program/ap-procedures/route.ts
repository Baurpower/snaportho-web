import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  mapApProcedure,
  type ApProcedureRow,
  type CreateApProcedurePayload,
} from "@/lib/workspace/preferences/types";

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
      return NextResponse.json({ procedures: [] }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("ap_procedures")
      .select(
        "id, program_id, name, abbreviation, subspecialty, approach, default_site, is_active, created_at, updated_at, created_by, updated_by"
      )
      .eq("program_id", membership.program_id)
      .eq("is_active", true)
      .order("subspecialty", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { procedures: ((data ?? []) as ApProcedureRow[]).map(mapApProcedure) },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load procedures." },
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
      return NextResponse.json(
        { error: "No active program membership found." },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => null)) as CreateApProcedurePayload | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Procedure name is required." },
        { status: 400 }
      );
    }

    const abbreviation =
      typeof body?.abbreviation === "string" ? body.abbreviation.trim() || null : null;
    const subspecialty =
      typeof body?.subspecialty === "string" ? body.subspecialty.trim() || null : null;
    const approach =
      typeof body?.approach === "string" ? body.approach.trim() || null : null;
    const defaultSite =
      typeof body?.defaultSite === "string" ? body.defaultSite.trim() || null : null;

    const { data, error } = await supabase
      .from("ap_procedures")
      .insert({
        program_id: membership.program_id,
        name,
        abbreviation,
        subspecialty,
        approach,
        default_site: defaultSite,
        created_by: user.id,
        updated_by: user.id,
      })
      .select(
        "id, program_id, name, abbreviation, subspecialty, approach, default_site, is_active, created_at, updated_at, created_by, updated_by"
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A procedure with this name, approach, and site already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { procedure: mapApProcedure(data as ApProcedureRow) },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create procedure." },
      { status: 500 }
    );
  }
}
