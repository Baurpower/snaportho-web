-- ============================================================================
-- Next-generation knowledge graph foundation
-- Additive canonical entity, relationship, governance, provenance, and
-- curriculum-bridge infrastructure without breaking the current pipeline.
-- ============================================================================

alter table public.source_aliases
  drop constraint if exists source_aliases_entity_type_check;

alter table public.source_aliases
  add constraint source_aliases_entity_type_check
    check (
      entity_type in (
        'specialty',
        'curriculum_node',
        'learning_objective',
        'concept',
        'canonical_entity',
        'tag',
        'external_question'
      )
    );

alter table public.tag_assignments
  drop constraint if exists tag_assignments_entity_type_check;

alter table public.tag_assignments
  add constraint tag_assignments_entity_type_check
    check (
      entity_type in (
        'specialty',
        'curriculum_node',
        'learning_objective',
        'concept',
        'canonical_entity',
        'external_source',
        'external_question'
      )
    );

create table if not exists public.canonical_entities (
  id uuid primary key default gen_random_uuid(),
  source_concept_id uuid null references public.concepts(id) on delete set null,
  entity_type text not null,
  preferred_label text not null,
  normalized_label text not null,
  slug text null,
  description text null,
  status text not null default 'proposed',
  review_status text not null default 'unreviewed',
  created_from_source_id uuid null references public.external_sources(id) on delete set null,
  replacement_entity_id uuid null references public.canonical_entities(id) on delete set null,
  deprecated_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_entities_type_check
    check (
      entity_type in (
        'condition',
        'procedure',
        'anatomy_structure',
        'classification_system',
        'complication',
        'diagnostic_test',
        'imaging_finding',
        'implant',
        'treatment_principle',
        'biomechanics_concept',
        'exam_maneuver'
      )
    ),
  constraint canonical_entities_status_check
    check (
      status in (
        'proposed',
        'draft',
        'reviewed',
        'canonical',
        'deprecated',
        'replaced',
        'merged',
        'split'
      )
    ),
  constraint canonical_entities_review_status_check
    check (
      review_status in (
        'unreviewed',
        'in_review',
        'approved',
        'rejected'
      )
    ),
  constraint canonical_entities_replacement_not_self_check
    check (replacement_entity_id is null or replacement_entity_id <> id)
);

comment on table public.canonical_entities is
  'Typed canonical orthopaedic domain entities. Coexists with concepts during the evolutionary migration away from curriculum-node-centered truth.';
comment on column public.canonical_entities.source_concept_id is
  'Optional bridge back to an existing concept row while the next-generation entity layer is adopted incrementally.';
comment on column public.canonical_entities.status is
  'Lifecycle state for durable ontology governance. Canonical entities should be deprecated or replaced rather than destructively deleted.';
comment on column public.canonical_entities.created_from_source_id is
  'Optional source system that first motivated or seeded the entity.';

create unique index if not exists canonical_entities_slug_unique_idx
  on public.canonical_entities (slug)
  where slug is not null;

create index if not exists canonical_entities_type_label_idx
  on public.canonical_entities (entity_type, normalized_label, is_active);

create index if not exists canonical_entities_source_concept_idx
  on public.canonical_entities (source_concept_id);

create index if not exists canonical_entities_status_idx
  on public.canonical_entities (status, review_status, is_active);

drop trigger if exists set_canonical_entities_updated_at on public.canonical_entities;
create trigger set_canonical_entities_updated_at
  before update on public.canonical_entities
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.ontology_governance_actions (
  id uuid primary key default gen_random_uuid(),
  source_entity_type text not null,
  source_entity_id uuid not null,
  target_entity_type text null,
  target_entity_ids uuid[] not null default '{}'::uuid[],
  action_type text not null,
  reason text null,
  actor_user_id uuid null,
  review_status text not null default 'proposed',
  notes text null,
  downstream_mappings_migrated boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  acted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ontology_governance_actions_source_type_check
    check (
      source_entity_type in (
        'concept',
        'canonical_entity',
        'canonical_relationship',
        'curriculum_node_entity'
      )
    ),
  constraint ontology_governance_actions_target_type_check
    check (
      target_entity_type is null
      or target_entity_type in (
        'concept',
        'canonical_entity',
        'canonical_relationship',
        'curriculum_node_entity'
      )
    ),
  constraint ontology_governance_actions_action_type_check
    check (
      action_type in (
        'merge',
        'split',
        'rename',
        'deprecate',
        'replace',
        'restore'
      )
    ),
  constraint ontology_governance_actions_review_status_check
    check (
      review_status in (
        'proposed',
        'in_review',
        'approved',
        'rejected',
        'applied'
      )
    ),
  constraint ontology_governance_actions_target_shape_check
    check (
      (
        action_type = 'split'
        and target_entity_type is not null
        and cardinality(target_entity_ids) >= 2
      )
      or (
        action_type in ('merge', 'replace')
        and target_entity_type is not null
        and cardinality(target_entity_ids) >= 1
      )
      or (
        action_type in ('rename', 'deprecate', 'restore')
        and target_entity_type is null
        and cardinality(target_entity_ids) = 0
      )
    )
);

