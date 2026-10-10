-- ob-claims-production.v1 tables: durable, source-text-free production ledger
-- for the v5 Orthobullets claim pipeline. DDL only; inserts no rows.
--
-- Design notes:
-- - No raw question text, choices, explanations, or HTML anywhere. Claims are
--   derived assertions; provenance is section identifiers + hashes only.
-- - Extraction events are immutable; force reprocess supersedes via pointer,
--   never by destroying history.
-- - v4 isolation: all names use the ob_claim_* prefix; the v4 route and v4
--   RPCs reference none of these tables.

begin;

-- Safety predicate for persisted claim text (mirrors the frozen contract
-- vignette rules: specific-patient patterns only; pure thresholds pass).
create or replace function public.ob_claim_text_is_safe(value text)
returns boolean
language sql
immutable
parallel safe
as $$
  select char_length(coalesce(value, '')) between 20 and 500
    and coalesce(value, '') !~* '\m(a|an)[[:space:]]+[0-9]{1,3}[[:space:]]*-?[[:space:]]*(year-old|years?[[:space:]]*-?[[:space:]]*old)[[:space:]]+(man|woman|male|female|boy|girl|child|patient)\M'
    and (
      coalesce(value, '') !~* '[0-9]{1,3}[[:space:]]*-?[[:space:]]*(year-old|years?[[:space:]]*-?[[:space:]]*old)'
      or coalesce(value, '') !~* '\m(presents?|presented|complains?|reports?|sustains?|sustained|fell|falls?|injured|arrives?|admitted|struck)\M'
    )
    and coalesce(value, '') !~* '\m(male|female)[[:space:]]+(laborer|carpenter|farmer|mechanic)\M';
$$;

revoke all on function public.ob_claim_text_is_safe(text) from public, anon, authenticated;
grant execute on function public.ob_claim_text_is_safe(text) to service_role;

-- 1. Production runs -------------------------------------------------------
create table public.ob_claim_production_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null,
  status text not null default 'running',
  algorithm_version text not null default 'orthobullets-claims-prod.v1',
  config jsonb not null default '{}'::jsonb,
  expected_count integer not null default 0,
  completed_count integer not null default 0,
  accepted_count integer not null default 0,
  unresolved_count integer not null default 0,
  failed_count integer not null default 0,
  total_prompt_tokens bigint not null default 0,
  total_completion_tokens bigint not null default 0,
  total_estimated_cost_usd numeric not null default 0,
  created_by text not null default 'runner',
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint ob_claim_production_runs_key_unique unique (run_key),
  constraint ob_claim_production_runs_status_check
    check (status in ('running', 'paused', 'completed', 'completed_with_gaps', 'failed', 'cancelled')),
  constraint ob_claim_production_runs_algorithm_check
    check (algorithm_version = 'orthobullets-claims-prod.v1'),
  constraint ob_claim_production_runs_counters_check check (
    expected_count >= 0 and completed_count >= 0 and accepted_count >= 0
    and unresolved_count >= 0 and failed_count >= 0
    and total_prompt_tokens >= 0 and total_completion_tokens >= 0
    and total_estimated_cost_usd >= 0
  ),
  constraint ob_claim_production_runs_safe_config_check check (public.educational_metadata_is_safe(config))
);

comment on table public.ob_claim_production_runs is
  'v5 production runs. config holds operator controls (budgets, filters); never source text.';

