import { redirect } from "next/navigation";
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from "@/lib/caseprep-review/access-control";
import {
  fetchAnkiKgReviewDashboard,
  type AnkiKgReviewFilters,
} from "@/lib/education/anki-kg-review";
import { isKgAutomationEnabled } from "@/lib/config/automation";
import { AnkiKgReviewDashboard } from "@/components/anki-kg-review/AnkiKgReviewDashboard";

export const dynamic = "force-dynamic";

function readFilters(searchParams: Record<string, string | string[] | undefined>): AnkiKgReviewFilters {
  const read = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  };

  return {
    batchId: read("batchId"),
    runId: read("runId"),
    deckBranch: read("deckBranch"),
    tag: read("tag"),
    confidenceBand: (read("confidenceBand") as AnkiKgReviewFilters["confidenceBand"]) ?? "all",
    mappedState: (read("mappedState") as AnkiKgReviewFilters["mappedState"]) ?? "all",
    sourceTagMode: (read("sourceTagMode") as AnkiKgReviewFilters["sourceTagMode"]) ?? "all",
    curriculumNodeSlug: read("curriculumNodeSlug"),
    reviewStatus: read("reviewStatus"),
  };
}

export default async function AnkiKgReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isKgAutomationEnabled()) {
    return (
      <div className="mx-auto mt-24 max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Review Dashboard Disabled</h1>
        <p className="mt-2 text-sm text-gray-600">
          This Anki KG review surface is committed for internal workflows, but production keeps it
          disabled unless <code>ENABLE_KG_AUTOMATION=true</code> is set.
        </p>
      </div>
    );
  }

  let ctx;
  try {
    ctx = await requireCasePrepReviewer();
  } catch (err) {
    if (err instanceof CasePrepReviewAuthError) {
      if (err.status === 401) {
        redirect("/auth/login?next=/admin/anki-kg-review");
      }
      return (
        <div className="mx-auto mt-24 max-w-md px-4 text-center">
          <h1 className="text-xl font-bold text-gray-800">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-500">{err.message}</p>
        </div>
      );
    }
    throw err;
  }

  const filters = readFilters(await searchParams);

  try {
    const initialData = await fetchAnkiKgReviewDashboard(filters);
    return (
      <AnkiKgReviewDashboard
        initialData={initialData}
        reviewerName={ctx.displayName}
        reviewerRole={ctx.role}
      />
    );
  } catch (err) {
    return (
      <div className="mx-auto mt-24 max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Review Dashboard Unavailable</h1>
        <p className="mt-2 text-sm text-gray-600">
          {err instanceof Error ? err.message : "Unable to load the Anki KG review dashboard."}
        </p>
      </div>
    );
  }
}
