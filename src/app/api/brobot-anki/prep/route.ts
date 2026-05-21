import { NextResponse } from "next/server";
import { z } from "zod";

import {
  optionalStringArraySchema,
  optionalTrimmedStringSchema,
  parseJsonBody,
  requireAuthenticatedUser,
} from "../_lib";

const prepRequestSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  rawCaseInput: z.string().trim().min(1, "rawCaseInput is required."),
  diagnosis: optionalTrimmedStringSchema,
  procedure: optionalTrimmedStringSchema,
  bodyRegion: optionalTrimmedStringSchema,
  subspecialty: optionalTrimmedStringSchema,
  generatedSummary: optionalTrimmedStringSchema,
  generatedKeywords: optionalStringArraySchema,
  generatedTopics: z.array(z.unknown()).optional(),
  suggestedTags: optionalStringArraySchema,
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);

    if ("response" in auth) {
      return auth.response;
    }

    const parsed = await parseJsonBody(request, prepRequestSchema);

    if (!parsed.success) {
      return parsed.response;
    }

    const { supabase, user } = auth;
    const body = parsed.data;

    const insertPayload = {
      user_id: user.id,
      title: body.title.trim(),
      raw_case_input: body.rawCaseInput.trim(),
      diagnosis: body.diagnosis ?? null,
      procedure: body.procedure ?? null,
      body_region: body.bodyRegion ?? null,
      subspecialty: body.subspecialty ?? null,
      generated_summary: body.generatedSummary ?? null,
      generated_keywords: body.generatedKeywords ?? [],
      generated_topics: body.generatedTopics ?? [],
      suggested_tags: body.suggestedTags ?? [],
      status: "pending",
      sent_to_anki_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("brobot_anki_prep_requests")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
