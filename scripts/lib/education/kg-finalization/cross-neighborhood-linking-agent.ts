import type { GraphFinalizationAgent, GraphFinalizationAgentReport } from "./types.ts";
import { emptyResult } from "./types.ts";
import { entityFingerprint, normalizeText } from "./utils.ts";

type CrossNeighborhoodArtifacts = {
  ownership_map: Array<Record<string, unknown>>;
  cross_neighborhood_links: Array<Record<string, unknown>>;
  duplicate_prevention_report: Record<string, unknown>;
};

function suggestedOwner(entityType: string): string {
  if (entityType === "anatomy_structure") return "shared-anatomy";
  if (entityType === "diagnostic_test" || entityType === "exam_maneuver") return "diagnostics-and-exam";
  if (entityType === "surgical_approach" || entityType === "surgical_positioning") return "shared-operative-technique";
  if (entityType === "complication") return "shared-complications";
  return "owning-clinical-neighborhood";
}

export const CrossNeighborhoodLinkingAgent: GraphFinalizationAgent<CrossNeighborhoodArtifacts> = {
  name: "CrossNeighborhoodLinkingAgent",
  run(input): GraphFinalizationAgentReport<CrossNeighborhoodArtifacts> {
    const result = emptyResult();
    const artifacts: CrossNeighborhoodArtifacts = {
      ownership_map: [],
      cross_neighborhood_links: [],
      duplicate_prevention_report: {},
    };

    for (const entity of input.entities) {
      const fingerprint = entityFingerprint(entity);
      const owner = suggestedOwner(String(entity.entityType));
      artifacts.ownership_map.push({
        fingerprint,
        slug: entity.slug,
        label: entity.preferredLabel,
        entityType: entity.entityType,
        suggestedOwner: owner,
        currentNeighborhood: input.neighborhoodId,
      });

      const externalMatches = input.canonicalRegistry.filter(
        (entry) =>
          normalizeText(entry.preferredLabel) === normalizeText(entity.preferredLabel) &&
          entry.slug !== entity.slug &&
          entry.neighborhoodId &&
          entry.neighborhoodId !== input.neighborhoodId
      );
      for (const match of externalMatches) {
        artifacts.cross_neighborhood_links.push({
          fingerprint,
          proposedSlug: entity.slug,
          externalCanonicalSlug: match.slug,
          externalNeighborhoodId: match.neighborhoodId,
          action: "reuse_or_link_existing_cross_neighborhood_identity",
        });
        result.modified.push({
          fingerprint,
          objectKind: "entity",
          agent: this.name,
          reason: "Generated entity matches an existing cross-neighborhood canonical identity.",
          before: entity,
          after: match,
          confidence: 0.95,
        });
        result.metrics.duplicatesPrevented += 1;
      }
    }

    artifacts.duplicate_prevention_report = {
      generatedEntities: input.entities.length,
      crossNeighborhoodLinkCandidates: artifacts.cross_neighborhood_links.length,
      sharedOwners: artifacts.ownership_map.reduce<Record<string, number>>((acc, item) => {
        acc[String(item.suggestedOwner)] = (acc[String(item.suggestedOwner)] ?? 0) + 1;
        return acc;
      }, {}),
    };

    return { agent: this.name, generatedAt: new Date().toISOString(), result, artifacts };
  },
};
