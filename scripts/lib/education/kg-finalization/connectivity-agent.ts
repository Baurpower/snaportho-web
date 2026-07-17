import type { GraphFinalizationAgent, GraphFinalizationAgentReport } from "./types.ts";
import { emptyResult } from "./types.ts";
import { resolveHandWristOwnership } from "./profiles/hand-wrist.ts";
import { buildDegreeMap, entityFingerprint, normalizeText } from "./utils.ts";

type ConnectivityArtifacts = {
  orphan_report: Array<Record<string, unknown>>;
  low_degree_report: Array<Record<string, unknown>>;
  connectivity_repairs: Array<Record<string, unknown>>;
};

function repairSuggestion(entityType: string, label: string, primarySlug?: string): string {
  if (entityType === "exam_maneuver") return `Add tested_by or examines edge linking ${label} to the relevant condition/anatomy.`;
  if (entityType === "diagnostic_test") return `Add tested_by/requires_imaging edge linking ${label} to ${primarySlug ?? "the primary condition"}.`;
  if (entityType === "anatomy_structure") return `Add involves_anatomy, part_of, or at_risk_structure edge tying ${label} into the neighborhood.`;
  if (entityType === "procedure") return `Add indicated_for, treats, uses_approach, or complication edges connecting ${label} to the clinical pathway.`;
  if (entityType === "classification_system") return `Add has_classification edge from ${primarySlug ?? "the primary condition"} to ${label}.`;
  return `Add a valid registry relationship connecting ${label} to an existing neighborhood anchor.`;
}

export const ConnectivityAgent: GraphFinalizationAgent<ConnectivityArtifacts> = {
  name: "ConnectivityAgent",
  run(input): GraphFinalizationAgentReport<ConnectivityArtifacts> {
    const result = emptyResult();
    const artifacts: ConnectivityArtifacts = {
      orphan_report: [],
      low_degree_report: [],
      connectivity_repairs: [],
    };
    const degree = buildDegreeMap(input.relationships);
    for (const claim of input.claims) degree.set(claim.primaryEntitySlug, (degree.get(claim.primaryEntitySlug) ?? 0) + 1);
    for (const point of input.decisionPoints) degree.set(point.subjectEntitySlug, (degree.get(point.subjectEntitySlug) ?? 0) + 1);
    const primarySlug = String(input.neighborhoodMetadata.primaryEntitySlug ?? input.neighborhoodId);

    for (const entity of input.entities) {
      const currentDegree = degree.get(entity.slug) ?? 0;
      const fingerprint = entityFingerprint(entity);
      const suggestedFix = repairSuggestion(String(entity.entityType), entity.preferredLabel, primarySlug);
      if (currentDegree === 0) {
        const disposition = classifyOrphan(entity.slug, entity.preferredLabel, String(entity.entityType));
        artifacts.orphan_report.push({
          fingerprint,
          slug: entity.slug,
          label: entity.preferredLabel,
          entityType: entity.entityType,
          issue: "orphan_entity",
          finalDisposition: disposition.finalDisposition,
          canonicalOwner: disposition.canonicalOwner,
          canonicalSlug: disposition.canonicalSlug,
          stagingBlocker: disposition.stagingBlocker,
          publicationBlocker: disposition.publicationBlocker,
          suggestedFix: disposition.suggestedAction ?? suggestedFix,
        });
        artifacts.connectivity_repairs.push({
          fingerprint,
          repairType: "suggested_edge",
          suggestedFix,
          autoApplied: false,
        });
        if (disposition.stagingBlocker) {
          result.escalations.push({
            id: `connectivity-orphan-${entity.slug}`,
            fingerprint,
            objectKind: "entity",
            agent: this.name,
            severity: "HIGH",
            disposition: "ACTION_REQUIRED",
            reason: "Generated entity is isolated from the neighborhood graph.",
            reviewer: "curator",
            suggestedAction: disposition.suggestedAction ?? suggestedFix,
          });
          result.metrics.publicationBlockersDetected += 1;
        } else {
          result.warnings.push({
            id: `connectivity-orphan-${entity.slug}`,
            agent: this.name,
            severity: "LOW",
            disposition: disposition.finalDisposition === "auto_resolved_remove_from_staging" ? "AUTO_RESOLVED" : "VALID_DEFER",
            message: disposition.suggestedAction ?? suggestedFix,
            fingerprint,
          });
        }
        result.metrics.orphanEntitiesRepaired += 1;
      } else if (currentDegree === 1 && entity.slug !== primarySlug) {
        const issue =
          entity.entityType === "classification_system" && !input.relationships.some((r) => r.objectSlug === entity.slug && r.predicate === "has_classification")
            ? "dangling_classification"
            : normalizeText(String(entity.entityType)).includes("procedure")
              ? "isolated_procedure"
              : "low_degree_node";
        artifacts.low_degree_report.push({
          fingerprint,
          slug: entity.slug,
          label: entity.preferredLabel,
          entityType: entity.entityType,
          degree: currentDegree,
          issue,
          suggestedFix,
        });
        result.warnings.push({
          id: `connectivity-low-degree-${entity.slug}`,
          agent: this.name,
          severity: "MODERATE",
          message: `Low-degree node may need another semantic anchor: ${entity.preferredLabel}.`,
          fingerprint,
        });
      } else {
        result.approved.push({
          fingerprint,
          objectKind: "entity",
          agent: this.name,
          reason: "Entity participates in the generated neighborhood graph.",
        });
      }
    }

    return { agent: this.name, generatedAt: new Date().toISOString(), result, artifacts };
  },
};

