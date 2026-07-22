/* eslint-disable @typescript-eslint/no-explicit-any -- Anki mapping rows await generated Supabase types. */
import { NextResponse } from "next/server";
import { reviewerAuth, body } from "../../_lib";
import { workspaceLocalIdentitySchema } from "@/lib/education/anki-reviewer";
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
      proposalKind: "create_missing_card",
      localIdentity: input,
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
      proposalKind: "create_missing_card",
      localIdentity: input,
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
      proposalKind: "create_missing_card",
      localIdentity: input,
    });
  if (!canonical.is_active)
    return NextResponse.json(
      { error: "canonical card inactive", conflictType: "card_inactive" },
      { status: 409 },
    );
  const { data: version, error: versionError } = await a.auth.supabase
    .from("canonical_card_versions")
    .select("id,content_hash,version_number,tag_snapshot")
    .eq("id", canonical.current_version_id)
    .eq("canonical_card_id", canonical.id)
    .maybeSingle();
  if (versionError || !version)
    return NextResponse.json(
      { error: "canonical card version unavailable" },
      { status: 500 },
    );
  if (version.content_hash !== input.contentHash)
    return NextResponse.json(
      {
        error: "local card differs from current canonical version",
        conflictType: "local_content_changed",
        canonicalCardId: canonical.id,
        canonicalCardVersionId: version.id,
        currentContentHash: version.content_hash,
      },
      { status: 409 },
    );
  const { data: links } = await a.auth.supabase
    .from("card_canonical_entity_links")
    .select(
      "canonical_entity_id,canonical_entities!inner(preferred_label,entity_type,status,is_active)",
    )
    .eq("canonical_card_id", canonical.id)
    .eq("is_active", true)
    .eq("review_status", "approved");
  return NextResponse.json({
    found: true,
    proposalKind: "edit_existing_card",
    canonicalCardId: canonical.id,
    canonicalCardVersionId: version.id,
    contentHash: version.content_hash,
    versionNumber: version.version_number,
    centralTags: version.tag_snapshot ?? [],
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