-- 2. Run items (one per question per run) ------------------------------------
create table public.ob_claim_production_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ob_claim_production_runs(id) on delete cascade,
  provider text not null default 'orthobullets',
  native_question_id text not null,
  specialty text null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz null,
  lease_owner text null,
  lease_expires_at timestamptz null,
  heartbeat_at timestamptz null,
  source_fingerprint_hash text null,
  identity_outcome text null,
  registry_question_id uuid null references public.external_questions(id) on delete restrict,
  live_attempt_id uuid null,
  last_diagnostic text null,
  reason_codes text[] not null default '{}',
  prompt_tokens bigint not null default 0,
  completion_tokens bigint not null default 0,
  estimated_cost_usd numeric not null default 0,
  started_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint ob_claim_production_items_identity_unique unique (run_id, native_question_id),
  constraint ob_claim_production_items_provider_check check (provider = 'orthobullets'),
  constraint ob_claim_production_items_native_check check (native_question_id ~ '^[A-Za-z0-9._:-]{1,200}$'),
  constraint ob_claim_production_items_status_check check (status in (
    'pending', 'leased', 'extracting', 'reviewing', 'resolving', 'persisting',
    'accepted', 'ai_review_unresolved', 'identity_unresolved', 'identity_conflict',
    'failed_transient', 'failed_permanent'
  )),
  constraint ob_claim_production_items_attempts_check check (
    attempt_count between 0 and 20 and max_attempts between 1 and 20
  ),
  constraint ob_claim_production_items_hash_check check (
    source_fingerprint_hash is null or source_fingerprint_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint ob_claim_production_items_identity_check check (
    identity_outcome is null or identity_outcome in ('RESOLVED', 'UNRESOLVED', 'CONFLICT')
  ),
  constraint ob_claim_production_items_usage_check check (
    prompt_tokens >= 0 and completion_tokens >= 0 and estimated_cost_usd >= 0
  )
);

comment on table public.ob_claim_production_items is
  'v5 production work items with lease coordination. Terminal states: accepted, ai_review_unresolved, identity_unresolved, identity_conflict, failed_permanent.';

create index ob_claim_production_items_lease_idx on public.ob_claim_production_items
  (run_id, status, next_attempt_at, lease_expires_at);

-- 3. Extraction events (immutable; supersede-by-pointer) ----------------------
create table public.ob_claim_extraction_events (
  id uuid primary key,
  item_id uuid not null references public.ob_claim_production_items(id) on delete cascade,
  run_id uuid not null references public.ob_claim_production_runs(id) on delete cascade,
  provider text not null,
  native_question_id text not null,
  source_fingerprint_hash text not null,
  algorithm_version text not null,
  prompt_set_version text not null,
  attempt_no integer not null,
  supersedes_attempt_id uuid null references public.ob_claim_extraction_events(id) on delete restrict,
  -- Deferred: force-reprocess retires the old live row BEFORE inserting its
  -- replacement (the live partial unique demands that order), so the pointer
  -- briefly names a row created later in the same transaction. Checked at commit.
  superseded_by_attempt_id uuid null,
  contract_version text not null,
  prompt_versions jsonb not null,
  models jsonb not null,
  registry_question_id uuid null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  final_state text not null,
  coverage_verdict text not null,
  coverage_notes text not null default '',
  missing_concepts text[] not null default '{}',
  diagnostics text[] not null default '{}',
  prompt_tokens bigint not null default 0,
  completion_tokens bigint not null default 0,
  estimated_cost_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint ob_claim_extraction_events_attempt_unique unique (
    provider, native_question_id, source_fingerprint_hash, algorithm_version, prompt_set_version, attempt_no
  ),
  constraint ob_claim_extraction_events_superseded_by_fk
    foreign key (superseded_by_attempt_id) references public.ob_claim_extraction_events(id)
    on delete restrict deferrable initially deferred,
  constraint ob_claim_extraction_events_provider_check check (provider = 'orthobullets'),
  constraint ob_claim_extraction_events_native_check check (native_question_id ~ '^[A-Za-z0-9._:-]{1,200}$'),
  constraint ob_claim_extraction_events_hash_check check (source_fingerprint_hash ~ '^[0-9a-f]{64}$'),
  constraint ob_claim_extraction_events_algorithm_check check (algorithm_version = 'orthobullets-claims-prod.v1'),
  constraint ob_claim_extraction_events_attempt_no_check check (attempt_no >= 0),
  constraint ob_claim_extraction_events_contract_check check (contract_version = 'ob-claims-production.v1'),
  constraint ob_claim_extraction_events_state_check check (final_state in ('accepted', 'ai_review_unresolved', 'failed')),
  constraint ob_claim_extraction_events_coverage_check check (coverage_verdict in (
    'complete', 'missing_major_concept', 'overextracted', 'internally_conflicting'
  )),
  constraint ob_claim_extraction_events_safe_json_check check (
    public.educational_metadata_is_safe(prompt_versions)
    and public.educational_metadata_is_safe(models)
  )
);

comment on table public.ob_claim_extraction_events is
  'Immutable extraction attempts. Force reprocess inserts a new attempt_no and points superseded_by; history is never destroyed.';

