-- Legacy ontology retargeting foundation (controlled migration toward canonical entities).
--
-- Context (live audit at authoring time):
--   * 0 concept rows exist; the legacy "concept" layer is empty.
--   * All legacy educational mappings flow through curriculum_nodes:
--       - card_knowledge_links: 1,111 active, all via curriculum_node_id.
--       - external_question_curriculum_mappings: 7,557 active, 7,493 via node.
--   * Retargeting therefore proceeds via the curriculum_node -> canonical_entity
--     bridge (curriculum_node_entities), NOT via concepts. The source_concept_id
--     columns below are kept for forward-compatibility but are null today.
--
-- Design: PARALLEL canonical mapping tables. We never mutate or delete legacy
-- mapping rows. Canonical mappings are additive and carry full provenance +
-- rollback metadata so a batch can be reversed by is_active flag or hard delete.
--
-- This migration is constraint/table DDL only. It inserts no mapping rows.

begin;

-- Card -> canonical entity (parallel to card_knowledge_links).
create table if not exists public.card_canonical_entity_links (
  id uuid primary key default gen_random_uuid(),
  canonical_card_id uuid not null references public.canonical_cards(id) on delete cascade,
  canonical_entity_id uuid not null references public.canonical_entities(id) on delete restrict,
  -- Provenance of the retarget path (all null-safe; whichever applied is set).
  source_curriculum_node_id uuid null references public.curriculum_nodes(id) on delete set null,
  source_concept_id uuid null references public.concepts(id) on delete set null,
  source_card_knowledge_link_id uuid null references public.card_knowledge_links(id) on delete set null,
  source_curriculum_node_entity_id uuid null references public.curriculum_node_entities(id) on delete set null,
  retarget_path text not null default 'curriculum_node_bridge',
  match_basis text not null default 'curriculum_inferred',
  mapping_confidence numeric(4,3) not null default 0.000,
  review_status text not null default 'approved',
  created_by_source text not null default 'legacy_ontology_retargeting',
  -- Rollback metadata.
  migration_proposal_id uuid null references public.kg_automation_proposals(id) on delete set null,
  rollback_batch_key text null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_canonical_entity_links_path_check
    check (retarget_path in ('curriculum_node_bridge', 'concept_bridge', 'direct_exact')),
  constraint card_canonical_entity_links_basis_check
    check (match_basis in ('exact_label', 'alias', 'curriculum_inferred', 'concept_bridge')),
  constraint card_canonical_entity_links_review_status_check
    check (review_status in ('unreviewed', 'in_review', 'approved', 'rejected', 'superseded')),
  constraint card_canonical_entity_links_created_by_source_check
    check (created_by_source in ('legacy_ontology_retargeting', 'manual', 'reviewed', 'import', 'ai_suggestion', 'system')),
  constraint card_canonical_entity_links_confidence_check
    check (mapping_confidence >= 0 and mapping_confidence <= 1)
);

comment on table public.card_canonical_entity_links is
  'Parallel canonical-entity mapping for cards. Additive retargeting target; legacy card_knowledge_links are never mutated. Carries rollback metadata (migration_proposal_id, rollback_batch_key).';

create unique index if not exists card_canonical_entity_links_unique_active_idx
  on public.card_canonical_entity_links (canonical_card_id, canonical_entity_id)
  where is_active = true;
create index if not exists card_canonical_entity_links_card_idx
  on public.card_canonical_entity_links (canonical_card_id, review_status, is_active);
create index if not exists card_canonical_entity_links_entity_idx
  on public.card_canonical_entity_links (canonical_entity_id, review_status, is_active);
create index if not exists card_canonical_entity_links_batch_idx
  on public.card_canonical_entity_links (rollback_batch_key);
create index if not exists card_canonical_entity_links_proposal_idx
  on public.card_canonical_entity_links (migration_proposal_id);

drop trigger if exists set_card_canonical_entity_links_updated_at on public.card_canonical_entity_links;
create trigger set_card_canonical_entity_links_updated_at
  before update on public.card_canonical_entity_links
  for each row
  execute function public.tg_set_updated_at();

