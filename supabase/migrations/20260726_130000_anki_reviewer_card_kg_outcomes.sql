-- Durable negative-review evidence from the assignment-independent Anki panel.
-- This table records reviewer judgments only; it never mutates graph topology.
begin;

-- Workspace proposals may contain mappings without editing card fields.
alter table public.anki_editor_workspace_proposals
  drop constraint if exists anki_editor_workspace_fields;
alter table public.anki_editor_workspace_proposals
  add constraint anki_editor_workspace_fields
  check (jsonb_typeof(edited_fields) = 'array');

create table public.anki_reviewer_card_kg_outcomes (
  id uuid primary key default gen_random_uuid(),
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  device_token_id uuid not null references public.brobot_anki_device_tokens(id) on delete restrict,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete restrict,
  base_content_hash text not null,
  note_guid text not null,
  card_ordinal integer not null,
  local_content_hash text not null,
  outcome text not null,
  reason_codes text[] not null default '{}',
  reviewer_notes text not null default '',
  evidence_hash text not null,
  idempotency_key uuid not null,
  client_version text not null,
  created_at timestamptz not null default now(),
  constraint anki_reviewer_card_kg_outcome_value
    check (outcome in ('no_reliable_existing_entity')),
  constraint anki_reviewer_card_kg_outcome_hashes
    check (
      base_content_hash ~ '^[a-f0-9]{64}$'
      and local_content_hash ~ '^[a-f0-9]{64}$'
      and evidence_hash ~ '^[a-f0-9]{64}$'
    ),
  constraint anki_reviewer_card_kg_outcome_identity
    check (char_length(note_guid) between 1 and 200 and card_ordinal >= 0),
  constraint anki_reviewer_card_kg_outcome_notes
    check (char_length(reviewer_notes) <= 2000),
  constraint anki_reviewer_card_kg_outcome_idempotent
    unique (reviewer_user_id, idempotency_key)
);

create index anki_reviewer_card_kg_outcomes_card_idx
  on public.anki_reviewer_card_kg_outcomes (canonical_card_id, created_at desc);

create trigger guard_anki_reviewer_card_kg_outcomes_immutable
  before update or delete on public.anki_reviewer_card_kg_outcomes
  for each row execute function public.guard_anki_reviewer_immutable();

alter table public.anki_reviewer_card_kg_outcomes enable row level security;
alter table public.anki_reviewer_card_kg_outcomes force row level security;
revoke all on public.anki_reviewer_card_kg_outcomes from anon, authenticated, service_role;
grant select, insert on public.anki_reviewer_card_kg_outcomes to service_role;

comment on table public.anki_reviewer_card_kg_outcomes is
  'Immutable reviewer evidence that a card had no reliable existing canonical-entity match. Never writes KG topology.';

commit;
