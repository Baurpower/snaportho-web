import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticateBroBotAnkiRequest,
  optionalTrimmedStringSchema,
  parseJsonBody,
} from "../_lib";

const sessionStatusSchema = z.enum(["created", "tagged", "completed", "failed"]);

const studySessionSchema = z.object({
  prepRequestId: z.string().uuid("prepRequestId must be a valid UUID."),
  addonDeviceId: z.string().uuid("addonDeviceId must be a valid UUID.").optional(),
  sessionTitle: z.string().trim().min(1, "sessionTitle is required."),
  appliedBaseTag: optionalTrimmedStringSchema,
  appliedCaseTag: optionalTrimmedStringSchema,
  appliedRequestTag: optionalTrimmedStringSchema,
  matchingStrategy: z
    .enum(["local_keyword", "local_tag", "local_hybrid"])
    .optional(),
  totalCardsFound: z
    .number()
    .int("totalCardsFound must be an integer.")
    .min(0, "totalCardsFound must be at least 0."),
  totalCardsTagged: z
    .number()
    .int("totalCardsTagged must be an integer.")
    .min(0, "totalCardsTagged must be at least 0."),
  maxCards: z
    .number()
    .int("maxCards must be an integer.")
    .min(0, "maxCards must be at least 0.")
    .optional(),
  minMatchScore: z
    .number()
    .min(0, "minMatchScore must be at least 0.")
    .optional(),
  includeClozeSiblings: z.boolean().optional(),
  totalCandidatesFound: z
    .number()
    .int("totalCandidatesFound must be an integer.")
    .min(0, "totalCandidatesFound must be at least 0.")
    .optional(),
  status: sessionStatusSchema.optional(),
});

function getPrepRequestStatusUpdate(
  sessionStatus: z.infer<typeof sessionStatusSchema> | undefined,
  totalCardsTagged: number
): "deck_created" | "completed" | null {
  if (sessionStatus === "completed") {
    return "completed";
  }

  if (sessionStatus === "tagged" || totalCardsTagged > 0) {
    return "deck_created";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateBroBotAnkiRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const parsed = await parseJsonBody(request, studySessionSchema);

    if (!parsed.success) {
      return parsed.response;
    }

    const { supabase, userId } = auth;
    const body = parsed.data;

    const { data: prepRequest, error: prepRequestError } = await supabase
      .from("brobot_anki_prep_requests")
      .select("id, user_id, status")
      .eq("id", body.prepRequestId)
      .eq("user_id", userId)
      .maybeSingle();

    if (prepRequestError) {
      return NextResponse.json(
        { error: prepRequestError.message },
        { status: 500 }
      );
    }

    if (!prepRequest) {
      return NextResponse.json(
        { error: "Prep request not found." },
        { status: 404 }
      );
    }

    if (body.addonDeviceId) {
      const { data: device, error: deviceError } = await supabase
        .from("brobot_anki_addon_devices")
        .select("id")
        .eq("id", body.addonDeviceId)
        .eq("user_id", userId)
        .maybeSingle();

      if (deviceError) {
        return NextResponse.json({ error: deviceError.message }, { status: 500 });
      }

      if (!device) {
        return NextResponse.json(
          { error: "Anki add-on device not found." },
          { status: 404 }
        );
      }
    }

    const insertPayload = {
      user_id: userId,
      prep_request_id: body.prepRequestId,
      addon_device_id: body.addonDeviceId ?? null,
      session_title: body.sessionTitle.trim(),
      applied_base_tag: body.appliedBaseTag ?? "SnapOrtho::Tonight",
      applied_case_tag: body.appliedCaseTag ?? null,
      applied_request_tag: body.appliedRequestTag ?? null,
      matching_strategy: body.matchingStrategy ?? "local_keyword",
      total_cards_found: body.totalCardsFound,
      total_cards_tagged: body.totalCardsTagged,
      max_cards: body.maxCards ?? null,
      min_match_score: body.minMatchScore ?? null,
      include_cloze_siblings: body.includeClozeSiblings ?? false,
      total_candidates_found: body.totalCandidatesFound ?? 0,
      status: body.status ?? "created",
    };

    const { data, error } = await supabase
      .from("brobot_anki_study_sessions")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const prepRequestStatus = getPrepRequestStatusUpdate(
      body.status,
      body.totalCardsTagged
    );

    if (prepRequestStatus) {
      const { error: updateError } = await supabase
        .from("brobot_anki_prep_requests")
        .update({ status: prepRequestStatus })
        .eq("id", body.prepRequestId)
        .eq("user_id", userId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
