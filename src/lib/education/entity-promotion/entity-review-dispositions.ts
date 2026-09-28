/** Phase 3 entity promotion: controlled review dispositions and criteria.
 *
 * Every proposed entity must eventually receive one explicit disposition.
 * Uncertainty maps to DEFER_NEEDS_REVIEW — never to a vague status.
 *
 * These constants are recommendation/review vocabulary only. They never
 * trigger canonical writes by themselves; see promotion-applier.ts, which
 * defaults to dry-run and requires reviewed decisions.
 */

export const ENTITY_DISPOSITIONS = [
  "PROMOTE_CANONICAL",
  "ALIAS_EXISTING",
  "MERGE_PROPOSALS",
  "REJECT_NON_ENTITY",
  "REJECT_TOO_GENERIC",
  "REJECT_CONTEXT_DEPENDENT",
  "REJECT_DUPLICATE",
  "DEFER_NEEDS_REVIEW",
] as const;

export type EntityDisposition = (typeof ENTITY_DISPOSITIONS)[number];

export function isEntityDisposition(value: string): value is EntityDisposition {
  return (ENTITY_DISPOSITIONS as readonly string[]).includes(value);
}

/** Canonical entity types from canonical_entities_type_check as amended by
 * 20260628_150000 (surgical_approach, surgical_positioning) and 20260705
 * ankle pilot (classification_grade, fixation_method). */
export const CANONICAL_ENTITY_TYPES = [
  "condition",
  "procedure",
  "anatomy_structure",
  "classification_system",
  "classification_grade",
  "complication",
  "diagnostic_test",
  "imaging_finding",
  "implant",
  "fixation_method",
  "treatment_principle",
  "biomechanics_concept",
  "exam_maneuver",
  "surgical_approach",
  "surgical_positioning",
  "symptom",
] as const;

export type CanonicalEntityType = (typeof CANONICAL_ENTITY_TYPES)[number];

export function isCanonicalEntityType(value: string): value is CanonicalEntityType {
  return (CANONICAL_ENTITY_TYPES as readonly string[]).includes(value);
}

/** Lifecycle states from canonical_entities_status_check. */
export const ENTITY_LIFECYCLE_STATUSES = [
  "proposed",
  "draft",
  "reviewed",
  "canonical",
  "deprecated",
  "replaced",
  "merged",
  "split",
] as const;

export type EntityLifecycleStatus = (typeof ENTITY_LIFECYCLE_STATUSES)[number];

/** Review states from canonical_entities_review_status_check. */
export const ENTITY_REVIEW_STATUSES = [
  "unreviewed",
  "in_review",
  "approved",
  "rejected",
] as const;

export type EntityReviewStatus = (typeof ENTITY_REVIEW_STATUSES)[number];

/** Alias types for canonical_entity_aliases. Conservative: lexical variants
 * only. Clinical synonyms (osteonecrosis/avascular necrosis) enter only via
 * reviewed ALIAS_EXISTING decisions, never via normalization. */
export const ENTITY_ALIAS_TYPES = [
  "abbreviation",
  "acronym",
  "synonym",
  "historical_term",
  "alternate_spelling",
  "plural_variant",
  "elided_form",
] as const;

export type EntityAliasType = (typeof ENTITY_ALIAS_TYPES)[number];

export function isEntityAliasType(value: string): value is EntityAliasType {
  return (ENTITY_ALIAS_TYPES as readonly string[]).includes(value);
}

/** A canonical entity should be reusable, independently meaningful, stable,
 * graph-suitable, understandable without the source card, and not a whole
 * proposition. See promotion criteria in the Phase 3 spec. */
export const PROMOTION_CRITERIA_VERSION = "entity-promotion-criteria.v1" as const;

/** Small seed list of recommendation-only generic-phrase signals. This is NOT
 * the durable negative list (see entity_review_decisions + rejected labels in
 * the database). It only shapes offline recommendations; reviewers decide. */
export const GENERIC_PHRASE_SEEDS = [
  "treatment",
  "management",
  "observation",
  "injury",
  "fracture",
  "infection",
  "pain",
  "swelling",
  "normal",
  "surgery",
  "upper",
  "instability",
  "laxity",
  "impingement",
  "deformity",
  "contracture",
  "next step",
  "most common",
  "higher",
  "lower",
  "high",
  "low",
  "posterior",
  "anterior",
  "medial",
  "lateral",
] as const;

/** Deictic / card-referential fragments that can never be canonical. */
export const DEICTIC_PHRASE_SEEDS = [
  "shown below",
  "shown above",
  "pictured",
  "this patient",
  "the structure",
  "the image",
  "above",
  "below",
] as const;
