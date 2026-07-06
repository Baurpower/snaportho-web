export type OntologyEntityType =
  | "specialty"
  | "curriculum_node"
  | "learning_objective"
  | "concept"
  | "canonical_entity"
  | "tag"
  | "external_source"
  | "external_question";

export type CurriculumNodeType =
  | "specialty"
  | "region"
  | "topic"
  | "subtopic"
  | "module"
  | "exam_domain"
  | "pathway";

export type ConceptType =
  | "fact"
  | "classification"
  | "diagnostic_rule"
  | "imaging"
  | "indication"
  | "procedure"
  | "complication"
  | "outcome"
  | "anatomy"
  | "biomechanics"
  | "pathophysiology"
  | "terminology";

export type ConceptAliasType =
  | "synonym"
  | "abbreviation"
  | "legacy_name"
  | "spelling_variant"
  | "source_label";

export type ExternalSourceType =
  | "qbank"
  | "flashcard_deck"
  | "chatbot"
  | "module"
  | "textbook"
  | "guideline"
  | "journal"
  | "reference";

export type SourceAliasKind =
  | "source_slug"
  | "source_label"
  | "source_topic_id"
  | "source_topic_label"
  | "source_specialty_label"
  | "source_question_group"
  | "source_question_id"
  | "source_chapter"
  | "source_section"
  | "external_id"
  | "other";

export type TagAssignmentSource =
  | "system"
  | "seed"
  | "manual"
  | "import"
  | "ai_suggestion";

export type AnkiImportFileType = "apkg" | "tsv";

export type AnkiImportMode = "dry_run" | "apply";

export type AnkiImportStatus = "pending" | "completed" | "failed";

export type CanonicalCardStatus = "imported" | "draft" | "reviewed" | "approved" | "archived";

export type CardReviewStatus = "unreviewed" | "in_review" | "reviewed" | "approved" | "rejected";

export type MappingReviewStatus =
  | "unreviewed"
  | "needs_review"
  | "auto_mapped"
  | "in_review"
  | "approved"
  | "rejected";

export type TrainingLevel =
  | "M3"
  | "M4"
  | "PGY1"
  | "PGY2"
  | "PGY3"
  | "PGY4"
  | "PGY5"
  | "Fellow"
  | "Attending";

export type TrainingLevelRole = "primary" | "secondary" | "stretch";

export type CardKnowledgeLinkMethod = "import_seed" | "deterministic" | "manual" | "ai_suggestion";

export type CanonicalEntityType =
  | "condition"
  | "procedure"
  | "anatomy_structure"
  | "classification_system"
  | "classification_grade"
  | "complication"
  | "diagnostic_test"
  | "imaging_finding"
  | "implant"
  | "fixation_method"
  | "treatment_principle"
  | "biomechanics_concept"
  | "exam_maneuver"
  | "surgical_approach"
  | "surgical_positioning";

export type CanonicalEntityStatus =
  | "proposed"
  | "draft"
  | "reviewed"
  | "canonical"
  | "deprecated"
  | "replaced"
  | "merged"
  | "split";

export type ReviewWorkflowStatus = "unreviewed" | "in_review" | "approved" | "rejected";

export type OntologyGovernanceEntityType =
  | "concept"
  | "canonical_entity"
  | "canonical_relationship"
  | "curriculum_node_entity";

export type OntologyGovernanceActionType =
  | "merge"
  | "split"
  | "rename"
  | "deprecate"
  | "replace"
  | "restore";

export type OntologyGovernanceReviewStatus =
  | "proposed"
  | "in_review"
  | "approved"
  | "rejected"
  | "applied";

export type RelationshipEndpointType =
  | "canonical_entity"
  | "concept"
  | "canonical_card"
  | "canonical_question_item"
  | "article"
  | "case_module"
  | "curriculum_node"
  | "learning_objective"
  | "training_level";

