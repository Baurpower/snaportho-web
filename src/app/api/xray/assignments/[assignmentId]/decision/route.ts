import { NextRequest, NextResponse } from "next/server";
import { requireXrayApiUser, xrayApiError } from "@/lib/xray/request";
import { recordXrayReviewDecision } from "@/lib/xray/workflow";

type Context = { params: Promise<{ assignmentId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireXrayApiUser();
  if ("error" in auth) return auth.error;
  try {
    const { assignmentId } = await context.params;
    const decision = await recordXrayReviewDecision(auth.user.id, assignmentId, await request.json());
    return NextResponse.json({ decision }, { status: 201 });
  } catch (error) {
    return xrayApiError(error);
  }
}
