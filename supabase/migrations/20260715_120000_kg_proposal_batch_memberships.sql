-- Minimal many-to-many batch membership for semantic KG proposals.
create table if not exists public.kg_proposal_batch_memberships (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.kg_automation_proposals(id) on delete restrict,
  batch_key text not null,
  topic_slug text not null,
  packet_hash text null,
  graph_hash text null,
  packet_state text not null default 'approved',
  apply_disposition text not null default 'pending',
  canonical_target_table text null,
  canonical_target_id uuid null,
  included_at timestamptz not null default now(),
  applied_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kg_proposal_batch_memberships_batch_key_not_blank check (length(btrim(batch_key)) > 0),
  constraint kg_proposal_batch_memberships_topic_not_blank check (length(btrim(topic_slug)) > 0),
  constraint kg_proposal_batch_memberships_packet_state_check check (packet_state in ('approved', 'rejected', 'superseded')),
  constraint kg_proposal_batch_memberships_apply_disposition_check check (
    apply_disposition in ('pending', 'inserted', 'updated', 'merged', 'already_applied', 'no_op', 'failed', 'rolled_back')
  ),
  constraint kg_proposal_batch_memberships_target_table_check check (
    canonical_target_table is null or canonical_target_table in ('canonical_entities', 'canonical_relationships', 'curriculum_node_entities')
  ),
  constraint kg_proposal_batch_memberships_proposal_batch_unique unique (proposal_id, batch_key)
);

create index if not exists kg_proposal_batch_memberships_batch_idx
  on public.kg_proposal_batch_memberships (batch_key, packet_state, apply_disposition);

create index if not exists kg_proposal_batch_memberships_proposal_idx
  on public.kg_proposal_batch_memberships (proposal_id, batch_key);

drop trigger if exists set_kg_proposal_batch_memberships_updated_at on public.kg_proposal_batch_memberships;
create trigger set_kg_proposal_batch_memberships_updated_at
  before update on public.kg_proposal_batch_memberships
  for each row execute function public.tg_set_updated_at();

grant select, insert, update on table public.kg_proposal_batch_memberships to service_role;

-- Idempotent backfill from the legacy single-batch metadata assignment.
insert into public.kg_proposal_batch_memberships (
  proposal_id, batch_key, topic_slug, packet_state, apply_disposition, included_at, applied_at, created_at
)
select
  p.id,
  coalesce(nullif(p.metadata->>'staging_batch_key', ''), nullif(p.metadata->>'pilot', ''), 'legacy-unattributed'),
  coalesce(nullif(p.metadata->>'pilot', ''), 'legacy-unattributed'),
  case when p.review_status = 'rejected' then 'rejected' else 'approved' end,
  case when p.review_status = 'applied' then 'already_applied' else 'pending' end,
  coalesce(p.created_at, now()),
  p.applied_at,
  coalesce(p.created_at, now())
from public.kg_automation_proposals p
where p.is_active = true
on conflict (proposal_id, batch_key) do nothing;

comment on table public.kg_proposal_batch_memberships is
  'Batch inclusion and batch-specific apply disposition for deduplicated semantic KG proposals.';
