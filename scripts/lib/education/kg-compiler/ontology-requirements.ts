/**
 * Ontology-driven neighborhood requirements derived from the Canonical Knowledge
 * Object Specification (§8–§9) and Anatomy Ontology Plan. The compiler enforces these
 * rules — it never invents ontology.
 */

import type { CanonicalEntityType } from "../kg-relationship-registry.ts";
import type { GapPriority, NeighborhoodSnapshot } from "./types.ts";

export type PredicateRequirement = {
  predicate: string;
  direction: "outbound" | "inbound";
  minCount: number;
  objectEntityTypes?: CanonicalEntityType[];
  subjectEntityTypes?: CanonicalEntityType[];
  priority: GapPriority;
  ruleId: string;
  description: string;
};

export type ClaimRequirement = {
  claimTypes: string[];
  minL1Count: number;
  priority: GapPriority;
  ruleId: string;
  description: string;
};

export type DecisionPointRequirement = {
  patternTypes: string[];
  minCount: number;
  priority: GapPriority;
  ruleId: string;
  description: string;
};

export type MetadataRequirement = {
  field: string;
  scope: "entity" | "relationship" | "primary_entity";
  priority: GapPriority;
  ruleId: string;
  description: string;
  /** When set, only relationships with these predicates need the field. */
  relationshipPredicates?: string[];
};

export type NeighborEntityRequirement = {
  entityType: CanonicalEntityType;
  minCount: number;
  priority: GapPriority;
  ruleId: string;
  description: string;
  optional?: boolean;
};

export type EntityShapeRequirements = {
  entityType: CanonicalEntityType;
  clinicalKinds?: string[];
  neighborEntities: NeighborEntityRequirement[];
  predicates: PredicateRequirement[];
  claims?: ClaimRequirement;
  decisionPoints?: DecisionPointRequirement;
  metadata: MetadataRequirement[];
};