function classifyOrphan(slug: string, label: string, entityType: string): {
  finalDisposition: string;
  stagingBlocker: boolean;
  publicationBlocker: boolean;
  suggestedAction?: string;
  canonicalOwner?: string;
  canonicalSlug?: string;
} {
  const text = `${slug} ${label}`.toLowerCase();
  if (/placeholder|mystery|unknown|tbd|todo|draft-unused/.test(text)) {
    return {
      finalDisposition: "action_required_unexplained_placeholder",
      stagingBlocker: true,
      publicationBlocker: true,
      suggestedAction: "Unexplained anatomy placeholder must be linked, removed, or routed before staging.",
    };
  }
  const handRule = resolveHandWristOwnership(slug, label, entityType);
  if (handRule) {
    return {
      finalDisposition: handRule.disposition.toLowerCase(),
      stagingBlocker: !handRule.stagingConnected,
      publicationBlocker: handRule.publicationDeferred,
      canonicalOwner: handRule.canonicalOwner,
      canonicalSlug: slug,
      suggestedAction: `${handRule.rationale} Staging may reference this shared object; publication waits for ${handRule.canonicalOwner} reconciliation.`,
    };
  }
  if (/trigger-finger|distal-radius-fracture|median-nerve-compression/.test(text)) {
    return {
      finalDisposition: "auto_resolved_remove_from_staging",
      stagingBlocker: false,
      publicationBlocker: false,
      suggestedAction: "Stale rejected differential/identity artifact; omit from staged CTS neighborhood unless explicitly linked by a reviewed future model.",
    };
  }
  if (/collateral-ligaments|needle-electromyography/.test(text)) {
    return {
      finalDisposition: "valid_defer_shared_or_specialist_root",
      stagingBlocker: false,
      publicationBlocker: true,
      suggestedAction: "Retain as a valid deferred/shared-domain object only if owned by the appropriate shared anatomy or EDX neighborhood.",
    };
  }
  if (/abductor-pollicis-brevis/.test(text)) {
    return {
      finalDisposition: "human_ontology_review_required",
      stagingBlocker: true,
      publicationBlocker: true,
      suggestedAction: "Decide whether to link APB as thenar motor anatomy in CTS or defer to shared hand anatomy.",
    };
  }
  if (entityType === "anatomy_structure") {
    return {
      finalDisposition: "valid_defer_shared_anatomy_root",
      stagingBlocker: false,
      publicationBlocker: true,
      suggestedAction: "Shared anatomy root can be deferred if owned outside this neighborhood.",
    };
  }
  return {
    finalDisposition: "action_required_link_remove_or_defer",
    stagingBlocker: true,
    publicationBlocker: true,
  };
}
