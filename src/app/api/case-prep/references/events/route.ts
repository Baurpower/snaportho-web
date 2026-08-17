import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const EventSchema = z.object({
  packetId: z.string().uuid().nullish(),
  canonicalSlug: z.string().trim().min(1).max(160),
  recommendationSetId: z.string().trim().max(160).nullish(),
  resourceId: z.string().trim().max(200).nullish(),
  eventType: z.enum(["panel_open", "impression", "click"]),
  rankPosition: z.number().int().positive().max(20).nullish(),
  topic: z.string().trim().max(220).nullish(),
  trainingLevel: z.string().trim().max(40).nullish(),
  generatedFrom: z.enum(["curated", "live", "hybrid", "cached"]).nullish(),
});

export async function POST(request: Request) {
  const parsed = EventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true });

  const resourceUuid =
    parsed.data.resourceId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
      parsed.data.resourceId,
    )
      ? parsed.data.resourceId
      : null;
  const { error } = await createAdminClient()
    .from("brobot_reading_events")
    .insert({
      user_id: user.id,
      conversation_id: null,
      source_message_id: null,
      resource_id: resourceUuid,
      event_type: parsed.data.eventType,
      rank_position: parsed.data.rankPosition ?? null,
      rank_score: null,
      mode: "or_prep",
      training_level: parsed.data.trainingLevel ?? null,
      topic: parsed.data.topic ?? null,
      metadata: {
        surface: "caseprep",
        packet_id: parsed.data.packetId ?? null,
        canonical_slug: parsed.data.canonicalSlug,
        recommendation_set_id: parsed.data.recommendationSetId ?? null,
        generated_from: parsed.data.generatedFrom ?? null,
        resource_id: parsed.data.resourceId ?? null,
      },
    });

  if (error) {
    console.error("[caseprep] reference event insert failed", error);
  }
  return NextResponse.json({ ok: true });
}