/** Connection-pattern contracts per canonical entity type (CKO spec §9). */
export const ENTITY_SHAPE_REQUIREMENTS: EntityShapeRequirements[] = [
  {
    entityType: "condition",
    clinicalKinds: ["fracture", "infection", "syndrome", "injury"],
    neighborEntities: [
      {
        entityType: "anatomy_structure",
        minCount: 3,
        priority: "critical",
        ruleId: "condition.anatomy.min_structures",
        description: "Diagnosis requires regional anatomy neighborhood (§9 condition).",
      },
      {
        entityType: "classification_system",
        minCount: 1,
        priority: "high",
        ruleId: "condition.classification.system",
        description: "Fracture diagnoses require a classification system when one exists clinically.",
      },
      {
        entityType: "imaging_finding",
        minCount: 1,
        priority: "high",
        ruleId: "condition.imaging.finding",
        description: "Diagnosis requires named imaging findings for instability/severity.",
      },
      {
        entityType: "procedure",
        minCount: 1,
        priority: "medium",
        ruleId: "condition.treatment.procedure",
        description: "Diagnosis requires at least one treatment procedure link.",
        optional: true,
      },
      {
        entityType: "complication",
        minCount: 1,
        priority: "medium",
        ruleId: "condition.complication",
        description: "Diagnosis requires complication neighborhood.",
      },
    ],
    predicates: [
      {
        predicate: "injured_in",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["anatomy_structure"],
        priority: "critical",
        ruleId: "condition.pred.injured_in",
        description: "Condition must localize injury to anatomy (injured_in).",
      },
      {
        predicate: "involves_anatomy",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["anatomy_structure", "biomechanics_concept"],
        priority: "high",
        ruleId: "condition.pred.involves_anatomy",
        description: "Condition must involve regional anatomy.",
      },
      {
        predicate: "at_risk_structure",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["anatomy_structure"],
        priority: "high",
        ruleId: "condition.pred.at_risk_structure",
        description: "Condition must link structures at risk.",
      },
      {
        predicate: "has_classification",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["classification_system"],
        priority: "critical",
        ruleId: "condition.pred.has_classification",
        description: "Condition must link to classification system.",
      },
      {
        predicate: "has_grade",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["classification_grade"],
        priority: "high",
        ruleId: "condition.pred.has_grade",
        description: "Condition must link to at least one classification grade.",
      },
      {
        predicate: "has_imaging_finding",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["imaging_finding"],
        priority: "critical",
        ruleId: "condition.pred.has_imaging_finding",
        description: "Condition must link imaging findings.",
      },
      {
        predicate: "has_complication",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["complication"],
        priority: "medium",
        ruleId: "condition.pred.has_complication",
        description: "Condition must link complications.",
      },
      {
        predicate: "treated_by",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["procedure", "treatment_principle"],
        priority: "high",
        ruleId: "condition.pred.treated_by",
        description: "Condition must link treatment pathway.",
      },
      {
        predicate: "prerequisite_for",
        direction: "inbound",
        minCount: 1,
        subjectEntityTypes: ["anatomy_structure"],
        priority: "high",
        ruleId: "condition.pred.prerequisite_for_inbound",
        description: "Regional anatomy must prerequisite_for the condition.",
      },
    ],
    claims: {
      claimTypes: ["fact", "board_trap", "imaging_point", "cognitive_trap"],
      minL1Count: 3,
      priority: "high",
      ruleId: "condition.claims.l1",
      description: "Condition requires L1 educational claims (facts, traps, imaging).",
    },
    decisionPoints: {
      patternTypes: ["operative_indication", "nonoperative_eligible"],
      minCount: 1,
      priority: "critical",
      ruleId: "condition.dp.management",
      description: "Condition requires operative vs nonoperative decision points.",
    },
    metadata: [
      {
        field: "clinical_kind",
        scope: "entity",
        priority: "high",
        ruleId: "condition.meta.clinical_kind",
        description: "Primary condition requires clinical_kind metadata.",
      },
      {
        field: "clinical_importance",
        scope: "relationship",
        relationshipPredicates: ["injured_in", "has_imaging_finding", "at_risk_structure"],
        priority: "medium",
        ruleId: "condition.meta.clinical_importance",
        description: "Core clinical edges require clinical_importance weighting.",
      },
    ],
  },
  {
    entityType: "procedure",
    neighborEntities: [
      {
        entityType: "anatomy_structure",
        minCount: 1,
        priority: "critical",
        ruleId: "procedure.anatomy",
        description: "Procedure requires target anatomy.",
      },
    ],
    predicates: [
      {
        predicate: "involves_anatomy",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["anatomy_structure"],
        priority: "critical",
        ruleId: "procedure.pred.involves_anatomy",
        description: "Procedure must involve target anatomy.",
      },
      {
        predicate: "at_risk_structure",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["anatomy_structure"],
        priority: "high",
        ruleId: "procedure.pred.at_risk_structure",
        description: "Procedure must link must_protect_during / at-risk structures.",
      },
      {
        predicate: "has_complication",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["complication"],
        priority: "medium",
        ruleId: "procedure.pred.has_complication",
        description: "Procedure should link operative complications.",
        optional: true,
      } as PredicateRequirement & { optional?: boolean },
    ],
    claims: {
      claimTypes: ["operative_pearl", "fact"],
      minL1Count: 0,
      priority: "low",
      ruleId: "procedure.claims",
      description: "Procedure operative pearls are recommended at higher maturity.",
    },
    decisionPoints: {
      patternTypes: ["operative_indication"],
      minCount: 0,
      priority: "low",
      ruleId: "procedure.dp",
      description: "Procedure-specific DPs often live on the indication condition.",
    },
    metadata: [
      {
        field: "context_relevance",
        scope: "relationship",
        relationshipPredicates: ["involves_anatomy", "at_risk_structure"],
        priority: "medium",
        ruleId: "procedure.meta.context",
        description: "Operative anatomy edges should declare context_relevance (OR, clinic).",
      },
    ],
  },
  {
    entityType: "anatomy_structure",
    neighborEntities: [],
    predicates: [
      {
        predicate: "part_of",
        direction: "outbound",
        minCount: 1,
        objectEntityTypes: ["anatomy_structure"],
        priority: "high",
        ruleId: "anatomy.pred.hierarchy",
        description: "Anatomy requires hierarchy edge (part_of or contains).",
      },
      {
        predicate: "prerequisite_for",
        direction: "outbound",
        minCount: 0,
        objectEntityTypes: ["condition", "procedure"],
        priority: "medium",
        ruleId: "anatomy.pred.prerequisite_for",
        description: "Hub anatomy should prerequisite_for clinical objects in region.",
      },
    ],
    claims: {
      claimTypes: ["anatomy_pearl"],
      minL1Count: 0,
      priority: "medium",
      ruleId: "anatomy.claims.pearl",
      description: "Anatomy hub should carry anatomy_pearl claims when educationally dense.",
    },
    metadata: [
      {
        field: "anatomy_kind",
        scope: "entity",
        priority: "critical",
        ruleId: "anatomy.meta.anatomy_kind",
        description: "Anatomy requires anatomy_kind metadata.",
      },
      {
        field: "hierarchy_level",
        scope: "entity",
        priority: "high",
        ruleId: "anatomy.meta.hierarchy_level",
        description: "Anatomy requires hierarchy_level metadata.",
      },
      {
        field: "region",
        scope: "entity",
        priority: "high",
        ruleId: "anatomy.meta.region",
        description: "Anatomy requires regional scope metadata.",
      },
    ],
  },
  {
    entityType: "classification_system",
    neighborEntities: [
      {
        entityType: "classification_grade",
        minCount: 2,
        priority: "high",
        ruleId: "classification.grades",
        description: "Classification system requires grade entities in neighborhood.",
      },
    ],
    predicates: [
      {
        predicate: "has_classification",
        direction: "inbound",
        minCount: 1,
        subjectEntityTypes: ["condition"],
        priority: "high",
        ruleId: "classification.pred.has_classification_inbound",
        description: "Classification system must be linked from a condition via has_classification.",
      },
    ],
    metadata: [],
  },
  {
    entityType: "classification_grade",
    neighborEntities: [],
    predicates: [
      {
        predicate: "injured_in",
        direction: "outbound",
        minCount: 0,
        objectEntityTypes: ["anatomy_structure"],
        priority: "medium",
        ruleId: "grade.pred.injured_in",
        description: "Grades should localize to anatomy when anatomically meaningful.",
      },
    ],
    metadata: [],
  },
  {
    entityType: "biomechanics_concept",
    neighborEntities: [],
    predicates: [
      {
        predicate: "involves_anatomy",
        direction: "inbound",
        minCount: 1,
        subjectEntityTypes: ["condition"],
        priority: "medium",
        ruleId: "biomechanics.inbound",
        description: "Biomechanics concepts should be linked from relevant conditions.",
      },
    ],
    claims: {
      claimTypes: ["fact", "anatomy_pearl"],
      minL1Count: 1,
      priority: "medium",
      ruleId: "biomechanics.claims",
      description: "Biomechanics hub should have at least one teaching claim.",
    },
    metadata: [],
  },
];

