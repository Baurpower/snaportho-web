/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any -- Additive Phase 3 tables are absent from generated database types until deployment. */
// @ts-nocheck Additive Phase 3 tables are absent from generated database types until deployment.
import { NextResponse } from "next/server";
import { reviewerAuth } from "../_lib";
// Priority curation queue for the add-on dashboard. v1 source: cards in the current published
// release that lack a production-eligible KG mapping (v_anki_deck_release_cards_missing_eligible_links).
// The future AI flagging pipeline (duplicates, low-yield, …) will union additional reasons here;
// the add-on already degrades to an empty state when this route is absent or returns nothing.
const PERSONAL = /^(personal|user|local)(_|::)/i;
const MARKERS = new Set(["snaportho_id", "snaportho_version", "snaportho_installed_hash"]);
function frontPreview(fieldSnapshot: any): string {
  const fields = Array.isArray(fieldSnapshot) ? fieldSnapshot : [];
  const central = fields.find(
    (f: any) => f?.name && !PERSONAL.test(f.name) && !MARKERS.has(String(f.name).toLowerCase()),
  );
  const value = String(central?.value ?? central?.rawValue ?? "");
  const text = value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  return text.length > 120 ? `${text.slice(0, 119)}…` : text;
}
export async function GET(request: Request) {
  const a = await reviewerAuth(request);
  if ("response" in a) return a.response;
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 1), 500);
  const supabase = a.auth.supabase;
  const { data: release, error: releaseError } = await supabase
    .from("anki_deck_releases")
    .select("id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (releaseError)
    return NextResponse.json({ error: "queue unavailable" }, { status: 500 });
  if (!release) return NextResponse.json({ cards: [] });
  const { data: flagged, error: flaggedError } = await supabase
    .from("v_anki_deck_release_cards_missing_eligible_links")
    .select("canonical_card_id,canonical_card_version_id")
    .eq("deck_release_id", release.id)
    .limit(limit);
  if (flaggedError)
    return NextResponse.json({ error: "queue unavailable" }, { status: 500 });
  if (!flagged?.length) return NextResponse.json({ cards: [] });
  const cardIds = flagged.map((r: any) => r.canonical_card_id);
  const versionIds = flagged.map((r: any) => r.canonical_card_version_id);
  const [{ data: members }, { data: versions }] = await Promise.all([
    supabase
      .from("anki_deck_release_cards")
      .select("canonical_card_id,note_guid,card_ordinal,deck_path")
      .eq("deck_release_id", release.id)
      .in("canonical_card_id", cardIds),
    supabase
      .from("canonical_card_versions")
      .select("id,field_snapshot")
      .in("id", versionIds),
  ]);
  const memberByCard = new Map((members ?? []).map((m: any) => [m.canonical_card_id, m]));
  const snapshotByVersion = new Map((versions ?? []).map((v: any) => [v.id, v.field_snapshot]));
  const cards = flagged
    .map((r: any) => {
      const member = memberByCard.get(r.canonical_card_id);
      if (!member) return null;
      return {
        noteGuid: member.note_guid,
        cardOrdinal: member.card_ordinal,
        deckPath: member.deck_path,
        priority: "medium",
        reason: "missing_kg_mapping",
        front: frontPreview(snapshotByVersion.get(r.canonical_card_version_id)),
      };
    })
    .filter(Boolean);
  return NextResponse.json({ cards });
}
