begin;

alter table public.brobot_kg_retrieval_events
  add column if not exists configured_deadline_ms integer null,
  add column if not exists elapsed_latency_ms integer null,
  add column if not exists timeout_stage text null,
  add column if not exists rpc_started boolean not null default false,
  add column if not exists rpc_completed boolean not null default false,
  add column if not exists evidence_packet_count integer not null default 0,
  add column if not exists answer_influenced boolean not null default false,
  add column if not exists retrieval_mode text not null default 'shadow',
  add column if not exists safe_error_code text null,
  add column if not exists safe_error_stage text null;

alter table public.brobot_kg_retrieval_events
  drop constraint if exists brobot_kg_timeout_stage_check,
  add constraint brobot_kg_timeout_stage_check check (
    timeout_stage is null or timeout_stage in (
      'deadline_before_rpc','rpc_timeout','rpc_completed_after_deadline',
      'response_parse_timeout','packet_construction_timeout','unknown_timeout'
    )
  ),
  drop constraint if exists brobot_kg_retrieval_mode_check,
  add constraint brobot_kg_retrieval_mode_check check (retrieval_mode = 'shadow'),
  drop constraint if exists brobot_kg_answer_influence_check,
  add constraint brobot_kg_answer_influence_check check (answer_influenced = false),
  drop constraint if exists brobot_kg_deadline_check,
  add constraint brobot_kg_deadline_check check (configured_deadline_ms is null or configured_deadline_ms between 50 and 5000),
  drop constraint if exists brobot_kg_elapsed_check,
  add constraint brobot_kg_elapsed_check check (elapsed_latency_ms is null or elapsed_latency_ms >= 0);

comment on column public.brobot_kg_retrieval_events.answer_influenced is
  'Hard shadow-mode invariant. KG packets are never supplied to answer generation.';

commit;
