import type { GraphFinalizationAgentReport } from "./types.ts";
import { blocksPublication, blocksStaging } from "./severity.ts";

export type RootCauseBlocker = {
  blocker_id: string;
  category: "SYSTEM_BLOCKER" | "ACTION_REQUIRED" | "HUMAN_REVIEW_REQUIRED" | "WARNING" | "VALID_DEFER";
  severity: "INFO" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  root_cause: string;
  affected_objects: number;
  unique_underlying_problem: string;
  recommended_action: string;
  staging_blocker: boolean;
  publication_blocker: boolean;
  object_fingerprints: string[];
};

export function dedupeRootCauses(reports: GraphFinalizationAgentReport[]): RootCauseBlocker[] {
  const grouped = new Map<string, RootCauseBlocker>();

  for (const report of reports) {
    if (report.agent === "SourceProvenanceAgent") {
      const unsupported = (report.artifacts.unsupported_objects as Array<Record<string, unknown>> | undefined) ?? [];
      const draftMissing = unsupported.filter((item) => ((item.missingDraftFields as unknown[]) ?? []).length > 0);
      const publicationMissing = unsupported.filter((item) => ((item.missingPublicationFields as unknown[]) ?? []).length > 0);
      if (draftMissing.length > 0) {
        upsert(grouped, {
          blocker_id: "draft-traceability-missing",
          category: "ACTION_REQUIRED",
          severity: "HIGH",
          root_cause: "missing draft/staging traceability",
          affected_objects: draftMissing.length,
          unique_underlying_problem: "Generated objects are missing lifecycle-minimum traceability fields needed before staging.",
          recommended_action: "Patch compiler/overlay export or source manifest ingestion so draft objects carry minimum traceability.",
          staging_blocker: true,
          publication_blocker: true,
          object_fingerprints: draftMissing.map((item) => String(item.fingerprint)),
        });
      }
      if (publicationMissing.length > 0) {
        upsert(grouped, {
          blocker_id: "record-level-publication-provenance-missing",
          category: "SYSTEM_BLOCKER",
          severity: "HIGH",
          root_cause: "missing publication provenance",
          affected_objects: publicationMissing.length,
          unique_underlying_problem:
            "Compiler/finalization artifacts preserve aggregate or draft provenance but not complete record-level publication provenance.",
          recommended_action: "Export source identifiers, source titles/paths, extraction method, evidence confidence, and approval status before publication.",
          staging_blocker: false,
          publication_blocker: true,
          object_fingerprints: publicationMissing.map((item) => String(item.fingerprint)),
        });
      }
    }

    if (report.agent === "ConnectivityAgent") {
      const orphans = (report.artifacts.orphan_report as Array<Record<string, unknown>> | undefined) ?? [];
      const actionableOrphans = orphans.filter((item) => item.stagingBlocker === true);
      const deferredOrphans = orphans.filter((item) => item.stagingBlocker !== true && item.publicationBlocker === true);
      if (actionableOrphans.length > 0) {
        upsert(grouped, {
          blocker_id: "unresolved-orphan-entities",
          category: "ACTION_REQUIRED",
          severity: "HIGH",
          root_cause: "orphan entity",
          affected_objects: actionableOrphans.length,
          unique_underlying_problem: "Generated entities are disconnected and need explicit disposition before staging.",
          recommended_action: "Link safely, remove placeholder entities, convert to metadata, or document valid deferral.",
          staging_blocker: true,
          publication_blocker: true,
          object_fingerprints: actionableOrphans.map((item) => String(item.fingerprint)),
        });
      }
      if (deferredOrphans.length > 0) {
        upsert(grouped, {
          blocker_id: "deferred-orphan-dispositions",
          category: "VALID_DEFER",
          severity: "MODERATE",
          root_cause: "valid orphan deferral",
          affected_objects: deferredOrphans.length,
          unique_underlying_problem: "Some disconnected entities have explicit defer/remove dispositions and should not block staging.",
          recommended_action: "Confirm ownership/removal before publication.",
          staging_blocker: false,
          publication_blocker: true,
          object_fingerprints: deferredOrphans.map((item) => String(item.fingerprint)),
        });
      }
    }

    if (report.agent === "OntologyConstraintAgent") {
      const illegal = (report.artifacts.illegal_triples as Array<Record<string, unknown>> | undefined) ?? [];
      if (illegal.length > 0) {
        upsert(grouped, {
          blocker_id: "illegal-ontology-triples",
          category: "ACTION_REQUIRED",
          severity: "CRITICAL",
          root_cause: "invalid or unsupported predicate",
          affected_objects: illegal.length,
          unique_underlying_problem: "One or more relationships violate the canonical predicate registry.",
          recommended_action: "Revise predicate, endpoint type, or vocabulary before staging.",
          staging_blocker: true,
          publication_blocker: true,
          object_fingerprints: illegal.map((item) => String(item.fingerprint)),
        });
      }
    }

    for (const escalation of report.result.escalations) {
      if (!blocksStaging(escalation) && !blocksPublication(escalation)) continue;
      if (["SourceProvenanceAgent", "ConnectivityAgent", "OntologyConstraintAgent"].includes(report.agent)) continue;
      upsert(grouped, {
        blocker_id: `${report.agent.toLowerCase()}-${String(escalation.disposition ?? "action").toLowerCase()}`,
        category: escalation.disposition === "HUMAN_REVIEW_REQUIRED" ? "HUMAN_REVIEW_REQUIRED" : "ACTION_REQUIRED",
        severity: escalation.severity,
        root_cause: escalation.reason,
        affected_objects: 1,
        unique_underlying_problem: escalation.reason,
        recommended_action: escalation.suggestedAction,
        staging_blocker: blocksStaging(escalation),
        publication_blocker: blocksPublication(escalation),
        object_fingerprints: [escalation.fingerprint],
      });
    }
  }

  return [...grouped.values()].sort((a, b) => Number(b.staging_blocker) - Number(a.staging_blocker) || b.affected_objects - a.affected_objects);
}

function upsert(grouped: Map<string, RootCauseBlocker>, blocker: RootCauseBlocker): void {
  const current = grouped.get(blocker.blocker_id);
  if (!current) {
    grouped.set(blocker.blocker_id, blocker);
    return;
  }
  current.affected_objects += blocker.affected_objects;
  current.object_fingerprints = [...new Set([...current.object_fingerprints, ...blocker.object_fingerprints])];
  current.staging_blocker ||= blocker.staging_blocker;
  current.publication_blocker ||= blocker.publication_blocker;
}
