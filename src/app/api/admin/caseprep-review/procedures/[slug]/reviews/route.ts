import { NextRequest, NextResponse } from "next/server";
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";
import { fetchSectionReviews } from "@/lib/caseprep-review/reviews";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;

  try {
    await requireCasePrepReviewer();
  } catch (err) {
    if (err instanceof CasePrepReviewAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  try {
    const reviews = await fetchSectionReviews(slug);
    return NextResponse.json({ data: reviews });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch reviews";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
