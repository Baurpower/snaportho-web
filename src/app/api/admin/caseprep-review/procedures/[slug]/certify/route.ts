import { NextRequest, NextResponse } from "next/server";
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";
import { certifyRegistryProcedure } from "@/lib/caseprep-review/client";
import {
  CasePrepRegistryNotFoundError,
  CasePrepRegistryUpstreamError,
} from "@/lib/caseprep-review/client";
import { fetchSectionReviews } from "@/lib/caseprep-review/reviews";
import { computeReviewProgress } from "@/lib/caseprep-review/review-utils";
import { fetchRegistryProcedure } from "@/lib/caseprep-review/client";
import { CERTIFIER_ROLES, REQUIRED_SECTIONS } from "@/lib/caseprep-review/constants";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await requireCasePrepReviewer();
  } catch (err) {
    if (err instanceof CasePrepReviewAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  if (!CERTIFIER_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: "Certification requires attending_reviewer, certifier, or content_admin role." },
      { status: 403 }
    );
  }

  let body: { notes?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Verify all required sections are approved before certifying
  let procedure;
  try {
    procedure = await fetchRegistryProcedure(slug);
  } catch (err) {
    if (err instanceof CasePrepRegistryNotFoundError) {
      return NextResponse.json({ error: `Procedure '${slug}' not found.` }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Failed to load procedure";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const reviews = await fetchSectionReviews(slug);
  const sectionKeys = procedure.sections.map((s) => s.key);
  const progress = computeReviewProgress(sectionKeys, reviews);

  if (!progress.allRequiredApproved) {
    const reviewMap = new Map(reviews.map((r) => [r.section_key, r.status]));
    const missing = sectionKeys.filter(
      (k) => REQUIRED_SECTIONS.has(k) && reviewMap.get(k) !== "approved"
    );
    return NextResponse.json(
      {
        error: "All required sections must be approved before certifying.",
        missing_sections: missing,
      },
      { status: 400 }
    );
  }

  const certifiedBy = ctx.displayName ?? ctx.email ?? "Unknown reviewer";

  try {
    const updated = await certifyRegistryProcedure(slug, certifiedBy, body.notes);
    const runtimeWarning =
      updated.runtime_enabled || updated.is_live
        ? "runtime_enabled is set on this procedure. It may go live in BroBot after the next CasePrep server restart."
        : undefined;
    return NextResponse.json({ ...updated, ...(runtimeWarning ? { _warning: runtimeWarning } : {}) });
  } catch (err) {
    if (err instanceof CasePrepRegistryNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof CasePrepRegistryUpstreamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Certification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
