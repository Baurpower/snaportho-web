import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getActiveMembershipForUser } from "@/lib/workspace/memberships";
import type {
  ApSearchResults,
  ApSearchAttendingMatch,
  ApSearchCardMatch,
  ApSearchItemMatch,
} from "@/lib/workspace/preferences/types";

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
      return NextResponse.json(
        { query: "", attendings: [], cards: [], items: [] } as ApSearchResults,
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (q.length < 1) {
      return NextResponse.json(
        { query: q, attendings: [], cards: [], items: [] } as ApSearchResults,
        { status: 200 }
      );
    }

    const programId = membership.program_id;

    // ── Attending name search ──────────────────────────────────
    // Two separate ilike queries avoid raw user input inside a PostgREST
    // .or() filter string, which breaks when q contains commas or dots.
    type AttendingRow = { id: string; full_name: string; display_name: string | null };

    const [fullNameResult, displayNameResult] = await Promise.all([
      supabase
        .from("program_attendings")
        .select("id, full_name, display_name")
        .eq("program_id", programId)
        .eq("is_active", true)
        .ilike("full_name", `%${q}%`)
        .limit(10),
      supabase
        .from("program_attendings")
        .select("id, full_name, display_name")
        .eq("program_id", programId)
        .eq("is_active", true)
        .ilike("display_name", `%${q}%`)
        .limit(10),
    ]);

    // Merge by id, deduplicate, cap at 10
    const attendingMap = new Map<string, AttendingRow>();
    for (const row of [
      ...((fullNameResult.data ?? []) as AttendingRow[]),
      ...((displayNameResult.data ?? []) as AttendingRow[]),
    ]) {
      if (!attendingMap.has(row.id)) attendingMap.set(row.id, row);
    }
    const mergedAttendingRows = [...attendingMap.values()].slice(0, 10);

    // For each matched attending, count their active cards
    const matchedAttendingIds = mergedAttendingRows.map((a) => a.id);

    const cardCountByAttending = new Map<string, number>();
    if (matchedAttendingIds.length > 0) {
      const { data: cardCounts } = await supabase
        .from("ap_cards")
        .select("attending_id")
        .eq("program_id", programId)
        .eq("is_active", true)
        .in("attending_id", matchedAttendingIds);

      (cardCounts ?? []).forEach((row: { attending_id: string }) => {
        cardCountByAttending.set(
          row.attending_id,
          (cardCountByAttending.get(row.attending_id) ?? 0) + 1
        );
      });
    }

    const attendings: ApSearchAttendingMatch[] = mergedAttendingRows.map((a) => ({
      kind: "attending",
      attendingId: a.id,
      attendingFullName: a.full_name,
      attendingDisplayName: a.display_name,
      cardCount: cardCountByAttending.get(a.id) ?? 0,
    }));

    // ── Card-level search (procedure name, approach, site) ─────
    // No DB-level limit — the full program card set is small and the JS
    // filter must see every card to avoid silently missing matches.
    // The result is capped to 20 after filtering.
    const { data: cardRows } = await supabase
      .from("ap_cards")
      .select(`
        id,
        attending_id,
        procedure_id,
        site,
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
      .eq("program_id", programId)
      .eq("is_active", true);

    // Filter in JS (Supabase can't easily filter on joined columns)
    const ql = q.toLowerCase();
    const cardMatches: ApSearchCardMatch[] = [];

    (cardRows ?? []).forEach(
      (row: {
        id: string;
        attending_id: string;
        procedure_id: string;
        site: string | null;
        program_attendings:
          | { full_name: string; display_name: string | null }
          | { full_name: string; display_name: string | null }[]
          | null;
        ap_procedures:
          | { name: string; approach: string | null; subspecialty: string | null }
          | { name: string; approach: string | null; subspecialty: string | null }[]
          | null;
      }) => {
        const attending = Array.isArray(row.program_attendings)
          ? row.program_attendings[0]
          : row.program_attendings;
        const procedure = Array.isArray(row.ap_procedures)
          ? row.ap_procedures[0]
          : row.ap_procedures;

        if (!procedure) return;

        let matchedField: "procedure_name" | "approach" | "site" | null = null;

        if (procedure.name.toLowerCase().includes(ql)) {
          matchedField = "procedure_name";
        } else if (procedure.approach?.toLowerCase().includes(ql)) {
          matchedField = "approach";
        } else if (row.site?.toLowerCase().includes(ql)) {
          matchedField = "site";
        }

        if (!matchedField) return;

        cardMatches.push({
          kind: "card",
          cardId: row.id,
          attendingId: row.attending_id,
          attendingFullName: attending?.full_name ?? "",
          attendingDisplayName: attending?.display_name ?? null,
          procedureId: row.procedure_id,
          procedureName: procedure.name,
          procedureApproach: procedure.approach,
          procedureSubspecialty: procedure.subspecialty,
          site: row.site,
          matchedField,
        });
      }
    );

    // Cap after filtering so every card in the program was considered.
    const cappedCardMatches = cardMatches.slice(0, 20);

    // ── Item content full-text search ──────────────────────────
    // Use Postgres full-text search via the GIN index on content_tsv
    const { data: itemRows } = await supabase
      .from("ap_items")
      .select(`
        id,
        section_id,
        content,
        is_high_yield,
        ap_sections!ap_items_section_id_fkey (
          id,
          title,
          card_id,
          ap_cards!ap_sections_card_id_fkey (
            id,
            attending_id,
            procedure_id,
            site,
            program_id,
            program_attendings!ap_cards_attending_id_fkey (
              full_name
            ),
            ap_procedures!ap_cards_procedure_id_fkey (
              name
            )
          )
        )
      `)
      .eq("is_active", true)
      .textSearch("content_tsv", q, { type: "plain", config: "english" })
      .limit(20);

    const itemMatches: ApSearchItemMatch[] = [];

    type ItemSearchRow = {
      id: string;
      section_id: string;
      content: string;
      is_high_yield: boolean;
      ap_sections:
        | {
            id: string;
            title: string;
            card_id: string;
            ap_cards:
              | {
                  id: string;
                  attending_id: string;
                  procedure_id: string;
                  site: string | null;
                  program_id: string;
                  program_attendings: { full_name: string } | { full_name: string }[] | null;
                  ap_procedures: { name: string } | { name: string }[] | null;
                }
              | {
                  id: string;
                  attending_id: string;
                  procedure_id: string;
                  site: string | null;
                  program_id: string;
                  program_attendings: { full_name: string } | { full_name: string }[] | null;
                  ap_procedures: { name: string } | { name: string }[] | null;
                }[]
              | null;
          }
        | null;
    };

    ((itemRows ?? []) as unknown as ItemSearchRow[]).forEach((row) => {
        const section = Array.isArray(row.ap_sections) ? row.ap_sections[0] : row.ap_sections;
        if (!section) return;

        const card = Array.isArray(section.ap_cards) ? section.ap_cards[0] : section.ap_cards;
        if (!card || card.program_id !== programId) return;

        const attending = Array.isArray(card.program_attendings)
          ? card.program_attendings[0]
          : card.program_attendings;
        const procedure = Array.isArray(card.ap_procedures)
          ? card.ap_procedures[0]
          : card.ap_procedures;

        itemMatches.push({
          kind: "item",
          itemId: row.id,
          sectionId: section.id,
          sectionTitle: section.title,
          cardId: card.id,
          attendingId: card.attending_id,
          attendingFullName: attending?.full_name ?? "",
          procedureId: card.procedure_id,
          procedureName: procedure?.name ?? "",
          site: card.site,
          content: row.content,
          isHighYield: row.is_high_yield,
        });
      }
    );

    const results: ApSearchResults = {
      query: q,
      attendings,
      cards: cappedCardMatches,
      items: itemMatches,
    };

    return NextResponse.json(results, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed." },
      { status: 500 }
    );
  }
}