export type CanonicalRelationshipPredicate =
  | "treats"
  | "treated_by"
  | "indicated_for"
  | "contraindicated_for"
  | "involves_anatomy"
  | "injured_in"
  | "at_risk_structure"
  | "has_imaging_finding"
  | "has_grade"
  | "uses_fixation"
  | "explains_instability"
  | "part_of"
  | "contains"
  | "articulates_with"
  | "inserts_on"
  | "uses_implant"
  | "uses_approach"
  | "uses_positioning"
  | "has_classification"
  | "indicates_treatment"
  | "has_complication"
  | "requires_imaging"
  | "tested_by"
  | "examines"
  | "prerequisite_for"
  | "commonly_confused_with"
  | "differential_for"
  | "supported_by_card"
  | "supported_by_question"
  | "supported_by_article"
  | "exemplified_by_case"
  | "covered_by_module"
  | "covered_by_curriculum_node"
  | "taught_by_learning_objective"
  | "expected_at_training_level";

export type ProvenanceStatus =
  | "pending"
  | "source_attached"
  | "reviewed"
  | "conflicted";

export type ProvenanceReviewStatus =
  | "unreviewed"
  | "in_review"
  | "approved"
  | "rejected"
  | "conflicted";

export type RelationshipLifecycleStatus = "active" | "deprecated" | "replaced";

export type RelationshipCreatedBySource =
  | "system"
  | "manual"
  | "import"
  | "ai_suggestion"
  | "reviewed";

export type ProvenanceSubjectType =
  | "canonical_entity"
  | "concept"
  | "concept_alias"
  | "source_alias"
  | "canonical_relationship"
  | "card_knowledge_link"
  | "external_question_curriculum_mapping"
  | "ontology_governance_action"
  | "curriculum_node_entity"
  | "canonical_card"
  | "canonical_card_version"
  | "external_question"
  | "educational_claim";

export type CurriculumNodeEntityRelationType =
  | "primary_coverage"
  | "secondary_coverage"
  | "objective_anchor"
  | "board_relevance"
  | "rotation_relevance"
  | "reference_only";

export type ConceptCanonicalEntityBridgeType =
  | "equivalent_to"
  | "narrower_than"
  | "broader_than"
  | "related_to"
  | "replaced_by";

export type ConceptCanonicalEntityReviewStatus =
  | "generated"
  | "needs_review"
  | "approved"
  | "rejected"
  | "superseded";

export type KgAutomationProposalType =
  | "create_canonical_entity"
  | "link_curriculum_node_to_entity"
  | "link_concept_to_entity"
  | "add_entity_alias"
  | "add_canonical_relationship"
  | "add_provenance_record"
  | "flag_duplicate_entity"
  | "flag_ambiguous_mapping"
  | "flag_possible_split"
  | "flag_possible_merge";

export type KgAutomationSourceSignalType =
  | "curriculum_node"
  | "learning_objective"
  | "concept"
  | "concept_alias"
  | "curriculum_node_alias"
  | "source_alias"
  | "canonical_card"
  | "card_knowledge_link"
  | "external_question"
  | "external_question_curriculum_mapping"
  | "anki_tag"
  | "anki_deck_path"
  | "curriculum_cluster"
  | "reference_import"
  | "canonical_entity";

export type KgAutomationConfidenceTier = "high" | "medium" | "low";

export type KgAutomationProposalReviewStatus =
  | "generated"
  | "needs_review"
  | "approved"
  | "rejected"
  | "applied"
  | "superseded";

export type TimestampedRow = {
  created_at: string;
  updated_at: string;
};

export type ActiveRow = {
  is_active: boolean;
  comments: string | null;
};

export type SpecialtyRow = TimestampedRow &
  ActiveRow & {
    id: string;
    slug: string;
    name: string;
    description: string | null;
  };

export type CurriculumNodeRow = TimestampedRow &
  ActiveRow & {
    id: string;
    parent_id: string | null;
    specialty_id: string | null;
    node_type: CurriculumNodeType;
    slug: string;
    title: string;
    short_label: string | null;
    description: string | null;
    sort_order: number;
  };

