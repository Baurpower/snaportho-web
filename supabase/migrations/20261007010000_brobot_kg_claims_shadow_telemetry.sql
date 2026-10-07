-- Additive BroBot KG claims shadow telemetry readiness.
-- Safe for live: IF NOT EXISTS columns + CHECK relax only. Does not enable answer influence by itself.
-- Does NOT create retrieve_brobot_knowledge_v3 (stay on v2 until explicitly enabled).
begin;

alter table public.brobot_kg_retrieval_events
  add column if not exists selected_claim_ids uuid[] not null default '{}',
  add column if not exists candidate_card_ids uuid[] not null default '{}',
  add column if not exists answer_used_claim_ids uuid[] not null default '{}',
  add column if not exists claim_candidate_count integer not null default 0,
  add column if not exists card_candidate_count integer not null default 0,
  add column if not exists query_variants text[] not null default '{}',
  add column if not exists requested_facets text[] not null default '{}',
  add column if not exists retrieval_channels jsonb not null default '{}',
  add column if not exists claim_score_components jsonb not null default '[]',
  add column if not exists exclusion_reasons text[] not null default '{}',
  add column if not exists rerank_version text,
  add column if not exists pool_size integer,
  add column if not exists support_level text;

create index if not exists brobot_kg_retrieval_claim_ids_idx
  on public.brobot_kg_retrieval_events using gin (selected_claim_ids);

-- Allow shadow dual-run and future flag-gated enable without breaking inserts.
alter table public.brobot_kg_retrieval_events
  drop constraint if exists brobot_kg_retrieval_mode_check,
  add constraint brobot_kg_retrieval_mode_check
    check (retrieval_mode in ('shadow', 'enabled')),
  drop constraint if exists brobot_kg_answer_influence_check,
  add constraint brobot_kg_answer_influence_check
    check (answer_influenced in (false, true));

comment on column public.brobot_kg_retrieval_events.answer_influenced is
  'True only when BROBOT_CLAIMS_GROUNDING_MODE=enabled and claims were supplied to answer generation.';

comment on column public.brobot_kg_retrieval_events.retrieval_mode is
  'shadow = dual-run/log only; enabled = claims may influence the answer (env-flag gated).';

commit;
