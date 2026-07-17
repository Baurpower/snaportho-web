import { NextResponse } from "next/server";
import { z } from "zod";

import { requestCasePrepV2, CasePrepV2Error } from "@/lib/caseprep-v2/client";
import { createClient } from "@/utils/supabase/server";

const RequestSchema = z.object({
  prompt: z.string().trim().min(1),
  trainingLevel: z.string().nullish(),
  conversationId: z.string().nullish(),
  casePrepSessionId: z.string().nullish(),
  anonymousSessionId: z.string().nullish(),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a case." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  try {
    const result = await requestCasePrepV2({
      prompt: parsed.data.prompt,
      userId: data.user?.id,
      anonymousSessionId: parsed.data.anonymousSessionId,
      trainingLevel: parsed.data.trainingLevel,
      entrySurface: "web_case_prep_v2",
      conversationId: parsed.data.conversationId,
      casePrepSessionId: parsed.data.casePrepSessionId,
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    const message =
      error instanceof CasePrepV2Error
        ? error.message
        : "Case Prep is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