export type LearningObjectiveRow = TimestampedRow &
  ActiveRow & {
    id: string;
    curriculum_node_id: string;
    slug: string;
    objective_text: string;
    objective_kind: string | null;
    sort_order: number;
  };

export type ConceptRow = TimestampedRow &
  ActiveRow & {
    id: string;
    curriculum_node_id: string;
    primary_learning_objective_id: string | null;
    slug: string;
    canonical_name: string;
    concept_type: ConceptType;
    description: string | null;
  };

export type ConceptAliasRow = TimestampedRow &
  ActiveRow & {
    id: string;
    concept_id: string;
    alias_name: string;
    alias_type: ConceptAliasType;
    is_preferred: boolean;
  };

export type ExternalSourceRow = TimestampedRow &
  ActiveRow & {
    id: string;
    slug: string;
    name: string;
    source_type: ExternalSourceType;
    homepage_url: string | null;
    description: string | null;
  };

export type ExternalQuestionRow = TimestampedRow &
  ActiveRow & {
    id: string;
    source_id: string;
    external_question_id: string;
    specialty_raw: string | null;
    specialty_normalized: string | null;
    topic_raw: string | null;
    topic_normalized: string | null;
    topic_slug: string | null;
    metadata: Record<string, unknown>;
    first_seen_at: string;
    last_seen_at: string;
  };

export type ExternalQuestionCurriculumMappingRow = TimestampedRow &
  ActiveRow & {
    id: string;
    external_question_id: string;
    specialty_id: string | null;
    curriculum_node_id: string | null;
    learning_objective_id: string | null;
    concept_id: string | null;
    mapping_confidence: number;
    needs_review: boolean;
    review_reason: string | null;
    suggested_action: string | null;
    mapping_method: "import_rule" | "manual" | "ai_suggestion" | "reviewed";
    is_primary: boolean;
    metadata: Record<string, unknown>;
  };

export type SourceAliasRow = TimestampedRow &
  ActiveRow & {
    id: string;
    source_id: string;
    entity_type: Exclude<OntologyEntityType, "external_source">;
    entity_id: string;
    alias_kind: SourceAliasKind;
    alias_value: string;
    external_id: string | null;
    metadata: Record<string, unknown>;
  };

export type TagRow = TimestampedRow &
  ActiveRow & {
    id: string;
    parent_tag_id: string | null;
    namespace: string;
    slug: string;
    label: string;
    description: string | null;
  };

export type TagAssignmentRow = TimestampedRow &
  ActiveRow & {
    id: string;
    tag_id: string;
    entity_type: OntologyEntityType;
    entity_id: string;
    assigned_by_source: TagAssignmentSource;
  };

export type AnkiImportBatchRow = TimestampedRow &
  ActiveRow & {
    id: string;
    source_id: string;
    file_name: string;
    file_type: AnkiImportFileType;
    file_sha256: string;
    importer_version: string;
    import_mode: AnkiImportMode;
    status: AnkiImportStatus;
    warnings: unknown[];
    metadata: Record<string, unknown>;
  };

export type AnkiDeckRow = TimestampedRow &
  ActiveRow & {
    id: string;
    import_batch_id: string | null;
    source_id: string;
    anki_deck_id: string;
    parent_deck_id: string | null;
    full_name: string;
    deck_name: string;
    deck_path: string[];
    metadata: Record<string, unknown>;
  };

export type AnkiNoteModelRow = TimestampedRow &
  ActiveRow & {
    id: string;
    import_batch_id: string | null;
    source_id: string;
    anki_model_id: string;
    model_name: string;
    field_names: string[];
    templates: unknown[];
    css: string | null;
    latex_pre: string | null;
    latex_post: string | null;
    metadata: Record<string, unknown>;
  };