comment on table public.ontology_governance_actions is
  'Lineage and governance ledger for merge, split, rename, deprecate, replace, and restore actions across current concepts and future typed canonical entities.';
comment on column public.ontology_governance_actions.target_entity_ids is
  'Target lineage ids. Supports single-target replacements and multi-target splits without assuming one canonical entity table forever.';
comment on column public.ontology_governance_actions.downstream_mappings_migrated is
  'Tracks whether downstream mappings and overlays have been reconciled after the governance action was approved.';

create index if not exists ontology_governance_actions_source_idx
  on public.ontology_governance_actions (source_entity_type, source_entity_id, created_at desc);

create index if not exists ontology_governance_actions_action_status_idx
  on public.ontology_governance_actions (action_type, review_status, acted_at desc);

create index if not exists ontology_governance_actions_target_ids_idx
  on public.ontology_governance_actions using gin (target_entity_ids);

drop trigger if exists set_ontology_governance_actions_updated_at
  on public.ontology_governance_actions;
create trigger set_ontology_governance_actions_updated_at
  before update on public.ontology_governance_actions
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.canonical_relationships (
  id uuid primary key default gen_random_uuid(),
  subject_entity_type text not null,
  subject_entity_id uuid not null,
  predicate text not null,
  object_entity_type text not null,
  object_entity_id uuid not null,
  confidence numeric(4,3) not null default 1.000,
  review_status text not null default 'unreviewed',
  provenance_status text not null default 'pending',
  lifecycle_status text not null default 'active',
  created_by_source text not null default 'system',
  deprecated_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_relationships_subject_type_check
    check (
      subject_entity_type in (
        'canonical_entity',
        'concept',
        'canonical_card',
        'canonical_question_item',
        'article',
        'case_module',
        'curriculum_node',
        'learning_objective',
        'training_level'
      )
    ),
  constraint canonical_relationships_object_type_check
    check (
      object_entity_type in (
        'canonical_entity',
        'concept',
        'canonical_card',
        'canonical_question_item',
        'article',
        'case_module',
        'curriculum_node',
        'learning_objective',
        'training_level'
      )
    ),
  constraint canonical_relationships_predicate_check
    check (
      predicate in (
        'treats',
        'treated_by',
        'indicated_for',
        'contraindicated_for',
        'involves_anatomy',
        'uses_implant',
        'uses_approach',
        'has_classification',
        'has_complication',
        'requires_imaging',
        'tested_by',
        'examines',
        'prerequisite_for',
        'commonly_confused_with',
        'differential_for',
        'supported_by_card',
        'supported_by_question',
        'supported_by_article',
        'exemplified_by_case',
        'covered_by_module',
        'covered_by_curriculum_node',
        'taught_by_learning_objective',
        'expected_at_training_level'
      )
    ),
  constraint canonical_relationships_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint canonical_relationships_review_status_check
    check (
      review_status in (
        'unreviewed',
        'in_review',
        'approved',
        'rejected'
      )
    ),
  constraint canonical_relationships_provenance_status_check
    check (
      provenance_status in (
        'pending',
        'source_attached',
        'reviewed',
        'conflicted'
      )
    ),
  constraint canonical_relationships_lifecycle_status_check
    check (
      lifecycle_status in (
        'active',
        'deprecated',
        'replaced'
      )
    ),
  constraint canonical_relationships_created_by_source_check
    check (
      created_by_source in (
        'system',
        'manual',
        'import',
        'ai_suggestion',
        'reviewed'
      )
    )
);

comment on table public.canonical_relationships is
  'Typed semantic edges for the next-generation SnapOrtho graph. Supports domain-to-domain, domain-to-educational-object, and domain-to-curriculum relationships without relying on hierarchy alone.';
comment on column public.canonical_relationships.provenance_status is
  'Whether the edge still needs source support, has attached support, has been editorially reviewed, or remains in conflict.';

create unique index if not exists canonical_relationships_unique_edge_idx
  on public.canonical_relationships (
    subject_entity_type,
    subject_entity_id,
    predicate,
    object_entity_type,
    object_entity_id
  )
  where is_active = true;

create index if not exists canonical_relationships_subject_idx
  on public.canonical_relationships (
    subject_entity_type,
    subject_entity_id,
    predicate,
    review_status
  );

create index if not exists canonical_relationships_object_idx
  on public.canonical_relationships (
    object_entity_type,
    object_entity_id,
    predicate,
    review_status
  );

create index if not exists canonical_relationships_lifecycle_idx
  on public.canonical_relationships (lifecycle_status, provenance_status, is_active);

