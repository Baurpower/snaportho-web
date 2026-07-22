-- Additive persistence contracts for optional administrative ingestion of factory artifacts.
-- This migration creates no apply, approval, or publication path.
begin;

create type public.anki_kg_factory_stage as enum ('identity_validation','card_quality_analysis','deterministic_mapping','concept_extraction','entity_resolution','clinical_critic','coverage_critic','cross_card_consistency','machine_consensus','risk_classification','queue_routing','human_review_pending','publication_validation','completed','failed');

create table public.anki_kg_factory_runs (
  id uuid primary key, contract_version text not null, implementation_version text not null,
  deck_release_id uuid not null references public.anki_deck_releases(id) on delete restrict,
  kg_snapshot text not null, alias_snapshot text not null, rules_version text not null, prompt_version text not null,
  provider_id text null, model_id text null, input_manifest_checksum text not null, configuration_checksum text not null,
  status text not null default 'pending', started_at timestamptz not null, completed_at timestamptz null, failed_at timestamptz null,
  parent_run_id uuid null references public.anki_kg_factory_runs(id) on delete restrict,
  retry_of_run_id uuid null references public.anki_kg_factory_runs(id) on delete restrict,
  safe_metadata jsonb not null default '{}'::jsonb,
  constraint anki_kg_factory_runs_hashes check (input_manifest_checksum ~ '^[0-9a-f]{64}$' and configuration_checksum ~ '^[0-9a-f]{64}$'),
  constraint anki_kg_factory_runs_status check (status in ('pending','running','completed','failed')),
  constraint anki_kg_factory_runs_timestamps check ((status='completed')=(completed_at is not null) and (status='failed')=(failed_at is not null)),
  constraint anki_kg_factory_runs_safe check (public.educational_metadata_is_safe(safe_metadata)),
  constraint anki_kg_factory_runs_idempotent unique (deck_release_id,kg_snapshot,alias_snapshot,input_manifest_checksum,configuration_checksum)
);

create table public.anki_kg_factory_batches (
  id uuid primary key, factory_run_id uuid not null references public.anki_kg_factory_runs(id) on delete restrict,
  cohort_key text not null, ordered_card_versions uuid[] not null, batch_checksum text not null,
  current_stage public.anki_kg_factory_stage not null default 'identity_validation', status text not null default 'pending',
  retry_count integer not null default 0, supersedes_batch_id uuid null references public.anki_kg_factory_batches(id) on delete restrict,
  reviewer_priority_summary jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), completed_at timestamptz null,
  constraint anki_kg_factory_batches_hash check (batch_checksum ~ '^[0-9a-f]{64}$'),
  constraint anki_kg_factory_batches_status check (status in ('pending','running','completed','failed')),
  constraint anki_kg_factory_batches_retry check (retry_count >= 0),
  constraint anki_kg_factory_batches_cards check (cardinality(ordered_card_versions)>0),
  constraint anki_kg_factory_batches_safe check (public.educational_metadata_is_safe(reviewer_priority_summary)),
  constraint anki_kg_factory_batches_idempotent unique (factory_run_id,batch_checksum)
);

create table public.anki_kg_factory_card_assignments (
  id uuid primary key, factory_run_id uuid not null references public.anki_kg_factory_runs(id) on delete restrict,
  batch_id uuid not null references public.anki_kg_factory_batches(id) on delete restrict,
  deck_release_card_id uuid not null references public.anki_deck_release_cards(id) on delete restrict,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete restrict,
  content_hash text not null, note_guid text not null, card_ordinal integer not null,
  current_stage public.anki_kg_factory_stage not null default 'identity_validation', final_disposition text null,
  constraint anki_kg_factory_assignment_hash check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint anki_kg_factory_assignment_ordinal check (card_ordinal>=0),
  constraint anki_kg_factory_assignment_disposition check (final_disposition is null or final_disposition in ('rapid_human_review','individual_human_review','clinical_exception','missing_alias','missing_entity','card_improvement','duplicate_card','stale_version','cross_card_conflict','no_mapping_confirm')),
  constraint anki_kg_factory_assignment_identity unique (factory_run_id,canonical_card_id,canonical_card_version_id),
  constraint anki_kg_factory_assignment_source_identity unique (factory_run_id,note_guid,card_ordinal)
);

create table public.anki_kg_factory_stage_results (
  id uuid primary key, assignment_id uuid not null references public.anki_kg_factory_card_assignments(id) on delete restrict,
  stage public.anki_kg_factory_stage not null, contract_version text not null, stage_implementation_version text not null,
  input_checksum text not null, output_checksum text not null, status text not null, result jsonb not null,
  warnings text[] not null default '{}', failure_codes text[] not null default '{}', retry_count integer not null default 0,
  started_at timestamptz not null, completed_at timestamptz null,
  supersedes_result_id uuid null references public.anki_kg_factory_stage_results(id) on delete restrict,
  constraint anki_kg_factory_stage_hashes check (input_checksum ~ '^[0-9a-f]{64}$' and output_checksum ~ '^[0-9a-f]{64}$'),
  constraint anki_kg_factory_stage_status check (status in ('completed','failed','skipped')),
  constraint anki_kg_factory_stage_retry check (retry_count>=0),
  constraint anki_kg_factory_stage_safe check (public.educational_metadata_is_safe(result)),
  constraint anki_kg_factory_stage_idempotent unique (assignment_id,stage,input_checksum,retry_count)
);

