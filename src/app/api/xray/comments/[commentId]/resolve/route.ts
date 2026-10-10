import { NextRequest, NextResponse } from "next/server";
import { requireXrayApiUser, xrayApiError } from "@/lib/xray/request";
import { resolveXrayReviewComment } from "@/lib/xray/workflow";

type Context = { params: Promise<{ commentId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireXrayApiUser();
  if ("error" in auth) return auth.error;
  try {
    const { commentId } = await context.params;
    const comment = await resolveXrayReviewComment(auth.user.id, commentId, await request.json());
    return NextResponse.json({ comment });
  } catch (error) {
    return xrayApiError(error);
  }
}