export type AnkiNoteRow = TimestampedRow &
  ActiveRow & {
    id: string;
    import_batch_id: string | null;
    source_id: string;
    note_model_id: string | null;
    primary_deck_id: string | null;
    source_note_key: string;
    anki_note_id: string | null;
    anki_note_guid: string | null;
    sort_field: string | null;
    tags_raw: string | null;
    field_values: unknown[];
    field_name_map: Record<string, unknown>;
    raw_html: Record<string, unknown>;
    source_content_hash: string;
    note_identity_hash: string;
    metadata: Record<string, unknown>;
  };

export type AnkiCardRow = TimestampedRow &
  ActiveRow & {
    id: string;
    import_batch_id: string | null;
    source_id: string;
    note_id: string;
    deck_id: string | null;
    source_card_key: string;
    anki_card_id: string | null;
    card_ord: number;
    card_type: number | null;
    queue: number | null;
    due: number | null;
    interval: number | null;
    ease_factor: number | null;
    reps: number | null;
    lapses: number | null;
    left_count: number | null;
    original_due: number | null;
    original_deck_id: string | null;
    flags: number | null;
    scheduling_data: string | null;
    source_content_hash: string;
    scheduling_hash: string | null;
    metadata: Record<string, unknown>;
  };

export type AnkiTagRow = TimestampedRow &
  ActiveRow & {
    id: string;
    import_batch_id: string | null;
    source_id: string;
    raw_name: string;
    slug: string;
    metadata: Record<string, unknown>;
  };

export type AnkiNoteTagRow = TimestampedRow &
  ActiveRow & {
    id: string;
    note_id: string;
    tag_id: string;
    import_batch_id: string | null;
    metadata: Record<string, unknown>;
  };

export type AnkiMediaRefRow = TimestampedRow &
  ActiveRow & {
    id: string;
    import_batch_id: string | null;
    note_id: string;
    card_id: string | null;
    field_name: string;
    media_kind: "image" | "audio" | "other";
    media_src: string;
    package_entry_name: string | null;
    media_sha256: string | null;
    exists_in_package: boolean;
    metadata: Record<string, unknown>;
  };

export type CanonicalCardRow = TimestampedRow &
  ActiveRow & {
    id: string;
    anki_note_id: string;
    anki_card_id: string;
    current_version_id: string | null;
    current_version_number: number;
    canonical_status: CanonicalCardStatus;
    title: string | null;
    source_content_hash: string;
    metadata: Record<string, unknown>;
  };

export type CanonicalCardVersionRow = TimestampedRow &
  ActiveRow & {
    id: string;
    canonical_card_id: string;
    version_number: number;
    source_note_id: string | null;
    source_card_id: string | null;
    content_hash: string;
    field_snapshot: unknown[];
    raw_html_snapshot: Record<string, unknown>;
    tag_snapshot: string[];
    metadata: Record<string, unknown>;
  };

export type CardQualityReviewRow = TimestampedRow &
  ActiveRow & {
    id: string;
    canonical_card_id: string;
    import_batch_id: string | null;
    review_status: CardReviewStatus;
    is_current: boolean;
    clarity: number | null;
    atomicity: number | null;
    cloze_quality: number | null;
    factual_accuracy: number | null;
    source_support: number | null;
    high_yield_value: number | null;
    exam_relevance: number | null;
    clinical_relevance: number | null;
    suggested_training_level: TrainingLevel | null;
    min_training_level: TrainingLevel | null;
    max_training_level: TrainingLevel | null;
    level_confidence: number | null;
    level_rationale: string | null;
    is_core_knowledge: boolean | null;
    is_rotation_level: boolean | null;
    is_oite_level: boolean | null;
    is_boards_level: boolean | null;
    is_attending_nuance: boolean | null;
    metadata: Record<string, unknown>;
    reviewed_by: string | null;
    reviewed_at: string | null;
  };

export type CardTrainingLevelLinkRow = TimestampedRow &
  ActiveRow & {
    id: string;
    canonical_card_id: string;
    training_level: TrainingLevel;
    relevance_score: number;
    level_role: TrainingLevelRole;
    reviewer_status: "unreviewed" | "in_review" | "approved" | "rejected";
    reviewed_by: string | null;
    reviewed_at: string | null;
    metadata: Record<string, unknown>;
  };

