import { validateRelationshipTriple } from "../kg-relationship-registry.ts";
import type { GraphFinalizationAgent, GraphFinalizationAgentReport } from "./types.ts";
import { emptyResult } from "./types.ts";
import { findEntity, relationshipFingerprint } from "./utils.ts";

type OntologyConstraintArtifacts = {
  illegal_triples: Array<Record<string, unknown>>;
  type_violations: Array<Record<string, unknown>>;
  predicate_violations: Array<Record<string, unknown>>;
};

export const OntologyConstraintAgent: GraphFinalizationAgent<OntologyConstraintArtifacts> = {
  name: "OntologyConstraintAgent",
  run(input): GraphFinalizationAgentReport<OntologyConstraintArtifacts> {
    const result = emptyResult();
    const artifacts: OntologyConstraintArtifacts = {
      illegal_triples: [],
      type_violations: [],
      predicate_violations: [],
    };

    for (const relationship of input.relationships) {
      const subject = findEntity(input, relationship.subjectSlug);
      const object = findEntity(input, relationship.objectSlug);
      const fingerprint = relationshipFingerprint(relationship);
      const validation = validateRelationshipTriple({
        subjectEndpointType: "canonical_entity",
        predicate: relationship.predicate,
        objectEndpointType: "canonical_entity",
        subjectEntityType: subject?.entityType ?? null,
        objectEntityType: object?.entityType ?? null,
      });
      if (validation.valid && subject && object) {
        result.approved.push({
          fingerprint,
          objectKind: "relationship",
          agent: this.name,
          reason: "Relationship satisfies the canonical predicate registry.",
        });
        continue;
      }

      const payload = {
        fingerprint,
        relationship,
        subjectEntityType: subject?.entityType ?? null,
        objectEntityType: object?.entityType ?? null,
        errors: [
          ...validation.errors,
          ...(subject ? [] : [`Unknown subject entity slug: ${relationship.subjectSlug}`]),
          ...(object ? [] : [`Unknown object entity slug: ${relationship.objectSlug}`]),
        ],
      };

      artifacts.illegal_triples.push(payload);
      if (!input.predicateRegistry[relationship.predicate]) {
        artifacts.predicate_violations.push(payload);
      } else {
        artifacts.type_violations.push(payload);
      }
      result.rejected.push({
        fingerprint,
        objectKind: "relationship",
        agent: this.name,
        reason: payload.errors.join(" "),
        before: relationship,
      });
      result.escalations.push({
        id: `ontology-${fingerprint}`,
        fingerprint,
        objectKind: "relationship",
        agent: this.name,
        severity: "HIGH",
        reason: "Illegal relationship triple must be removed, revised, or routed before publication.",
        reviewer: "curator",
        suggestedAction: "Revise predicate or endpoint identity/type; do not publish as-is.",
      });
      result.metrics.publicationBlockersDetected += 1;
    }

    return { agent: this.name, generatedAt: new Date().toISOString(), result, artifacts };
  },
};
