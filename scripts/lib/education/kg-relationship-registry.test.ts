import assert from "node:assert/strict";

import {
  CANONICAL_ENTITY_TYPES,
  DEFERRED_ENDPOINT_TYPES,
  GENERATION_PREDICATES,
  PREDICATE_REGISTRY,
  RELATIONSHIP_ENDPOINT_TYPES,
  getGenerationRelationRules,
  validateRelationshipTriple,
} from "./kg-relationship-registry.ts";

// --- Valid triples ---------------------------------------------------------

const validTriples = [
  {
    subjectEndpointType: "canonical_entity",
    subjectEntityType: "condition",
    predicate: "has_classification",
    objectEndpointType: "canonical_entity",
    objectEntityType: "classification_system",
  },
  {
    subjectEndpointType: "canonical_entity",
    subjectEntityType: "classification_system",
    predicate: "indicates_treatment",
    objectEndpointType: "canonical_entity",
    objectEntityType: "treatment_principle",
  },
  {
    subjectEndpointType: "canonical_entity",
    subjectEntityType: "procedure",
    predicate: "uses_positioning",
    objectEndpointType: "canonical_entity",
    objectEntityType: "surgical_positioning",
  },
  {
    subjectEndpointType: "canonical_entity",
    subjectEntityType: "procedure",
    predicate: "uses_approach",
    objectEndpointType: "canonical_entity",
    objectEntityType: "surgical_approach",
  },
  {
    subjectEndpointType: "canonical_entity",
    subjectEntityType: "condition",
    predicate: "has_complication",
    objectEndpointType: "canonical_entity",
    objectEntityType: "complication",
  },
  // prerequisite_for is intentionally unconstrained on entity type.
  {
    subjectEndpointType: "canonical_entity",
    subjectEntityType: "anatomy_structure",
    predicate: "prerequisite_for",
    objectEndpointType: "canonical_entity",
    objectEntityType: "classification_system",
  },
  // Educational edge to a non-entity endpoint.
  {
    subjectEndpointType: "canonical_entity",
    subjectEntityType: "condition",
    predicate: "covered_by_curriculum_node",
    objectEndpointType: "curriculum_node",
    objectEntityType: null,
  },
] as const;

for (const triple of validTriples) {
  const result = validateRelationshipTriple(triple);
  assert.ok(result.valid, `expected valid: ${triple.predicate} (${result.errors.join("; ")})`);
  assert.equal(result.errors.length, 0, triple.predicate);
}

// --- Invalid triples -------------------------------------------------------

// Wrong object entity type for the predicate.
const wrongObjectType = validateRelationshipTriple({
  subjectEndpointType: "canonical_entity",
  subjectEntityType: "condition",
  predicate: "has_classification",
  objectEndpointType: "canonical_entity",
  objectEntityType: "procedure",
});
assert.equal(wrongObjectType.valid, false);
assert.ok(wrongObjectType.errors.some((e) => e.includes("object entity type")));

// Wrong subject entity type (a procedure cannot "have" a classification).
const wrongSubjectType = validateRelationshipTriple({
  subjectEndpointType: "canonical_entity",
  subjectEntityType: "procedure",
  predicate: "has_classification",
  objectEndpointType: "canonical_entity",
  objectEntityType: "classification_system",
});
assert.equal(wrongSubjectType.valid, false);
assert.ok(wrongSubjectType.errors.some((e) => e.includes("subject entity type")));

// Clinical predicate must not connect a curriculum_node endpoint.
const curriculumAsSubject = validateRelationshipTriple({
  subjectEndpointType: "curriculum_node",
  subjectEntityType: null,
  predicate: "treats",
  objectEndpointType: "canonical_entity",
  objectEntityType: "condition",
});
assert.equal(curriculumAsSubject.valid, false);
assert.ok(curriculumAsSubject.errors.some((e) => e.includes("subject endpoint type")));

// Unknown predicate.
const unknownPredicate = validateRelationshipTriple({
  subjectEndpointType: "canonical_entity",
  subjectEntityType: "condition",
  predicate: "cures_magically",
  objectEndpointType: "canonical_entity",
  objectEntityType: "condition",
});
assert.equal(unknownPredicate.valid, false);
assert.ok(unknownPredicate.errors.some((e) => e.includes("Unknown predicate")));

// Deferred predicate is rejected.
const deferred = validateRelationshipTriple({
  subjectEndpointType: "canonical_entity",
  subjectEntityType: "condition",
  predicate: "supported_by_question",
  objectEndpointType: "canonical_entity",
  objectEntityType: "condition",
});
assert.equal(deferred.valid, false);
assert.ok(deferred.errors.some((e) => e.includes("deferred")));

// A relationship pointing at a deferred endpoint type is impossible to express,
// because the deferred types are not in the allowed endpoint set at all.
for (const deferredType of DEFERRED_ENDPOINT_TYPES) {
  assert.ok(
    !RELATIONSHIP_ENDPOINT_TYPES.includes(deferredType as never),
    `deferred endpoint type leaked into allowed set: ${deferredType}`
  );
}

// --- Generation rules are registry-derived and internally consistent -------

const generationRules = getGenerationRelationRules();
assert.equal(generationRules.length, GENERATION_PREDICATES.length);
for (const rule of generationRules) {
  // Every generation rule must round-trip as valid through the validator.
  const sampleSubject = rule.subjectEntityTypes[0];
  const sampleObject = rule.objectEntityTypes[0];
  const result = validateRelationshipTriple({
    subjectEndpointType: "canonical_entity",
    subjectEntityType: sampleSubject,
    predicate: rule.predicate,
    objectEndpointType: "canonical_entity",
    objectEntityType: sampleObject,
  });
  assert.ok(result.valid, `generation rule should be valid: ${rule.predicate}`);
  // Entity types referenced must be real canonical entity types.
  for (const t of [...rule.subjectEntityTypes, ...rule.objectEntityTypes]) {
    assert.ok(CANONICAL_ENTITY_TYPES.includes(t), `unknown entity type in generation rule: ${t}`);
  }
}

// Registry self-consistency: every predicate's declared entity types are real.
for (const [predicate, rule] of Object.entries(PREDICATE_REGISTRY)) {
  for (const t of rule.subjectEntityTypes ?? []) {
    assert.ok(CANONICAL_ENTITY_TYPES.includes(t), `${predicate}: bad subject entity type ${t}`);
  }
  for (const t of rule.objectEntityTypes ?? []) {
    assert.ok(CANONICAL_ENTITY_TYPES.includes(t), `${predicate}: bad object entity type ${t}`);
  }
}

console.log("kg-relationship-registry.test.ts: all assertions passed");
