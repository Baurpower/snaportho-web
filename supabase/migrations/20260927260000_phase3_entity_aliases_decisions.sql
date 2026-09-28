-- ============================================================================
-- Phase 3 entity promotion: source-agnostic canonical aliases + review log
-- (DESIGN — normal migration pipeline only; do NOT hand-apply.)
--
-- Why new tables instead of reusing existing ones:
-- - public.source_aliases is source-scoped (requires source_id, alias_kind is
--   source vocabulary). Claim-graph resolution needs source-agnostic reviewed
--   aliases ("ACL" -> anterior cruciate ligament on ANY card).
-- - public.concept_aliases serves the legacy concept layer only.
-- - public.kg_automation_proposals captures proposals, not the full
--   8-disposition review vocabulary (promote/alias/merge/4x reject/defer)
--   with reviewer + previous-state provenance per decision.
--
-- Trusted-canonical definition (used by verification + consumers):
--   is_active AND review_status = 'approved'
--   AND status IN ('reviewed', 'canonical')
-- ============================================================================

begin;

create table if not exists public.canonical_entity_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_entity_id uuid not null references public.canonical_entities(id) on delete cascade,
  alias_name text not null,
  normalized_alias text not null,
  alias_type text not null default 'synonym',
  confidence numeric(4,3) null,
  review_status text not null default 'unreviewed',
  reviewed_by text null,
  reviewed_at timestamptz null,
  created_from_decision_key text null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canonical_entity_aliases_type_check
    check (
      alias_type in (
        'abbreviation',
        'acronym',
        'synonym',
        'historical_term',
        'alternate_spelling',
        'plural_variant',
        'elided_form',
        'legacy_name'
      )
    ),
  constraint canonical_entity_aliases_review_status_check
    check (
      review_status in (
        'unreviewed',
        'in_review',
        'approved',
        'rejected'
      )
    ),
  constraint canonical_entity_aliases_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint canonical_entity_aliases_label_not_blank_check
    check (length(btrim(alias_name)) > 0 and length(btrim(normalized_alias)) > 0)
);

comment on table public.canonical_entity_aliases is
  'Source-agnostic reviewed aliases for canonical entities. Clinical synonyms enter only via reviewed ALIAS_EXISTING decisions, never via normalization.';
comment on column public.canonical_entity_aliases.created_from_decision_key is
  'Idempotency/provenance link to entity_review_decisions.decision_key.';

create unique index if not exists canonical_entity_aliases_entity_alias_uidx
  on public.canonical_entity_aliases (canonical_entity_id, normalized_alias)
  where is_active;

create index if not exists canonical_entity_aliases_lookup_idx
  on public.canonical_entity_aliases (normalized_alias, is_active);

create index if not exists canonical_entity_aliases_review_idx
  on public.canonical_entity_aliases (review_status, is_active);

drop trigger if exists set_canonical_entity_aliases_updated_at on public.canonical_entity_aliases;
create trigger set_canonical_entity_aliases_updated_at
  before update on public.canonical_entity_aliases
  for each row
  execute function public.tg_set_updated_at();

create table if not exists public.entity_review_decisions (
  id uuid primary key default gen_random_uuid(),
  decision_key text not null,
  kg_proposal_id uuid null references public.kg_automation_proposals(id) on delete set null,
  offline_proposal_id uuid null,
  proposal_label text not null,
  proposal_normalized_label text not null,
  proposed_entity_type text null,
  decision text not null,
  canonical_entity_id uuid null references public.canonical_entities(id) on delete set null,
  merge_head_proposal_id uuid null references public.kg_automation_proposals(id) on delete set null,
  canonical_label text null,
  entity_type text null,
  alias_type text null,
  reviewer text not null,
  reason text not null,
  confidence numeric(4,3) null,
  previous_state jsonb not null default '{}'::jsonb,
  source_claim_ids uuid[] not null default '{}'::uuid[],
  needs_full_db_recheck boolean not null default false,
  applied_at timestamptz null,
  applied_by text null,
  superseded_by uuid null references public.entity_review_decisions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_review_decisions_key_unique unique (decision_key),
  constraint entity_review_decisions_decision_check
    check (
      decision in (
        'PROMOTE_CANONICAL',
        'ALIAS_EXISTING',
        'MERGE_PROPOSALS',
        'REJECT_NON_ENTITY',
        'REJECT_TOO_GENERIC',
        'REJECT_CONTEXT_DEPENDENT',
        'REJECT_DUPLICATE',
        'DEFER_NEEDS_REVIEW'
      )
    ),
  constraint entity_review_decisions_target_check
    check (
      (decision = 'ALIAS_EXISTING' and canonical_entity_id is not null)
      or (decision = 'MERGE_PROPOSALS' and merge_head_proposal_id is not null)
      or (decision = 'PROMOTE_CANONICAL' and canonical_label is not null and entity_type is not null)
      or decision in (
        'REJECT_NON_ENTITY',
        'REJECT_TOO_GENERIC',
        'REJECT_CONTEXT_DEPENDENT',
        'REJECT_DUPLICATE',
        'DEFER_NEEDS_REVIEW'
      )
    ),
  constraint entity_review_decisions_reviewer_not_blank_check
    check (length(btrim(reviewer)) > 0 and length(btrim(reason)) > 0)
);

comment on table public.entity_review_decisions is
  'Durable per-proposal review decisions with reviewer provenance. Also serves as the negative list: future extractors must consult rejected normalized labels before proposing.';
comment on column public.entity_review_decisions.decision_key is
  'Client-supplied idempotency key. Replays with the same key are no-ops.';
comment on column public.entity_review_decisions.previous_state is
  'Snapshot of proposal/entity status before the decision, for reversibility.';

create index if not exists entity_review_decisions_proposal_idx
  on public.entity_review_decisions (proposal_normalized_label, decision);

create index if not exists entity_review_decisions_applied_idx
  on public.entity_review_decisions (applied_at)
  where applied_at is null;

drop trigger if exists set_entity_review_decisions_updated_at on public.entity_review_decisions;
create trigger set_entity_review_decisions_updated_at
  before update on public.entity_review_decisions
  for each row
  execute function public.tg_set_updated_at();

commit;
