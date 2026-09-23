import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { authenticateBroBotAnkiRequest } from "../_lib";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildLaunchCommandRow,
  guidOrdinalResolution,
  isAnkiLaunchCreateRequest,
  toLaunchRequest,
} from "@/lib/education/anki-launch-commands";

export async function POST(request: Request) {
  const auth = await authenticateBroBotAnkiRequest(request);
  if ("response" in auth) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isAnkiLaunchCreateRequest(body)) {
    return NextResponse.json({ error: "invalid_launch" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: notes, error: noteError } = await admin
    .from("anki_notes")
    .select("id")
    .eq("anki_note_guid", body.noteGuid)
    .eq("is_active", true);
  if (noteError) return NextResponse.json({ error: noteError.message }, { status: 500 });
  const noteIds = (notes ?? []).map((note) => note.id);
  const { data: ankiCards, error: cardError } = noteIds.length
    ? await admin
      .from("anki_cards")
      .select("id")
      .in("note_id", noteIds)
      .eq("card_ord", body.cardOrdinal)
      .eq("is_active", true)
    : { data: [], error: null };
  if (cardError) return NextResponse.json({ error: cardError.message }, { status: 500 });
  const ankiCardIds = (ankiCards ?? []).map((card) => card.id);
  const { data: matches, error: lookupError } = ankiCardIds.length
    ? await admin
      .from("canonical_cards")
      .select("id,current_version_id")
      .in("anki_card_id", ankiCardIds)
      .eq("is_active", true)
    : { data: [], error: null };
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  const rows = matches ?? [];
  const resolution = guidOrdinalResolution(rows.length);
  if (resolution === "not_found") return NextResponse.json({ error: "guid_ordinal_not_found" }, { status: 404 });
  if (resolution === "ambiguous") return NextResponse.json({ error: "guid_ordinal_ambiguous" }, { status: 409 });
  const card = rows[0] as { id: string; current_version_id: string };
  if (body.canonicalCardId && body.canonicalCardId !== card.id) {
    return NextResponse.json({ error: "canonical_card_mismatch" }, { status: 409 });
  }

  const insert = buildLaunchCommandRow({
    userId: auth.userId,
    card: {
      canonicalCardId: card.id,
      canonicalCardVersionId: card.current_version_id,
      noteGuid: body.noteGuid,
      cardOrdinal: body.cardOrdinal,
    },
    idempotencySeed: body.idempotencyKey ?? randomUUID(),
  });
  const { data: existing } = await admin
    .from("educational_anki_launch_commands")
    .select("id,canonical_card_id,canonical_card_version_id,note_guid,card_ordinal,requested_at,expires_at,status")
    .eq("user_id", auth.userId)
    .eq("idempotency_key", insert.idempotency_key)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, command: toLaunchRequest(existing) });
  }
  const { data: created, error: insertError } = await admin
    .from("educational_anki_launch_commands")
    .insert(insert)
    .select("id,canonical_card_id,canonical_card_version_id,note_guid,card_ordinal,requested_at,expires_at")
    .single();
  if (insertError || !created) {
    return NextResponse.json({ error: insertError?.message ?? "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, command: toLaunchRequest(created) });
}
