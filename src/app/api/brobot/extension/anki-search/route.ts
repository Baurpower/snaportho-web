import { NextResponse } from "next/server";
import { authenticateDeviceLinkedRequest } from "@/lib/brobot/device-link";
import {
  ExtensionAnkiSearchRequestSchema,
  normalizedSearchId,
} from "@/lib/education/contracts/extension-anki-search-v1";

const TOKEN_HEADER = "x-snaportho-extension-token";

export async function POST(request: Request) {
  const auth = await authenticateDeviceLinkedRequest(request, {
    deviceTokenHeader: TOKEN_HEADER,
    allowBrowserSession: false,
    allowBearerToken: false,
  });
  if ("response" in auth) return auth.response;
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = ExtensionAnkiSearchRequestSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid Anki search request", field: parsed.error.issues[0]?.path.join(".") }, { status: 400 });
  const input = parsed.data;
  const normalized = normalizedSearchId(input);
  const { data: existing, error: existingError } = await auth.supabase.from("educational_anki_search_requests")
    .select("id,status,expires_at").eq("user_id", auth.userId).eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (existingError) {
    const relayMissing = existingError.code === "42P01" || existingError.code === "PGRST205";
    return NextResponse.json({
      error: relayMissing ? "anki_search_relay_unavailable" : "anki_search_queue_failed",
      message: relayMissing
        ? "The Anki search relay is not installed on this SnapOrtho backend."
        : "SnapOrtho could not check the Anki search queue.",
    }, { status: 503 });
  }
  if (existing) return NextResponse.json({ searchRequestId: existing.id, status: existing.status, expiresAt: existing.expires_at, idempotentReplay: true });
  const { data, error } = await auth.supabase.from("educational_anki_search_requests").insert({
    user_id: auth.userId,
    source_device_token_id: auth.deviceTokenId,
    provider: input.source.provider,
    query_kind: input.source.queryKind,
    submitted_native_id: input.source.nativeQuestionId,
    normalized_native_id: normalized,
    question_fingerprint_hash: input.source.questionFingerprintHash,
    tested_concept: input.concept.testedConcept,
    concept_summary: input.concept.summary,
    search_keywords: input.concept.searchKeywords,
    page_sections: input.concept.pageSections,
    concept_source: input.concept.source,
    requested_action: input.requestedAction,
    idempotency_key: input.idempotencyKey,
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  }).select("id,status,expires_at").single();
  if (error) {
    const relayMissing = error.code === "42P01" || error.code === "PGRST205";
    return NextResponse.json({
      error: relayMissing ? "anki_search_relay_unavailable" : "anki_search_queue_failed",
      message: relayMissing
        ? "The Anki search relay is not installed on this SnapOrtho backend."
        : "SnapOrtho could not queue the Anki search. Please retry.",
    }, { status: 503 });
  }
  return NextResponse.json({ searchRequestId: data.id, status: data.status, expiresAt: data.expires_at }, { status: 202 });
}
