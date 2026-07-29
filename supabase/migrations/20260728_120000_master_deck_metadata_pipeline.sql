-- Versioned metadata taxonomy, parallel agent persistence, review ledger, and
-- deterministic Anki tag manifests for the SnapOrtho master deck.
-- Additive DDL only: this migration does not seed, run, accept, or publish data.

begin;

create function public.metadata_anki_tag_array_is_valid(value text[], allow_empty boolean)
returns boolean
language sql
immutable
parallel safe
as $$
  select
    (allow_empty or cardinality(value) > 0)
    and coalesce(bool_and(tag ~ '^(SnapOrtho|Legacy)(::[A-Za-z0-9][A-Za-z0-9_]*)+$'), allow_empty)
  from unnest(value) tag;
$$;

create function public.metadata_evidence_spans_are_valid(input_value jsonb)
returns boolean
language sql
immutable
parallel safe
as $$
  select jsonb_typeof(input_value) = 'array'
    and jsonb_array_length(input_value) > 0
    and coalesce((
      select bool_and(
        jsonb_typeof(item) = 'object'
        and item ?& array['fieldName','start','end','contentHash']
        and char_length(item ->> 'fieldName') between 1 and 100
        and (item ->> 'start') ~ '^[0-9]+$'
        and (item ->> 'end') ~ '^[0-9]+$'
        and (item ->> 'start')::integer <= (item ->> 'end')::integer
        and (item ->> 'contentHash') ~ '^[0-9a-f]{64}$'
      )
      from jsonb_array_elements(
        case
          when jsonb_typeof(input_value) = 'array' then input_value
          else '[]'::jsonb
        end
      ) as element(item)
    ), false);
$$;

create table public.metadata_taxonomy_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  lifecycle_status text not null default 'draft',
  definition_checksum text not null,
  parent_version_id uuid null references public.metadata_taxonomy_versions(id) on delete restrict,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  frozen_at timestamptz null,
  activated_at timestamptz null,
  retired_at timestamptz null,
  constraint metadata_taxonomy_versions_version_check
    check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$'),
  constraint metadata_taxonomy_versions_lifecycle_check
    check (lifecycle_status in ('draft','frozen','active','retired')),
  constraint metadata_taxonomy_versions_checksum_check
    check (definition_checksum ~ '^[0-9a-f]{64}$'),
  constraint metadata_taxonomy_versions_parent_check
    check (parent_version_id is null or parent_version_id <> id),
  constraint metadata_taxonomy_versions_metadata_check
    check (public.educational_metadata_is_safe(safe_metadata)),
  constraint metadata_taxonomy_versions_timestamps_check check (
    (lifecycle_status = 'draft' and frozen_at is null and activated_at is null and retired_at is null)
    or (lifecycle_status = 'frozen' and frozen_at is not null and activated_at is null and retired_at is null)
    or (lifecycle_status = 'active' and frozen_at is not null and activated_at is not null and retired_at is null)
    or (lifecycle_status = 'retired' and frozen_at is not null and activated_at is not null and retired_at is not null)
  )
);

create unique index metadata_taxonomy_versions_one_active_idx
  on public.metadata_taxonomy_versions ((true))
  where lifecycle_status = 'active';

