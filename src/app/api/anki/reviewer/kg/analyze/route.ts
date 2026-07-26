/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewerAuth, body } from "../../_lib";
import { workspaceLocalIdentitySchema } from "@/lib/education/anki-reviewer";
import { analyzeKgCardEvidence } from "@/lib/education/anki-kg-draft";

const analyzeRequestSchema = z
  .object({
    contractVersion: z.literal("snaportho-anki-kg-analyze.v1"),
    localIdentity: workspaceLocalIdentitySchema,
    clientVersion: z.string().min(1).max(64),
  })
  .strict();

export async function POST(request: Request) {
  const a = await reviewerAuth(request, "clinical_editor");
  if ("response" in a) return a.response;
  const parsed = await body(request, analyzeRequestSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data!;

  const { data: notes, error: noteError } = await a.auth.supabase
    .from("anki_notes")
    .select("id")
    .eq("anki_note_guid", input.localIdentity.noteGuid)
    .eq("is_active", true)
    .limit(5);
  if (noteError || !notes?.length)
    return NextResponse.json({ error: "card not found" }, { status: 404 });

  const { data: cards } = await a.auth.supabase
    .from("anki_cards")
    .select("id")
    .in(
      "note_id",
      notes.map((note: any) => note.id),
    )
    .eq("card_ord", input.localIdentity.cardOrdinal)
    .eq("is_active", true)
    .limit(5);
  if (!cards?.length || cards.length !== 1)
    return NextResponse.json({ error: "card not found or ambiguous" }, { status: 404 });

  const { data: canonical } = await a.auth.supabase
    .from("canonical_cards")
    .select("id,current_version_id,is_active")
    .eq("anki_card_id", cards[0].id)
    .maybeSingle();
  if (!canonical?.is_active)
    return NextResponse.json({ error: "canonical card unavailable" }, { status: 404 });

  const { data: version } = await a.auth.supabase
    .from("canonical_card_versions")
    .select("id,field_snapshot")
    .eq("id", canonical.current_version_id)
    .eq("canonical_card_id", canonical.id)
    .maybeSingle();
  if (!version)
    return NextResponse.json({ error: "version unavailable" }, { status: 404 });

  const fields = Array.isArray(version.field_snapshot) ? version.field_snapshot : [];
  return NextResponse.json({
    contractVersion: "snaportho-anki-kg-analyze.v1",
    canonicalCardId: canonical.id,
    canonicalCardVersionId: version.id,
    cardEvidence: analyzeKgCardEvidence(
      fields.map((field: any) => ({
        name: String(field?.name ?? "unknown"),
        rawValue: String(field?.rawValue ?? field?.value ?? ""),
        plainText: String(field?.plainText ?? ""),
      })),
    ),
  });
}
