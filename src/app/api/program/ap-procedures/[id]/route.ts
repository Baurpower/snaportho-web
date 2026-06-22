import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  mapApProcedure,
  type ApProcedureRow,
  type UpdateApProcedurePayload,
} from "@/lib/workspace/preferences/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = (await request.json().catch(() => null)) as UpdateApProcedurePayload | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "Procedure name cannot be empty." }, { status: 400 });
      }
      updates.name = name;
    }
    if (body.abbreviation !== undefined) {
      updates.abbreviation =
        typeof body.abbreviation === "string" ? body.abbreviation.trim() || null : null;
    }
    if (body.subspecialty !== undefined) {
      updates.subspecialty =
        typeof body.subspecialty === "string" ? body.subspecialty.trim() || null : null;
    }
    if (body.approach !== undefined) {
      updates.approach =
        typeof body.approach === "string" ? body.approach.trim() || null : null;
    }
    if (body.defaultSite !== undefined) {
      updates.default_site =
        typeof body.defaultSite === "string" ? body.defaultSite.trim() || null : null;
    }
    if (typeof body.isActive === "boolean") {
      updates.is_active = body.isActive;
    }

    const { data, error } = await supabase
      .from("ap_procedures")
      .update(updates)
      .eq("id", id)
      .eq("program_id", membership.program_id)
      .select(
        "id, program_id, name, abbreviation, subspecialty, approach, default_site, is_active, created_at, updated_at, created_by, updated_by"
      )
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A procedure with this name, approach, and site already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Procedure not found." }, { status: 404 });
    }

    return NextResponse.json(
      { procedure: mapApProcedure(data as ApProcedureRow) },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update procedure." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data, error } = await supabase
      .from("ap_procedures")
      .update({
        is_active: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("program_id", membership.program_id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Procedure not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete procedure." },
      { status: 500 }
    );
  }
}
