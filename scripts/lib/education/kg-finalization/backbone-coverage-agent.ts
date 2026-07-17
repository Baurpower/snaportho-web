import type { GraphFinalizationAgent, GraphFinalizationAgentReport } from "./types.ts";
import { emptyResult } from "./types.ts";
import { normalizeText } from "./utils.ts";

type BackboneCoverageArtifacts = {
  coverage_report: Record<string, unknown>;
  missing_domains: Array<Record<string, unknown>>;
  weak_domains: Array<Record<string, unknown>>;
};

type DomainRule = {
  domain: string;
  matcher: (inputText: string, entityTypes: Set<string>, predicates: Set<string>) => boolean;
};

function rulesForNeighborhood(topic: string): DomainRule[] {
  const fracture = topic.includes("fracture");
  if (fracture) {
    return [
      { domain: "anatomy", matcher: (_, types, predicates) => types.has("anatomy_structure") || predicates.has("involves_anatomy") },
      { domain: "imaging", matcher: (_, types, predicates) => types.has("diagnostic_test") || predicates.has("requires_imaging") },
      { domain: "classification", matcher: (_, types, predicates) => types.has("classification_system") || predicates.has("has_classification") },
      { domain: "treatment", matcher: (_, types, predicates) => types.has("procedure") || predicates.has("indicates_treatment") },
      { domain: "complications", matcher: (_, types, predicates) => types.has("complication") || predicates.has("has_complication") },
    ];
  }
  if (topic.includes("carpal") || topic.includes("tunnel") || topic.includes("nerve") || topic.includes("compression")) {
    return [
      { domain: "anatomy", matcher: (_, types, predicates) => types.has("anatomy_structure") || predicates.has("involves_anatomy") },
      { domain: "exam", matcher: (_, types, predicates) => types.has("exam_maneuver") || predicates.has("tested_by") },
      { domain: "electrodiagnostics", matcher: (text, types) => text.includes("electrodiagnostic") || text.includes("edx") || types.has("diagnostic_test") },
      { domain: "nonoperative_treatment", matcher: (text) => text.includes("splint") || text.includes("injection") || text.includes("nonoperative") },
      { domain: "operative_treatment", matcher: (text, types) => text.includes("release") || types.has("procedure") },
      { domain: "postoperative_or_rehab", matcher: (text) => text.includes("postoperative") || text.includes("return to work") || text.includes("rehab") },
      { domain: "revision_or_failed_release", matcher: (text) => text.includes("revision") || text.includes("persistent") || text.includes("recurrent") },
    ];
  }
  return [
    { domain: "anatomy", matcher: (_, types, predicates) => types.has("anatomy_structure") || predicates.has("involves_anatomy") },
    { domain: "diagnosis", matcher: (_, types, predicates) => types.has("diagnostic_test") || predicates.has("tested_by") },
    { domain: "treatment", matcher: (_, types, predicates) => types.has("procedure") || predicates.has("treated_by") },
    { domain: "complications", matcher: (_, types, predicates) => types.has("complication") || predicates.has("has_complication") },
  ];
}

export const BackboneCoverageAgent: GraphFinalizationAgent<BackboneCoverageArtifacts> = {
  name: "BackboneCoverageAgent",
  run(input): GraphFinalizationAgentReport<BackboneCoverageArtifacts> {
    const result = emptyResult();
    const artifacts: BackboneCoverageArtifacts = {
      coverage_report: {},
      missing_domains: [],
      weak_domains: [],
    };
    const topicText = normalizeText(
      [
        input.neighborhoodId,
        input.neighborhoodMetadata.displayName,
        ...input.entities.map((entity) => `${entity.slug} ${entity.preferredLabel} ${entity.entityType}`),
        ...input.claims.map((claim) => claim.claimText),
        ...input.decisionPoints.map((point) => `${point.trigger} ${point.action}`),
      ].join(" ")
    );
    const entityTypes = new Set(input.entities.map((entity) => String(entity.entityType)));
    const predicates = new Set(input.relationships.map((relationship) => relationship.predicate));
    const rules = rulesForNeighborhood(topicText);
    const domainResults = rules.map((rule) => {
      const present = rule.matcher(topicText, entityTypes, predicates);
      return { domain: rule.domain, present };
    });

    for (const domainResult of domainResults) {
      if (!domainResult.present) {
        artifacts.missing_domains.push({
          ...domainResult,
          requiredAction: "Add or justify omitted backbone coverage before publication.",
        });
        result.escalations.push({
          id: `coverage-missing-${domainResult.domain}`,
          fingerprint: `coverage|${domainResult.domain}`,
          objectKind: "entity",
          agent: this.name,
          severity: "MODERATE",
          reason: `Expected neighborhood backbone domain is absent: ${domainResult.domain}.`,
          reviewer: "curator",
          suggestedAction: "Confirm whether this is a deliberate omission or missing generated content.",
        });
      }
    }

    const weakDomains = domainResults.filter((domain) => domain.present).filter((domain) => {
      if (domain.domain === "exam") return input.relationships.filter((relationship) => relationship.predicate === "tested_by").length < 2;
      if (domain.domain === "complications") return input.entities.filter((entity) => entity.entityType === "complication").length < 2;
      return false;
    });
    artifacts.weak_domains = weakDomains.map((domain) => ({
      ...domain,
      reason: "Domain exists but may be underconnected or thin for publication-grade coverage.",
    }));

    artifacts.coverage_report = {
      neighborhoodId: input.neighborhoodId,
      domains: domainResults,
      presentDomains: domainResults.filter((domain) => domain.present).length,
      missingDomains: artifacts.missing_domains.length,
      weakDomains: artifacts.weak_domains.length,
      note: "Backbone coverage is an omission detector, not a template enforcer.",
    };

    return { agent: this.name, generatedAt: new Date().toISOString(), result, artifacts };
  },
};
