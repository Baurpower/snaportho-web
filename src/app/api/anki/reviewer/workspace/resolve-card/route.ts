/* eslint-disable @typescript-eslint/no-explicit-any -- Anki mapping rows await generated Supabase types. */
import { NextResponse } from "next/server";
import { reviewerAuth, body } from "../../_lib";
import { workspaceLocalIdentitySchema } from "@/lib/education/anki-reviewer";

/** Master resource fields the enrichment panel cares about (non-empty only). */
const RESOURCE_HINT_FIELDS = [
  "Orthobullets",
  "Orthobullets_Link",
  "ROCK",
  "ROCK_Link",
  "Nailed_It",
  "Nailed_It_Link",
  "Video",
  "Video_Link",
  "Extra",
] as const;

function resourceHintsFromSnapshot(raw: unknown): Record<string, string> {
  if (!Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const field of raw) {
    const name = String((field as any)?.name ?? "").trim();
    if (!RESOURCE_HINT_FIELDS.includes(name as (typeof RESOURCE_HINT_FIELDS)[number])) {
      continue;
    }
    const value = String(
      (field as any)?.rawValue ?? (field as any)?.value ?? "",
    ).trim();
    if (!value) continue;
    // Cap size so resolve stays metadata-safe for the dock.
    out[name] = value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  }
  return out;
}

/**
 * Resolve local note GUID/ord to a pinned canonical version for proposals.
 * Content-hash mismatch is soft: Master-note-type installs rarely match the
 * import identity hash (extra marker/empty fields + different tags). Callers
 * still receive the server pin so they can propose against the current version.
 *
 * `identityResolved` is the reviewer-facing success signal; `contentMatches` is
 * identity-hash parity only (often false after SnapOrtho Master install).
 */
export async function POST(request: Request) {
  const a = await reviewerAuth(request, "clinical_editor");
  if ("response" in a) return a.response;
  const parsed = await body(request, workspaceLocalIdentitySchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data!;
  const { data: notes, error: noteError } = await a.auth.supabase
    .from("anki_notes")
    .select("id")
    .eq("anki_note_guid", input.noteGuid)
    .eq("is_active", true)
    .limit(5);
  if (noteError)
    return NextResponse.json(
      { error: "card resolution unavailable" },
      { status: 500 },
    );
  if (!notes?.length)
    return NextResponse.json({
      found: false,
      identityResolved: false,
      contentMatches: false,
      styleMismatchLikely: false,
      proposalKind: "create_missing_card",
      localIdentity: input,
      mappings: [],
      resourceHints: {},
    });
  const { data: cards, error: cardError } = await a.auth.supabase
    .from("anki_cards")
    .select("id")
    .in(
      "note_id",
      notes.map((n: any) => n.id),
    )
    .eq("card_ord", input.cardOrdinal)
    .eq("is_active", true)
    .limit(5);
  if (cardError)
    return NextResponse.json(
      { error: "card resolution unavailable" },
      { status: 500 },
    );
  if (!cards?.length)
    return NextResponse.json({
      found: false,
      identityResolved: false,
      contentMatches: false,
      styleMismatchLikely: false,
      proposalKind: "create_missing_card",
      localIdentity: input,
      mappings: [],
      resourceHints: {},
    });
  if (cards.length !== 1)
    return NextResponse.json(
      { error: "ambiguous card identity", conflictType: "identity_mismatch" },
      { status: 409 },
    );
  const { data: canonical, error: canonicalError } = await a.auth.supabase
    .from("canonical_cards")
    .select("id,current_version_id,is_active,canonical_status")
    .eq("anki_card_id", cards[0].id)
    .maybeSingle();
  if (canonicalError)
    return NextResponse.json(
      { error: "card resolution unavailable" },
      { status: 500 },
    );
  if (!canonical)
    return NextResponse.json({
      found: false,
      identityResolved: false,
      contentMatches: false,
      styleMismatchLikely: false,
      proposalKind: "create_missing_card",
      localIdentity: input,
      mappings: [],
      resourceHints: {},
    });
  if (!canonical.is_active)
    return NextResponse.json(
      { error: "canonical card inactive", conflictType: "card_inactive" },
      { status: 409 },
    );
  const { data: version, error: versionError } = await a.auth.supabase
    .from("canonical_card_versions")
    .select("id,content_hash,version_number,tag_snapshot,field_snapshot")
    .eq("id", canonical.current_version_id)
    .eq("canonical_card_id", canonical.id)
    .maybeSingle();
  if (versionError || !version)
    return NextResponse.json(
      { error: "canonical card version unavailable" },
      { status: 500 },
    );

  const contentMatches = version.content_hash === input.contentHash;
  // Soft mismatch after Master install is expected — not editorial conflict.
  const styleMismatchLikely = !contentMatches;
  const { data: links } = await a.auth.supabase
    .from("card_canonical_entity_links")
    .select(
      "canonical_entity_id,canonical_entities!inner(preferred_label,entity_type,status,is_active)",
    )
    .eq("canonical_card_id", canonical.id)
    .eq("is_active", true)
    .eq("review_status", "approved");

  const resourceHints = resourceHintsFromSnapshot((version as any).field_snapshot);

  return NextResponse.json({
    found: true,
    identityResolved: true,
    contentMatches,
    styleMismatchLikely,
    proposalKind: "edit_existing_card",
    canonicalCardId: canonical.id,
    canonicalCardVersionId: version.id,
    contentHash: version.content_hash,
    localContentHash: input.contentHash,
    versionNumber: version.version_number,
    centralTags: version.tag_snapshot ?? [],
    conflictHint: contentMatches ? null : "style_or_local_reshape",
    resourceHints,
    mappings: (links ?? [])
      .filter(
        (x: any) =>
          x.canonical_entities?.is_active &&
          x.canonical_entities?.status === "canonical",
      )
      .map((x: any) => ({
        canonicalEntityId: x.canonical_entity_id,
        label: x.canonical_entities.preferred_label,
        entityType: x.canonical_entities.entity_type,
      })),
  });
}
