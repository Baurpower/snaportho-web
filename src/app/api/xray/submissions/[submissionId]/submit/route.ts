import { NextRequest, NextResponse } from "next/server";
import { requireXrayApiUser, xrayApiError } from "@/lib/xray/request";
import { submitXrayRevision } from "@/lib/xray/workflow";

type Context = { params: Promise<{ submissionId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireXrayApiUser();
  if ("error" in auth) return auth.error;
  try {
    const { submissionId } = await context.params;
    const revision = await submitXrayRevision(auth.user.id, submissionId, await request.json());
    return NextResponse.json({ revision }, { status: 201 });
  } catch (error) {
    return xrayApiError(error);
  }
}
