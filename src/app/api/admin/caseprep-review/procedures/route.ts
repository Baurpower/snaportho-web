import { NextResponse } from "next/server";

import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";
import {
  CasePrepRegistryUpstreamError,
  fetchRegistryIndex,
} from "@/lib/caseprep-review/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireCasePrepReviewer();

    const data = await fetchRegistryIndex();
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof CasePrepReviewAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof CasePrepRegistryUpstreamError) {
      return NextResponse.json(
        { error: "Unable to load CasePrep registry index." },
        { status: 502 }
      );
    }

    console.error("[caseprep-review] procedures index error", error);
    return NextResponse.json(
      { error: "Unable to load CasePrep registry index." },
      { status: 500 }
    );
  }
}