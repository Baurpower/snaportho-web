import type { NeighborhoodPlan, NeighborhoodRole, NeighborhoodSnapshot } from "./types.ts";

function inferRole(entityType: string, slug: string, primarySlug: string): NeighborhoodRole {
  if (slug === primarySlug) return "primary_condition";
  switch (entityType) {
    case "anatomy_structure":
      return "neighboring_anatomy";
    case "procedure":
    case "surgical_approach":
      return "procedure";
    case "classification_system":
    case "classification_grade":
      return "classification";
    case "imaging_finding":
    case "diagnostic_test":
      return "imaging";
    case "complication":
      return "complication";
    case "biomechanics_concept":
      return "biomechanics";
    case "fixation_method":
    case "implant":
      return "fixation";
    default:
      return "supporting";
  }
}

export function buildNeighborhoodPlan(snapshot: NeighborhoodSnapshot): NeighborhoodPlan {
  const roles = {
    primary_condition: [] as string[],
    neighboring_anatomy: [] as string[],
    procedure: [] as string[],
    classification: [] as string[],
    imaging: [] as string[],
    complication: [] as string[],
    decision_point_anchor: [] as string[],
    claim_anchor: [] as string[],
    biomechanics: [] as string[],
    fixation: [] as string[],
    supporting: [] as string[],
  };

  const claimAnchors = new Set(snapshot.claims.map((c) => c.primaryEntitySlug));
  const dpAnchors = new Set(snapshot.decisionPoints.map((dp) => dp.subjectEntitySlug));

  const nodes = snapshot.entities.map((entity) => {
    let role = inferRole(entity.entityType, entity.slug, snapshot.primaryEntitySlug);
    if (entity.slug !== snapshot.primaryEntitySlug) {
      if (claimAnchors.has(entity.slug) && role === "supporting") role = "claim_anchor";
      if (dpAnchors.has(entity.slug)) role = "decision_point_anchor";
    }

    roles[role].push(entity.slug);

    const inboundEdgeCount = snapshot.relationships.filter((r) => r.objectSlug === entity.slug).length;
    const outboundEdgeCount = snapshot.relationships.filter((r) => r.subjectSlug === entity.slug).length;

    return {
      slug: entity.slug,
      entityType: entity.entityType,
      preferredLabel: entity.preferredLabel,
      role,
      isPrimary: entity.slug === snapshot.primaryEntitySlug,
      inboundEdgeCount,
      outboundEdgeCount,
    };
  });

  return {
    topicKey: snapshot.topicKey,
    pilotKey: snapshot.pilotKey,
    primaryEntitySlug: snapshot.primaryEntitySlug,
    displayName: snapshot.displayName,
    generatedAt: new Date().toISOString(),
    nodes,
    edgeCount: snapshot.relationships.length,
    claimCount: snapshot.claims.length,
    decisionPointCount: snapshot.decisionPoints.length,
    roles,
  };
}