-- Single live event per extraction identity.
create unique index ob_claim_extraction_events_live_uidx on public.ob_claim_extraction_events
  (provider, native_question_id, source_fingerprint_hash, algorithm_version, prompt_set_version)
  where superseded_by_attempt_id is null;

-- Immutability: only the supersede pointer may change after insert.
create or replace function public.ob_claim_extraction_events_guard()
returns trigger
language plpgsql
as $$
begin
  if old.id is distinct from new.id
    or old.item_id is distinct from new.item_id
    or old.run_id is distinct from new.run_id
    or old.provider is distinct from new.provider
    or old.native_question_id is distinct from new.native_question_id
    or old.source_fingerprint_hash is distinct from new.source_fingerprint_hash
    or old.algorithm_version is distinct from new.algorithm_version
    or old.prompt_set_version is distinct from new.prompt_set_version
    or old.attempt_no is distinct from new.attempt_no
    or old.supersedes_attempt_id is distinct from new.supersedes_attempt_id
    or old.contract_version is distinct from new.contract_version
    or old.prompt_versions is distinct from new.prompt_versions
    or old.models is distinct from new.models
    or old.registry_question_id is distinct from new.registry_question_id
    or old.started_at is distinct from new.started_at
    or old.completed_at is distinct from new.completed_at
    or old.final_state is distinct from new.final_state
    or old.coverage_verdict is distinct from new.coverage_verdict
    or old.coverage_notes is distinct from new.coverage_notes
    or old.missing_concepts is distinct from new.missing_concepts
    or old.diagnostics is distinct from new.diagnostics
    or old.prompt_tokens is distinct from new.prompt_tokens
    or old.completion_tokens is distinct from new.completion_tokens
    or old.estimated_cost_usd is distinct from new.estimated_cost_usd then
    raise exception 'extraction event immutable except supersede pointer';
  end if;
  return new;
end;
$$;

create trigger ob_claim_extraction_events_guard_trigger
  before update on public.ob_claim_extraction_events
  for each row execute function public.ob_claim_extraction_events_guard();

-- 4. Extracted claim candidates (immutable) -----------------------------------
create table public.ob_claim_candidates (
  id uuid primary key,
  extraction_event_id uuid not null references public.ob_claim_extraction_events(id) on delete cascade,
  item_id uuid not null references public.ob_claim_production_items(id) on delete cascade,
  run_id uuid not null references public.ob_claim_production_runs(id) on delete cascade,
  candidate_index integer not null,
  claim_text text not null,
  importance text not null,
  claim_type text not null,
  qualifiers jsonb not null default '{}'::jsonb,
  support_sections text[] not null,
  generator_model text not null,
  generator_prompt_version text not null,
  generator_confidence numeric not null,
  origin_candidate_index integer null,
  repair_action text null,
  repair_reason text null,
  pre_repair_text text null,
  final_text text not null,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ob_claim_candidates_index_unique unique (extraction_event_id, candidate_index),
  constraint ob_claim_candidates_text_check check (public.ob_claim_text_is_safe(claim_text)),
  constraint ob_claim_candidates_final_text_check check (public.ob_claim_text_is_safe(final_text)),
  constraint ob_claim_candidates_importance_check check (importance in ('primary', 'secondary')),
  constraint ob_claim_candidates_type_check check (claim_type in (
    'diagnosis', 'treatment_indication', 'treatment_contraindication', 'anatomy',
    'risk_factor', 'complication', 'prognosis', 'classification', 'imaging',
    'physical_exam', 'biomechanics', 'epidemiology', 'pathophysiology',
    'threshold', 'operative_technique', 'postoperative_management'
  )),
  constraint ob_claim_candidates_qualifiers_check check (public.educational_claim_qualifiers_are_valid(qualifiers)),
  constraint ob_claim_candidates_confidence_check check (generator_confidence >= 0 and generator_confidence <= 1),
  constraint ob_claim_candidates_repair_check check (
    (repair_action is null and repair_reason is null and pre_repair_text is null)
    or (repair_action in ('rewrite', 'split'))
  )
);

comment on table public.ob_claim_candidates is
  'Immutable extracted candidates. Split children carry origin_candidate_index; rewrites keep pre_repair_text. Repair history is reconstructible.';

