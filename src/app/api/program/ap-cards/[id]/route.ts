import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import {
  mapApItem,
  mapApSection,
  mapApCardTag,
  type ApFullCard,
  type ApSectionWithItems,
  type ApSectionRow,
  type ApItemRow,
  type ApCardTagRow,
  type UpdateApCardPayload,
} from "@/lib/workspace/preferences/types";

export async function GET(
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
      return NextResponse.json({ error: "No active program membership found." }, { status: 400 });
    }

    // Fetch card with attending and procedure in one query
    const { data: cardRow, error: cardError } = await supabase
      .from("ap_cards")
      .select(`
        id,
        program_id,
        attending_id,
        procedure_id,
        site,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        program_attendings!ap_cards_attending_id_fkey (
          full_name,
          display_name
        ),
        ap_procedures!ap_cards_procedure_id_fkey (
          name,
          approach,
          subspecialty,
          abbreviation
        )
      `)
      .eq("id", id)
      .eq("program_id", membership.program_id)
      .eq("is_active", true)
      .maybeSingle();

    if (cardError) {
      return NextResponse.json({ error: cardError.message }, { status: 500 });
    }
    if (!cardRow) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    const card = cardRow as unknown as {
      id: string;
      program_id: string;
      attending_id: string;
      procedure_id: string;
      site: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      updated_by: string | null;
      program_attendings: { full_name: string; display_name: string | null } | null;
      ap_procedures: {
        name: string;
        approach: string | null;
        subspecialty: string | null;
        abbreviation: string | null;
      } | null;
    };

    const attending = Array.isArray(card.program_attendings)
      ? card.program_attendings[0]
      : card.program_attendings;
    const procedure = Array.isArray(card.ap_procedures)
      ? card.ap_procedures[0]
      : card.ap_procedures;

    // Fetch sections
    const { data: sectionRows, error: sectionsError } = await supabase
      .from("ap_sections")
      .select(
        "id, card_id, title, sort_order, is_default, is_active, created_at, updated_at, created_by, updated_by"
      )
      .eq("card_id", id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (sectionsError) {
      return NextResponse.json({ error: sectionsError.message }, { status: 500 });
    }

    const sections = (sectionRows ?? []) as ApSectionRow[];
    const sectionIds = sections.map((s) => s.id);

    // Fetch all items for all sections in one query
    let items: ApItemRow[] = [];
    if (sectionIds.length > 0) {
      const { data: itemRows, error: itemsError } = await supabase
        .from("ap_items")
        .select(
          "id, section_id, content, is_high_yield, sort_order, is_active, created_at, updated_at, created_by, updated_by"
        )
        .in("section_id", sectionIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }
      items = (itemRows ?? []) as ApItemRow[];
    }

    // Fetch tags
    const { data: tagRows, error: tagsError } = await supabase
      .from("ap_card_tags")
      .select("id, card_id, tag_type, tag_value, created_by, created_at")
      .eq("card_id", id)
      .order("tag_type", { ascending: true })
      .order("tag_value", { ascending: true });

    if (tagsError) {
      return NextResponse.json({ error: tagsError.message }, { status: 500 });
    }

    // Resolve updated_by display name
    let updatedByName: string | null = null;
    if (card.updated_by) {
      const { data: rosterRow } = await supabase
        .from("program_roster")
        .select("full_name")
        .eq("claimed_by_user_id", card.updated_by)
        .eq("program_id", membership.program_id)
        .maybeSingle();
      updatedByName = (rosterRow as { full_name: string | null } | null)?.full_name ?? null;
    }

    // Group items by section
    const itemsBySection = new Map<string, ApItemRow[]>();
    items.forEach((item) => {
      const list = itemsBySection.get(item.section_id) ?? [];
      list.push(item);
      itemsBySection.set(item.section_id, list);
    });

    const sectionsWithItems: ApSectionWithItems[] = sections.map((row) => ({
      ...mapApSection(row),
      items: (itemsBySection.get(row.id) ?? []).map(mapApItem),
    }));

    const fullCard: ApFullCard = {
      id: card.id,
      programId: card.program_id,
      attendingId: card.attending_id,
      procedureId: card.procedure_id,
      site: card.site,
      isActive: card.is_active,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      createdBy: card.created_by,
      updatedBy: card.updated_by,
      attendingFullName: attending?.full_name ?? "",
      attendingDisplayName: attending?.display_name ?? null,
      procedureName: procedure?.name ?? "",
      procedureApproach: procedure?.approach ?? null,
      procedureSubspecialty: procedure?.subspecialty ?? null,
      procedureAbbreviation: procedure?.abbreviation ?? null,
      updatedByName,
      sections: sectionsWithItems,
      tags: ((tagRows ?? []) as ApCardTagRow[]).map(mapApCardTag),
    };

    return NextResponse.json({ card: fullCard }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load card." },
      { status: 500 }
    );
  }
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

    const body = (await request.json().catch(() => null)) as UpdateApCardPayload | null;
    const updates: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (body?.site !== undefined) {
      updates.site =
        typeof body.site === "string" ? body.site.trim() || null : null;
    }

    const { data, error } = await supabase
      .from("ap_cards")
      .update(updates)
      .eq("id", id)
      .eq("program_id", membership.program_id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update card." },
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
      .from("ap_cards")
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
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete card." },
      { status: 500 }
    );
  }
}
