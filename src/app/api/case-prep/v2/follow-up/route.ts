import { NextResponse } from "next/server";
import { z } from "zod";

import {
  PinnedCasePrepSessionSchema,
  requestPinnedCasePrepFollowUp,
} from "@/lib/caseprep-v2/follow-up";

const RequestSchema = z.object({
  session: PinnedCasePrepSessionSchema,
  question: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid pinned Case Prep request." }, { status: 400 });
  }
  try {
    const result = await requestPinnedCasePrepFollowUp(
      parsed.data.session,
      parsed.data.question
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Case Prep follow-up failed." },
      { status: 409 }
    );
  }
}
