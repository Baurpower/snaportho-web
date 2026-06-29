import { NextRequest, NextResponse } from "next/server";
import {
  fetchAnkiKgReviewDashboard,
  type AnkiKgReviewFilters,
} from "@/lib/education/anki-kg-review";
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";

function readFilters(searchParams: URLSearchParams): AnkiKgReviewFilters {
  return {
    batchId: searchParams.get("batchId"),
    runId: searchParams.get("runId"),
    deckBranch: searchParams.get("deckBranch"),
    tag: searchParams.get("tag"),
    confidenceBand: (searchParams.get("confidenceBand") as AnkiKgReviewFilters["confidenceBand"]) ?? "all",
    mappedState: (searchParams.get("mappedState") as AnkiKgReviewFilters["mappedState"]) ?? "all",
    sourceTagMode: (searchParams.get("sourceTagMode") as AnkiKgReviewFilters["sourceTagMode"]) ?? "all",
    curriculumNodeSlug: searchParams.get("curriculumNodeSlug"),
    reviewStatus: searchParams.get("reviewStatus"),
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireCasePrepReviewer();
  } catch (err) {
    if (err instanceof CasePrepReviewAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  try {
    const payload = await fetchAnkiKgReviewDashboard(readFilters(req.nextUrl.searchParams));
    return NextResponse.json({ data: payload });
  } catch (err) {
    console.error("[anki-kg-review] dashboard fetch failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to load Anki KG review dashboard." },
      { status: 500 }
    );
  }
}