create or replace function public.ob_claim_immutable_guard()
returns trigger
language plpgsql
as $$
begin
  raise exception 'table is insert-only';
end;
$$;

create trigger ob_claim_candidates_guard_trigger
  before update or delete on public.ob_claim_candidates
  for each row execute function public.ob_claim_immutable_guard();

-- 5. Candidate review decisions (immutable; candidate null = set level) -------
create table public.ob_claim_candidate_decisions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid null references public.ob_claim_candidates(id) on delete cascade,
  extraction_event_id uuid not null references public.ob_claim_extraction_events(id) on delete cascade,
  item_id uuid not null references public.ob_claim_production_items(id) on delete cascade,
  run_id uuid not null references public.ob_claim_production_runs(id) on delete cascade,
  stage text not null,
  verdict text not null,
  reason text not null,
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  constraint ob_claim_candidate_decisions_stage_check check (stage in ('factual', 'quality', 'coverage', 'validator')),
  constraint ob_claim_candidate_decisions_scope_check check (
    (stage in ('factual', 'quality') and candidate_id is not null)
    or (stage = 'coverage' and candidate_id is null)
    or (stage = 'validator')
  ),
  constraint ob_claim_candidate_decisions_verdict_check check (
    (stage = 'factual' and verdict in ('supported', 'unsupported', 'ambiguous'))
    or (stage = 'quality' and verdict in ('good', 'rewrite', 'split', 'remove'))
    or (stage = 'coverage' and verdict in ('complete', 'missing_major_concept', 'overextracted', 'internally_conflicting'))
    or (stage = 'validator' and verdict in ('accept', 'abstain'))
  )
);

comment on table public.ob_claim_candidate_decisions is
  'Every review-stage judgment. Coverage rows are set-level (candidate null); validator rows carry the shared set verdict per candidate.';

create trigger ob_claim_candidate_decisions_guard_trigger
  before update or delete on public.ob_claim_candidate_decisions
  for each row execute function public.ob_claim_immutable_guard();

create index ob_claim_candidate_decisions_event_idx on public.ob_claim_candidate_decisions (extraction_event_id, stage);

-- 6. Candidate-to-durable-claim resolutions (immutable) ------------------------
create table public.ob_claim_candidate_resolutions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.ob_claim_candidates(id) on delete cascade,
  extraction_event_id uuid not null references public.ob_claim_extraction_events(id) on delete cascade,
  item_id uuid not null references public.ob_claim_production_items(id) on delete cascade,
  run_id uuid not null references public.ob_claim_production_runs(id) on delete cascade,
  examined_claim_id uuid null references public.educational_claims(id) on delete restrict,
  structural_hash text not null,
  semantic_hash text not null,
  verdict text not null,
  reason text not null,
  decision text not null,
  resolved_claim_id uuid null references public.educational_claims(id) on delete restrict,
  model text not null,
  prompt_version text not null,
  prompt_tokens bigint not null default 0,
  completion_tokens bigint not null default 0,
  estimated_cost_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint ob_claim_candidate_resolutions_hash_check check (
    structural_hash ~ '^[0-9a-f]{64}$' and semantic_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint ob_claim_candidate_resolutions_verdict_check check (verdict in (
    'exact_identity', 'equivalent', 'related_but_distinct', 'contradictory', 'uncertain'
  )),
  constraint ob_claim_candidate_resolutions_decision_check check (decision in ('reuse', 'create', 'unresolved')),
  constraint ob_claim_candidate_resolutions_resolved_check check (
    (decision = 'reuse' and resolved_claim_id is not null)
    or (decision in ('create', 'unresolved'))
  ),
  constraint ob_claim_candidate_resolutions_usage_check check (
    prompt_tokens >= 0 and completion_tokens >= 0 and estimated_cost_usd >= 0
  )
);

comment on table public.ob_claim_candidate_resolutions is
  'Resolution evidence per candidate. Unresolved/duplicate/conflict outcomes are recorded, never merged.';

create trigger ob_claim_candidate_resolutions_guard_trigger
  before update or delete on public.ob_claim_candidate_resolutions
  for each row execute function public.ob_claim_immutable_guard();

create index ob_claim_candidate_resolutions_candidate_idx on public.ob_claim_candidate_resolutions (candidate_id);

