import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateBroBotAnkiRequest, parseJsonBody } from "../_lib";
import { buildBroBotAnkiPlan } from "@/lib/brobot-anki/plan-generator";

const generatePlanSchema = z.object({
  rawCaseInput: z.string().trim().min(1, "rawCaseInput is required."),
});

export async function POST(request: Request) {
  try {
    const auth = await authenticateBroBotAnkiRequest(request);

    if ("response" in auth) {
      return auth.response;
    }

    const parsed = await parseJsonBody(request, generatePlanSchema);

    if (!parsed.success) {
      return parsed.response;
    }

    const plan = buildBroBotAnkiPlan(parsed.data.rawCaseInput);
    return NextResponse.json(plan, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