create table public.metadata_concepts (
  id uuid primary key default gen_random_uuid(),
  taxonomy_version_id uuid not null references public.metadata_taxonomy_versions(id) on delete restrict,
  facet text not null,
  stable_key text not null,
  slug text not null,
  preferred_label text not null,
  definition text not null,
  parent_concept_id uuid null references public.metadata_concepts(id) on delete restrict,
  external_codes jsonb not null default '{}'::jsonb,
  applicability_rules jsonb not null default '{}'::jsonb,
  is_exportable boolean not null default true,
  lifecycle_status text not null default 'active',
  replacement_concept_id uuid null references public.metadata_concepts(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint metadata_concepts_facet_check check (
    facet in ('specialty','laterality','content_type','clinical_phase','learner_level','yield','source','workflow')
  ),
  constraint metadata_concepts_key_check check (stable_key ~ '^[a-z][a-z0-9._-]{1,127}$'),
  constraint metadata_concepts_slug_check check (slug ~ '^[A-Za-z0-9][A-Za-z0-9_]{0,127}$'),
  constraint metadata_concepts_label_check check (char_length(preferred_label) between 1 and 200),
  constraint metadata_concepts_definition_check check (char_length(definition) between 1 and 4000),
  constraint metadata_concepts_external_codes_check check (
    jsonb_typeof(external_codes) = 'object' and public.educational_metadata_is_safe(external_codes)
  ),
  constraint metadata_concepts_rules_check check (
    jsonb_typeof(applicability_rules) = 'object' and public.educational_metadata_is_safe(applicability_rules)
  ),
  constraint metadata_concepts_lifecycle_check
    check (lifecycle_status in ('active','deprecated','replaced')),
  constraint metadata_concepts_replacement_check check (
    (lifecycle_status = 'replaced') = (replacement_concept_id is not null)
    and (replacement_concept_id is null or replacement_concept_id <> id)
  ),
  constraint metadata_concepts_version_key_unique unique (taxonomy_version_id, stable_key),
  constraint metadata_concepts_version_facet_slug_unique unique (taxonomy_version_id, facet, slug)
);

create index metadata_concepts_parent_idx on public.metadata_concepts (parent_concept_id);
create index metadata_concepts_lookup_idx
  on public.metadata_concepts (taxonomy_version_id, facet, lifecycle_status, slug);

create table public.metadata_concept_aliases (
  id uuid primary key default gen_random_uuid(),
  taxonomy_version_id uuid not null references public.metadata_taxonomy_versions(id) on delete restrict,
  metadata_concept_id uuid not null references public.metadata_concepts(id) on delete restrict,
  alias text not null,
  normalized_alias text not null,
  alias_type text not null,
  source text not null,
  language_code text not null default 'en',
  review_status text not null default 'proposed',
  reviewer_user_id uuid null references auth.users(id) on delete restrict,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint metadata_concept_aliases_alias_check
    check (char_length(alias) between 1 and 500 and char_length(normalized_alias) between 1 and 500),
  constraint metadata_concept_aliases_type_check
    check (alias_type in ('synonym','abbreviation','legacy_tag','misspelling','source_path')),
  constraint metadata_concept_aliases_source_check check (char_length(source) between 1 and 200),
  constraint metadata_concept_aliases_language_check check (language_code ~ '^[a-z]{2,3}(?:-[A-Z]{2})?$'),
  constraint metadata_concept_aliases_review_check
    check (review_status in ('proposed','approved','rejected','superseded')),
  constraint metadata_concept_aliases_reviewer_check check (
    (review_status = 'proposed' and reviewer_user_id is null and reviewed_at is null)
    or (review_status <> 'proposed' and reviewer_user_id is not null and reviewed_at is not null)
  ),
  constraint metadata_concept_aliases_identity_unique
    unique (taxonomy_version_id, normalized_alias, language_code, metadata_concept_id)
);

create index metadata_concept_aliases_lookup_idx
  on public.metadata_concept_aliases (taxonomy_version_id, normalized_alias)
  where review_status = 'approved';

create table public.metadata_pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  deck_release_id uuid not null references public.anki_deck_releases(id) on delete restrict,
  taxonomy_version_id uuid not null references public.metadata_taxonomy_versions(id) on delete restrict,
  cohort_kind text not null,
  cohort_definition jsonb not null,
  input_manifest_checksum text not null,
  configuration_checksum text not null,
  deterministic_rules_version text not null,
  deterministic_rules_checksum text not null,
  prompt_bundle_version text not null,
  prompt_bundle_checksum text not null,
  model_manifest jsonb not null,
  export_policy_version text not null,
  export_policy_checksum text not null,
  status text not null default 'pending',
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  failed_at timestamptz null,
  constraint metadata_pipeline_runs_key_check check (run_key ~ '^[a-z0-9][a-z0-9._-]{2,127}$'),
  constraint metadata_pipeline_runs_cohort_kind_check
    check (cohort_kind in ('published_release','full_import','pilot','deck_branch','explicit_card_versions')),
  constraint metadata_pipeline_runs_cohort_check
    check (jsonb_typeof(cohort_definition) = 'object' and public.educational_metadata_is_safe(cohort_definition)),
  constraint metadata_pipeline_runs_hashes_check check (
    input_manifest_checksum ~ '^[0-9a-f]{64}$'
    and configuration_checksum ~ '^[0-9a-f]{64}$'
    and deterministic_rules_checksum ~ '^[0-9a-f]{64}$'
    and prompt_bundle_checksum ~ '^[0-9a-f]{64}$'
    and export_policy_checksum ~ '^[0-9a-f]{64}$'
  ),
  constraint metadata_pipeline_runs_models_check
    check (jsonb_typeof(model_manifest) = 'object' and public.educational_metadata_is_safe(model_manifest)),
  constraint metadata_pipeline_runs_status_check
    check (status in ('pending','running','completed','failed','cancelled')),
  constraint metadata_pipeline_runs_metadata_check
    check (public.educational_metadata_is_safe(safe_metadata)),
  constraint metadata_pipeline_runs_timestamps_check check (
    (status = 'pending' and started_at is null and completed_at is null and failed_at is null)
    or (status = 'running' and started_at is not null and completed_at is null and failed_at is null)
    or (status = 'completed' and started_at is not null and completed_at is not null and failed_at is null)
    or (status = 'failed' and started_at is not null and completed_at is null and failed_at is not null)
    or (status = 'cancelled' and completed_at is not null)
  ),
  constraint metadata_pipeline_runs_idempotent unique (
    deck_release_id, taxonomy_version_id, input_manifest_checksum, configuration_checksum
  )
);

create index metadata_pipeline_runs_resume_idx
  on public.metadata_pipeline_runs (status, created_at);

create table public.metadata_pipeline_batches (
  id uuid primary key default gen_random_uuid(),
  pipeline_run_id uuid not null references public.metadata_pipeline_runs(id) on delete restrict,
  batch_key text not null,
  cohort_key text not null,
  ordered_card_version_ids uuid[] not null,
  batch_checksum text not null,
  status text not null default 'pending',
  current_stage text not null default 'identity_validation',
  attempt_count integer not null default 0,
  lease_owner text null,
  leased_until timestamptz null,
  last_heartbeat_at timestamptz null,
  supersedes_batch_id uuid null references public.metadata_pipeline_batches(id) on delete restrict,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  constraint metadata_pipeline_batches_key_check
    check (batch_key ~ '^[a-z0-9][a-z0-9._-]{1,127}$' and char_length(cohort_key) between 1 and 300),
  constraint metadata_pipeline_batches_cards_check
    check (cardinality(ordered_card_version_ids) between 1 and 500),
  constraint metadata_pipeline_batches_hash_check check (batch_checksum ~ '^[0-9a-f]{64}$'),
  constraint metadata_pipeline_batches_status_check
    check (status in ('pending','leased','running','completed','failed','cancelled')),
  constraint metadata_pipeline_batches_stage_check check (
    current_stage in (
      'identity_validation','signal_extraction','anatomy_agent','diagnosis_agent','treatment_agent',
      'specialty_agent','clinical_entailment_critic','ontology_resolution_critic','consensus',
      'cross_card_consistency','risk_routing','human_review','publication_validation',
      'tag_rendering','completed','failed'
    )
  ),
  constraint metadata_pipeline_batches_attempt_check check (attempt_count >= 0),
  constraint metadata_pipeline_batches_lease_check check (
    (status in ('leased','running') and lease_owner is not null and leased_until is not null)
    or (status not in ('leased','running') and lease_owner is null and leased_until is null)
  ),
  constraint metadata_pipeline_batches_supersedes_check
    check (supersedes_batch_id is null or supersedes_batch_id <> id),
  constraint metadata_pipeline_batches_timestamps_check check (
    (status = 'pending' and started_at is null and completed_at is null)
    or (status in ('leased','running') and started_at is not null and completed_at is null)
    or (status in ('completed','failed','cancelled') and completed_at is not null)
  ),
  constraint metadata_pipeline_batches_run_key_unique unique (pipeline_run_id, batch_key),
  constraint metadata_pipeline_batches_run_checksum_unique unique (pipeline_run_id, batch_checksum)
);

create index metadata_pipeline_batches_claim_idx
  on public.metadata_pipeline_batches (pipeline_run_id, status, leased_until, created_at);

