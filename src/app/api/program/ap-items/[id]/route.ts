import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  mapApItem,
  type ApItemRow,
  type UpdateApItemPayload,
} from "@/lib/workspace/preferences/types";

type ItemWithParents = {
  id: string;
  section_id: string;
  content: string;
  is_high_yield: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  ap_sections: {
    id: string;
    card_id: string;
    ap_cards: { id: string; program_id: string } | { id: string; program_id: string }[] | null;
  } | null;
};

async function getItemWithParents(
  supabase: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>,
  itemId: string,
  programId: string
): Promise<ItemWithParents | null> {
  const { data, error } = await supabase
    .from("ap_items")
    .select(`
      id,
      section_id,
      content,
      is_high_yield,
      sort_order,
      is_active,
      created_at,
      updated_at,
      created_by,
      updated_by,
      ap_sections!ap_items_section_id_fkey (
        id,
        card_id,
        ap_cards!ap_sections_card_id_fkey (
          id,
          program_id
        )
      )
    `)
    .eq("id", itemId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as ItemWithParents;
  const section = Array.isArray(row.ap_sections) ? row.ap_sections[0] : row.ap_sections;
  if (!section) return null;

  const card = Array.isArray(section.ap_cards) ? section.ap_cards[0] : section.ap_cards;
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

    const existing = await getItemWithParents(supabase, id, membership.program_id);
    if (!existing) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as UpdateApItemPayload | null;
    const updates: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    let contentChanged = false;
    let highYieldChanged = false;
    let newContent: string | undefined;
    let newHighYield: boolean | undefined;

    if (typeof body?.content === "string") {
      const content = body.content.trim();
      if (!content) {
        return NextResponse.json({ error: "Item content cannot be empty." }, { status: 400 });
      }
      if (content.length > 500) {
        return NextResponse.json(
          { error: "Item content cannot exceed 500 characters." },
          { status: 400 }
        );
      }
      if (content !== existing.content) {
        contentChanged = true;
        newContent = content;
        updates.content = content;
      }
    }

    if (typeof body?.isHighYield === "boolean") {
      if (body.isHighYield !== existing.is_high_yield) {
        highYieldChanged = true;
        newHighYield = body.isHighYield;
        updates.is_high_yield = body.isHighYield;
      }
    }

    if (typeof body?.sortOrder === "number") {
      updates.sort_order = body.sortOrder;
    }

    if (typeof body?.isActive === "boolean") {
      updates.is_active = body.isActive;
    }

    const { data, error } = await supabase
      .from("ap_items")
      .update(updates)
      .eq("id", id)
      .select(
        "id, section_id, content, is_high_yield, sort_order, is_active, created_at, updated_at, created_by, updated_by"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Write history if content or high-yield changed
    if (contentChanged || highYieldChanged) {
      await supabase.from("ap_item_history").insert({
        item_id: id,
        previous_content: contentChanged ? existing.content : null,
        new_content: contentChanged ? (newContent ?? null) : null,
        previous_is_high_yield: highYieldChanged ? existing.is_high_yield : null,
        new_is_high_yield: highYieldChanged ? (newHighYield ?? null) : null,
        changed_by: user.id,
      });
    }

    const section = Array.isArray(existing.ap_sections)
      ? existing.ap_sections[0]
      : existing.ap_sections;
    const card = section
      ? Array.isArray(section.ap_cards)
        ? section.ap_cards[0]
        : section.ap_cards
      : null;

    const now = new Date().toISOString();

    // Bump section
    if (section) {
      await supabase
        .from("ap_sections")
        .update({ updated_by: user.id, updated_at: now })
        .eq("id", section.id);
    }

    // Bump parent card
    if (card) {
      await supabase
        .from("ap_cards")
        .update({ updated_by: user.id, updated_at: now })
        .eq("id", card.id);
    }

    return NextResponse.json(
      { item: mapApItem(data as ApItemRow) },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update item." },
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

    const existing = await getItemWithParents(supabase, id, membership.program_id);
    if (!existing) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("ap_items")
      .update({ is_active: false, updated_by: user.id, updated_at: now })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const section = Array.isArray(existing.ap_sections)
      ? existing.ap_sections[0]
      : existing.ap_sections;
    const card = section
      ? Array.isArray(section.ap_cards)
        ? section.ap_cards[0]
        : section.ap_cards
      : null;

    if (section) {
      await supabase
        .from("ap_sections")
        .update({ updated_by: user.id, updated_at: now })
        .eq("id", section.id);
    }
    if (card) {
      await supabase
        .from("ap_cards")
        .update({ updated_by: user.id, updated_at: now })
        .eq("id", card.id);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete item." },
      { status: 500 }
    );
  }
}
