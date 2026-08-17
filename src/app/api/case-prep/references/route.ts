import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildCasePrepReadingTopic,
  getCasePrepReferences,
} from "@/lib/brobot/reading";
import { getGuestSessionFromRequest } from "@/lib/brobot/guest-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const RequestSchema = z.object({
  // SSE packet IDs are opaque (currently uuid4 hex), not necessarily RFC UUIDs.
  packetId: z.string().trim().min(1).max(160).nullish(),
  canonicalSlug: z.string().trim().min(1).max(160),
  displayName: z.string().trim().min(1).max(220),
  requestedCase: z.string().trim().max(300).nullish(),
  specialty: z.string().trim().max(100).nullish(),
  region: z.string().trim().max(100).nullish(),
  procedureType: z.string().trim().max(100).nullish(),
  trainingLevel: z.string().trim().max(40).nullish(),
  sourceHints: z
    .array(
      z.object({
        title: z.string().trim().max(300).optional(),
        url: z.string().url().max(1600),
      }),
    )
    .max(12)
    .optional(),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !getGuestSessionFromRequest(request)) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const topic = buildCasePrepReadingTopic(parsed.data);
  const result = await getCasePrepReferences({
    supabase: createAdminClient(),
    topic,
    sourceHints: parsed.data.sourceHints,
    max: 6,
  });

  return NextResponse.json({
    recommendationSetId: result.recommendationSetId,
    topic: result.topic,
    generatedFrom: result.generatedFrom,
    resources: result.resources.map(({ rankScore, ...resource }) => {
      void rankScore;
      return resource;
    }),
  });
}
