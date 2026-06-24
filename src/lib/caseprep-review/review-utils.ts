/**
 * Pure client-safe utilities for CasePrep review state.
 * No server imports — safe to use in both Server and Client Components.
 */
import type { CasePrepSectionReview, SectionReviewStatus } from "./types";
import { REQUIRED_SECTIONS } from "./constants";

export type ReviewProgress = {
  approvedCount: number;
  requiredTotal: number;
  allRequiredApproved: boolean;
};

export function computeReviewProgress(
  sectionKeys: string[],
  reviews: CasePrepSectionReview[]
): ReviewProgress {
  const reviewMap = new Map(reviews.map((r) => [r.section_key, r.status as SectionReviewStatus]));
  const requiredKeys = sectionKeys.filter((k) => REQUIRED_SECTIONS.has(k));
  const approvedCount = requiredKeys.filter((k) => reviewMap.get(k) === "approved").length;
  return {
    approvedCount,
    requiredTotal: requiredKeys.length,
    allRequiredApproved: requiredKeys.length > 0 && approvedCount === requiredKeys.length,
  };
}
