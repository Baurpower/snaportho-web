import type { NeighborhoodRelationship } from "../kg-compiler/types.ts";
import type { GraphFinalizationAgent, GraphFinalizationAgentReport } from "./types.ts";
import { emptyResult } from "./types.ts";
import { entityLabel, findEntity, normalizeText, relationshipFingerprint } from "./utils.ts";

type RelationshipNormalizationArtifacts = {
  relationship_revisions: Array<Record<string, unknown>>;
  decision_point_conversions: Array<Record<string, unknown>>;
  rejected_relationships: Array<Record<string, unknown>>;
};

function isPersistentOrRecurrentFailedRelease(slug: string): boolean {
  const normalized = normalizeText(slug);
  return (
    normalized.includes("persistent carpal tunnel") ||
    normalized.includes("recurrent carpal tunnel") ||
    normalized.includes("failed release")
  );
}

function isRevisionRelease(slug: string): boolean {
  const normalized = normalizeText(slug);
  return normalized.includes("revision") && normalized.includes("release");
}

export const RelationshipNormalizationAgent: GraphFinalizationAgent<RelationshipNormalizationArtifacts> = {
  name: "RelationshipNormalizationAgent",
  run(input): GraphFinalizationAgentReport<RelationshipNormalizationArtifacts> {
    const result = emptyResult();
    const artifacts: RelationshipNormalizationArtifacts = {
      relationship_revisions: [],
      decision_point_conversions: [],
      rejected_relationships: [],
    };

    for (const relationship of input.relationships) {
      const fingerprint = relationshipFingerprint(relationship);
      const subject = findEntity(input, relationship.subjectSlug);
      const object = findEntity(input, relationship.objectSlug);
      const subjectLabel = entityLabel(input, relationship.subjectSlug);
      const objectLabel = entityLabel(input, relationship.objectSlug);

      if (
        relationship.predicate === "treated_by" &&
        isPersistentOrRecurrentFailedRelease(`${relationship.subjectSlug} ${subjectLabel}`) &&
        isRevisionRelease(`${relationship.objectSlug} ${objectLabel}`)
      ) {
        const replacement = {
          remove: relationship,
          add: [
            {
              subjectSlug: relationship.subjectSlug,
              predicate: "evaluated_by",
              objectSlug: "failed-release-evaluation-pathway",
            },
            {
              subjectSlug: "failed-release-evaluation-pathway",
              predicate: "may_lead_to",
              objectSlug: relationship.objectSlug,
            },
          ],
          note: "Represent failed-release revision as a decision pathway instead of an unconditional treatment edge.",
        };
        artifacts.decision_point_conversions.push({
          fingerprint,
          reason: replacement.note,
          before: relationship,
          after: replacement.add,
        });
        result.modified.push({
          fingerprint,
          objectKind: "relationship",
          agent: this.name,
          reason: replacement.note,
          before: relationship,
          after: replacement,
          confidence: 0.94,
        });
        result.metrics.relationshipsNormalized += 1;
        continue;
      }

      if (
        relationship.predicate === "uses_implant" &&
        (object?.entityType !== "implant" || /instrument|set|tray|knife|scissor|retractor/i.test(`${relationship.objectSlug} ${objectLabel}`))
      ) {
        artifacts.rejected_relationships.push({
          fingerprint,
          reason: "Instrument sets and operative tools are not implants.",
          relationship,
          subjectType: subject?.entityType ?? null,
          objectType: object?.entityType ?? null,
        });
        result.rejected.push({
          fingerprint,
          objectKind: "relationship",
          agent: this.name,
          reason: "Rejected invalid implant relationship.",
          before: relationship,
        });
        result.metrics.relationshipsNormalized += 1;
        result.metrics.unsupportedEdgesRemoved += 1;
        continue;
      }

      if (
        relationship.predicate === "differential_for" &&
        /fracture|dislocation/i.test(`${relationship.subjectSlug} ${subjectLabel} ${relationship.objectSlug} ${objectLabel}`) &&
        /carpal tunnel/i.test(`${input.neighborhoodId} ${subjectLabel} ${objectLabel}`)
      ) {
        artifacts.rejected_relationships.push({
          fingerprint,
          reason: "Fracture-style differential edge is unsafe/noisy for the CTS neighborhood.",
          relationship,
        });
        result.rejected.push({
          fingerprint,
          objectKind: "relationship",
          agent: this.name,
          reason: "Rejected unsafe generic fracture-style CTS relationship.",
          before: relationship,
        });
        result.metrics.relationshipsNormalized += 1;
        result.metrics.unsupportedEdgesRemoved += 1;
        continue;
      }

      if (relationship.predicate === "treated_by") {
        const revised: NeighborhoodRelationship = {
          ...relationship,
          metadata: {
            ...(relationship.metadata ?? {}),
            finalization_qualifier:
              "Treatment relationship requires indication context and must not be interpreted as a default pathway.",
            review_status: "needs_review",
          },
        };
        artifacts.relationship_revisions.push({
          fingerprint,
          reason: "Broad treated_by edge retained only with explicit non-default pathway qualifier.",
          before: relationship,
          after: revised,
        });
        result.modified.push({
          fingerprint,
          objectKind: "relationship",
          agent: this.name,
          reason: "Added qualifier to broad treatment relationship.",
          before: relationship,
          after: revised,
          confidence: 0.72,
        });
        result.metrics.relationshipsNormalized += 1;
      }
    }

    return { agent: this.name, generatedAt: new Date().toISOString(), result, artifacts };
  },
};
