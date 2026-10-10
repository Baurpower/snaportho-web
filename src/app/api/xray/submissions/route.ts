import { NextRequest, NextResponse } from "next/server";
import { requireXrayApiUser, xrayApiError } from "@/lib/xray/request";
import { createXraySubmission } from "@/lib/xray/workflow";

export async function POST(request: NextRequest) {
  const auth = await requireXrayApiUser();
  if ("error" in auth) return auth.error;
  try {
    const submission = await createXraySubmission(auth.user.id, await request.json());
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    return xrayApiError(error);
  }
}
