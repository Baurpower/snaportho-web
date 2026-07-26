-- Review-gated graph diffs proposed from Anki cards.
-- Suggestions, clinician decisions, and adjudications are immutable evidence.
-- This migration intentionally creates no function that writes canonical KG truth.
begin;

create table public.anki_kg_improvement_suggestions (
  id uuid primary key default gen_random_uuid(),
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  device_token_id uuid not null references public.brobot_anki_device_tokens(id) on delete restrict,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete restrict,
  base_content_hash text not null,
  note_guid text not null,
  card_ordinal integer not null,
  local_content_hash text not null,
  improvement_id text not null,
  graph_diff jsonb not null,
  evidence_hash text not null,
  algorithm_version text not null,
  idempotency_key uuid not null,
  client_version text not null,
  created_at timestamptz not null default now(),
  constraint anki_kg_improvement_hashes check (
    base_content_hash ~ '^[a-f0-9]{64}$'
    and local_content_hash ~ '^[a-f0-9]{64}$'
    and evidence_hash ~ '^[a-f0-9]{64}$'
  ),
  constraint anki_kg_improvement_identity check (
    char_length(note_guid) between 1 and 200
    and card_ordinal >= 0
    and char_length(improvement_id) between 1 and 64
  ),
  constraint anki_kg_improvement_graph_diff check (
    jsonb_typeof(graph_diff) = 'object'
    and graph_diff ->> 'contractVersion' = 'snaportho-anki-kg-improvement.v1'
    and graph_diff ->> 'improvementId' = improvement_id
    and jsonb_typeof(graph_diff -> 'operations') = 'array'
    and jsonb_typeof(graph_diff -> 'qualityGates') = 'array'
  ),
  constraint anki_kg_improvement_idempotent
    unique (reviewer_user_id, idempotency_key)
);

create table public.anki_kg_improvement_decisions (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.anki_kg_improvement_suggestions(id) on delete restrict,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  device_token_id uuid not null references public.brobot_anki_device_tokens(id) on delete restrict,
  decision text not null,
  evidence_hash text not null,
  reviewer_notes text not null default '',
  idempotency_key uuid not null,
  client_version text not null,
  created_at timestamptz not null default now(),
  constraint anki_kg_improvement_decision_value
    check (decision in ('accept', 'not_useful')),
  constraint anki_kg_improvement_decision_hash
    check (evidence_hash ~ '^[a-f0-9]{64}$'),
  constraint anki_kg_improvement_decision_notes
    check (char_length(reviewer_notes) <= 2000),
  constraint anki_kg_improvement_decision_once unique (suggestion_id),
  constraint anki_kg_improvement_decision_idempotent
    unique (reviewer_user_id, idempotency_key)
);

create table public.anki_kg_improvement_adjudications (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.anki_kg_improvement_suggestions(id) on delete restrict,
  decision_id uuid not null references public.anki_kg_improvement_decisions(id) on delete restrict,
  adjudicator_user_id uuid not null references auth.users(id) on delete restrict,
  device_token_id uuid not null references public.brobot_anki_device_tokens(id) on delete restrict,
  adjudication text not null,
  approved_operation_ids text[] not null default '{}',
  evidence_hash text not null,
  reason_codes text[] not null default '{}',
  adjudicator_notes text not null default '',
  idempotency_key uuid not null,
  client_version text not null,
  created_at timestamptz not null default now(),
  constraint anki_kg_improvement_adjudication_value
    check (adjudication in ('approve_for_incorporation', 'request_changes', 'reject', 'defer')),
  constraint anki_kg_improvement_adjudication_hash
    check (evidence_hash ~ '^[a-f0-9]{64}$'),
  constraint anki_kg_improvement_adjudication_notes
    check (char_length(adjudicator_notes) <= 2000),
  constraint anki_kg_improvement_adjudication_once unique (suggestion_id),
  constraint anki_kg_improvement_adjudication_idempotent
    unique (adjudicator_user_id, idempotency_key)
);

