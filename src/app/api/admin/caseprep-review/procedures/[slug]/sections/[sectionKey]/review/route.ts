import { NextRequest, NextResponse } from "next/server";
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";
import { upsertSectionReview } from "@/lib/caseprep-review/reviews";
import type { SectionReviewStatus } from "@/lib/caseprep-review/types";

type RouteContext = { params: Promise<{ slug: string; sectionKey: string }> };

const VALID_STATUSES = new Set<SectionReviewStatus>([
  "unreviewed",
  "needs_improvement",
  "approved",
]);

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug, sectionKey } = await params;

  let ctx;
  try {
    ctx = await requireCasePrepReviewer();
  } catch (err) {
    if (err instanceof CasePrepReviewAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  let body: { status?: string; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status, comment } = body;
  if (!status || !VALID_STATUSES.has(status as SectionReviewStatus)) {
    return NextResponse.json(
      { error: "status must be one of: unreviewed, needs_improvement, approved" },
      { status: 400 }
    );
  }

  try {
    const review = await upsertSectionReview(
      slug,
      sectionKey,
      ctx.userId,
      status as SectionReviewStatus,
      comment,
      ctx.displayName
    );
    return NextResponse.json({ data: review });
  } catch (err) {
    console.error("[caseprep-review] section review upsert failed:", {
      name: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      slug,
      sectionKey,
      status,
    });
    return NextResponse.json(
      { error: "Unable to save section review. Please try again." },
      { status: 500 }
    );
  }
}
