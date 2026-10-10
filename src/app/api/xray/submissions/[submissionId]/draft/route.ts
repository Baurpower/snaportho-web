import { NextRequest, NextResponse } from "next/server";
import { requireXrayApiUser, xrayApiError } from "@/lib/xray/request";
import { saveXrayDraft } from "@/lib/xray/workflow";

type Context = { params: Promise<{ submissionId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireXrayApiUser();
  if ("error" in auth) return auth.error;
  try {
    const { submissionId } = await context.params;
    const submission = await saveXrayDraft(auth.user.id, submissionId, await request.json());
    return NextResponse.json({ submission });
  } catch (error) {
    return xrayApiError(error);
  }
}