export type NeighborhoodLevelRequirement = {
  ruleId: string;
  kind: "asset_link" | "provenance" | "curriculum_bridge";
  priority: GapPriority;
  description: string;
  minCount?: number;
};

/** Neighborhood-wide requirements beyond per-entity shapes. */
export const NEIGHBORHOOD_REQUIREMENTS: NeighborhoodLevelRequirement[] = [
  {
    ruleId: "neighborhood.assets.cards",
    kind: "asset_link",
    priority: "medium",
    description: "High-yield neighborhoods should link Anki card assets to primary entity.",
    minCount: 1,
  },
  {
    ruleId: "neighborhood.assets.questions",
    kind: "asset_link",
    priority: "medium",
    description: "High-yield neighborhoods should link question assets to primary entity.",
    minCount: 1,
  },
  {
    ruleId: "neighborhood.provenance",
    kind: "provenance",
    priority: "high",
    description: "Neighborhood proposals should carry provenance signals on every assertion.",
  },
  {
    ruleId: "neighborhood.curriculum_bridge",
    kind: "curriculum_bridge",
    priority: "high",
    description: "Active curriculum topics require curriculum_node → entity bridge.",
    minCount: 1,
  },
];

export function getEntityShapeRequirements(
  entityType: CanonicalEntityType | string,
  clinicalKind?: string
): EntityShapeRequirements | undefined {
  const matches = ENTITY_SHAPE_REQUIREMENTS.filter((r) => r.entityType === entityType);
  if (matches.length === 0) return undefined;
  if (clinicalKind) {
    const kindMatch = matches.find(
      (r) => !r.clinicalKinds || r.clinicalKinds.includes(clinicalKind)
    );
    return kindMatch ?? matches[0];
  }
  return matches[0];
}

export function expandRequirementsForNeighborhood(snapshot: NeighborhoodSnapshot) {
  const entityRequirements = snapshot.entities
    .map((entity) => {
      const clinicalKind = String(entity.metadata.clinical_kind ?? "");
      return {
        entity,
        requirements: getEntityShapeRequirements(
          entity.entityType,
          clinicalKind || undefined
        ),
      };
    })
    .filter((e) => e.requirements != null);

  return {
    entityRequirements,
    neighborhoodRequirements: NEIGHBORHOOD_REQUIREMENTS,
    targetMaturityLevel: snapshot.targetMaturityLevel,
  };
}

export function maturityImpactForPriority(priority: GapPriority): number {
  switch (priority) {
    case "critical":
      return 0.15;
    case "high":
      return 0.1;
    case "medium":
      return 0.05;
    case "low":
      return 0.02;
    default:
      return 0.05;
  }
}

export function reviewerForGap(
  kind: string,
  priority: GapPriority,
  predicate?: string
): import("./types.ts").RequiredReviewer {
  if (predicate === "at_risk_structure" || predicate === "indicates_treatment") return "attending";
  if (kind === "missing_decision_point") return "attending";
  if (kind === "missing_claim" && priority === "critical") return "clinical_expert";
  if (priority === "critical") return "clinical_expert";
  if (priority === "high") return "curator";
  return "none";
}