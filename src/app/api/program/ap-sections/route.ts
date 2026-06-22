import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  mapApSection,
  type ApSectionRow,
  type CreateApSectionPayload,
} from "@/lib/workspace/preferences/types";

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

    const body = (await request.json().catch(() => null)) as CreateApSectionPayload | null;
    const cardId = typeof body?.cardId === "string" ? body.cardId.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";

    if (!cardId) {
      return NextResponse.json({ error: "cardId is required." }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Section title is required." }, { status: 400 });
    }

    // Verify the card belongs to the user's program
    const { data: cardCheck, error: cardCheckError } = await supabase
      .from("ap_cards")
      .select("id")
      .eq("id", cardId)
      .eq("program_id", membership.program_id)
      .eq("is_active", true)
      .maybeSingle();

    if (cardCheckError) {
      return NextResponse.json({ error: cardCheckError.message }, { status: 500 });
    }
    if (!cardCheck) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    // Determine sort_order: append after existing sections
    const sortOrder = typeof body?.sortOrder === "number" ? body.sortOrder : 999;

    const { data, error } = await supabase
      .from("ap_sections")
      .insert({
        card_id: cardId,
        title,
        sort_order: sortOrder,
        is_default: false,
        created_by: user.id,
        updated_by: user.id,
      })
      .select(
        "id, card_id, title, sort_order, is_default, is_active, created_at, updated_at, created_by, updated_by"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Bump parent card updated_at / updated_by
    await supabase
      .from("ap_cards")
      .update({ updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", cardId);

    return NextResponse.json(
      { section: mapApSection(data as ApSectionRow) },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create section." },
      { status: 500 }
    );
  }
}
