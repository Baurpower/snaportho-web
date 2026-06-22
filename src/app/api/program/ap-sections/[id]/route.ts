import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  mapApSection,
  type ApSectionRow,
  type UpdateApSectionPayload,
} from "@/lib/workspace/preferences/types";

async function getSectionWithProgram(
  supabase: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>,
  sectionId: string,
  programId: string
) {
  const { data, error } = await supabase
    .from("ap_sections")
    .select(`
      id,
      card_id,
      title,
      sort_order,
      is_default,
      is_active,
      created_at,
      updated_at,
      created_by,
      updated_by,
      ap_cards!ap_sections_card_id_fkey (
        program_id
      )
    `)
    .eq("id", sectionId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as ApSectionRow & {
    ap_cards: { program_id: string } | { program_id: string }[] | null;
  };

  const card = Array.isArray(row.ap_cards) ? row.ap_cards[0] : row.ap_cards;
  if (!card || card.program_id !== programId) return null;

  return row;
}

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

    const sectionRow = await getSectionWithProgram(supabase, id, membership.program_id);
    if (!sectionRow) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as UpdateApSectionPayload | null;
    const updates: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (typeof body?.title === "string") {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: "Section title cannot be empty." }, { status: 400 });
      }
      updates.title = title;
    }
    if (typeof body?.sortOrder === "number") {
      updates.sort_order = body.sortOrder;
    }
    if (typeof body?.isActive === "boolean") {
      updates.is_active = body.isActive;
    }

    const { data, error } = await supabase
      .from("ap_sections")
      .update(updates)
      .eq("id", id)
      .select(
        "id, card_id, title, sort_order, is_default, is_active, created_at, updated_at, created_by, updated_by"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Bump parent card
    await supabase
      .from("ap_cards")
      .update({ updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", sectionRow.card_id);

    return NextResponse.json(
      { section: mapApSection(data as ApSectionRow) },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update section." },
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

    const sectionRow = await getSectionWithProgram(supabase, id, membership.program_id);
    if (!sectionRow) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    const { error } = await supabase
      .from("ap_sections")
      .update({
        is_active: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Bump parent card
    await supabase
      .from("ap_cards")
      .update({ updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", sectionRow.card_id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete section." },
      { status: 500 }
    );
  }
}
