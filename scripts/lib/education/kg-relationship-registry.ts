/**
 * Shared canonical-relationship validation registry.
 *
 * Single source of truth for which entity types a given predicate may legally
 * connect. Used by both the proposal generator and the apply step so that
 * relationship rules are never re-encoded as one-off hardcoded arrays inside a
 * script. Pure module: no Supabase / IO imports, so it is unit-testable and
 * safe to import from CLI scripts and the Next.js app alike.
 *
 * There are two distinct "type" layers a relationship touches:
 *   1. Endpoint type  — the polymorphic `subject_entity_type` /
 *      `object_entity_type` column on `canonical_relationships` (which table the
 *      id points at: canonical_entity, concept, canonical_card, ...).
 *   2. Entity type    — when the endpoint is a `canonical_entity`, the
 *      `entity_type` of that row (condition, procedure, classification_system,
 *      ...).
 *
 * The registry constrains both layers per predicate.
 */

// Polymorphic endpoint types currently backed by a real table (plus the
// intentional `training_level` pseudo-type). Kept in lockstep with the
// canonical_relationships subject/object CHECK constraints. The three
// forward-declared, table-less types (canonical_question_item, article,
// case_module) are intentionally absent and deferred until backing tables exist.
export const RELATIONSHIP_ENDPOINT_TYPES = [
  "canonical_entity",
  "concept",
  "canonical_card",
  "curriculum_node",
  "learning_objective",
  "training_level",
] as const;
export type RelationshipEndpointType = (typeof RELATIONSHIP_ENDPOINT_TYPES)[number];

// Endpoint types that were declared in the original schema but have no backing
// table yet. Re-enable each one in the same migration that creates its table.
export const DEFERRED_ENDPOINT_TYPES = ["canonical_question_item", "article", "case_module"] as const;
export type DeferredEndpointType = (typeof DEFERRED_ENDPOINT_TYPES)[number];

// Canonical domain entity types. Kept in lockstep with the
// canonical_entities.entity_type CHECK constraint.
export const CANONICAL_ENTITY_TYPES = [
  "condition",
  "procedure",
  "anatomy_structure",
  "classification_system",
  "complication",
  "diagnostic_test",
  "imaging_finding",
  "implant",
  "treatment_principle",
  "biomechanics_concept",
  "exam_maneuver",
  "surgical_approach",
  "surgical_positioning",
] as const;
export type CanonicalEntityType = (typeof CANONICAL_ENTITY_TYPES)[number];

export type PredicateRule = {
  /** Allowed polymorphic endpoint types for the subject side. */
  subjectEndpointTypes: RelationshipEndpointType[];
  /** Allowed polymorphic endpoint types for the object side. */
  objectEndpointTypes: RelationshipEndpointType[];
  /**
   * When the subject endpoint is a canonical_entity, the allowed entity_type
   * values. Omit to allow any canonical entity type.
   */
  subjectEntityTypes?: CanonicalEntityType[];
  /** Same, for the object side. */
  objectEntityTypes?: CanonicalEntityType[];
  /**
   * True when the predicate is not currently satisfiable (its only sensible
   * endpoint is a deferred table-less type). Generation and apply must skip
   * these until their backing tables exist.
   */
  deferred?: boolean;
  description: string;
};

export const PREDICATE_REGISTRY: Record<string, PredicateRule> = {
  // --- Clinical / domain edges (canonical_entity <-> canonical_entity) ---
  treats: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["procedure", "treatment_principle", "implant"],
    objectEntityTypes: ["condition"],
    description: "A procedure/treatment/implant treats a condition.",
  },
  treated_by: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["condition"],
    objectEntityTypes: ["procedure", "treatment_principle", "implant"],
    description: "A condition is treated by a procedure/treatment/implant.",
  },
  indicated_for: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["procedure", "treatment_principle", "implant"],
    objectEntityTypes: ["condition"],
    description: "A procedure/treatment/implant is indicated for a condition.",
  },
  contraindicated_for: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["procedure", "treatment_principle", "implant"],
    objectEntityTypes: ["condition"],
    description: "A procedure/treatment/implant is contraindicated for a condition.",
  },
  involves_anatomy: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["condition", "procedure"],
    objectEntityTypes: ["anatomy_structure"],
    description: "A condition or procedure involves an anatomic structure.",
  },
  uses_implant: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["procedure"],
    objectEntityTypes: ["implant"],
    description: "A procedure uses an implant.",
  },
  uses_approach: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["procedure"],
    objectEntityTypes: ["surgical_approach"],
    description: "A procedure uses a surgical approach.",
  },
  uses_positioning: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["procedure"],
    objectEntityTypes: ["surgical_positioning"],
    description: "A procedure uses an operative positioning setup.",
  },
  has_classification: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["condition"],
    objectEntityTypes: ["classification_system"],
    description: "A condition has a classification system.",
  },
  indicates_treatment: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["classification_system", "condition"],
    objectEntityTypes: ["treatment_principle", "procedure"],
    description: "A classification grade / condition indicates a treatment principle or procedure.",
  },
  has_complication: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["condition", "procedure", "implant"],
    objectEntityTypes: ["complication"],
    description: "A condition/procedure/implant has a complication.",
  },
  requires_imaging: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["condition", "procedure"],
    objectEntityTypes: ["diagnostic_test", "imaging_finding"],
    description: "A condition/procedure requires imaging.",
  },
  tested_by: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["condition", "anatomy_structure"],
    objectEntityTypes: ["exam_maneuver", "diagnostic_test"],
    description: "A condition/anatomy is tested by an exam maneuver or diagnostic test.",
  },
  examines: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["exam_maneuver"],
    objectEntityTypes: ["anatomy_structure", "condition"],
    description: "An exam maneuver examines an anatomic structure or condition.",
  },
  prerequisite_for: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    description: "Mastering the subject entity is a prerequisite for the object entity.",
  },
  commonly_confused_with: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    description: "Two entities are commonly confused with one another.",
  },
  differential_for: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_entity"],
    subjectEntityTypes: ["condition"],
    objectEntityTypes: ["condition"],
    description: "A condition is part of the differential for another condition.",
  },

  // --- Educational / curriculum edges (canonical_entity -> other layer) ---
  supported_by_card: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["canonical_card"],
    description: "An entity is supported by a flashcard.",
  },
  covered_by_curriculum_node: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["curriculum_node"],
    description: "An entity is covered by a curriculum node.",
  },
  taught_by_learning_objective: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["learning_objective"],
    description: "An entity is taught by a learning objective.",
  },
  expected_at_training_level: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: ["training_level"],
    description: "An entity is expected to be mastered at a training level.",
  },

  // --- Deferred: only sensible endpoint is a table-less type ---
  supported_by_question: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: [],
    deferred: true,
    description: "Deferred until a canonical_question_item table exists.",
  },
  supported_by_article: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: [],
    deferred: true,
    description: "Deferred until an article table exists.",
  },
  exemplified_by_case: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: [],
    deferred: true,
    description: "Deferred until a case_module table exists.",
  },
  covered_by_module: {
    subjectEndpointTypes: ["canonical_entity"],
    objectEndpointTypes: [],
    deferred: true,
    description: "Deferred until a case_module table exists.",
  },
};

