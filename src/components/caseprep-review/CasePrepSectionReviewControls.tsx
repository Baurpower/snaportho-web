"use client";

import { useState } from "react";
import type { CasePrepSectionReview, SectionReviewStatus } from "@/lib/caseprep-review/types";

interface CasePrepSectionReviewControlsProps {
  sectionKey: string;
  procedureSlug: string;
  review: CasePrepSectionReview | null;
  onReviewed: (review: CasePrepSectionReview) => void;
}

export function CasePrepSectionReviewControls({
  sectionKey,
  procedureSlug,
  review,
  onReviewed,
}: CasePrepSectionReviewControlsProps) {
  const [comment, setComment] = useState(review?.comment ?? "");
  const [submitting, setSubmitting] = useState<SectionReviewStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (status: SectionReviewStatus) => {
    if (status === "needs_improvement" && !comment.trim()) {
      setError("A comment is required when marking Needs Improvement.");
      return;
    }
    setSubmitting(status);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/caseprep-review/procedures/${encodeURIComponent(procedureSlug)}/sections/${encodeURIComponent(sectionKey)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, comment: comment.trim() || null }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Review submission failed");
      }
      onReviewed(json.data as CasePrepSectionReview);
      // Keep comment in case reviewer wants to amend
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(null);
    }
  };

  const status = review?.status ?? "unreviewed";
  const reviewerLabel = review?.reviewer_display_name
    ? `${review.reviewer_display_name}`
    : null;
  const reviewedDate = review?.reviewed_at
    ? new Date(review.reviewed_at).toLocaleDateString()
    : null;

  return (
    <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
      {/* Current status */}
      <div className="flex items-center gap-3 text-sm">
        <StatusChip status={status} />
        {reviewerLabel && (
          <span className="text-gray-500">
            {reviewerLabel}
            {reviewedDate ? ` · ${reviewedDate}` : ""}
          </span>
        )}
      </div>

      {/* Comment */}
      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Leave a comment (required for Needs Improvement)…"
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => submit("needs_improvement")}
          disabled={submitting !== null}
          className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            status === "needs_improvement"
              ? "bg-orange-100 border-orange-300 text-orange-800"
              : "bg-white border-gray-300 text-gray-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800"
          }`}
        >
          {submitting === "needs_improvement" ? "Saving…" : "⚑ Needs Improvement"}
        </button>
        <button
          onClick={() => submit("approved")}
          disabled={submitting !== null}
          className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            status === "approved"
              ? "bg-green-100 border-green-300 text-green-800"
              : "bg-white border-gray-300 text-gray-700 hover:border-green-300 hover:bg-green-50 hover:text-green-800"
          }`}
        >
          {submitting === "approved" ? "Saving…" : "✓ Approve Section"}
        </button>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: SectionReviewStatus }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        ✓ Approved
      </span>
    );
  }
  if (status === "needs_improvement") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
        ⚑ Needs Improvement
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      · Not Reviewed
    </span>
  );
}
