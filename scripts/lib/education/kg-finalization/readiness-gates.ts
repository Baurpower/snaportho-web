import type { RootCauseBlocker } from "./root-cause-deduper.ts";
import type { GraphFinalizationAgentReport, GraphFinalizationInput } from "./types.ts";

export type ReadinessGateResult = {
  ready_for_staged_manufacturing: boolean;
  ready_for_publication: boolean;
  staging_blockers: RootCauseBlocker[];
  publication_blockers: RootCauseBlocker[];
  valid_deferrals: number;
  warnings: number;
};

export function evaluateReadinessGates(
  input: GraphFinalizationInput,
  reports: GraphFinalizationAgentReport[],
  rootCauses: RootCauseBlocker[]
): ReadinessGateResult {
  const stagingBlockers = rootCauses.filter((blocker) => blocker.staging_blocker);
  const publicationBlockers = rootCauses.filter((blocker) => blocker.publication_blocker);
  const reviewOverlayConsumable = Boolean(input.neighborhoodMetadata.reviewOverlayApplied || input.priorReviewDecisions.length > 0);
  if (!reviewOverlayConsumable) {
    stagingBlockers.push({
      blocker_id: "review-overlay-not-consumed",
      category: "SYSTEM_BLOCKER",
      severity: "HIGH",
      root_cause: "unconsumed review overlay",
      affected_objects: 1,
      unique_underlying_problem: "Finalization input does not include prior review decisions or a post-review overlay marker.",
      recommended_action: "Run finalization with --post-review-input or --prior-review.",
      staging_blocker: true,
      publication_blocker: true,
      object_fingerprints: [`neighborhood|${input.neighborhoodId}`],
    });
  }

  const warnings = reports.flatMap((report) => report.result.warnings);
  return {
    ready_for_staged_manufacturing: stagingBlockers.length === 0,
    ready_for_publication: stagingBlockers.length === 0 && publicationBlockers.length === 0,
    staging_blockers: stagingBlockers,
    publication_blockers: publicationBlockers,
    valid_deferrals: warnings.filter((warning) => warning.disposition === "VALID_DEFER").length,
    warnings: warnings.filter((warning) => warning.disposition !== "VALID_DEFER").length,
  };
}