-- Question -> canonical entity (parallel to external_question_curriculum_mappings).
create table if not exists public.question_canonical_entity_links (
  id uuid primary key default gen_random_uuid(),
  external_question_id uuid not null references public.external_questions(id) on delete cascade,
  canonical_entity_id uuid not null references public.canonical_entities(id) on delete restrict,
  source_curriculum_node_id uuid null references public.curriculum_nodes(id) on delete set null,
  source_concept_id uuid null references public.concepts(id) on delete set null,
  source_question_mapping_id uuid null references public.external_question_curriculum_mappings(id) on delete set null,
  source_curriculum_node_entity_id uuid null references public.curriculum_node_entities(id) on delete set null,
  retarget_path text not null default 'curriculum_node_bridge',
  match_basis text not null default 'curriculum_inferred',
  mapping_confidence numeric(4,3) not null default 0.000,
  review_status text not null default 'approved',
  created_by_source text not null default 'legacy_ontology_retargeting',
  migration_proposal_id uuid null references public.kg_automation_proposals(id) on delete set null,
  rollback_batch_key text null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_canonical_entity_links_path_check
    check (retarget_path in ('curriculum_node_bridge', 'concept_bridge', 'direct_exact')),
  constraint question_canonical_entity_links_basis_check
    check (match_basis in ('exact_label', 'alias', 'curriculum_inferred', 'concept_bridge')),
  constraint question_canonical_entity_links_review_status_check
    check (review_status in ('unreviewed', 'in_review', 'approved', 'rejected', 'superseded')),
  constraint question_canonical_entity_links_created_by_source_check
    check (created_by_source in ('legacy_ontology_retargeting', 'manual', 'reviewed', 'import', 'ai_suggestion', 'system')),
  constraint question_canonical_entity_links_confidence_check
    check (mapping_confidence >= 0 and mapping_confidence <= 1)
);

comment on table public.question_canonical_entity_links is
  'Parallel canonical-entity mapping for external questions. Additive retargeting target; legacy external_question_curriculum_mappings are never mutated. Carries rollback metadata.';

create unique index if not exists question_canonical_entity_links_unique_active_idx
  on public.question_canonical_entity_links (external_question_id, canonical_entity_id)
  where is_active = true;
create index if not exists question_canonical_entity_links_question_idx
  on public.question_canonical_entity_links (external_question_id, review_status, is_active);
create index if not exists question_canonical_entity_links_entity_idx
  on public.question_canonical_entity_links (canonical_entity_id, review_status, is_active);
create index if not exists question_canonical_entity_links_batch_idx
  on public.question_canonical_entity_links (rollback_batch_key);
create index if not exists question_canonical_entity_links_proposal_idx
  on public.question_canonical_entity_links (migration_proposal_id);

drop trigger if exists set_question_canonical_entity_links_updated_at on public.question_canonical_entity_links;
create trigger set_question_canonical_entity_links_updated_at
  before update on public.question_canonical_entity_links
  for each row
  execute function public.tg_set_updated_at();

-- Add retargeting proposal types to the automation proposal vocabulary.
alter table public.kg_automation_proposals
  drop constraint if exists kg_automation_proposals_type_check;
alter table public.kg_automation_proposals
  add constraint kg_automation_proposals_type_check
  check (
    proposal_type in (
      'create_canonical_entity',
      'link_curriculum_node_to_entity',
      'link_concept_to_entity',
      'add_entity_alias',
      'add_canonical_relationship',
      'add_provenance_record',
      'flag_duplicate_entity',
      'flag_ambiguous_mapping',
      'flag_possible_split',
      'flag_possible_merge',
      'retarget_card_to_entity',
      'retarget_question_to_entity'
    )
  );

-- Service-role-only access, consistent with the rest of the KG schema.
grant select, insert, update on public.card_canonical_entity_links to service_role;
grant select, insert, update on public.question_canonical_entity_links to service_role;

commit;
