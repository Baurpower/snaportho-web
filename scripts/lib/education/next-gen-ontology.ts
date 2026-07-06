import type {
  CanonicalEntityStatus,
  CanonicalEntityType,
  CanonicalRelationshipPredicate,
  ConceptCanonicalEntityBridgeType,
  ConceptCanonicalEntityReviewStatus,
  CurriculumNodeEntityRelationType,
  KgAutomationConfidenceTier,
  KgAutomationProposalReviewStatus,
  KgAutomationProposalType,
  KgAutomationSourceSignalType,
  OntologyFoundationTables,
  OntologyGovernanceActionType,
  OntologyGovernanceReviewStatus,
  ProvenanceReviewStatus,
  ProvenanceStatus,
  RelationshipEndpointType,
  ReviewWorkflowStatus,
} from "./ontology-db-types.ts";

type QueryBuilder = {
  select(columns: string): QueryBuilder;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder;
  eq(column: string, value: boolean | number | string): QueryBuilder;
  or(filters: string): QueryBuilder;
  limit(count: number): QueryBuilder;
};

type DatabaseClient = {
  from(relation: string): QueryBuilder;
};

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
] as const satisfies readonly CanonicalEntityType[];

export const CANONICAL_ENTITY_STATUSES = [
  "proposed",
  "draft",
  "reviewed",
  "canonical",
  "deprecated",
  "replaced",
  "merged",
  "split",
] as const satisfies readonly CanonicalEntityStatus[];

export const REVIEW_WORKFLOW_STATUSES = [
  "unreviewed",
  "in_review",
  "approved",
  "rejected",
] as const satisfies readonly ReviewWorkflowStatus[];

export const ONTOLOGY_GOVERNANCE_ACTION_TYPES = [
  "merge",
  "split",
  "rename",
  "deprecate",
  "replace",
  "restore",
] as const satisfies readonly OntologyGovernanceActionType[];

export const ONTOLOGY_GOVERNANCE_REVIEW_STATUSES = [
  "proposed",
  "in_review",
  "approved",
  "rejected",
  "applied",
] as const satisfies readonly OntologyGovernanceReviewStatus[];

export const PROVENANCE_STATUSES = [
  "pending",
  "source_attached",
  "reviewed",
  "conflicted",
] as const satisfies readonly ProvenanceStatus[];

export const PROVENANCE_REVIEW_STATUSES = [
  "unreviewed",
  "in_review",
  "approved",
  "rejected",
  "conflicted",
] as const satisfies readonly ProvenanceReviewStatus[];

export const RELATIONSHIP_ENDPOINT_TYPES = [
  "canonical_entity",
  "concept",
  "canonical_card",
  "canonical_question_item",
  "article",
  "case_module",
  "curriculum_node",
  "learning_objective",
  "training_level",
] as const satisfies readonly RelationshipEndpointType[];

export const CANONICAL_RELATIONSHIP_PREDICATES = [
  "treats",
  "treated_by",
  "indicated_for",
  "contraindicated_for",
  "involves_anatomy",
  "uses_implant",
  "uses_approach",
  "has_classification",
  "has_complication",
  "requires_imaging",
  "tested_by",
  "examines",
  "prerequisite_for",
  "commonly_confused_with",
  "differential_for",
  "supported_by_card",
  "supported_by_question",
  "supported_by_article",
  "exemplified_by_case",
  "covered_by_module",
  "covered_by_curriculum_node",
  "taught_by_learning_objective",
  "expected_at_training_level",
] as const satisfies readonly CanonicalRelationshipPredicate[];

export const CURRICULUM_NODE_ENTITY_RELATION_TYPES = [
  "primary_coverage",
  "secondary_coverage",
  "objective_anchor",
  "board_relevance",
  "rotation_relevance",
  "reference_only",
] as const satisfies readonly CurriculumNodeEntityRelationType[];

export const CONCEPT_CANONICAL_ENTITY_BRIDGE_TYPES = [
  "equivalent_to",
  "narrower_than",
  "broader_than",
  "related_to",
  "replaced_by",
] as const satisfies readonly ConceptCanonicalEntityBridgeType[];

export const CONCEPT_CANONICAL_ENTITY_REVIEW_STATUSES = [
  "generated",
  "needs_review",
  "approved",
  "rejected",
  "superseded",
] as const satisfies readonly ConceptCanonicalEntityReviewStatus[];

export const KG_AUTOMATION_PROPOSAL_TYPES = [
  "create_canonical_entity",
  "link_curriculum_node_to_entity",
  "link_concept_to_entity",
  "add_entity_alias",
  "add_canonical_relationship",
  "add_provenance_record",
  "flag_duplicate_entity",
  "flag_ambiguous_mapping",
  "flag_possible_split",
  "flag_possible_merge",
] as const satisfies readonly KgAutomationProposalType[];