create table public.anki_kg_factory_machine_reviews (
  id uuid primary key, stage_result_id uuid not null references public.anki_kg_factory_stage_results(id) on delete restrict,
  canonical_entity_id uuid null references public.canonical_entities(id) on delete restrict,
  reviewer_type text not null, reviewer_version text not null, decision text not null, confidence numeric(5,4) not null,
  reason_codes text[] not null default '{}', competing_entity_ids uuid[] not null default '{}', evidence_hashes text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint anki_kg_factory_machine_review_decision check (decision in ('support','oppose','uncertain')),
  constraint anki_kg_factory_machine_review_confidence check (confidence between 0 and 1),
  constraint anki_kg_factory_machine_review_hashes check (array_to_string(evidence_hashes,'') ~ '^([0-9a-f]{64})*$'),
  constraint anki_kg_factory_machine_review_identity unique (stage_result_id,reviewer_type,reviewer_version,canonical_entity_id)
);

create table public.anki_kg_factory_consensus_decisions (
  id uuid primary key, assignment_id uuid not null references public.anki_kg_factory_card_assignments(id) on delete restrict,
  canonical_entity_id uuid null references public.canonical_entities(id) on delete restrict, outcome text not null,
  dissent_preserved boolean not null, production_eligible boolean not null default false,
  decision_checksum text not null, safe_rationale jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint anki_kg_factory_consensus_outcome check (outcome in ('strong_support','qualified_support','disputed','insufficient_evidence','no_mapping_supported','kg_gap','alias_gap','card_improvement_required')),
  constraint anki_kg_factory_consensus_machine_only check (production_eligible=false),
  constraint anki_kg_factory_consensus_hash check (decision_checksum ~ '^[0-9a-f]{64}$'),
  constraint anki_kg_factory_consensus_safe check (public.educational_metadata_is_safe(safe_rationale)),
  constraint anki_kg_factory_consensus_identity unique nulls not distinct (assignment_id,canonical_entity_id,decision_checksum)
);

create table public.anki_kg_factory_queue_items (
  id uuid primary key, assignment_id uuid not null references public.anki_kg_factory_card_assignments(id) on delete restrict,
  consensus_decision_id uuid not null references public.anki_kg_factory_consensus_decisions(id) on delete restrict,
  canonical_entity_id uuid null references public.canonical_entities(id) on delete restrict, queue_name text not null,
  risk_tier text not null, priority_score integer not null, reason_codes text[] not null default '{}', evidence_hashes text[] not null default '{}',
  required_human_action text not null, lifecycle_status text not null default 'pending_human_review', created_at timestamptz not null default now(),
  constraint anki_kg_factory_queue_name check (queue_name in ('rapid_human_review','individual_human_review','clinical_exception','missing_alias','missing_entity','card_improvement','duplicate_card','stale_version','cross_card_conflict','publication_candidate','no_mapping_confirm')),
  constraint anki_kg_factory_queue_risk check (risk_tier in ('A','B','C','D')),
  constraint anki_kg_factory_queue_priority check (priority_score between 0 and 100),
  constraint anki_kg_factory_queue_lifecycle check (lifecycle_status in ('pending_human_review','resolved','superseded')),
  constraint anki_kg_factory_queue_identity unique (assignment_id,queue_name,consensus_decision_id)
);

create table public.anki_kg_factory_artifacts (
  id uuid primary key, factory_run_id uuid not null references public.anki_kg_factory_runs(id) on delete restrict,
  batch_id uuid null references public.anki_kg_factory_batches(id) on delete restrict, artifact_type text not null,
  contract_version text not null, artifact_checksum text not null, relative_path text not null, safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), supersedes_artifact_id uuid null references public.anki_kg_factory_artifacts(id) on delete restrict,
  constraint anki_kg_factory_artifact_hash check (artifact_checksum ~ '^[0-9a-f]{64}$'),
  constraint anki_kg_factory_artifact_path check (relative_path !~ '(^/|\.\.)'),
  constraint anki_kg_factory_artifact_safe check (public.educational_metadata_is_safe(safe_metadata)),
  constraint anki_kg_factory_artifact_identity unique nulls not distinct (factory_run_id,batch_id,artifact_type,artifact_checksum)
);

create function public.guard_anki_kg_factory_immutable() returns trigger language plpgsql as $$
begin raise exception 'completed factory results and machine reviews are immutable'; end $$;
create trigger guard_completed_factory_stage_result before update or delete on public.anki_kg_factory_stage_results for each row when (old.status='completed') execute function public.guard_anki_kg_factory_immutable();
create trigger guard_factory_machine_review before update or delete on public.anki_kg_factory_machine_reviews for each row execute function public.guard_anki_kg_factory_immutable();

do $$ declare table_name text; begin foreach table_name in array array['anki_kg_factory_runs','anki_kg_factory_batches','anki_kg_factory_card_assignments','anki_kg_factory_stage_results','anki_kg_factory_machine_reviews','anki_kg_factory_consensus_decisions','anki_kg_factory_queue_items','anki_kg_factory_artifacts'] loop execute format('alter table public.%I enable row level security',table_name); execute format('alter table public.%I force row level security',table_name); execute format('revoke all on public.%I from anon, authenticated, service_role',table_name); execute format('grant select, insert, update, delete on public.%I to service_role',table_name); end loop; end $$;

comment on table public.anki_kg_factory_runs is 'Administrative, review-gated Anki-to-KG factory run pins; never publication authority.';
commit;