create table public.metadata_pipeline_stage_results (
  id uuid primary key default gen_random_uuid(),
  pipeline_run_id uuid not null references public.metadata_pipeline_runs(id) on delete restrict,
  batch_id uuid not null references public.metadata_pipeline_batches(id) on delete restrict,
  canonical_card_id uuid null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid null references public.canonical_card_versions(id) on delete restrict,
  facet text null,
  stage text not null,
  agent_name text not null,
  agent_version text not null,
  contract_version text not null,
  input_checksum text not null,
  output_checksum text not null,
  status text not null,
  attempt_number integer not null default 1,
  result jsonb not null,
  warnings text[] not null default '{}',
  failure_codes text[] not null default '{}',
  supersedes_result_id uuid null references public.metadata_pipeline_stage_results(id) on delete restrict,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  constraint metadata_pipeline_stage_results_card_check check (
    (canonical_card_id is null) = (canonical_card_version_id is null)
  ),
  constraint metadata_pipeline_stage_results_facet_check check (
    facet is null or facet in (
      'anatomy','diagnosis','treatment','specialty','laterality','content_type',
      'clinical_phase','learner_level','yield','source','workflow'
    )
  ),
  constraint metadata_pipeline_stage_results_stage_check check (
    stage in (
      'identity_validation','signal_extraction','facet_agent','clinical_entailment_critic',
      'ontology_resolution_critic','consensus','cross_card_consistency','risk_routing',
      'human_review','publication_validation','tag_rendering'
    )
  ),
  constraint metadata_pipeline_stage_results_agent_check
    check (char_length(agent_name) between 1 and 100 and char_length(agent_version) between 1 and 100),
  constraint metadata_pipeline_stage_results_hashes_check
    check (input_checksum ~ '^[0-9a-f]{64}$' and output_checksum ~ '^[0-9a-f]{64}$'),
  constraint metadata_pipeline_stage_results_status_check
    check (status in ('completed','failed','skipped','superseded')),
  constraint metadata_pipeline_stage_results_attempt_check check (attempt_number > 0),
  constraint metadata_pipeline_stage_results_result_check
    check (jsonb_typeof(result) = 'object' and public.educational_metadata_is_safe(result)),
  constraint metadata_pipeline_stage_results_time_check check (completed_at >= started_at),
  constraint metadata_pipeline_stage_results_supersedes_check
    check (supersedes_result_id is null or supersedes_result_id <> id),
  constraint metadata_pipeline_stage_results_idempotent unique nulls not distinct (
    pipeline_run_id, batch_id, canonical_card_version_id, facet, stage,
    agent_name, agent_version, input_checksum, attempt_number
  )
);

create index metadata_pipeline_stage_results_card_idx
  on public.metadata_pipeline_stage_results
  (pipeline_run_id, canonical_card_version_id, facet, stage, completed_at desc);

