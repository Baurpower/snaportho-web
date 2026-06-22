import { createClient } from "@/utils/supabase/server";
import type { CasePrepReviewerContext, CasePrepReviewerRole } from "./types";

const ROLE_RANK: Record<CasePrepReviewerRole, number> = {
  viewer: 0,
  resident_reviewer: 1,
  attending_reviewer: 2,
  certifier: 3,
  content_admin: 4,
};

export class CasePrepReviewAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isReviewerRole(value: string | null | undefined): value is CasePrepReviewerRole {
  return (
    value === "viewer" ||
    value === "resident_reviewer" ||
    value === "attending_reviewer" ||
    value === "certifier" ||
    value === "content_admin"
  );
}

export async function requireCasePrepReviewer(options?: {
  minRole?: CasePrepReviewerRole;
}): Promise<CasePrepReviewerContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new CasePrepReviewAuthError(401, "Authentication required.");
  }

  const { data: reviewer, error: reviewerError } = await supabase
    .from("caseprep_reviewers")
    .select("role, display_name, specialty, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (reviewerError) {
    throw new CasePrepReviewAuthError(500, "Failed to verify reviewer access.");
  }

  if (!reviewer || !isReviewerRole(reviewer.role)) {
    throw new CasePrepReviewAuthError(403, "CasePrep reviewer access required.");
  }

  const role = reviewer.role;
  const minRole = options?.minRole ?? "viewer";
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new CasePrepReviewAuthError(403, "Insufficient CasePrep reviewer permissions.");
  }

  return {
    userId: user.id,
    email: user.email,
    role,
    displayName: reviewer.display_name ?? null,
    specialty: reviewer.specialty ?? null,
  };
}