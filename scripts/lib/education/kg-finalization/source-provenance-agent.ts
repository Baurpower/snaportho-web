import { missingDraftProvenance, missingPublicationProvenance, provenanceRequirementMatrix } from "./provenance-requirements.ts";
import type { GraphFinalizationAgent, GraphFinalizationAgentReport } from "./types.ts";
import { emptyResult } from "./types.ts";
import { claimFingerprint, decisionPointFingerprint, entityFingerprint, relationshipFingerprint } from "./utils.ts";

type SourceProvenanceArtifacts = {
  unsupported_objects: Array<Record<string, unknown>>;
  provenance_report: Record<string, unknown>;
  orphan_evidence: Array<Record<string, unknown>>;
  lost_mapping_report: Record<string, unknown>;
};

export const SourceProvenanceAgent: GraphFinalizationAgent<SourceProvenanceArtifacts> = {
  name: "SourceProvenanceAgent",
  run(input): GraphFinalizationAgentReport<SourceProvenanceArtifacts> {
    const result = emptyResult();
    const artifacts: SourceProvenanceArtifacts = {
      unsupported_objects: [],
      provenance_report: {},
      orphan_evidence: [],
      lost_mapping_report: {},
    };

    const objects = [
      ...input.entities.map((object) => ({ kind: "entity" as const, fingerprint: entityFingerprint(object), object })),
      ...input.relationships.map((object) => ({ kind: "relationship" as const, fingerprint: relationshipFingerprint(object), object })),
      ...input.claims.map((object) => ({ kind: "claim" as const, fingerprint: claimFingerprint(object), object })),
      ...input.decisionPoints.map((object) => ({ kind: "decision_point" as const, fingerprint: decisionPointFingerprint(object), object })),
    ];

    const linkedFingerprints = new Set<string>();
    for (const item of objects) {
      linkedFingerprints.add(item.fingerprint);
      const draftMissing = missingDraftProvenance(item.kind, item.object as Record<string, unknown>);
      const publicationMissing = missingPublicationProvenance(item.kind, item.object as Record<string, unknown>);

      if (draftMissing.length === 0 && publicationMissing.length === 0) {
        result.approved.push({
          fingerprint: item.fingerprint,
          objectKind: item.kind,
          agent: this.name,
          reason: "Object contains publication-grade provenance fields.",
        });
        continue;
      }

      artifacts.unsupported_objects.push({
        fingerprint: item.fingerprint,
        objectKind: item.kind,
        missingDraftFields: draftMissing,
        missingPublicationFields: publicationMissing,
        stagingTraceabilitySufficient: draftMissing.length === 0,
        object: item.object,
      });

      if (draftMissing.length > 0) {
        result.escalations.push({
          id: `provenance-draft-${item.fingerprint}`,
          fingerprint: item.fingerprint,
          objectKind: item.kind,
          agent: this.name,
          severity: item.kind === "relationship" || item.kind === "claim" ? "HIGH" : "MODERATE",
          disposition: "ACTION_REQUIRED",
          reason: `Object is missing draft/staging traceability fields: ${draftMissing.join(", ")}.`,
          reviewer: "curator",
          suggestedAction: "Attach minimum draft provenance before staging.",
        });
        if (item.kind === "relationship" || item.kind === "claim") result.metrics.publicationBlockersDetected += 1;
      } else if (publicationMissing.length > 0) {
        result.warnings.push({
          id: `provenance-publication-${item.fingerprint}`,
          fingerprint: item.fingerprint,
          agent: this.name,
          severity: "MODERATE",
          disposition: "VALID_DEFER",
          message: `Publication-only provenance still missing: ${publicationMissing.join(", ")}.`,
        });
      }
    }

    const evidenceFingerprints = new Set(input.sourceManifest.flatMap((source) => source.objectFingerprints ?? []));
    artifacts.orphan_evidence = input.sourceManifest
      .filter((source) => (source.objectFingerprints ?? []).every((fingerprint) => !linkedFingerprints.has(fingerprint)))
      .map((source) => ({
        sourceIdentifier: source.sourceIdentifier,
        sourceTitle: source.sourceTitle,
        reason: "Evidence source is present in the manifest but no generated object currently consumes its fingerprint mapping.",
      }));

    artifacts.lost_mapping_report = {
      sourceManifestEntries: input.sourceManifest.length,
      manifestObjectFingerprints: evidenceFingerprints.size,
      generatedObjectsWithAnySource: linkedFingerprints.size,
      generatedObjects: objects.length,
      unsupportedObjects: artifacts.unsupported_objects.length,
      note:
        input.sourceManifest.length === 0
          ? "No external source manifest was supplied to finalization."
          : "Counts compare manifest fingerprints to generated object provenance.",
    };
    artifacts.provenance_report = {
      requirementMatrix: provenanceRequirementMatrix(),
      totals: {
        entities: input.entities.length,
        relationships: input.relationships.length,
        claims: input.claims.length,
        decisionPoints: input.decisionPoints.length,
        objectsMissingDraftMinimum: artifacts.unsupported_objects.filter((item) => (item.missingDraftFields as unknown[]).length > 0).length,
        objectsMissingPublicationMinimum: artifacts.unsupported_objects.filter((item) => (item.missingPublicationFields as unknown[]).length > 0).length,
        orphanEvidence: artifacts.orphan_evidence.length,
      },
      byKind: artifacts.unsupported_objects.reduce<Record<string, number>>((acc, item) => {
        acc[String(item.objectKind)] = (acc[String(item.objectKind)] ?? 0) + 1;
        return acc;
      }, {}),
    };

    if (input.sourceManifest.length === 0) {
      result.warnings.push({
        id: "provenance-missing-source-manifest",
        agent: this.name,
        severity: "MODERATE",
        disposition: "SYSTEM_BLOCKER",
        message: "Compiler/finalization input lacks a record-level source manifest; publication provenance must be reconciled before certification.",
      });
    }

    return { agent: this.name, generatedAt: new Date().toISOString(), result, artifacts };
  },
};