create table public.card_metadata_assertions (
  id uuid primary key default gen_random_uuid(),
  canonical_card_id uuid not null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete restrict,
  facet text not null,
  canonical_entity_id uuid null references public.canonical_entities(id) on delete restrict,
  metadata_concept_id uuid null references public.metadata_concepts(id) on delete restrict,
  assertion_role text not null default 'primary',
  polarity text not null default 'positive',
  confidence numeric(5,4) not null,
  decision text not null default 'proposed',
  decision_method text not null default 'pending',
  decision_policy_version text null,
  provenance text not null,
  evidence_spans jsonb not null,
  rationale_codes text[] not null default '{}',
  alternatives jsonb not null default '[]'::jsonb,
  pipeline_run_id uuid not null references public.metadata_pipeline_runs(id) on delete restrict,
  batch_id uuid not null references public.metadata_pipeline_batches(id) on delete restrict,
  stage_result_id uuid not null references public.metadata_pipeline_stage_results(id) on delete restrict,
  taxonomy_version_id uuid not null references public.metadata_taxonomy_versions(id) on delete restrict,
  rules_version text not null,
  prompt_version text not null,
  model_version text not null,
  reviewer_user_id uuid null references auth.users(id) on delete restrict,
  review_reason_codes text[] not null default '{}',
  reviewed_at timestamptz null,
  supersedes_assertion_id uuid null references public.card_metadata_assertions(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint card_metadata_assertions_facet_check check (
    facet in (
      'anatomy','diagnosis','treatment','specialty','laterality','content_type',
      'clinical_phase','learner_level','yield','source','workflow'
    )
  ),
  constraint card_metadata_assertions_one_target_check check (
    (canonical_entity_id is not null)::integer + (metadata_concept_id is not null)::integer = 1
  ),
  constraint card_metadata_assertions_role_check
    check (assertion_role in ('primary','secondary','context','excluded')),
  constraint card_metadata_assertions_polarity_check
    check (polarity in ('positive','negative','uncertain')),
  constraint card_metadata_assertions_confidence_check check (confidence between 0 and 1),
  constraint card_metadata_assertions_decision_check
    check (decision in ('proposed','accepted','rejected','superseded')),
  constraint card_metadata_assertions_decision_method_check
    check (decision_method in ('pending','automated_policy','human_review','supersession')),
  constraint card_metadata_assertions_provenance_check
    check (provenance in ('deterministic','model','human','import','inferred')),
  constraint card_metadata_assertions_evidence_check check (
    public.metadata_evidence_spans_are_valid(evidence_spans)
    and public.educational_metadata_is_safe(evidence_spans)
  ),
  constraint card_metadata_assertions_alternatives_check check (
    jsonb_typeof(alternatives) = 'array' and public.educational_metadata_is_safe(alternatives)
  ),
  constraint card_metadata_assertions_review_check check (
    (decision = 'proposed' and decision_method = 'pending'
      and decision_policy_version is null and reviewer_user_id is null and reviewed_at is null)
    or (decision in ('accepted','rejected') and decision_method = 'human_review'
      and decision_policy_version is null and reviewer_user_id is not null and reviewed_at is not null)
    or (decision = 'accepted' and decision_method = 'automated_policy'
      and decision_policy_version is not null and reviewer_user_id is null and reviewed_at is not null
      and confidence >= 0.9800)
    or (decision = 'superseded' and decision_method = 'supersession')
  ),
  constraint card_metadata_assertions_supersedes_check
    check (supersedes_assertion_id is null or supersedes_assertion_id <> id)
);

create unique index card_metadata_assertions_active_identity_idx
  on public.card_metadata_assertions (
    canonical_card_version_id, facet, coalesce(canonical_entity_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(metadata_concept_id, '00000000-0000-0000-0000-000000000000'::uuid),
    assertion_role, polarity
  )
  where decision in ('proposed','accepted');

create unique index card_metadata_assertions_one_primary_specialty_idx
  on public.card_metadata_assertions (canonical_card_version_id)
  where facet = 'specialty' and assertion_role = 'primary' and decision = 'accepted';

create unique index card_metadata_assertions_one_primary_content_type_idx
  on public.card_metadata_assertions (canonical_card_version_id)
  where facet = 'content_type' and assertion_role = 'primary' and decision = 'accepted';

create index card_metadata_assertions_review_queue_idx
  on public.card_metadata_assertions (decision, facet, confidence, created_at);
create index card_metadata_assertions_card_idx
  on public.card_metadata_assertions (canonical_card_id, canonical_card_version_id, facet);

create table public.anki_tag_dispositions (
  id uuid primary key default gen_random_uuid(),
  anki_tag_id uuid not null references public.anki_tags(id) on delete restrict,
  taxonomy_version_id uuid not null references public.metadata_taxonomy_versions(id) on delete restrict,
  normalized_form text not null,
  disposition text not null,
  rationale text not null,
  evidence jsonb not null default '{}'::jsonb,
  review_status text not null default 'proposed',
  reviewer_user_id uuid null references auth.users(id) on delete restrict,
  reviewed_at timestamptz null,
  supersedes_disposition_id uuid null references public.anki_tag_dispositions(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint anki_tag_dispositions_normalized_check
    check (char_length(normalized_form) between 1 and 1000),
  constraint anki_tag_dispositions_value_check check (
    disposition in (
      'map_exact','map_split','source_only','navigation_only','workflow_only',
      'ambiguous','contaminated','retired'
    )
  ),
  constraint anki_tag_dispositions_rationale_check check (char_length(rationale) between 1 and 4000),
  constraint anki_tag_dispositions_evidence_check
    check (jsonb_typeof(evidence) = 'object' and public.educational_metadata_is_safe(evidence)),
  constraint anki_tag_dispositions_review_check check (
    review_status in ('proposed','approved','rejected','superseded')
    and (
      (review_status = 'proposed' and reviewer_user_id is null and reviewed_at is null)
      or (review_status <> 'proposed' and reviewer_user_id is not null and reviewed_at is not null)
    )
  ),
  constraint anki_tag_dispositions_supersedes_check
    check (supersedes_disposition_id is null or supersedes_disposition_id <> id),
  constraint anki_tag_dispositions_identity_unique
    unique (anki_tag_id, taxonomy_version_id)
);

create index anki_tag_dispositions_queue_idx
  on public.anki_tag_dispositions (taxonomy_version_id, review_status, disposition);

create table public.anki_tag_disposition_targets (
  id uuid primary key default gen_random_uuid(),
  disposition_id uuid not null references public.anki_tag_dispositions(id) on delete restrict,
  canonical_entity_id uuid null references public.canonical_entities(id) on delete restrict,
  metadata_concept_id uuid null references public.metadata_concepts(id) on delete restrict,
  canonical_tag_path text null,
  target_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint anki_tag_disposition_targets_one_target_check check (
    (canonical_entity_id is not null)::integer
    + (metadata_concept_id is not null)::integer
    + (canonical_tag_path is not null)::integer = 1
  ),
  constraint anki_tag_disposition_targets_path_check check (
    canonical_tag_path is null
    or canonical_tag_path ~ '^(SnapOrtho|Legacy)(::[A-Za-z0-9][A-Za-z0-9_]*)+$'
  ),
  constraint anki_tag_disposition_targets_order_check check (target_order >= 0),
  constraint anki_tag_disposition_targets_identity_unique
    unique nulls not distinct (
      disposition_id, canonical_entity_id, metadata_concept_id, canonical_tag_path
    )
);

create table public.metadata_releases (
  id uuid primary key default gen_random_uuid(),
  release_key text not null unique,
  release_version text not null,
  deck_release_id uuid not null references public.anki_deck_releases(id) on delete restrict,
  taxonomy_version_id uuid not null references public.metadata_taxonomy_versions(id) on delete restrict,
  pipeline_run_id uuid not null references public.metadata_pipeline_runs(id) on delete restrict,
  status text not null default 'draft',
  manifest_checksum text not null,
  predecessor_release_id uuid null references public.metadata_releases(id) on delete restrict,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  published_at timestamptz null,
  superseded_at timestamptz null,
  constraint metadata_releases_key_check check (release_key ~ '^[a-z0-9][a-z0-9._-]{2,127}$'),
  constraint metadata_releases_version_check check (release_version ~ '^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$'),
  constraint metadata_releases_status_check
    check (status in ('draft','review','published','superseded')),
  constraint metadata_releases_checksum_check check (manifest_checksum ~ '^[0-9a-f]{64}$'),
  constraint metadata_releases_predecessor_check
    check (predecessor_release_id is null or predecessor_release_id <> id),
  constraint metadata_releases_timestamps_check check (
    (status = 'draft' and reviewed_at is null and published_at is null and superseded_at is null)
    or (status = 'review' and reviewed_at is not null and published_at is null and superseded_at is null)
    or (status = 'published' and reviewed_at is not null and published_at is not null and superseded_at is null)
    or (status = 'superseded' and reviewed_at is not null and published_at is not null and superseded_at is not null)
  )
);

create unique index metadata_releases_one_published_per_deck_idx
  on public.metadata_releases (deck_release_id)
  where status = 'published';

create table public.metadata_release_assertions (
  metadata_release_id uuid not null references public.metadata_releases(id) on delete restrict,
  assertion_id uuid not null references public.card_metadata_assertions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (metadata_release_id, assertion_id)
);

create index metadata_release_assertions_assertion_idx
  on public.metadata_release_assertions (assertion_id, metadata_release_id);

create table public.rendered_anki_tag_manifests (
  id uuid primary key default gen_random_uuid(),
  manifest_key text not null unique,
  metadata_release_id uuid not null references public.metadata_releases(id) on delete restrict,
  deck_release_id uuid not null references public.anki_deck_releases(id) on delete restrict,
  taxonomy_version_id uuid not null references public.metadata_taxonomy_versions(id) on delete restrict,
  export_policy_version text not null,
  export_policy_checksum text not null,
  transition_mode text not null,
  output_checksum text not null,
  status text not null default 'draft',
  predecessor_manifest_id uuid null references public.rendered_anki_tag_manifests(id) on delete restrict,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  validated_at timestamptz null,
  published_at timestamptz null,
  superseded_at timestamptz null,
  constraint rendered_anki_tag_manifests_key_check
    check (manifest_key ~ '^[a-z0-9][a-z0-9._-]{2,127}$'),
  constraint rendered_anki_tag_manifests_hashes_check
    check (export_policy_checksum ~ '^[0-9a-f]{64}$' and output_checksum ~ '^[0-9a-f]{64}$'),
  constraint rendered_anki_tag_manifests_transition_check
    check (transition_mode in ('shadow','transition','clean')),
  constraint rendered_anki_tag_manifests_status_check
    check (status in ('draft','validated','published','superseded')),
  constraint rendered_anki_tag_manifests_predecessor_check
    check (predecessor_manifest_id is null or predecessor_manifest_id <> id),
  constraint rendered_anki_tag_manifests_metadata_check
    check (public.educational_metadata_is_safe(safe_metadata)),
  constraint rendered_anki_tag_manifests_timestamps_check check (
    (status = 'draft' and validated_at is null and published_at is null and superseded_at is null)
    or (status = 'validated' and validated_at is not null and published_at is null and superseded_at is null)
    or (status = 'published' and validated_at is not null and published_at is not null and superseded_at is null)
    or (status = 'superseded' and validated_at is not null and published_at is not null and superseded_at is not null)
  )
);

create unique index rendered_anki_tag_manifests_one_published_idx
  on public.rendered_anki_tag_manifests (metadata_release_id)
  where status = 'published';

create table public.rendered_anki_tag_manifest_cards (
  id uuid primary key default gen_random_uuid(),
  manifest_id uuid not null references public.rendered_anki_tag_manifests(id) on delete restrict,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete restrict,
  rendered_tags text[] not null,
  added_tags text[] not null default '{}',
  removed_tags text[] not null default '{}',
  unchanged_tags text[] not null default '{}',
  output_checksum text not null,
  created_at timestamptz not null default now(),
  constraint rendered_anki_tag_manifest_cards_tags_check check (
    public.metadata_anki_tag_array_is_valid(rendered_tags, false)
  ),
  constraint rendered_anki_tag_manifest_cards_diff_check check (
    public.metadata_anki_tag_array_is_valid(added_tags || removed_tags || unchanged_tags, true)
  ),
  constraint rendered_anki_tag_manifest_cards_checksum_check
    check (output_checksum ~ '^[0-9a-f]{64}$'),
  constraint rendered_anki_tag_manifest_cards_identity_unique
    unique (manifest_id, canonical_card_id),
  constraint rendered_anki_tag_manifest_cards_version_unique
    unique (manifest_id, canonical_card_version_id)
);

create table public.rendered_anki_tag_sources (
  id uuid primary key default gen_random_uuid(),
  manifest_card_id uuid not null references public.rendered_anki_tag_manifest_cards(id) on delete restrict,
  rendered_tag text not null,
  source_kind text not null,
  assertion_id uuid null references public.card_metadata_assertions(id) on delete restrict,
  disposition_id uuid null references public.anki_tag_dispositions(id) on delete restrict,
  metadata_concept_id uuid null references public.metadata_concepts(id) on delete restrict,
  canonical_entity_id uuid null references public.canonical_entities(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint rendered_anki_tag_sources_tag_check
    check (rendered_tag ~ '^(SnapOrtho|Legacy)(::[A-Za-z0-9][A-Za-z0-9_]*)+$'),
  constraint rendered_anki_tag_sources_kind_check
    check (source_kind in ('assertion','taxonomy_ancestor','legacy_disposition','release_marker')),
  constraint rendered_anki_tag_sources_target_check check (
    (source_kind = 'assertion' and assertion_id is not null and disposition_id is null)
    or (source_kind = 'taxonomy_ancestor' and assertion_id is not null
        and (metadata_concept_id is not null or canonical_entity_id is not null))
    or (source_kind = 'legacy_disposition' and disposition_id is not null and assertion_id is null)
    or (source_kind = 'release_marker' and assertion_id is null and disposition_id is null
        and metadata_concept_id is null and canonical_entity_id is null)
  ),
  constraint rendered_anki_tag_sources_identity_unique unique nulls not distinct (
    manifest_card_id, rendered_tag, source_kind, assertion_id, disposition_id,
    metadata_concept_id, canonical_entity_id
  )
);

create index rendered_anki_tag_sources_assertion_idx
  on public.rendered_anki_tag_sources (assertion_id)
  where assertion_id is not null;

create function public.validate_metadata_concept_lineage()
returns trigger language plpgsql set search_path = public as $$
declare parent_row public.metadata_concepts; replacement_row public.metadata_concepts;
begin
  if new.parent_concept_id is not null then
    select * into parent_row from public.metadata_concepts where id = new.parent_concept_id;
    if parent_row.taxonomy_version_id <> new.taxonomy_version_id or parent_row.facet <> new.facet then
      raise exception 'metadata concept parent must share taxonomy version and facet';
    end if;
  end if;
  if new.replacement_concept_id is not null then
    select * into replacement_row from public.metadata_concepts where id = new.replacement_concept_id;
    if replacement_row.taxonomy_version_id <> new.taxonomy_version_id
      or replacement_row.facet <> new.facet then
      raise exception 'replacement metadata concept must share taxonomy version and facet';
    end if;
  end if;
  return new;
end $$;

create trigger validate_metadata_concept_lineage_before_write
  before insert or update on public.metadata_concepts
  for each row execute function public.validate_metadata_concept_lineage();

create function public.validate_metadata_concept_alias()
returns trigger language plpgsql set search_path = public as $$
declare concept_version uuid;
begin
  select taxonomy_version_id into concept_version
  from public.metadata_concepts where id = new.metadata_concept_id;
  if concept_version is distinct from new.taxonomy_version_id then
    raise exception 'metadata concept alias taxonomy version mismatch';
  end if;
  return new;
end $$;

create trigger validate_metadata_concept_alias_before_write
  before insert or update on public.metadata_concept_aliases
  for each row execute function public.validate_metadata_concept_alias();

create function public.guard_frozen_metadata_taxonomy_content()
returns trigger language plpgsql set search_path = public as $$
declare target_version uuid; target_status text;
begin
  target_version := case when tg_op = 'DELETE' then old.taxonomy_version_id else new.taxonomy_version_id end;
  select lifecycle_status into target_status
  from public.metadata_taxonomy_versions where id = target_version;
  if target_status <> 'draft' then
    raise exception 'frozen, active, or retired metadata taxonomy content is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger guard_metadata_concept_taxonomy_before_write
  before insert or update or delete on public.metadata_concepts
  for each row execute function public.guard_frozen_metadata_taxonomy_content();
create trigger guard_metadata_alias_taxonomy_before_write
  before insert or update or delete on public.metadata_concept_aliases
  for each row execute function public.guard_frozen_metadata_taxonomy_content();

create function public.guard_metadata_taxonomy_version_lifecycle()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and old.lifecycle_status <> 'draft' then
    raise exception 'non-draft metadata taxonomy version cannot be deleted';
  end if;
  if tg_op = 'UPDATE' then
    if old.lifecycle_status = 'draft' and new.lifecycle_status not in ('draft','frozen') then
      raise exception 'metadata taxonomy must be frozen before activation';
    elsif old.lifecycle_status = 'frozen' and new.lifecycle_status not in ('frozen','active') then
      raise exception 'frozen metadata taxonomy may only be activated';
    elsif old.lifecycle_status = 'active' and new.lifecycle_status not in ('active','retired') then
      raise exception 'active metadata taxonomy may only be retired';
    elsif old.lifecycle_status = 'retired' and to_jsonb(new) <> to_jsonb(old) then
      raise exception 'retired metadata taxonomy is immutable';
    end if;
    if old.lifecycle_status <> 'draft'
      and (to_jsonb(new) - array['lifecycle_status','activated_at','retired_at'])
        <> (to_jsonb(old) - array['lifecycle_status','activated_at','retired_at']) then
      raise exception 'frozen metadata taxonomy definition is immutable';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger guard_metadata_taxonomy_version_lifecycle_before_write
  before update or delete on public.metadata_taxonomy_versions
  for each row execute function public.guard_metadata_taxonomy_version_lifecycle();

create function public.validate_metadata_pipeline_batch()
returns trigger language plpgsql set search_path = public as $$
declare expected_release uuid; found_count integer;
begin
  select deck_release_id into expected_release
  from public.metadata_pipeline_runs where id = new.pipeline_run_id;
  select count(distinct rc.canonical_card_version_id) into found_count
  from public.anki_deck_release_cards rc
  where rc.deck_release_id = expected_release
    and rc.canonical_card_version_id = any(new.ordered_card_version_ids);
  if found_count <> cardinality(new.ordered_card_version_ids) then
    raise exception 'metadata batch contains duplicate or out-of-release card versions';
  end if;
  return new;
end $$;

create trigger validate_metadata_pipeline_batch_before_write
  before insert or update of pipeline_run_id, ordered_card_version_ids
  on public.metadata_pipeline_batches
  for each row execute function public.validate_metadata_pipeline_batch();

create function public.validate_metadata_stage_result()
returns trigger language plpgsql set search_path = public as $$
declare batch_run uuid; version_card uuid; batch_versions uuid[];
begin
  select pipeline_run_id, ordered_card_version_ids into batch_run, batch_versions
  from public.metadata_pipeline_batches where id = new.batch_id;
  if batch_run is distinct from new.pipeline_run_id then
    raise exception 'metadata stage result run/batch mismatch';
  end if;
  if new.canonical_card_version_id is not null then
    select canonical_card_id into version_card
    from public.canonical_card_versions where id = new.canonical_card_version_id;
    if version_card is distinct from new.canonical_card_id
      or not new.canonical_card_version_id = any(batch_versions) then
      raise exception 'metadata stage result card/version/batch mismatch';
    end if;
  end if;
  return new;
end $$;

create trigger validate_metadata_stage_result_before_write
  before insert or update on public.metadata_pipeline_stage_results
  for each row execute function public.validate_metadata_stage_result();

create function public.validate_card_metadata_assertion()
returns trigger language plpgsql set search_path = public as $$
declare
  version_card uuid; run_taxonomy uuid; batch_run uuid;
  result_run uuid; result_batch uuid; result_card uuid; result_facet text;
  concept_facet text; concept_taxonomy uuid; target_entity_type text;
begin
  select canonical_card_id into version_card
  from public.canonical_card_versions where id = new.canonical_card_version_id;
  select taxonomy_version_id into run_taxonomy
  from public.metadata_pipeline_runs where id = new.pipeline_run_id;
  select pipeline_run_id into batch_run
  from public.metadata_pipeline_batches where id = new.batch_id;
  select pipeline_run_id, batch_id, canonical_card_version_id, facet
    into result_run, result_batch, result_card, result_facet
  from public.metadata_pipeline_stage_results where id = new.stage_result_id;
  if version_card is distinct from new.canonical_card_id
    or run_taxonomy is distinct from new.taxonomy_version_id
    or batch_run is distinct from new.pipeline_run_id
    or result_run is distinct from new.pipeline_run_id
    or result_batch is distinct from new.batch_id
    or result_card is distinct from new.canonical_card_version_id
    or (result_facet is not null and result_facet is distinct from new.facet) then
    raise exception 'card metadata assertion provenance identity mismatch';
  end if;
  if new.metadata_concept_id is not null then
    select facet, taxonomy_version_id into concept_facet, concept_taxonomy
    from public.metadata_concepts where id = new.metadata_concept_id;
    if concept_facet is distinct from new.facet or concept_taxonomy is distinct from new.taxonomy_version_id then
      raise exception 'card metadata assertion concept/facet/taxonomy mismatch';
    end if;
  else
    select ce.entity_type into target_entity_type
    from public.canonical_entities ce
    where ce.id = new.canonical_entity_id;
    if not (
      (new.facet = 'anatomy' and target_entity_type = 'anatomy_structure')
      or (new.facet = 'diagnosis' and target_entity_type in ('condition','complication'))
      or (new.facet = 'treatment' and target_entity_type in (
        'procedure','treatment_principle','fixation_method','surgical_approach','implant'
      ))
    ) then raise exception 'canonical entity type is not valid for metadata facet'; end if;
  end if;
  return new;
end $$;

create trigger validate_card_metadata_assertion_before_write
  before insert or update on public.card_metadata_assertions
  for each row execute function public.validate_card_metadata_assertion();

create function public.guard_decided_metadata_evidence()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'reviewed metadata evidence cannot be deleted'; end if;
  if old.decision in ('accepted','rejected','superseded') then
    if old.decision in ('accepted','rejected')
      and new.decision = 'superseded'
      and new.decision_method = 'supersession'
      and (to_jsonb(new) - array['decision','decision_method'])
        = (to_jsonb(old) - array['decision','decision_method']) then
      return new;
    end if;
    raise exception 'reviewed metadata evidence is immutable except for a lifecycle-only supersession';
  end if;
  return new;
end $$;

create trigger guard_decided_card_metadata_assertion
  before update or delete on public.card_metadata_assertions
  for each row
  when (old.decision in ('accepted','rejected','superseded'))
  execute function public.guard_decided_metadata_evidence();

create function public.guard_terminal_metadata_stage_result()
returns trigger language plpgsql as $$
begin
  raise exception 'completed metadata stage results are immutable; create a superseding result';
end $$;

create trigger guard_terminal_metadata_stage_result
  before update or delete on public.metadata_pipeline_stage_results
  for each row
  when (old.status in ('completed','failed','skipped','superseded'))
  execute function public.guard_terminal_metadata_stage_result();

create function public.validate_metadata_release_assertion()
returns trigger language plpgsql set search_path = public as $$
declare release_row public.metadata_releases; assertion_row public.card_metadata_assertions;
begin
  select * into release_row from public.metadata_releases where id = new.metadata_release_id;
  select * into assertion_row from public.card_metadata_assertions where id = new.assertion_id;
  if assertion_row.decision <> 'accepted'
    or assertion_row.taxonomy_version_id <> release_row.taxonomy_version_id
    or assertion_row.pipeline_run_id <> release_row.pipeline_run_id
    or not exists (
      select 1 from public.anki_deck_release_cards rc
      where rc.deck_release_id = release_row.deck_release_id
        and rc.canonical_card_id = assertion_row.canonical_card_id
        and rc.canonical_card_version_id = assertion_row.canonical_card_version_id
        and rc.inclusion_status = 'included'
    ) then
    raise exception 'metadata release membership requires accepted, pinned, in-release assertion';
  end if;
  return new;
end $$;

create trigger validate_metadata_release_assertion_before_insert
  before insert on public.metadata_release_assertions
  for each row execute function public.validate_metadata_release_assertion();

create function public.guard_metadata_release_lifecycle()
returns trigger language plpgsql security definer set search_path = public as $$
declare member_count integer; computed_checksum text;
begin
  if tg_op = 'DELETE' and old.status in ('published','superseded') then
    raise exception 'published metadata release cannot be deleted';
  end if;
  if tg_op = 'UPDATE' then
    if old.status in ('published','superseded')
      and (to_jsonb(new) - array['status','superseded_at'])
        <> (to_jsonb(old) - array['status','superseded_at']) then
      raise exception 'published metadata release fields are immutable';
    end if;
    if old.status = 'superseded' or (old.status = 'published' and new.status not in ('published','superseded')) then
      raise exception 'invalid metadata release lifecycle transition';
    end if;
  end if;
  if tg_op <> 'DELETE' and new.status = 'published'
    and (tg_op = 'INSERT' or old.status <> 'published') then
    select count(*),
      encode(digest(coalesce(string_agg(assertion_id::text, E'\n' order by assertion_id), ''), 'sha256'), 'hex')
    into member_count, computed_checksum
    from public.metadata_release_assertions where metadata_release_id = new.id;
    if member_count = 0 or computed_checksum is distinct from new.manifest_checksum then
      raise exception 'published metadata release requires nonempty checksum-matched membership';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger guard_metadata_release_lifecycle_before_write
  before update or delete on public.metadata_releases
  for each row execute function public.guard_metadata_release_lifecycle();

create function public.guard_metadata_release_member_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
declare release_id uuid; release_status text;
begin
  release_id := case when tg_op = 'DELETE' then old.metadata_release_id else new.metadata_release_id end;
  select status into release_status from public.metadata_releases where id = release_id;
  if release_status in ('published','superseded') then
    raise exception 'published metadata release membership is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger guard_metadata_release_member_mutation_before_write
  before insert or update or delete on public.metadata_release_assertions
  for each row execute function public.guard_metadata_release_member_mutation();

create function public.validate_rendered_anki_manifest_card()
returns trigger language plpgsql set search_path = public as $$
declare expected_release uuid; version_card uuid;
begin
  select deck_release_id into expected_release
  from public.rendered_anki_tag_manifests where id = new.manifest_id;
  select canonical_card_id into version_card
  from public.canonical_card_versions where id = new.canonical_card_version_id;
  if version_card is distinct from new.canonical_card_id
    or not exists (
      select 1 from public.anki_deck_release_cards rc
      where rc.deck_release_id = expected_release
        and rc.canonical_card_id = new.canonical_card_id
        and rc.canonical_card_version_id = new.canonical_card_version_id
    ) then raise exception 'rendered tag card/version/release mismatch'; end if;
  if cardinality(new.rendered_tags) <> cardinality(array(select distinct unnest(new.rendered_tags))) then
    raise exception 'rendered tag list contains duplicates';
  end if;
  return new;
end $$;

create trigger validate_rendered_anki_manifest_card_before_write
  before insert or update on public.rendered_anki_tag_manifest_cards
  for each row execute function public.validate_rendered_anki_manifest_card();

create function public.validate_rendered_anki_tag_source()
returns trigger language plpgsql set search_path = public as $$
declare
  target_card_version uuid; target_metadata_release uuid; target_taxonomy uuid;
  assertion_card_version uuid; disposition_taxonomy uuid; disposition_review text;
begin
  select mc.canonical_card_version_id, m.metadata_release_id, m.taxonomy_version_id
    into target_card_version, target_metadata_release, target_taxonomy
  from public.rendered_anki_tag_manifest_cards mc
  join public.rendered_anki_tag_manifests m on m.id = mc.manifest_id
  where mc.id = new.manifest_card_id;
  if new.assertion_id is not null then
    select canonical_card_version_id into assertion_card_version
    from public.card_metadata_assertions where id = new.assertion_id;
    if assertion_card_version is distinct from target_card_version
      or not exists (
        select 1 from public.metadata_release_assertions ra
        where ra.metadata_release_id = target_metadata_release
          and ra.assertion_id = new.assertion_id
      ) then raise exception 'rendered tag assertion is not accepted release evidence for this card'; end if;
  end if;
  if new.disposition_id is not null then
    select taxonomy_version_id, review_status into disposition_taxonomy, disposition_review
    from public.anki_tag_dispositions where id = new.disposition_id;
    if disposition_taxonomy is distinct from target_taxonomy or disposition_review <> 'approved' then
      raise exception 'rendered legacy tag requires an approved disposition in the pinned taxonomy';
    end if;
  end if;
  return new;
end $$;

create trigger validate_rendered_anki_tag_source_before_write
  before insert or update on public.rendered_anki_tag_sources
  for each row execute function public.validate_rendered_anki_tag_source();

create function public.guard_rendered_anki_manifest_lifecycle()
returns trigger language plpgsql security definer set search_path = public as $$
declare card_count integer; unsourced_count integer; computed_checksum text;
begin
  if tg_op = 'DELETE' and old.status in ('published','superseded') then
    raise exception 'published rendered Anki tag manifest cannot be deleted';
  end if;
  if tg_op = 'UPDATE' then
    if old.status in ('published','superseded')
      and (to_jsonb(new) - array['status','superseded_at'])
        <> (to_jsonb(old) - array['status','superseded_at']) then
      raise exception 'published rendered Anki tag manifest is immutable';
    end if;
    if old.status = 'superseded'
      or (old.status = 'published' and new.status not in ('published','superseded')) then
      raise exception 'invalid rendered Anki tag manifest lifecycle transition';
    end if;
  end if;
  if tg_op <> 'DELETE' and new.status = 'published'
    and (tg_op = 'INSERT' or old.status <> 'published') then
    select count(*),
      encode(digest(coalesce(string_agg(
        canonical_card_version_id::text || '|' || output_checksum,
        E'\n' order by canonical_card_version_id
      ), ''), 'sha256'), 'hex')
    into card_count, computed_checksum
    from public.rendered_anki_tag_manifest_cards where manifest_id = new.id;
    select count(*) into unsourced_count
    from public.rendered_anki_tag_manifest_cards mc
    cross join lateral unnest(mc.rendered_tags) tag
    where mc.manifest_id = new.id
      and not exists (
        select 1 from public.rendered_anki_tag_sources s
        where s.manifest_card_id = mc.id and s.rendered_tag = tag
      );
    if card_count = 0 or unsourced_count <> 0 or computed_checksum is distinct from new.output_checksum then
      raise exception 'published tag manifest requires nonempty, sourced, checksum-matched cards';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger guard_rendered_anki_manifest_lifecycle_before_write
  before update or delete on public.rendered_anki_tag_manifests
  for each row execute function public.guard_rendered_anki_manifest_lifecycle();

create function public.guard_rendered_anki_manifest_child_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_manifest_id uuid; manifest_status text;
begin
  if tg_table_name = 'rendered_anki_tag_manifest_cards' then
    target_manifest_id := case when tg_op = 'DELETE' then old.manifest_id else new.manifest_id end;
  else
    select manifest_id into target_manifest_id
    from public.rendered_anki_tag_manifest_cards
    where id = case when tg_op = 'DELETE' then old.manifest_card_id else new.manifest_card_id end;
  end if;
  select status into manifest_status
  from public.rendered_anki_tag_manifests where id = target_manifest_id;
  if manifest_status in ('published','superseded') then
    raise exception 'published rendered Anki tag manifest children are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger guard_rendered_anki_manifest_card_mutation_before_write
  before insert or update or delete on public.rendered_anki_tag_manifest_cards
  for each row execute function public.guard_rendered_anki_manifest_child_mutation();
create trigger guard_rendered_anki_tag_source_mutation_before_write
  before insert or update or delete on public.rendered_anki_tag_sources
  for each row execute function public.guard_rendered_anki_manifest_child_mutation();

create function public.claim_metadata_pipeline_batch(
  requested_run_id uuid,
  worker_id text,
  lease_seconds integer default 300
)
returns setof public.metadata_pipeline_batches
language plpgsql
security definer
set search_path = public
as $$
declare claimed_id uuid;
begin
  if char_length(worker_id) not between 1 and 200 or lease_seconds not between 30 and 3600 then
    raise exception 'invalid metadata batch lease request';
  end if;
  select b.id into claimed_id
  from public.metadata_pipeline_batches b
  where b.pipeline_run_id = requested_run_id
    and (b.status = 'pending' or (b.status in ('leased','running') and b.leased_until < now()))
  order by b.created_at, b.batch_key
  for update skip locked
  limit 1;
  if claimed_id is null then return; end if;
  return query
    update public.metadata_pipeline_batches
    set status = 'leased',
        lease_owner = worker_id,
        leased_until = now() + make_interval(secs => lease_seconds),
        last_heartbeat_at = now(),
        started_at = coalesce(started_at, now()),
        attempt_count = attempt_count + 1
    where id = claimed_id
    returning *;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'metadata_taxonomy_versions','metadata_concepts','metadata_concept_aliases',
    'metadata_pipeline_runs','metadata_pipeline_batches','metadata_pipeline_stage_results',
    'card_metadata_assertions','anki_tag_dispositions','anki_tag_disposition_targets',
    'metadata_releases','metadata_release_assertions','rendered_anki_tag_manifests',
    'rendered_anki_tag_manifest_cards','rendered_anki_tag_sources'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated, service_role', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      table_name || '_service_role_all', table_name
    );
  end loop;
end $$;

revoke all on function public.claim_metadata_pipeline_batch(uuid,text,integer)
  from public, anon, authenticated;
grant execute on function public.claim_metadata_pipeline_batch(uuid,text,integer)
  to service_role;

comment on table public.card_metadata_assertions is
  'Version-pinned metadata proposal and human-decision ledger. Accepted rows are immutable canonical metadata evidence.';
comment on table public.anki_tag_dispositions is
  'Versioned reviewed disposition of source-native Anki tags; raw tag rows remain unchanged.';
comment on table public.rendered_anki_tag_sources is
  'Per-tag provenance connecting visible Anki output to accepted assertions, taxonomy closure, or reviewed legacy disposition.';
comment on function public.claim_metadata_pipeline_batch(uuid,text,integer) is
  'Narrow service-role worker lease using FOR UPDATE SKIP LOCKED for resumable parallel metadata processing.';

commit;
