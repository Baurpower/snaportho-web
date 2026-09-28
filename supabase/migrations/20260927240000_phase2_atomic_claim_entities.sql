-- ============================================================================
-- Phase 2: atomic multi-claim support — claim_entities, claim_quality_flags,
-- and per-claim backfill items.
--
-- The card-claim factory now emits ZERO OR MORE atomic claims per card
-- version (one per extraction unit) instead of forcing one card -> one
-- claim. This migration adds the storage for that shape:
--
--   * public.claim_entities — 0..N entity targets per claim version with an
--     explicit role (teaches_about / tested_answer / context / comparison /
--     contraindication). Replaces the implicit "one primary entity" model
--     without touching primary_entity_id on existing rows.
--   * public.claim_quality_flags — claim-level review flags for EVERY claim
--     including auto-approved ones. block_auto_approve flags are advisory
--     records; the factory already withholds the link before writing them.
--   * public.card_claim_backfill_claims — per-claim children of
--     card_claim_backfill_items, so one backfill item can carry claims 1..N
--     with index, queue, and payload each.
--
-- DDL only. No backfill, no review-state changes, no merges, no repointing.
-- Claim text provenance (source unit id, claim index, rewrite method) travels
-- in educational_claim_versions.metadata, which needs no DDL change.
-- ============================================================================

begin;

create table if not exists public.claim_entities (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.educational_claims(id) on delete restrict,
  claim_version_id uuid not null references public.educational_claim_versions(id) on delete restrict,
  entity_kind text not null,
  canonical_entity_id uuid null references public.canonical_entities(id) on delete set null,
  proposed_proposal_id uuid null references public.kg_automation_proposals(id) on delete set null,
  role text not null,
  confidence numeric(4,3) not null,
  evidence_locator text not null,
  algorithm_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claim_entities_kind_check
    check (entity_kind in ('canonical', 'proposed', 'unresolved')),
  constraint claim_entities_role_check
    check (role in ('teaches_about', 'tested_answer', 'context', 'comparison', 'contraindication')),
  constraint claim_entities_confidence_check check (confidence >= 0 and confidence <= 1),
  constraint claim_entities_locator_check
    check (char_length(evidence_locator) between 1 and 200 and evidence_locator !~ '<[^>]+>'),
  constraint claim_entities_algorithm_check check (algorithm_version ~ '^[A-Za-z0-9._:-]{1,80}$'),
  constraint claim_entities_target_check check (
    (entity_kind = 'canonical' and canonical_entity_id is not null and proposed_proposal_id is null)
    or (entity_kind = 'proposed' and proposed_proposal_id is not null and canonical_entity_id is null)
    or (entity_kind = 'unresolved' and canonical_entity_id is null and proposed_proposal_id is null)
  ),
  constraint claim_entities_safe_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create unique index if not exists claim_entities_canonical_uidx
  on public.claim_entities (claim_version_id, canonical_entity_id, role)
  where is_active and entity_kind = 'canonical';
create unique index if not exists claim_entities_proposed_uidx
  on public.claim_entities (claim_version_id, proposed_proposal_id, role)
  where is_active and entity_kind = 'proposed';
create unique index if not exists claim_entities_unresolved_uidx
  on public.claim_entities (claim_version_id, role)
  where is_active and entity_kind = 'unresolved';
create index if not exists claim_entities_claim_idx
  on public.claim_entities (claim_id, is_active);
create index if not exists claim_entities_canonical_idx
  on public.claim_entities (canonical_entity_id, is_active)
  where canonical_entity_id is not null;

create table if not exists public.claim_quality_flags (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.educational_claims(id) on delete restrict,
  claim_version_id uuid null references public.educational_claim_versions(id) on delete restrict,
  canonical_card_id uuid null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid null references public.canonical_card_versions(id) on delete restrict,
  code text not null,
  severity text not null,
  detail text not null default '',
  algorithm_version text not null,
  created_at timestamptz not null default now(),
  constraint claim_quality_flags_code_check check (code ~ '^[a-z0-9_]{1,80}$'),
  constraint claim_quality_flags_severity_check check (severity in ('review', 'block_auto_approve')),
  constraint claim_quality_flags_detail_check check (char_length(detail) <= 500),
  constraint claim_quality_flags_algorithm_check check (algorithm_version ~ '^[A-Za-z0-9._:-]{1,80}$'),
  constraint claim_quality_flags_claim_code_unique unique (claim_id, code)
);

create index if not exists claim_quality_flags_claim_idx
  on public.claim_quality_flags (claim_id);
create index if not exists claim_quality_flags_severity_idx
  on public.claim_quality_flags (severity, code);

create table if not exists public.card_claim_backfill_claims (
  id uuid primary key default gen_random_uuid(),
  backfill_item_id uuid not null references public.card_claim_backfill_items(id) on delete restrict,
  claim_index integer not null,
  claims_in_version integer not null,
  queue text not null,
  claim_id uuid null,
  claim_ref_kind text null,
  entity_target_kind text null,
  reason_codes text[] not null default '{}'::text[],
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_claim_backfill_claims_index_check
    check (claim_index >= 1 and claims_in_version >= 1 and claim_index <= claims_in_version),
  constraint card_claim_backfill_claims_claim_ref_check
    check (claim_ref_kind is null or claim_ref_kind in ('stored_claim', 'proposed_payload', 'unresolved_payload')),
  constraint card_claim_backfill_claims_target_check
    check (entity_target_kind is null or entity_target_kind in ('canonical', 'proposed', 'unresolved')),
  constraint card_claim_backfill_claims_result_check
    check (public.educational_metadata_is_safe(result_payload)),
  constraint card_claim_backfill_claims_item_index_unique
    unique (backfill_item_id, claim_index)
);

create index if not exists card_claim_backfill_claims_item_idx
  on public.card_claim_backfill_claims (backfill_item_id);
create index if not exists card_claim_backfill_claims_claim_idx
  on public.card_claim_backfill_claims (claim_id)
  where claim_id is not null;

drop trigger if exists set_claim_entities_updated_at on public.claim_entities;
create trigger set_claim_entities_updated_at
  before update on public.claim_entities
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_card_claim_backfill_claims_updated_at on public.card_claim_backfill_claims;
create trigger set_card_claim_backfill_claims_updated_at
  before update on public.card_claim_backfill_claims
  for each row execute function public.tg_set_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'claim_entities',
    'claim_quality_flags',
    'card_claim_backfill_claims'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated, service_role', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_service_role_all',
      table_name
    );
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      table_name || '_service_role_all',
      table_name
    );
  end loop;
end $$;

comment on table public.claim_entities is
  'Phase 2: 0..N entity targets per claim version with explicit roles. Unresolved rows record missing evidence, never a silent merge.';
comment on table public.claim_quality_flags is
  'Phase 2: claim-level review flags for every claim including auto-approved ones. Advisory records; the factory withholds links before writing block flags.';
comment on table public.card_claim_backfill_claims is
  'Phase 2: per-claim children of backfill items. One card version carries claims 1..N with index, queue, and payload each.';

commit;
