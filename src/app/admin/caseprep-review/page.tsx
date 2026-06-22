import { redirect } from "next/navigation";
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";
import { fetchRegistryIndex } from "@/lib/caseprep-review/client";
import { CasePrepReviewDashboard } from "@/components/caseprep-review/CasePrepReviewDashboard";

export const dynamic = "force-dynamic";

export default async function CasePrepReviewPage() {
  let ctx;
  try {
    ctx = await requireCasePrepReviewer();
  } catch (err) {
    if (err instanceof CasePrepReviewAuthError) {
      if (err.status === 401) {
        redirect("/auth/login?next=/admin/caseprep-review");
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

  let data;
  try {
    data = await fetchRegistryIndex();
  } catch {
    return (
      <div className="max-w-md mx-auto mt-24 text-center px-4">
        <h1 className="text-xl font-bold text-gray-800">Registry Unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">
          Unable to load the CasePrep registry. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <CasePrepReviewDashboard
      data={data}
      reviewerRole={ctx.role}
      reviewerName={ctx.displayName}
    />
  );
}
