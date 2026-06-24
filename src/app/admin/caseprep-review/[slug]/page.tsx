import { redirect, notFound } from "next/navigation";
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";
import {
  CasePrepRegistryNotFoundError,
  fetchRegistryProcedure,
} from "@/lib/caseprep-review/client";
import { fetchSectionReviews } from "@/lib/caseprep-review/reviews";
import { CasePrepProcedureDetail } from "@/components/caseprep-review/CasePrepProcedureDetail";
import type { CasePrepSectionReview } from "@/lib/caseprep-review/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CasePrepProcedurePage({ params }: PageProps) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await requireCasePrepReviewer();
  } catch (err) {
    if (err instanceof CasePrepReviewAuthError) {
      if (err.status === 401) {
        redirect(`/auth/login?next=/admin/caseprep-review/${encodeURIComponent(slug)}`);
      }
      return (
        <div className="max-w-md mx-auto mt-24 text-center px-4">
          <h1 className="text-xl font-bold text-gray-800">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-500">{err.message}</p>
        </div>
      );
    }
    throw err;
  }

  // Load procedure and reviews in parallel
  const [procedureResult, reviewsResult] = await Promise.allSettled([
    fetchRegistryProcedure(slug),
    fetchSectionReviews(slug),
  ]);

  if (procedureResult.status === "rejected") {
    const err = procedureResult.reason;
    if (err instanceof CasePrepRegistryNotFoundError) {
      notFound();
    }
    return (
      <div className="max-w-md mx-auto mt-24 text-center px-4">
        <h1 className="text-xl font-bold text-gray-800">Load Failed</h1>
        <p className="mt-2 text-sm text-gray-500">
          Unable to load this procedure. Please try again later.
        </p>
        <Link
          href="/admin/caseprep-review"
          className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const procedure = procedureResult.value;
  const initialReviews: CasePrepSectionReview[] =
    reviewsResult.status === "fulfilled" ? reviewsResult.value : [];

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <Link
          href="/admin/caseprep-review"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← All Procedures
        </Link>
      </div>
      <CasePrepProcedureDetail
        procedure={procedure}
        initialReviews={initialReviews}
        reviewerRole={ctx.role}
        reviewerName={ctx.displayName}
      />
    </>
  );
}
