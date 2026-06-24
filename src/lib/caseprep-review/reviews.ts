import { createClient } from "@/utils/supabase/server";
import type { CasePrepSectionReview, SectionReviewStatus } from "./types";

export type { ReviewProgress } from "./review-utils";
export { computeReviewProgress } from "./review-utils";

export async function fetchSectionReviews(
  procedureSlug: string
): Promise<CasePrepSectionReview[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("caseprep_section_reviews")
    .select(
      "id, procedure_slug, section_key, reviewer_id, status, comment, reviewed_at, updated_at"
    )
    .eq("procedure_slug", procedureSlug);

  if (error) {
    console.error("[fetchSectionReviews] Supabase error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to fetch section reviews: ${error.message}`);
  }

  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Fetch display names for all distinct reviewer IDs in one query.
  const reviewerIds = [...new Set(rows.map((r) => r.reviewer_id))];
  const { data: reviewerRows } = await supabase
    .from("caseprep_reviewers")
    .select("user_id, display_name")
    .in("user_id", reviewerIds);

  const displayNameMap = new Map(
    (reviewerRows ?? []).map((r) => [r.user_id, r.display_name as string | null])
  );

  return rows.map((row) => ({
    id: row.id,
    procedure_slug: row.procedure_slug,
    section_key: row.section_key,
    reviewer_id: row.reviewer_id,
    reviewer_display_name: displayNameMap.get(row.reviewer_id) ?? null,
    status: row.status as SectionReviewStatus,
    comment: row.comment ?? null,
    reviewed_at: row.reviewed_at,
    updated_at: row.updated_at,
  }));
}

export async function upsertSectionReview(
  procedureSlug: string,
  sectionKey: string,
  reviewerId: string,
  status: SectionReviewStatus,
  comment?: string,
  reviewerDisplayName?: string | null
): Promise<CasePrepSectionReview> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const commentVal = comment?.trim() || null;

  // Check whether a review row already exists for this (procedure_slug, section_key) pair.
  const { data: existing, error: selectError } = await supabase
    .from("caseprep_section_reviews")
    .select("id")
    .eq("procedure_slug", procedureSlug)
    .eq("section_key", sectionKey)
    .maybeSingle();

  if (selectError) {
    console.error("[upsertSectionReview] SELECT error:", {
      message: selectError.message,
      code: selectError.code,
      details: selectError.details,
      hint: selectError.hint,
      procedureSlug,
      sectionKey,
    });
    throw new Error(`Failed to check existing review: ${selectError.message}`);
  }

  let row: {
    id: string;
    procedure_slug: string;
    section_key: string;
    reviewer_id: string;
    status: string;
    comment: string | null;
    reviewed_at: string;
    updated_at: string;
  } | null = null;

  if (existing) {
    // UPDATE the existing row (any active reviewer may overwrite per RLS policy).
    const { data: updated, error: updateError } = await supabase
      .from("caseprep_section_reviews")
      .update({
        reviewer_id: reviewerId,
        status,
        comment: commentVal,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id, procedure_slug, section_key, reviewer_id, status, comment, reviewed_at, updated_at")
      .single();

    if (updateError || !updated) {
      console.error("[upsertSectionReview] UPDATE error:", {
        message: updateError?.message,
        code: updateError?.code,
        details: updateError?.details,
        hint: updateError?.hint,
        existingId: existing.id,
        procedureSlug,
        sectionKey,
        reviewerId,
        status,
      });
      throw new Error(`Failed to update section review: ${updateError?.message ?? "no data"}`);
    }

    row = updated;
  } else {
    // INSERT a new row.
    const { data: inserted, error: insertError } = await supabase
      .from("caseprep_section_reviews")
      .insert({
        procedure_slug: procedureSlug,
        section_key: sectionKey,
        reviewer_id: reviewerId,
        status,
        comment: commentVal,
        reviewed_at: now,
        updated_at: now,
      })
      .select("id, procedure_slug, section_key, reviewer_id, status, comment, reviewed_at, updated_at")
      .single();

    if (insertError || !inserted) {
      console.error("[upsertSectionReview] INSERT error:", {
        message: insertError?.message,
        code: insertError?.code,
        details: insertError?.details,
        hint: insertError?.hint,
        procedureSlug,
        sectionKey,
        reviewerId,
        status,
      });
      throw new Error(`Failed to insert section review: ${insertError?.message ?? "no data"}`);
    }

    row = inserted;
  }

  return {
    id: row.id,
    procedure_slug: row.procedure_slug,
    section_key: row.section_key,
    reviewer_id: row.reviewer_id,
    reviewer_display_name: reviewerDisplayName ?? null,
    status: row.status as SectionReviewStatus,
    comment: row.comment ?? null,
    reviewed_at: row.reviewed_at,
    updated_at: row.updated_at,
  };
}