export type CardKnowledgeLinkRow = TimestampedRow &
  ActiveRow & {
    id: string;
    canonical_card_id: string;
    specialty_id: string | null;
    curriculum_node_id: string | null;
    learning_objective_id: string | null;
    concept_id: string | null;
    mapping_confidence: number;
    review_status: MappingReviewStatus;
    link_method: CardKnowledgeLinkMethod;
    is_primary: boolean;
    metadata: Record<string, unknown>;
  };

export type CurriculumNodeAliasRow = TimestampedRow &
  ActiveRow & {
    id: string;
    curriculum_node_id: string;
    alias_name: string;
    normalized_alias: string;
    alias_type:
      | "synonym"
      | "abbreviation"
      | "legacy_name"
      | "spelling_variant"
      | "source_label"
      | "deck_label"
      | "tag_label";
    metadata: Record<string, unknown>;
  };

export type AnkiKgMappingRunRow = TimestampedRow &
  ActiveRow & {
    id: string;
    import_batch_id: string;
    mapper_version: string;
    run_mode: "dry_run" | "apply";
    status: "pending" | "completed" | "failed";
    min_confidence: number;
    deck_prefix: string | null;
    limit_count: number | null;
    total_cards_considered: number;
    high_confidence_count: number;
    medium_confidence_count: number;
    no_mapping_count: number;
    applied_mapping_count: number;
    candidate_mapping_count: number;
    metadata: Record<string, unknown>;
  };

export type AnkiKgMappingCandidateRow = TimestampedRow &
  ActiveRow & {
    id: string;
    mapping_run_id: string;
    canonical_card_id: string;
    specialty_id: string | null;
    curriculum_node_id: string | null;
    concept_id: string | null;
    candidate_rank: number;
    mapping_confidence: number;
    review_status: "auto_mapped" | "needs_review" | "approved" | "rejected";
    mapper_type: "deterministic" | "manual" | "ai_suggestion";
    is_selected: boolean;
    metadata: Record<string, unknown>;
  };

export type CanonicalEntityRow = TimestampedRow &
  ActiveRow & {
    id: string;
    source_concept_id: string | null;
    entity_type: CanonicalEntityType;
    preferred_label: string;
    normalized_label: string;
    slug: string | null;
    description: string | null;
    status: CanonicalEntityStatus;
    review_status: ReviewWorkflowStatus;
    created_from_source_id: string | null;
    replacement_entity_id: string | null;
    deprecated_at: string | null;
    metadata: Record<string, unknown>;
  };

export type OntologyGovernanceActionRow = TimestampedRow &
  ActiveRow & {
    id: string;
    source_entity_type: OntologyGovernanceEntityType;
    source_entity_id: string;
    target_entity_type: OntologyGovernanceEntityType | null;
    target_entity_ids: string[];
    action_type: OntologyGovernanceActionType;
    reason: string | null;
    actor_user_id: string | null;
    review_status: OntologyGovernanceReviewStatus;
    notes: string | null;
    downstream_mappings_migrated: boolean;
    acted_at: string;
    metadata: Record<string, unknown>;
  };

export type CanonicalRelationshipRow = TimestampedRow &
  ActiveRow & {
    id: string;
    subject_entity_type: RelationshipEndpointType;
    subject_entity_id: string;
    predicate: CanonicalRelationshipPredicate;
    object_entity_type: RelationshipEndpointType;
    object_entity_id: string;
    confidence: number;
    review_status: ReviewWorkflowStatus;
    provenance_status: ProvenanceStatus;
    lifecycle_status: RelationshipLifecycleStatus;
    created_by_source: RelationshipCreatedBySource;
    deprecated_at: string | null;
    metadata: Record<string, unknown>;
  };