create function public.validate_anki_kg_improvement_decision()
returns trigger language plpgsql as $$
declare suggestion public.anki_kg_improvement_suggestions;
begin
  select * into suggestion
  from public.anki_kg_improvement_suggestions
  where id = new.suggestion_id;
  if suggestion.id is null then raise exception 'suggestion_not_found'; end if;
  if suggestion.reviewer_user_id <> new.reviewer_user_id then
    raise exception 'suggestion_reviewer_mismatch';
  end if;
  if suggestion.evidence_hash <> new.evidence_hash then
    raise exception 'suggestion_evidence_changed';
  end if;
  return new;
end $$;

create trigger validate_anki_kg_improvement_decision_before_insert
  before insert on public.anki_kg_improvement_decisions
  for each row execute function public.validate_anki_kg_improvement_decision();

create function public.validate_anki_kg_improvement_adjudication()
returns trigger language plpgsql as $$
declare
  suggestion public.anki_kg_improvement_suggestions;
  reviewer_decision public.anki_kg_improvement_decisions;
  valid_operation_ids text[];
begin
  select * into suggestion
  from public.anki_kg_improvement_suggestions
  where id = new.suggestion_id;
  select * into reviewer_decision
  from public.anki_kg_improvement_decisions
  where id = new.decision_id and suggestion_id = new.suggestion_id;
  if suggestion.id is null or reviewer_decision.id is null then
    raise exception 'improvement_evidence_not_found';
  end if;
  if reviewer_decision.decision <> 'accept' then
    raise exception 'only_accepted_improvements_can_be_adjudicated';
  end if;
  if suggestion.reviewer_user_id = new.adjudicator_user_id then
    raise exception 'independent_adjudicator_required';
  end if;
  if suggestion.evidence_hash <> new.evidence_hash then
    raise exception 'suggestion_evidence_changed';
  end if;
  select coalesce(array_agg(value ->> 'id'), '{}'::text[])
  into valid_operation_ids
  from jsonb_array_elements(suggestion.graph_diff -> 'operations') value;
  if not new.approved_operation_ids <@ valid_operation_ids then
    raise exception 'unknown_graph_operation';
  end if;
  if new.adjudication = 'approve_for_incorporation'
    and cardinality(new.approved_operation_ids) = 0 then
    raise exception 'approved_operations_required';
  end if;
  return new;
end $$;

create trigger validate_anki_kg_improvement_adjudication_before_insert
  before insert on public.anki_kg_improvement_adjudications
  for each row execute function public.validate_anki_kg_improvement_adjudication();

create trigger guard_anki_kg_improvement_suggestions_immutable
  before update or delete on public.anki_kg_improvement_suggestions
  for each row execute function public.guard_anki_reviewer_immutable();
create trigger guard_anki_kg_improvement_decisions_immutable
  before update or delete on public.anki_kg_improvement_decisions
  for each row execute function public.guard_anki_reviewer_immutable();
create trigger guard_anki_kg_improvement_adjudications_immutable
  before update or delete on public.anki_kg_improvement_adjudications
  for each row execute function public.guard_anki_reviewer_immutable();

create index anki_kg_improvement_suggestions_card_idx
  on public.anki_kg_improvement_suggestions (canonical_card_id, created_at desc);
create index anki_kg_improvement_decisions_queue_idx
  on public.anki_kg_improvement_decisions (decision, created_at desc);

alter table public.anki_kg_improvement_suggestions enable row level security;
alter table public.anki_kg_improvement_suggestions force row level security;
alter table public.anki_kg_improvement_decisions enable row level security;
alter table public.anki_kg_improvement_decisions force row level security;
alter table public.anki_kg_improvement_adjudications enable row level security;
alter table public.anki_kg_improvement_adjudications force row level security;

revoke all on public.anki_kg_improvement_suggestions from anon, authenticated, service_role;
revoke all on public.anki_kg_improvement_decisions from anon, authenticated, service_role;
revoke all on public.anki_kg_improvement_adjudications from anon, authenticated, service_role;
grant select, insert on public.anki_kg_improvement_suggestions to service_role;
grant select, insert on public.anki_kg_improvement_decisions to service_role;
grant select, insert on public.anki_kg_improvement_adjudications to service_role;

comment on table public.anki_kg_improvement_suggestions is
  'Immutable card-derived graph diffs. Suggestions never write canonical entities, claims, relationships, or mappings.';
comment on table public.anki_kg_improvement_adjudications is
  'Independent human adjudication of accepted graph operations. Incorporation remains a separate controlled workflow.';

commit;
