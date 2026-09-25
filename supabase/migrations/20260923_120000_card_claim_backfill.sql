-- ============================================================================
-- Card-claim backfill runs and per-card items.
--
-- The card-claim factory is deterministic and dry-run only. This schema
-- records backfill progress and per-card results WITHOUT touching review
-- state: canonical_entities, educational_claims content, and review
-- workflows are never mutated by these tables.
--
-- Claims with canonical targets live in educational_claims (explicit
-- deterministic ids). Claims with proposed/unresolved targets live only as
-- payloads on backfill items until a future human-reviewed promotion.
-- Proposed entities live in kg_automation_proposals (create_canonical_entity).
-- ============================================================================

begin;

create table if not exists public.card_claim_backfill_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  deck_release_id uuid not null references public.anki_deck_releases(id) on delete restrict,
  mode text not null,
  status text not null default 'pending',
  factory_contract_version text null,
  factory_implementation_version text null,
  batch_size integer not null default 200,
  totals jsonb not null default '{}'::jsonb,
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_claim_backfill_runs_mode_check
    check (mode in ('dry_run', 'apply')),
  constraint card_claim_backfill_runs_status_check
    check (status in ('pending', 'running', 'completed', 'failed')),
  constraint card_claim_backfill_runs_batch_check
    check (batch_size >= 1 and batch_size <= 1000),
  constraint card_claim_backfill_runs_totals_check
    check (public.educational_metadata_is_safe(totals))
);

create table if not exists public.card_claim_backfill_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.card_claim_backfill_runs(id) on delete restrict,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete cascade,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete cascade,
  content_hash text not null,
  status text not null default 'pending',
  claim_id uuid null,
  claim_ref_kind text null,
  entity_target_kind text null,
  entity_id uuid null references public.canonical_entities(id) on delete set null,
  proposed_entity_label text null,
  proposed_entity_type text null,
  proposed_proposal_id uuid null references public.kg_automation_proposals(id) on delete set null,
  resolution_reason text null,
  teaches_link_id uuid null references public.card_canonical_entity_links(id) on delete set null,
  conflict_kind text null,
  error_text text null,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_claim_backfill_items_status_check
    check (status in ('pending', 'processed', 'needs_review', 'failed')),
  constraint card_claim_backfill_items_claim_ref_check
    check (claim_ref_kind is null or claim_ref_kind in ('stored_claim', 'proposed_payload', 'unresolved_payload')),
  constraint card_claim_backfill_items_target_check
    check (entity_target_kind is null or entity_target_kind in ('canonical', 'proposed', 'unresolved')),
  constraint card_claim_backfill_items_conflict_check
    check (conflict_kind is null or conflict_kind in ('claim_conflict', 'link_conflict')),
  constraint card_claim_backfill_items_result_check
    check (public.educational_metadata_is_safe(result_payload)),
  constraint card_claim_backfill_items_card_version_unique
    unique (run_id, canonical_card_version_id)
);

create index if not exists card_claim_backfill_items_run_status_idx
  on public.card_claim_backfill_items (run_id, status);
create index if not exists card_claim_backfill_items_claim_idx
  on public.card_claim_backfill_items (claim_id)
  where claim_id is not null;

-- These operational tables are not client-facing. Explicitly deny API roles
-- even on projects that retain legacy default grants, then force RLS so a
-- future grant cannot expose historical card/claim payloads by accident.
revoke all on table public.card_claim_backfill_runs from anon, authenticated;
revoke all on table public.card_claim_backfill_items from anon, authenticated;
alter table public.card_claim_backfill_runs enable row level security;
alter table public.card_claim_backfill_runs force row level security;
alter table public.card_claim_backfill_items enable row level security;
alter table public.card_claim_backfill_items force row level security;

drop trigger if exists set_card_claim_backfill_runs_updated_at on public.card_claim_backfill_runs;
create trigger set_card_claim_backfill_runs_updated_at
  before update on public.card_claim_backfill_runs
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_card_claim_backfill_items_updated_at on public.card_claim_backfill_items;
create trigger set_card_claim_backfill_items_updated_at
  before update on public.card_claim_backfill_items
  for each row execute function public.tg_set_updated_at();

grant select, insert, update on table public.card_claim_backfill_runs to service_role;
grant select, insert, update on table public.card_claim_backfill_items to service_role;

commit;
