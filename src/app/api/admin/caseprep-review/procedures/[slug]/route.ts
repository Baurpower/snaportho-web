import { NextResponse } from "next/server";

import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";
import {
  CasePrepRegistryNotFoundError,
  CasePrepRegistryUpstreamError,
  fetchRegistryProcedure,
} from "@/lib/caseprep-review/client";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCasePrepReviewer();
    const { slug } = await context.params;

    if (!slug?.trim()) {
      return NextResponse.json({ error: "Procedure slug is required." }, { status: 400 });
    }

    const data = await fetchRegistryProcedure(slug);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof CasePrepReviewAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof CasePrepRegistryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof CasePrepRegistryUpstreamError) {
      return NextResponse.json(
        { error: "Unable to load CasePrep procedure detail." },
        { status: 502 }
      );
    }

    console.error("[caseprep-review] procedure detail error", error);
    return NextResponse.json(
      { error: "Unable to load CasePrep procedure detail." },
      { status: 500 }
    );
  }
}