export type OntologyProvenanceRecordRow = TimestampedRow &
  ActiveRow & {
    id: string;
    subject_entity_type: ProvenanceSubjectType;
    subject_entity_id: string;
    source_artifact_id: string | null;
    source_artifact_type: string;
    source_name: string;
    source_external_id: string | null;
    extraction_method: string;
    confidence: number;
    reviewer_status: ProvenanceReviewStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    notes: string | null;
    metadata: Record<string, unknown>;
  };

export type CurriculumNodeEntityRow = TimestampedRow &
  ActiveRow & {
    id: string;
    curriculum_node_id: string;
    canonical_entity_id: string | null;
    concept_id: string | null;
    relation_type: CurriculumNodeEntityRelationType;
    confidence: number;
    review_status: ReviewWorkflowStatus;
    provenance_status: ProvenanceStatus;
    deprecated_at: string | null;
    metadata: Record<string, unknown>;
  };

export type ConceptCanonicalEntityRow = TimestampedRow &
  ActiveRow & {
    id: string;
    concept_id: string;
    canonical_entity_id: string;
    bridge_type: ConceptCanonicalEntityBridgeType;
    confidence: number;
    review_status: ConceptCanonicalEntityReviewStatus;
    provenance_status: ProvenanceStatus;
    created_by: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    notes: string | null;
    metadata: Record<string, unknown>;
  };

export type KgAutomationProposalRow = TimestampedRow &
  ActiveRow & {
    id: string;
    proposal_fingerprint: string;
    proposal_type: KgAutomationProposalType;
    source_signal_type: KgAutomationSourceSignalType;
    source_signal_ids: string[];
    specialty_id: string | null;
    proposed_entity_type: CanonicalEntityType | null;
    proposed_entity_label: string | null;
    proposed_existing_entity_id: string | null;
    proposed_subject_entity_id: string | null;
    proposed_predicate: CanonicalRelationshipPredicate | null;
    proposed_object_entity_id: string | null;
    proposed_alias: string | null;
    proposed_bridge_type: ConceptCanonicalEntityBridgeType | CurriculumNodeEntityRelationType | null;
    confidence: number;
    confidence_tier: KgAutomationConfidenceTier;
    confidence_reason: string | null;
    evidence_summary: string | null;
    supporting_card_count: number;
    supporting_question_count: number;
    supporting_curriculum_node_count: number;
    supporting_source_count: number;
    conflict_count: number;
    review_status: KgAutomationProposalReviewStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    reviewer_notes: string | null;
    applied_at: string | null;
    superseded_by: string | null;
    metadata: Record<string, unknown>;
  };

export type OntologyFoundationTables = {
  specialties: SpecialtyRow;
  curriculum_nodes: CurriculumNodeRow;
  learning_objectives: LearningObjectiveRow;
  concepts: ConceptRow;
  canonical_entities: CanonicalEntityRow;
  concept_canonical_entities: ConceptCanonicalEntityRow;
  kg_automation_proposals: KgAutomationProposalRow;
  concept_aliases: ConceptAliasRow;
  external_sources: ExternalSourceRow;
  external_questions: ExternalQuestionRow;
  external_question_curriculum_mappings: ExternalQuestionCurriculumMappingRow;
  source_aliases: SourceAliasRow;
  tags: TagRow;
  tag_assignments: TagAssignmentRow;
  anki_import_batches: AnkiImportBatchRow;
  anki_decks: AnkiDeckRow;
  anki_note_models: AnkiNoteModelRow;
  anki_notes: AnkiNoteRow;
  anki_cards: AnkiCardRow;
  anki_tags: AnkiTagRow;
  anki_note_tags: AnkiNoteTagRow;
  anki_media_refs: AnkiMediaRefRow;
  canonical_cards: CanonicalCardRow;
  canonical_card_versions: CanonicalCardVersionRow;
  card_quality_reviews: CardQualityReviewRow;
  card_training_level_links: CardTrainingLevelLinkRow;
  card_knowledge_links: CardKnowledgeLinkRow;
  canonical_relationships: CanonicalRelationshipRow;
  ontology_governance_actions: OntologyGovernanceActionRow;
  ontology_provenance_records: OntologyProvenanceRecordRow;
  curriculum_node_entities: CurriculumNodeEntityRow;
  curriculum_node_aliases: CurriculumNodeAliasRow;
  anki_kg_mapping_runs: AnkiKgMappingRunRow;
  anki_kg_mapping_candidates: AnkiKgMappingCandidateRow;
};