-- 7. Question identity resolutions (immutable) ---------------------------------
create table public.ob_question_identity_resolutions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.ob_claim_production_items(id) on delete cascade,
  run_id uuid not null references public.ob_claim_production_runs(id) on delete cascade,
  native_question_id text not null,
  outcome text not null,
  registry_question_id uuid null references public.external_questions(id) on delete restrict,
  method text not null,
  confidence text not null,
  evidence text[] not null default '{}',
  locator text not null,
  conflicting_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint ob_question_identity_resolutions_native_check check (native_question_id ~ '^[A-Za-z0-9._:-]{1,200}$'),
  constraint ob_question_identity_resolutions_outcome_check check (outcome in ('RESOLVED', 'UNRESOLVED', 'CONFLICT')),
  constraint ob_question_identity_resolutions_method_check check (method in (
    'registry_native_exact', 'registry_alias_exact', 'no_registry_match',
    'native_id_ambiguous', 'alias_ambiguous', 'native_alias_mismatch'
  )),
  constraint ob_question_identity_resolutions_confidence_check check (confidence in ('high', 'medium', 'low')),
  constraint ob_question_identity_resolutions_registry_check check (
    (outcome = 'RESOLVED' and registry_question_id is not null)
    or (outcome in ('UNRESOLVED', 'CONFLICT') and registry_question_id is null)
  )
);

comment on table public.ob_question_identity_resolutions is
  'Identity decisions per item. RESOLVED carries exactly one registry id; CONFLICT names all contenders; nothing here creates registry rows.';

create trigger ob_question_identity_resolutions_guard_trigger
  before update or delete on public.ob_question_identity_resolutions
  for each row execute function public.ob_claim_immutable_guard();

revoke all on function public.ob_claim_extraction_events_guard() from public, anon, authenticated;
revoke all on function public.ob_claim_immutable_guard() from public, anon, authenticated;
grant execute on function public.ob_claim_extraction_events_guard() to service_role;
grant execute on function public.ob_claim_immutable_guard() to service_role;

-- Retrieval support for claim resolution (additive; tiny table, instant build).
create index if not exists educational_claims_v5_text_trgm_idx
  on public.educational_claims using gin (claim_text extensions.gin_trgm_ops);

-- Supersede audit pointer on question links (additive, nullable, no backfill).
-- Lets the persist RPC record WHICH claim retired an edge; absent in prod today.
alter table public.question_claim_links
  add column if not exists superseded_at timestamptz null,
  add column if not exists superseded_by_claim_id uuid null
    references public.educational_claims(id) on delete set null;

-- Back-reference: items.live_attempt_id --------------------------------------
alter table public.ob_claim_production_items
  add constraint ob_claim_production_items_live_attempt_fk
  foreign key (live_attempt_id) references public.ob_claim_extraction_events(id) on delete set null;

-- RLS: service role only -------------------------------------------------------
alter table public.ob_claim_production_runs enable row level security;
alter table public.ob_claim_production_items enable row level security;
alter table public.ob_claim_extraction_events enable row level security;
alter table public.ob_claim_candidates enable row level security;
alter table public.ob_claim_candidate_decisions enable row level security;
alter table public.ob_claim_candidate_resolutions enable row level security;
alter table public.ob_question_identity_resolutions enable row level security;

revoke all on public.ob_claim_production_runs from public, anon, authenticated;
revoke all on public.ob_claim_production_items from public, anon, authenticated;
revoke all on public.ob_claim_extraction_events from public, anon, authenticated;
revoke all on public.ob_claim_candidates from public, anon, authenticated;
revoke all on public.ob_claim_candidate_decisions from public, anon, authenticated;
revoke all on public.ob_claim_candidate_resolutions from public, anon, authenticated;
revoke all on public.ob_question_identity_resolutions from public, anon, authenticated;

grant all on public.ob_claim_production_runs to service_role;
grant all on public.ob_claim_production_items to service_role;
grant all on public.ob_claim_extraction_events to service_role;
grant all on public.ob_claim_candidates to service_role;
grant all on public.ob_claim_candidate_decisions to service_role;
grant all on public.ob_claim_candidate_resolutions to service_role;
grant all on public.ob_question_identity_resolutions to service_role;

commit;