drop trigger if exists set_canonical_relationships_updated_at on public.canonical_relationships;
create trigger set_canonical_relationships_updated_at
  before update on public.canonical_relationships
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.ontology_provenance_records (
  id uuid primary key default gen_random_uuid(),
  subject_entity_type text not null,
  subject_entity_id uuid not null,
  source_artifact_id uuid null,
  source_artifact_type text not null,
  source_name text not null,
  source_external_id text null,
  extraction_method text not null default 'manual',
  confidence numeric(4,3) not null default 1.000,
  reviewer_status text not null default 'unreviewed',
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  notes text null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ontology_provenance_records_subject_type_check
    check (
      subject_entity_type in (
        'canonical_entity',
        'concept',
        'concept_alias',
        'source_alias',
        'canonical_relationship',
        'card_knowledge_link',
        'external_question_curriculum_mapping',
        'ontology_governance_action',
        'curriculum_node_entity',
        'canonical_card',
        'canonical_card_version',
        'external_question',
        'educational_claim'
      )
    ),
  constraint ontology_provenance_records_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint ontology_provenance_records_reviewer_status_check
    check (
      reviewer_status in (
        'unreviewed',
        'in_review',
        'approved',
        'rejected',
        'conflicted'
      )
    )
);

comment on table public.ontology_provenance_records is
  'Granular provenance records for canonical entities, aliases, semantic relationships, mappings, governance actions, and future educational claims.';
comment on column public.ontology_provenance_records.source_artifact_id is
  'Optional UUID of the source-native or canonical artifact that supports the subject assertion. Kept polymorphic to avoid forcing one source table forever.';

create index if not exists ontology_provenance_records_subject_idx
  on public.ontology_provenance_records (subject_entity_type, subject_entity_id, reviewer_status);

create index if not exists ontology_provenance_records_source_idx
  on public.ontology_provenance_records (source_artifact_type, source_external_id);

create index if not exists ontology_provenance_records_review_idx
  on public.ontology_provenance_records (reviewer_status, confidence desc, created_at desc);

drop trigger if exists set_ontology_provenance_records_updated_at
  on public.ontology_provenance_records;
create trigger set_ontology_provenance_records_updated_at
  before update on public.ontology_provenance_records
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.curriculum_node_entities (
  id uuid primary key default gen_random_uuid(),
  curriculum_node_id uuid not null references public.curriculum_nodes(id) on delete cascade,
  canonical_entity_id uuid null references public.canonical_entities(id) on delete restrict,
  concept_id uuid null references public.concepts(id) on delete restrict,
  relation_type text not null default 'primary_coverage',
  confidence numeric(4,3) not null default 1.000,
  review_status text not null default 'unreviewed',
  provenance_status text not null default 'pending',
  deprecated_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_node_entities_exactly_one_target_check
    check (
      ((canonical_entity_id is not null)::integer + (concept_id is not null)::integer) = 1
    ),
  constraint curriculum_node_entities_relation_type_check
    check (
      relation_type in (
        'primary_coverage',
        'secondary_coverage',
        'objective_anchor',
        'board_relevance',
        'rotation_relevance',
        'reference_only'
      )
    ),
  constraint curriculum_node_entities_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint curriculum_node_entities_review_status_check
    check (
      review_status in (
        'unreviewed',
        'in_review',
        'approved',
        'rejected'
      )
    ),
  constraint curriculum_node_entities_provenance_status_check
    check (
      provenance_status in (
        'pending',
        'source_attached',
        'reviewed',
        'conflicted'
      )
    )
);

comment on table public.curriculum_node_entities is
  'Bridge between curriculum overlays and canonical domain entities. Demotes curriculum_nodes from being treated as primary domain truth while preserving current overlays.';
comment on column public.curriculum_node_entities.concept_id is
  'Transitional bridge for the current concepts table so curriculum overlays can move toward typed canonical entities without forcing an immediate full migration.';

create unique index if not exists curriculum_node_entities_unique_target_idx
  on public.curriculum_node_entities (
    curriculum_node_id,
    coalesce(canonical_entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(concept_id, '00000000-0000-0000-0000-000000000000'::uuid),
    relation_type
  )
  where is_active = true;

create index if not exists curriculum_node_entities_curriculum_idx
  on public.curriculum_node_entities (curriculum_node_id, relation_type, review_status);

create index if not exists curriculum_node_entities_canonical_entity_idx
  on public.curriculum_node_entities (canonical_entity_id, relation_type, review_status);

create index if not exists curriculum_node_entities_concept_idx
  on public.curriculum_node_entities (concept_id, relation_type, review_status);

drop trigger if exists set_curriculum_node_entities_updated_at on public.curriculum_node_entities;
create trigger set_curriculum_node_entities_updated_at
  before update on public.curriculum_node_entities
  for each row
  execute function public.tg_set_updated_at();

grant select, insert, update on table public.canonical_entities to service_role;
grant select, insert, update on table public.ontology_governance_actions to service_role;
grant select, insert, update on table public.canonical_relationships to service_role;
grant select, insert, update on table public.ontology_provenance_records to service_role;
grant select, insert, update on table public.curriculum_node_entities to service_role;