export type RelationshipTripleInput = {
  subjectEndpointType: string;
  predicate: string;
  objectEndpointType: string;
  /** Required only when the corresponding endpoint is a canonical_entity. */
  subjectEntityType?: string | null;
  objectEntityType?: string | null;
};

export type RelationshipValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Validate a single subject -> predicate -> object triple against the registry.
 * Returns every reason it is invalid (empty list when valid).
 */
export function validateRelationshipTriple(
  input: RelationshipTripleInput
): RelationshipValidationResult {
  const errors: string[] = [];
  const rule = PREDICATE_REGISTRY[input.predicate];

  if (!rule) {
    return { valid: false, errors: [`Unknown predicate: ${input.predicate}`] };
  }

  if (rule.deferred) {
    errors.push(`Predicate ${input.predicate} is deferred and not currently satisfiable.`);
  }

  if (!rule.subjectEndpointTypes.includes(input.subjectEndpointType as RelationshipEndpointType)) {
    errors.push(
      `Predicate ${input.predicate} does not allow subject endpoint type ${input.subjectEndpointType}.`
    );
  }

  if (!rule.objectEndpointTypes.includes(input.objectEndpointType as RelationshipEndpointType)) {
    errors.push(
      `Predicate ${input.predicate} does not allow object endpoint type ${input.objectEndpointType}.`
    );
  }

  if (
    input.subjectEndpointType === "canonical_entity" &&
    rule.subjectEntityTypes &&
    input.subjectEntityType != null &&
    !rule.subjectEntityTypes.includes(input.subjectEntityType as CanonicalEntityType)
  ) {
    errors.push(
      `Predicate ${input.predicate} does not allow subject entity type ${input.subjectEntityType}.`
    );
  }

  if (
    input.objectEndpointType === "canonical_entity" &&
    rule.objectEntityTypes &&
    input.objectEntityType != null &&
    !rule.objectEntityTypes.includes(input.objectEntityType as CanonicalEntityType)
  ) {
    errors.push(
      `Predicate ${input.predicate} does not allow object entity type ${input.objectEntityType}.`
    );
  }

  return { valid: errors.length === 0, errors };
}

export type GenerationRelationRule = {
  predicate: string;
  /** Entity types the edge subject (canonical_entity) may have. */
  subjectEntityTypes: CanonicalEntityType[];
  /** Entity types the edge object (canonical_entity) may have. */
  objectEntityTypes: CanonicalEntityType[];
};

/**
 * Domain relation rules the proposal generator is currently allowed to emit.
 * Curated subset (kept narrow on purpose while entity coverage is still
 * shallow), but every entry is sourced from the registry rather than from a
 * hardcoded type list — so the generator and the validator can never drift.
 */
export const GENERATION_PREDICATES = [
  "has_classification",
  "has_complication",
  "involves_anatomy",
] as const;

export function getGenerationRelationRules(): GenerationRelationRule[] {
  return GENERATION_PREDICATES.map((predicate) => {
    const rule = PREDICATE_REGISTRY[predicate];
    if (!rule || !rule.subjectEntityTypes || !rule.objectEntityTypes) {
      throw new Error(`Generation predicate ${predicate} is missing entity-type constraints in the registry.`);
    }
    return {
      predicate,
      subjectEntityTypes: rule.subjectEntityTypes,
      objectEntityTypes: rule.objectEntityTypes,
    };
  });
}
