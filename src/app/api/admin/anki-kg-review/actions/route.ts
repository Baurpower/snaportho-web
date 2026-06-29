import { NextRequest, NextResponse } from "next/server";
import {
  applyAnkiKgReviewAction,
  previewAnkiKgReviewAction,
  type ReviewActionInput,
} from "@/lib/education/anki-kg-review";
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";

function isAction(value: string | null | undefined): value is ReviewActionInput["action"] {
  return (
    value === "approve_candidate" ||
    value === "reject_candidate" ||
    value === "needs_alias" ||
    value === "wrong_node" ||
    value === "bulk_approve_high_confidence_branch" ||
    value === "bulk_reject_source_only"
  );
}

export async function POST(req: NextRequest) {
  try {
    await requireCasePrepReviewer();
  } catch (err) {
    if (err instanceof CasePrepReviewAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  let body: ReviewActionInput;
  try {
    body = (await req.json()) as ReviewActionInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.runId || !isAction(body.action)) {
    return NextResponse.json(
      { error: "runId and a valid action are required." },
      { status: 400 }
    );
  }

  if (
    (body.action === "approve_candidate" ||
      body.action === "reject_candidate" ||
      body.action === "needs_alias" ||
      body.action === "wrong_node") &&
    !body.candidateId
  ) {
    return NextResponse.json({ error: "candidateId is required for single-candidate actions." }, { status: 400 });
  }

  if (body.action === "bulk_approve_high_confidence_branch" && !body.deckBranch) {
    return NextResponse.json({ error: "deckBranch is required for bulk branch approval." }, { status: 400 });
  }

  try {
    const result = body.previewOnly
      ? await previewAnkiKgReviewAction(body)
      : await applyAnkiKgReviewAction(body);
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[anki-kg-review] action failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to apply review action." },
      { status: 500 }
    );
  }
}