export type OntologyFoundationInserts = {
  specialties: Omit<SpecialtyRow, "created_at" | "updated_at">;
  curriculum_nodes: Omit<CurriculumNodeRow, "created_at" | "updated_at">;
  learning_objectives: Omit<LearningObjectiveRow, "created_at" | "updated_at">;
  concepts: Omit<ConceptRow, "created_at" | "updated_at">;
  canonical_entities: Omit<CanonicalEntityRow, "created_at" | "updated_at">;
  concept_canonical_entities: Omit<ConceptCanonicalEntityRow, "created_at" | "updated_at">;
  kg_automation_proposals: Omit<KgAutomationProposalRow, "created_at" | "updated_at">;
  concept_aliases: Omit<ConceptAliasRow, "created_at" | "updated_at">;
  external_sources: Omit<ExternalSourceRow, "created_at" | "updated_at">;
  external_questions: Omit<ExternalQuestionRow, "created_at" | "updated_at">;
  external_question_curriculum_mappings: Omit<
    ExternalQuestionCurriculumMappingRow,
    "created_at" | "updated_at"
  >;
  source_aliases: Omit<SourceAliasRow, "created_at" | "updated_at">;
  tags: Omit<TagRow, "created_at" | "updated_at">;
  tag_assignments: Omit<TagAssignmentRow, "created_at" | "updated_at">;
  anki_import_batches: Omit<AnkiImportBatchRow, "created_at" | "updated_at">;
  anki_decks: Omit<AnkiDeckRow, "created_at" | "updated_at">;
  anki_note_models: Omit<AnkiNoteModelRow, "created_at" | "updated_at">;
  anki_notes: Omit<AnkiNoteRow, "created_at" | "updated_at">;
  anki_cards: Omit<AnkiCardRow, "created_at" | "updated_at">;
  anki_tags: Omit<AnkiTagRow, "created_at" | "updated_at">;
  anki_note_tags: Omit<AnkiNoteTagRow, "created_at" | "updated_at">;
  anki_media_refs: Omit<AnkiMediaRefRow, "created_at" | "updated_at">;
  canonical_cards: Omit<CanonicalCardRow, "created_at" | "updated_at">;
  canonical_card_versions: Omit<CanonicalCardVersionRow, "created_at" | "updated_at">;
  card_quality_reviews: Omit<CardQualityReviewRow, "created_at" | "updated_at">;
  card_training_level_links: Omit<CardTrainingLevelLinkRow, "created_at" | "updated_at">;
  card_knowledge_links: Omit<CardKnowledgeLinkRow, "created_at" | "updated_at">;
  canonical_relationships: Omit<CanonicalRelationshipRow, "created_at" | "updated_at">;
  ontology_governance_actions: Omit<OntologyGovernanceActionRow, "created_at" | "updated_at">;
  ontology_provenance_records: Omit<OntologyProvenanceRecordRow, "created_at" | "updated_at">;
  curriculum_node_entities: Omit<CurriculumNodeEntityRow, "created_at" | "updated_at">;
  curriculum_node_aliases: Omit<CurriculumNodeAliasRow, "created_at" | "updated_at">;
  anki_kg_mapping_runs: Omit<AnkiKgMappingRunRow, "created_at" | "updated_at">;
  anki_kg_mapping_candidates: Omit<AnkiKgMappingCandidateRow, "created_at" | "updated_at">;
};

export type OntologyFoundationUpdates = {
  [K in keyof OntologyFoundationInserts]: Partial<OntologyFoundationInserts[K]>;
};
