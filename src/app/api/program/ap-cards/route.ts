import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import type { ApCardSummary, CreateApCardPayload } from "@/lib/workspace/preferences/types";

type CardSummaryRow = {
  id: string;
  program_id: string;
  attending_id: string;
  procedure_id: string;
  site: string | null;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
  program_attendings: {
    full_name: string;
    display_name: string | null;
  } | null;
  ap_procedures: {
    name: string;
    approach: string | null;
    subspecialty: string | null;
  } | null;
  // aggregates injected post-query
  item_count?: number;
  high_yield_count?: number;
  updated_by_name?: string | null;
};

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ cards: [] }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const attendingId = searchParams.get("attendingId");
    const procedureId = searchParams.get("procedureId");
    const site = searchParams.get("site");

    let query = supabase
      .from("ap_cards")
      .select(`
        id,
        program_id,
        attending_id,
        procedure_id,
        site,
        is_active,
        updated_at,
        updated_by,
        program_attendings!ap_cards_attending_id_fkey (
          full_name,
          display_name
        ),
        ap_procedures!ap_cards_procedure_id_fkey (
          name,
          approach,
          subspecialty
        )
      `)
      .eq("program_id", membership.program_id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (attendingId) query = query.eq("attending_id", attendingId);
    if (procedureId) query = query.eq("procedure_id", procedureId);
    if (site) query = query.eq("site", site);

    const { data: cardRows, error: cardsError } = await query;

    if (cardsError) {
      return NextResponse.json({ error: cardsError.message }, { status: 500 });
    }

    const rows = (cardRows ?? []) as unknown as CardSummaryRow[];

    if (rows.length === 0) {
      return NextResponse.json({ cards: [] }, { status: 200 });
    }

    // Fetch item counts per card in one query
    const cardIds = rows.map((r) => r.id);
    const { data: itemCounts, error: countError } = await supabase
      .from("ap_items")
      .select("section_id, is_high_yield")
      .eq("is_active", true)
      .in(
        "section_id",
        await supabase
          .from("ap_sections")
          .select("id")
          .in("card_id", cardIds)
          .eq("is_active", true)
          .then(({ data }) => (data ?? []).map((s: { id: string }) => s.id))
      );

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Map section_id → card_id
    const { data: sectionRows } = await supabase
      .from("ap_sections")
      .select("id, card_id")
      .in("card_id", cardIds)
      .eq("is_active", true);

    const sectionToCard = new Map<string, string>();
    (sectionRows ?? []).forEach((s: { id: string; card_id: string }) => {
      sectionToCard.set(s.id, s.card_id);
    });

    const itemCountMap = new Map<string, number>();
    const highYieldMap = new Map<string, number>();
    (itemCounts ?? []).forEach((item: { section_id: string; is_high_yield: boolean }) => {
      const cardId = sectionToCard.get(item.section_id);
      if (!cardId) return;
      itemCountMap.set(cardId, (itemCountMap.get(cardId) ?? 0) + 1);
      if (item.is_high_yield) {
        highYieldMap.set(cardId, (highYieldMap.get(cardId) ?? 0) + 1);
      }
    });

    // Fetch updated_by display names
    const updatedByIds = [...new Set(rows.map((r) => r.updated_by).filter(Boolean))] as string[];
    const nameMap = new Map<string, string>();

    if (updatedByIds.length > 0) {
      const { data: memberRows } = await supabase
        .from("program_roster")
        .select("claimed_by_user_id, full_name")
        .in("claimed_by_user_id", updatedByIds)
        .eq("program_id", membership.program_id);

      (memberRows ?? []).forEach((m: { claimed_by_user_id: string; full_name: string | null }) => {
        if (m.claimed_by_user_id && m.full_name) {
          nameMap.set(m.claimed_by_user_id, m.full_name);
        }
      });
    }

    const cards: ApCardSummary[] = rows.map((row) => {
      const attending = Array.isArray(row.program_attendings)
        ? row.program_attendings[0]
        : row.program_attendings;
      const procedure = Array.isArray(row.ap_procedures)
        ? row.ap_procedures[0]
        : row.ap_procedures;

      return {
        id: row.id,
        programId: row.program_id,
        attendingId: row.attending_id,
        attendingFullName: attending?.full_name ?? "",
        attendingDisplayName: attending?.display_name ?? null,
        procedureId: row.procedure_id,
        procedureName: procedure?.name ?? "",
        procedureApproach: procedure?.approach ?? null,
        procedureSubspecialty: procedure?.subspecialty ?? null,
        site: row.site,
        isActive: row.is_active,
        itemCount: itemCountMap.get(row.id) ?? 0,
        highYieldCount: highYieldMap.get(row.id) ?? 0,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
        updatedByName: row.updated_by ? (nameMap.get(row.updated_by) ?? null) : null,
      };
    });

    return NextResponse.json({ cards }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load cards." },
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

    const body = (await request.json().catch(() => null)) as CreateApCardPayload | null;
    if (!body?.attendingId || !body?.procedureId) {
      return NextResponse.json(
        { error: "attendingId and procedureId are required." },
        { status: 400 }
      );
    }

    const site =
      typeof body.site === "string" ? body.site.trim() || null : null;

    const { data: cardId, error: rpcError } = await supabase.rpc(
      "create_ap_card_with_sections",
      {
        p_program_id:   membership.program_id,
        p_attending_id: body.attendingId,
        p_procedure_id: body.procedureId,
        p_site:         site,
        p_user_id:      user.id,
      }
    );

    if (rpcError) {
      // rpcError.code is the Postgres SQLSTATE; rpcError.message is the exception text.
      if (rpcError.code === "P0001") {
        return NextResponse.json(
          { error: "You are not an active member of this program." },
          { status: 403 }
        );
      }
      if (rpcError.code === "P0002") {
        return NextResponse.json(
          { error: "Attending not found in this program." },
          { status: 400 }
        );
      }
      if (rpcError.code === "P0003") {
        return NextResponse.json(
          { error: "Procedure not found in this program." },
          { status: 400 }
        );
      }
      if (rpcError.code === "P0004") {
        return NextResponse.json(
          { error: "A preference card already exists for this attending, procedure, and site." },
          { status: 409 }
        );
      }
      if (rpcError.code === "P0005") {
        return NextResponse.json(
          { error: "Attribution mismatch: user ID does not match authenticated user." },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ cardId }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create card." },
      { status: 500 }
    );
  }
}
