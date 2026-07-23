import { NextResponse } from "next/server";
import { z } from "zod";

import { requestCasePrepWebV11 } from "@/lib/caseprep-v1-1/client";

const RequestSchema = z.object({ prompt: z.string().trim().min(1) });

export async function POST(request: Request) {
  if (process.env.CASEPREP_WEB_V1_1_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a case." }, { status: 400 });
  }
  try {
    return NextResponse.json({ data: await requestCasePrepWebV11(parsed.data.prompt) });
  } catch {
    return NextResponse.json({ error: "Case Prep is temporarily unavailable." }, { status: 502 });
  }
}
