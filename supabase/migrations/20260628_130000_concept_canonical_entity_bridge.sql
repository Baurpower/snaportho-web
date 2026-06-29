-- ============================================================================
-- Concept to canonical entity bridge
-- Reviewed transitional links from the legacy concept layer into the
-- next-generation canonical entity layer. This is additive and read-path only.
-- ============================================================================

create table if not exists public.concept_canonical_entities (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id) on delete restrict,
  canonical_entity_id uuid not null references public.canonical_entities(id) on delete restrict,
  bridge_type text not null default 'equivalent_to',
  confidence numeric(4,3) not null default 1.000,
  review_status text not null default 'generated',
  provenance_status text not null default 'pending',
  created_by text null,
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  notes text null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint concept_canonical_entities_bridge_type_check
    check (
      bridge_type in (
        'equivalent_to',
        'narrower_than',
        'broader_than',
        'related_to',
        'replaced_by'
      )
    ),
  constraint concept_canonical_entities_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint concept_canonical_entities_review_status_check
    check (
      review_status in (
        'generated',
        'needs_review',
        'approved',
        'rejected',
        'superseded'
      )
    ),
  constraint concept_canonical_entities_provenance_status_check
    check (
      provenance_status in (
        'pending',
        'source_attached',
        'reviewed',
        'conflicted'
      )
    ),
  constraint concept_canonical_entities_reviewed_at_requires_reviewer_check
    check (
      reviewed_at is null
      or reviewed_by is not null
    )
);

comment on table public.concept_canonical_entities is
  'Reviewed bridge from the legacy concept layer into next-generation canonical entities. Keeps concept migration incremental and auditable.';
comment on column public.concept_canonical_entities.bridge_type is
  'Semantic relationship between the old concept row and the canonical entity. Equivalent links are the safest path for direct reuse.';
comment on column public.concept_canonical_entities.created_by is
  'Free-text creation channel for transition auditing, for example manual, import, ai_suggestion, or review.';

create unique index if not exists concept_canonical_entities_unique_active_idx
  on public.concept_canonical_entities (concept_id, canonical_entity_id, bridge_type)
  where is_active = true;

create index if not exists concept_canonical_entities_concept_idx
  on public.concept_canonical_entities (concept_id, review_status, bridge_type);

create index if not exists concept_canonical_entities_canonical_idx
  on public.concept_canonical_entities (canonical_entity_id, review_status, bridge_type);

create index if not exists concept_canonical_entities_review_idx
  on public.concept_canonical_entities (review_status, is_active, confidence desc);

drop trigger if exists set_concept_canonical_entities_updated_at on public.concept_canonical_entities;
create trigger set_concept_canonical_entities_updated_at
  before update on public.concept_canonical_entities
  for each row
  execute function public.tg_set_updated_at();

grant select, insert, update on table public.concept_canonical_entities to service_role;
