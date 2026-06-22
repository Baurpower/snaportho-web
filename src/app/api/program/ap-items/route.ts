import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  mapApItem,
  type ApItemRow,
  type CreateApItemPayload,
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

    const body = (await request.json().catch(() => null)) as CreateApItemPayload | null;
    const sectionId = typeof body?.sectionId === "string" ? body.sectionId.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!sectionId) {
      return NextResponse.json({ error: "sectionId is required." }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "Item content is required." }, { status: 400 });
    }
    if (content.length > 500) {
      return NextResponse.json(
        { error: "Item content cannot exceed 500 characters." },
        { status: 400 }
      );
    }

    // Verify section belongs to a card in the user's program
    const { data: sectionCheck, error: sectionCheckError } = await supabase
      .from("ap_sections")
      .select(`
        id,
        card_id,
        ap_cards!ap_sections_card_id_fkey (
          id,
          program_id
        )
      `)
      .eq("id", sectionId)
      .eq("is_active", true)
      .maybeSingle();

    if (sectionCheckError) {
      return NextResponse.json({ error: sectionCheckError.message }, { status: 500 });
    }
    if (!sectionCheck) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    const sectionWithCard = sectionCheck as unknown as {
      id: string;
      card_id: string;
      ap_cards: { id: string; program_id: string } | { id: string; program_id: string }[] | null;
    };

    const card = Array.isArray(sectionWithCard.ap_cards)
      ? sectionWithCard.ap_cards[0]
      : sectionWithCard.ap_cards;

    if (!card || card.program_id !== membership.program_id) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    const isHighYield = body?.isHighYield === true;
    const sortOrder = typeof body?.sortOrder === "number" ? body.sortOrder : 0;

    const { data, error } = await supabase
      .from("ap_items")
      .insert({
        section_id: sectionId,
        content,
        is_high_yield: isHighYield,
        sort_order: sortOrder,
        created_by: user.id,
        updated_by: user.id,
      })
      .select(
        "id, section_id, content, is_high_yield, sort_order, is_active, created_at, updated_at, created_by, updated_by"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date().toISOString();

    // Bump section updated_at / updated_by
    await supabase
      .from("ap_sections")
      .update({ updated_by: user.id, updated_at: now })
      .eq("id", sectionId);

    // Bump parent card updated_at / updated_by
    await supabase
      .from("ap_cards")
      .update({ updated_by: user.id, updated_at: now })
      .eq("id", card.id);

    return NextResponse.json(
      { item: mapApItem(data as ApItemRow) },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create item." },
      { status: 500 }
    );
  }
}
