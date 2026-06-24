import { NextRequest, NextResponse } from "next/server";
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";
import { updateRegistrySection } from "@/lib/caseprep-review/client";
import {
  CasePrepRegistryNotFoundError,
  CasePrepRegistryUpstreamError,
} from "@/lib/caseprep-review/client";
import { EDITOR_ROLES } from "@/lib/caseprep-review/constants";
import type { ClinicalSectionItem } from "@/lib/caseprep-review/types";

type RouteContext = { params: Promise<{ slug: string; sectionKey: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
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

  if (!EDITOR_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: "Editing requires resident_reviewer role or above." },
      { status: 403 }
    );
  }

  let body: { items?: ClinicalSectionItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  try {
    const result = await updateRegistrySection(slug, sectionKey, body.items);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CasePrepRegistryNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof CasePrepRegistryUpstreamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Section update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
