import { evaluateReadinessGates } from "./readiness-gates.ts";
import { dedupeRootCauses } from "./root-cause-deduper.ts";
import type { GraphFinalizationAgent, GraphFinalizationAgentReport } from "./types.ts";
import { emptyResult } from "./types.ts";

type PublicationArtifacts = {
  publication_readiness: Record<string, unknown>;
  blocker_report: Array<Record<string, unknown>>;
  maturity_report: Record<string, unknown>;
  staging_readiness: Record<string, unknown>;
  blocker_root_causes: Array<Record<string, unknown>>;
};

export const PublicationReadinessAgent: GraphFinalizationAgent<PublicationArtifacts> = {
  name: "PublicationReadinessAgent",
  run(input, context): GraphFinalizationAgentReport<PublicationArtifacts> {
    const result = emptyResult();
    const rootCauses = dedupeRootCauses(context.reports);
    const gates = evaluateReadinessGates(input, context.reports, rootCauses);
    const maturityEstimate = Math.max(1, Math.min(5, 5 - gates.staging_blockers.length - Math.ceil(gates.publication_blockers.length / 3)));

    const artifacts: PublicationArtifacts = {
      blocker_root_causes: rootCauses,
      blocker_report: rootCauses,
      staging_readiness: {
        ready_for_staged_manufacturing: gates.ready_for_staged_manufacturing,
        staging_blockers: gates.staging_blockers,
        unique_staging_blockers: gates.staging_blockers.length,
        affected_objects: gates.staging_blockers.reduce((sum, blocker) => sum + blocker.affected_objects, 0),
      },
      publication_readiness: {
        ready_for_publication: gates.ready_for_publication,
        ready_for_staged_manufacturing: gates.ready_for_staged_manufacturing,
        staging_blockers: gates.staging_blockers,
        publication_blockers: gates.publication_blockers,
        unique_publication_blockers: gates.publication_blockers.length,
        affected_objects: gates.publication_blockers.reduce((sum, blocker) => sum + blocker.affected_objects, 0),
      },
      maturity_report: {
        estimatedMaturityLevel: maturityEstimate,
        basis: "Calibrated staging/publication root-cause blockers over compiler/post-review artifacts.",
        uniqueStagingBlockers: gates.staging_blockers.length,
        uniquePublicationBlockers: gates.publication_blockers.length,
        warnings: gates.warnings,
        validDeferrals: gates.valid_deferrals,
        limitations: [
          "This is a report-only maturity estimate.",
          "It does not certify clinical truth.",
          "It does not mutate staging or production KG state.",
        ],
      },
    };

    result.metrics.publicationBlockersDetected = gates.publication_blockers.length;
    if (!gates.ready_for_staged_manufacturing) {
      result.escalations.push({
        id: "staging-readiness-blocked",
        fingerprint: `staging|${input.neighborhoodId}`,
        objectKind: "entity",
        agent: this.name,
        severity: "HIGH",
        disposition: "ACTION_REQUIRED",
        reason: `Staged manufacturing blocked by ${gates.staging_blockers.length} unique root-cause issue(s).`,
        reviewer: "curator",
        suggestedAction: "Resolve staging-readiness root causes before staging.",
      });
    }

    return { agent: this.name, generatedAt: new Date().toISOString(), result, artifacts };
  },
};
