import { NextRequest, NextResponse } from "next/server";
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";
import {
  fetchRegistryProcedure,
  updateRegistrySection,
  CasePrepRegistryNotFoundError,
  CasePrepRegistryUpstreamError,
} from "@/lib/caseprep-review/client";
import { BULLET_SECTIONS, EDITOR_ROLES } from "@/lib/caseprep-review/constants";
import type { ClinicalSectionItem } from "@/lib/caseprep-review/types";

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

  if (!EDITOR_ROLES.has(ctx.role)) {
    return NextResponse.json({ error: "Editing requires editor role." }, { status: 403 });
  }

  let body: { fromSectionKey?: string; toSectionKey?: string; bulletText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fromSectionKey, toSectionKey, bulletText } = body;

  if (!fromSectionKey || !toSectionKey || typeof bulletText !== "string") {
    return NextResponse.json(
      { error: "fromSectionKey, toSectionKey, and bulletText are required" },
      { status: 400 }
    );
  }

  if (!BULLET_SECTIONS.has(fromSectionKey) || !BULLET_SECTIONS.has(toSectionKey)) {
    return NextResponse.json(
      { error: "Both sections must be bullet-list sections." },
      { status: 400 }
    );
  }

  if (fromSectionKey === toSectionKey) {
    return NextResponse.json(
      { error: "Source and destination sections must be different." },
      { status: 400 }
    );
  }

  // Fetch current procedure state server-side so we work with the authoritative data.
  let procedure;
  try {
    procedure = await fetchRegistryProcedure(slug);
  } catch (err) {
    if (err instanceof CasePrepRegistryNotFoundError) {
      return NextResponse.json({ error: `Procedure '${slug}' not found.` }, { status: 404 });
    }
    const msg = err instanceof Error ? err.message : "Failed to load procedure";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const fromSection = procedure.sections.find((s) => s.key === fromSectionKey);
  const toSection = procedure.sections.find((s) => s.key === toSectionKey);

  if (!fromSection) {
    return NextResponse.json({ error: `Section '${fromSectionKey}' not found.` }, { status: 404 });
  }
  if (!toSection) {
    return NextResponse.json({ error: `Section '${toSectionKey}' not found.` }, { status: 404 });
  }

  // Find the bullet in the source section by exact text match.
  const bulletIndex = fromSection.items.findIndex(
    (item) => item.kind === "bullet" && item.text === bulletText
  );

  if (bulletIndex === -1) {
    return NextResponse.json(
      { error: "Bullet not found in source section." },
      { status: 404 }
    );
  }

  const bulletItem = fromSection.items[bulletIndex] as Extract<ClinicalSectionItem, { kind: "bullet" }>;

  // Build updated item lists.
  const newFromItems: ClinicalSectionItem[] = fromSection.items.filter((_, i) => i !== bulletIndex);
  const newToItems: ClinicalSectionItem[] = [...toSection.items, bulletItem];

  // PATCH source section first.
  let updatedFrom;
  try {
    updatedFrom = await updateRegistrySection(slug, fromSectionKey, newFromItems);
  } catch (err) {
    console.error("[move-bullet] PATCH source section failed:", {
      slug,
      fromSectionKey,
      message: err instanceof Error ? err.message : String(err),
    });
    if (err instanceof CasePrepRegistryNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof CasePrepRegistryUpstreamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to update source section. Bullet was not moved." },
      { status: 500 }
    );
  }

  // PATCH destination section.
  let updatedTo;
  try {
    updatedTo = await updateRegistrySection(slug, toSectionKey, newToItems);
  } catch (err) {
    console.error("[move-bullet] PATCH destination section failed (source already updated):", {
      slug,
      toSectionKey,
      message: err instanceof Error ? err.message : String(err),
    });
    if (err instanceof CasePrepRegistryNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof CasePrepRegistryUpstreamError) {
      return NextResponse.json(
        {
          error:
            "Bullet was removed from the source section but could not be added to the destination. Please refresh the page.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error:
          "Bullet was removed from the source section but could not be added to the destination. Please refresh the page.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    fromSection: updatedFrom.section,
    toSection: updatedTo.section,
    coverage_score: updatedTo.coverage_score,
    validation_warnings: updatedTo.validation_warnings,
  });
}