export const KG_AUTOMATION_SOURCE_SIGNAL_TYPES = [
  "curriculum_node",
  "learning_objective",
  "concept",
  "concept_alias",
  "curriculum_node_alias",
  "source_alias",
  "canonical_card",
  "card_knowledge_link",
  "external_question",
  "external_question_curriculum_mapping",
  "anki_tag",
  "anki_deck_path",
  "curriculum_cluster",
  "reference_import",
  "canonical_entity",
] as const satisfies readonly KgAutomationSourceSignalType[];

export const KG_AUTOMATION_CONFIDENCE_TIERS = [
  "high",
  "medium",
  "low",
] as const satisfies readonly KgAutomationConfidenceTier[];

export const KG_AUTOMATION_REVIEW_STATUSES = [
  "generated",
  "needs_review",
  "approved",
  "rejected",
  "applied",
  "superseded",
] as const satisfies readonly KgAutomationProposalReviewStatus[];

export function normalizeCanonicalEntityLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isRetiredCanonicalEntityStatus(status: CanonicalEntityStatus): boolean {
  return status === "deprecated" || status === "replaced" || status === "merged" || status === "split";
}

export function listCanonicalEntities(
  client: DatabaseClient,
  options: {
    entityType?: CanonicalEntityType;
    status?: CanonicalEntityStatus;
    reviewStatus?: ReviewWorkflowStatus;
    normalizedLabel?: string;
    limit?: number;
  } = {}
) {
  let query = client
    .from("canonical_entities")
    .select(
      "id, entity_type, preferred_label, normalized_label, slug, status, review_status, replacement_entity_id, deprecated_at, metadata"
    )
    .order("preferred_label", { ascending: true });

  if (options.entityType) {
    query = query.eq("entity_type", options.entityType);
  }
  if (options.status) {
    query = query.eq("status", options.status);
  }
  if (options.reviewStatus) {
    query = query.eq("review_status", options.reviewStatus);
  }
  if (options.normalizedLabel) {
    query = query.eq("normalized_label", normalizeCanonicalEntityLabel(options.normalizedLabel));
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query;
}

export function listCanonicalRelationshipsForEntity(
  client: DatabaseClient,
  entityType: RelationshipEndpointType,
  entityId: string,
  predicate?: CanonicalRelationshipPredicate
) {
  let query = client
    .from("canonical_relationships")
    .select("*")
    .or(
      `and(subject_entity_type.eq.${entityType},subject_entity_id.eq.${entityId}),and(object_entity_type.eq.${entityType},object_entity_id.eq.${entityId})`
    )
    .eq("is_active", true);

  if (predicate) {
    query = query.eq("predicate", predicate);
  }

  return query.order("confidence", { ascending: false });
}

export function listCurriculumNodeEntityLinks(
  client: DatabaseClient,
  curriculumNodeId: string,
  relationType?: CurriculumNodeEntityRelationType
) {
  let query = client
    .from("curriculum_node_entities")
    .select("*")
    .eq("curriculum_node_id", curriculumNodeId)
    .eq("is_active", true)
    .order("confidence", { ascending: false });

  if (relationType) {
    query = query.eq("relation_type", relationType);
  }

  return query;
}

export function listOntologyProvenance(
  client: DatabaseClient,
  subjectEntityType: OntologyFoundationTables["ontology_provenance_records"]["subject_entity_type"],
  subjectEntityId: string
) {
  return client
    .from("ontology_provenance_records")
    .select("*")
    .eq("subject_entity_type", subjectEntityType)
    .eq("subject_entity_id", subjectEntityId)
    .eq("is_active", true)
    .order("confidence", { ascending: false })
    .order("created_at", { ascending: false });
}

export function listConceptCanonicalEntityLinks(
  client: DatabaseClient,
  conceptId: string,
  reviewStatus?: ConceptCanonicalEntityReviewStatus
) {
  let query = client
    .from("concept_canonical_entities")
    .select("*")
    .eq("concept_id", conceptId)
    .eq("is_active", true)
    .order("confidence", { ascending: false });

  if (reviewStatus) {
    query = query.eq("review_status", reviewStatus);
  }

  return query;
}

export function listKgAutomationProposals(
  client: DatabaseClient,
  options: {
    proposalType?: KgAutomationProposalType;
    reviewStatus?: KgAutomationProposalReviewStatus;
    confidenceTier?: KgAutomationConfidenceTier;
    specialtyId?: string;
    limit?: number;
  } = {}
) {
  let query = client
    .from("kg_automation_proposals")
    .select("*")
    .eq("is_active", true)
    .order("confidence", { ascending: false });

  if (options.proposalType) {
    query = query.eq("proposal_type", options.proposalType);
  }
  if (options.reviewStatus) {
    query = query.eq("review_status", options.reviewStatus);
  }
  if (options.confidenceTier) {
    query = query.eq("confidence_tier", options.confidenceTier);
  }
  if (options.specialtyId) {
    query = query.eq("specialty_id", options.specialtyId);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query;
}
