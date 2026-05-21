import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticateBroBotAnkiRequest,
  optionalStringArraySchema,
  optionalTrimmedStringSchema,
  parseJsonBody,
} from "../_lib";

const matchSchema = z.object({
  rawAnkiCardId: z.number().int("rawAnkiCardId must be an integer.").optional(),
  rawAnkiNoteId: z.number().int("rawAnkiNoteId must be an integer.").optional(),
  deckName: optionalTrimmedStringSchema,
  cardPreview: optionalTrimmedStringSchema,
  matchScore: z.number().min(0, "matchScore must be at least 0.").optional(),
  matchedKeywords: optionalStringArraySchema,
  matchReason: optionalTrimmedStringSchema,
  included: z.boolean().optional(),
});

const sessionMatchesSchema = z.object({
  sessionId: z.string().uuid("sessionId must be a valid UUID."),
  matches: z
    .array(matchSchema)
    .min(1, "matches must contain at least one item."),
});

export async function POST(request: Request) {
  try {
    const auth = await authenticateBroBotAnkiRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const parsed = await parseJsonBody(request, sessionMatchesSchema);

    if (!parsed.success) {
      return parsed.response;
    }

    const { supabase, userId } = auth;
    const body = parsed.data;

    const { data: session, error: sessionError } = await supabase
      .from("brobot_anki_study_sessions")
      .select("id")
      .eq("id", body.sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json(
        { error: "Study session not found." },
        { status: 404 }
      );
    }

    const rows = body.matches.map((match) => ({
      session_id: body.sessionId,
      raw_anki_card_id: match.rawAnkiCardId ?? null,
      raw_anki_note_id: match.rawAnkiNoteId ?? null,
      deck_name: match.deckName ?? null,
      card_preview: match.cardPreview ?? null,
      match_score: match.matchScore ?? null,
      matched_keywords: match.matchedKeywords ?? [],
      match_reason: match.matchReason ?? null,
      included: match.included ?? false,
    }));

    const { error } = await supabase
      .from("brobot_anki_session_matches")
      .insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ insertedCount: rows.length }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
