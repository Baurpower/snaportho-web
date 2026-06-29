-- ============================================================================
-- Anki KG mapping review workflow v1
-- Review ledger plus read-only workflow views for deterministic mapping review.
-- ============================================================================

create table if not exists public.anki_kg_review_actions (
  id uuid primary key default gen_random_uuid(),
  mapping_run_id uuid not null references public.anki_kg_mapping_runs(id) on delete cascade,
  canonical_card_id uuid not null references public.canonical_cards(id) on delete cascade,
  candidate_id uuid null references public.anki_kg_mapping_candidates(id) on delete set null,
  card_knowledge_link_id uuid null references public.card_knowledge_links(id) on delete set null,
  reviewer_user_id uuid not null,
  decision text not null,
  rationale text null,
  previous_status text null,
  new_status text null,
  review_group_key text null,
  metadata jsonb not null default '{}'::jsonb,
  comments text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anki_kg_review_actions_decision_check
    check (
      decision in (
        'approve_candidate',
        'reject_candidate',
        'needs_alias',
        'wrong_node',
        'bulk_approve_high_confidence_branch',
        'bulk_reject_source_only'
      )
    )
);

comment on table public.anki_kg_review_actions is
  'Audit ledger for human review actions taken against deterministic Anki-to-KG mapping candidates and applied links.';

create index if not exists anki_kg_review_actions_run_idx
  on public.anki_kg_review_actions (mapping_run_id, created_at desc);

create index if not exists anki_kg_review_actions_candidate_idx
  on public.anki_kg_review_actions (candidate_id, created_at desc);

create index if not exists anki_kg_review_actions_card_idx
  on public.anki_kg_review_actions (canonical_card_id, created_at desc);

drop trigger if exists set_anki_kg_review_actions_updated_at on public.anki_kg_review_actions;
create trigger set_anki_kg_review_actions_updated_at
  before update on public.anki_kg_review_actions
  for each row
  execute function public.tg_set_updated_at();

drop view if exists public.v_anki_kg_mapping_summary;
drop view if exists public.v_anki_kg_alias_suggestions;
drop view if exists public.v_anki_kg_coverage_by_tag;
drop view if exists public.v_anki_kg_coverage_by_deck_branch;
drop view if exists public.v_anki_kg_unmapped_cards;
drop view if exists public.v_anki_kg_applied_mappings;
drop view if exists public.v_anki_kg_review_candidates;

create view public.v_anki_kg_review_candidates as
with base_cards as (
  select
    v.import_batch_id,
    v.canonical_card_id,
    v.source_note_id,
    v.source_card_id,
    v.anki_note_id,
    v.anki_card_id,
    v.anki_guid,
    v.deck_name,
    array_to_string((string_to_array(coalesce(v.deck_name, ''), '::'))[1:4], '::') as deck_branch,
    v.model_name,
    v.field_text,
    v.tags,
    v.media_ref_count,
    v.review_status as card_review_status,
    v.weak_tag_reason,
    v.source_only_tag_count,
    v.broad_tag_count,
    v.likely_topic_tag_count
  from public.v_anki_mapping_readiness v
)
select
  c.mapping_run_id,
  bc.import_batch_id,
  c.id as candidate_id,
  c.canonical_card_id,
  bc.source_note_id,
  bc.source_card_id,
  bc.anki_note_id,
  bc.anki_card_id,
  bc.anki_guid,
  bc.deck_name,
  bc.deck_branch,
  bc.model_name,
  bc.field_text,
  bc.tags,
  bc.media_ref_count,
  bc.card_review_status,
  bc.weak_tag_reason,
  bc.source_only_tag_count,
  bc.broad_tag_count,
  bc.likely_topic_tag_count,
  (coalesce(bc.source_only_tag_count, 0) > 0) as has_source_provenance_tags,
  c.specialty_id,
  c.curriculum_node_id,
  cn.slug as curriculum_node_slug,
  cn.title as curriculum_node_title,
  cn.node_type as curriculum_node_type,
  c.concept_id,
  c.candidate_rank,
  c.mapping_confidence,
  c.review_status,
  c.mapper_type,
  c.is_selected,
  coalesce(c.metadata -> 'matched_labels', '[]'::jsonb) as matched_labels,
  coalesce(c.metadata -> 'evidence', '[]'::jsonb) as evidence,
  coalesce(c.metadata -> 'questionable_reasons', '[]'::jsonb) as questionable_reasons,
  c.comments,
  c.created_at,
  c.updated_at
from public.anki_kg_mapping_candidates c
join public.anki_kg_mapping_runs r
  on r.id = c.mapping_run_id
join base_cards bc
  on bc.canonical_card_id = c.canonical_card_id
 and bc.import_batch_id = r.import_batch_id
left join public.curriculum_nodes cn
  on cn.id = c.curriculum_node_id
where c.is_active = true;

create view public.v_anki_kg_applied_mappings as
with base_cards as (
  select
    v.import_batch_id,
    v.canonical_card_id,
    v.source_note_id,
    v.source_card_id,
    v.anki_note_id,
    v.anki_card_id,
    v.anki_guid,
    v.deck_name,
    array_to_string((string_to_array(coalesce(v.deck_name, ''), '::'))[1:4], '::') as deck_branch,
    v.model_name,
    v.field_text,
    v.tags,
    v.media_ref_count,
    v.review_status as card_review_status,
    v.weak_tag_reason,
    v.source_only_tag_count,
    v.broad_tag_count,
    v.likely_topic_tag_count
  from public.v_anki_mapping_readiness v
)
select
  (ckl.metadata ->> 'mapping_run_id')::uuid as mapping_run_id,
  bc.import_batch_id,
  ckl.id as card_knowledge_link_id,
  ckl.canonical_card_id,
  bc.source_note_id,
  bc.source_card_id,
  bc.anki_note_id,
  bc.anki_card_id,
  bc.anki_guid,
  bc.deck_name,
  bc.deck_branch,
  bc.model_name,
  bc.field_text,
  bc.tags,
  bc.media_ref_count,
  bc.card_review_status,
  bc.weak_tag_reason,
  bc.source_only_tag_count,
  bc.broad_tag_count,
  bc.likely_topic_tag_count,
  (coalesce(bc.source_only_tag_count, 0) > 0) as has_source_provenance_tags,
  ckl.specialty_id,
  ckl.curriculum_node_id,
  cn.slug as curriculum_node_slug,
  cn.title as curriculum_node_title,
  cn.node_type as curriculum_node_type,
  ckl.learning_objective_id,
  ckl.concept_id,
  ckl.mapping_confidence,
  ckl.review_status,
  ckl.link_method,
  ckl.is_primary,
  coalesce(ckl.metadata -> 'matched_labels', '[]'::jsonb) as matched_labels,
  coalesce(ckl.metadata -> 'evidence', '[]'::jsonb) as evidence,
  ckl.comments,
  ckl.created_at,
  ckl.updated_at
from public.card_knowledge_links ckl
join public.anki_kg_mapping_runs r
  on r.id = (ckl.metadata ->> 'mapping_run_id')::uuid
join base_cards bc
  on bc.canonical_card_id = ckl.canonical_card_id
 and bc.import_batch_id = r.import_batch_id
left join public.curriculum_nodes cn
  on cn.id = ckl.curriculum_node_id
where ckl.is_active = true
  and ckl.metadata ? 'mapping_run_id';

create view public.v_anki_kg_unmapped_cards as
with base_cards as (
  select
    v.import_batch_id,
    v.canonical_card_id,
    v.source_note_id,
    v.source_card_id,
    v.anki_note_id,
    v.anki_card_id,
    v.anki_guid,
    v.deck_name,
    array_to_string((string_to_array(coalesce(v.deck_name, ''), '::'))[1:4], '::') as deck_branch,
    v.model_name,
    v.field_text,
    v.tags,
    v.media_ref_count,
    v.review_status as card_review_status,
    v.weak_tag_reason,
    v.source_only_tag_count,
    v.broad_tag_count,
    v.likely_topic_tag_count
  from public.v_anki_mapping_readiness v
),
run_cards as (
  select
    r.id as mapping_run_id,
    r.import_batch_id,
    bc.canonical_card_id,
    bc.source_note_id,
    bc.source_card_id,
    bc.anki_note_id,
    bc.anki_card_id,
    bc.anki_guid,
    bc.deck_name,
    bc.deck_branch,
    bc.model_name,
    bc.field_text,
    bc.tags,
    bc.media_ref_count,
    bc.card_review_status,
    bc.weak_tag_reason,
    bc.source_only_tag_count,
    bc.broad_tag_count,
    bc.likely_topic_tag_count
  from public.anki_kg_mapping_runs r
  join base_cards bc
    on bc.import_batch_id = r.import_batch_id
)
select
  rc.mapping_run_id,
  rc.import_batch_id,
  rc.canonical_card_id,
  rc.source_note_id,
  rc.source_card_id,
  rc.anki_note_id,
  rc.anki_card_id,
  rc.anki_guid,
  rc.deck_name,
  rc.deck_branch,
  rc.model_name,
  rc.field_text,
  rc.tags,
  rc.media_ref_count,
  rc.card_review_status,
  rc.weak_tag_reason,
  rc.source_only_tag_count,
  rc.broad_tag_count,
  rc.likely_topic_tag_count,
  (coalesce(rc.source_only_tag_count, 0) > 0) as has_source_provenance_tags
from run_cards rc
left join public.anki_kg_mapping_candidates c
  on c.mapping_run_id = rc.mapping_run_id
 and c.canonical_card_id = rc.canonical_card_id
 and c.is_active = true
where c.id is null;

create view public.v_anki_kg_coverage_by_deck_branch as
with base_cards as (
  select
    v.import_batch_id,
    v.canonical_card_id,
    array_to_string((string_to_array(coalesce(v.deck_name, ''), '::'))[1:4], '::') as deck_branch
  from public.v_anki_mapping_readiness v
),
run_cards as (
  select
    r.id as mapping_run_id,
    r.import_batch_id,
    bc.canonical_card_id,
    bc.deck_branch
  from public.anki_kg_mapping_runs r
  join base_cards bc
    on bc.import_batch_id = r.import_batch_id
),
candidate_flags as (
  select
    c.mapping_run_id,
    c.canonical_card_id,
    bool_or(c.review_status = 'needs_review') as has_needs_review_candidate,
    bool_or(c.review_status = 'rejected') as has_rejected_candidate
  from public.anki_kg_mapping_candidates c
  where c.is_active = true
  group by c.mapping_run_id, c.canonical_card_id
),
applied_flags as (
  select
    (ckl.metadata ->> 'mapping_run_id')::uuid as mapping_run_id,
    ckl.canonical_card_id,
    bool_or(ckl.review_status in ('auto_mapped', 'approved', 'in_review', 'needs_review')) as has_active_mapping,
    bool_or(ckl.review_status = 'approved') as has_approved_mapping
  from public.card_knowledge_links ckl
  where ckl.is_active = true
    and ckl.metadata ? 'mapping_run_id'
  group by (ckl.metadata ->> 'mapping_run_id')::uuid, ckl.canonical_card_id
)
select
  rc.mapping_run_id,
  rc.import_batch_id,
  rc.deck_branch,
  count(*)::bigint as total_cards,
  count(*) filter (where coalesce(af.has_active_mapping, false))::bigint as mapped_cards,
  count(*) filter (
    where not coalesce(af.has_active_mapping, false)
      and not exists (
        select 1
        from public.anki_kg_mapping_candidates c
        where c.mapping_run_id = rc.mapping_run_id
          and c.canonical_card_id = rc.canonical_card_id
          and c.is_active = true
      )
  )::bigint as unmapped_cards,
  count(*) filter (where coalesce(cf.has_needs_review_candidate, false))::bigint as needs_review_cards,
  count(*) filter (where coalesce(af.has_approved_mapping, false))::bigint as approved_cards,
  count(*) filter (where coalesce(cf.has_rejected_candidate, false))::bigint as rejected_cards,
  round(
    100.0 * count(*) filter (where coalesce(af.has_active_mapping, false))::numeric
    / nullif(count(*)::numeric, 0),
    1
  ) as coverage_percentage
from run_cards rc
left join candidate_flags cf
  on cf.mapping_run_id = rc.mapping_run_id
 and cf.canonical_card_id = rc.canonical_card_id
left join applied_flags af
  on af.mapping_run_id = rc.mapping_run_id
 and af.canonical_card_id = rc.canonical_card_id
group by rc.mapping_run_id, rc.import_batch_id, rc.deck_branch;

create view public.v_anki_kg_coverage_by_tag as
with base_cards as (
  select
    v.import_batch_id,
    v.canonical_card_id,
    coalesce(v.tags, '{}'::text[]) as tags
  from public.v_anki_mapping_readiness v
),
run_cards as (
  select
    r.id as mapping_run_id,
    r.import_batch_id,
    bc.canonical_card_id,
    tag_value as tag_name
  from public.anki_kg_mapping_runs r
  join base_cards bc
    on bc.import_batch_id = r.import_batch_id
  cross join lateral unnest(bc.tags) as tag_value
),
candidate_flags as (
  select
    c.mapping_run_id,
    c.canonical_card_id,
    bool_or(c.review_status = 'needs_review') as has_needs_review_candidate
  from public.anki_kg_mapping_candidates c
  where c.is_active = true
  group by c.mapping_run_id, c.canonical_card_id
),
applied_flags as (
  select
    (ckl.metadata ->> 'mapping_run_id')::uuid as mapping_run_id,
    ckl.canonical_card_id,
    bool_or(ckl.review_status in ('auto_mapped', 'approved', 'in_review', 'needs_review')) as has_active_mapping
  from public.card_knowledge_links ckl
  where ckl.is_active = true
    and ckl.metadata ? 'mapping_run_id'
  group by (ckl.metadata ->> 'mapping_run_id')::uuid, ckl.canonical_card_id
)
select
  rc.mapping_run_id,
  rc.import_batch_id,
  rc.tag_name,
  count(*)::bigint as total_cards,
  count(*) filter (where coalesce(af.has_active_mapping, false))::bigint as mapped_cards,
  count(*) filter (
    where not coalesce(af.has_active_mapping, false)
      and not exists (
        select 1
        from public.anki_kg_mapping_candidates c
        where c.mapping_run_id = rc.mapping_run_id
          and c.canonical_card_id = rc.canonical_card_id
          and c.is_active = true
      )
  )::bigint as unmapped_cards,
  count(*) filter (where coalesce(cf.has_needs_review_candidate, false))::bigint as needs_review_cards,
  round(
    100.0 * count(*) filter (where coalesce(af.has_active_mapping, false))::numeric
    / nullif(count(*)::numeric, 0),
    1
  ) as coverage_percentage
from run_cards rc
left join candidate_flags cf
  on cf.mapping_run_id = rc.mapping_run_id
 and cf.canonical_card_id = rc.canonical_card_id
left join applied_flags af
  on af.mapping_run_id = rc.mapping_run_id
 and af.canonical_card_id = rc.canonical_card_id
group by rc.mapping_run_id, rc.import_batch_id, rc.tag_name;

create view public.v_anki_kg_alias_suggestions as
with candidate_labels as (
  select
    c.mapping_run_id,
    c.curriculum_node_id,
    cn.slug as curriculum_node_slug,
    cn.title as curriculum_node_title,
    cn.node_type as curriculum_node_type,
    c.canonical_card_id,
    c.mapping_confidence,
    jsonb_array_elements_text(coalesce(c.metadata -> 'matched_labels', '[]'::jsonb)) as suggested_alias
  from public.anki_kg_mapping_candidates c
  join public.curriculum_nodes cn
    on cn.id = c.curriculum_node_id
  where c.is_active = true
    and c.curriculum_node_id is not null
    and c.review_status = 'needs_review'
),
normalized_labels as (
  select
    cl.mapping_run_id,
    cl.curriculum_node_id,
    cl.curriculum_node_slug,
    cl.curriculum_node_title,
    cl.curriculum_node_type,
    cl.canonical_card_id,
    cl.mapping_confidence,
    trim(cl.suggested_alias) as suggested_alias,
    trim(
      both '-'
      from lower(regexp_replace(trim(cl.suggested_alias), '[^a-z0-9]+', '-', 'g'))
    ) as normalized_alias
  from candidate_labels cl
  where trim(cl.suggested_alias) <> ''
)
select
  nl.mapping_run_id,
  nl.curriculum_node_id,
  nl.curriculum_node_slug,
  nl.curriculum_node_title,
  nl.curriculum_node_type,
  nl.suggested_alias,
  nl.normalized_alias,
  count(distinct nl.canonical_card_id)::bigint as card_count,
  round(avg(nl.mapping_confidence)::numeric, 3) as avg_confidence
from normalized_labels nl
left join public.curriculum_node_aliases a
  on a.curriculum_node_id = nl.curriculum_node_id
 and a.normalized_alias = nl.normalized_alias
 and a.is_active = true
where a.id is null
group by
  nl.mapping_run_id,
  nl.curriculum_node_id,
  nl.curriculum_node_slug,
  nl.curriculum_node_title,
  nl.curriculum_node_type,
  nl.suggested_alias,
  nl.normalized_alias;

create view public.v_anki_kg_mapping_summary as
with total_cards as (
  select
    r.id as mapping_run_id,
    count(*)::bigint as total_cards
  from public.anki_kg_mapping_runs r
  join public.v_anki_cards_for_review v
    on v.import_batch_id = r.import_batch_id
  group by r.id
),
applied_links as (
  select
    am.mapping_run_id,
    count(*)::bigint as applied_links,
    count(*) filter (where am.review_status = 'approved')::bigint as approved_links
  from public.v_anki_kg_applied_mappings am
  group by am.mapping_run_id
),
mapped_cards as (
  select
    am.mapping_run_id,
    count(distinct am.canonical_card_id)::bigint as mapped_cards
  from public.v_anki_kg_applied_mappings am
  group by am.mapping_run_id
),
needs_review as (
  select
    rc.mapping_run_id,
    count(*)::bigint as needs_review_candidates
  from public.v_anki_kg_review_candidates rc
  where rc.review_status = 'needs_review'
  group by rc.mapping_run_id
),
rejected as (
  select
    rc.mapping_run_id,
    count(*)::bigint as rejected_candidates
  from public.v_anki_kg_review_candidates rc
  where rc.review_status = 'rejected'
  group by rc.mapping_run_id
),
unmapped as (
  select
    uc.mapping_run_id,
    count(*)::bigint as unmapped_cards
  from public.v_anki_kg_unmapped_cards uc
  group by uc.mapping_run_id
)
select
  r.id as mapping_run_id,
  r.import_batch_id,
  r.mapper_version,
  r.run_mode,
  r.status,
  r.min_confidence,
  r.deck_prefix,
  r.limit_count,
  coalesce(tc.total_cards, 0) as total_cards,
  coalesce(mc.mapped_cards, 0) as mapped_cards,
  coalesce(um.unmapped_cards, 0) as unmapped_cards,
  coalesce(nr.needs_review_candidates, 0) as needs_review_candidates,
  coalesce(al.applied_links, 0) as applied_links,
  coalesce(al.approved_links, 0) as approved_links,
  coalesce(rj.rejected_candidates, 0) as rejected_candidates,
  round(
    100.0 * coalesce(mc.mapped_cards, 0)::numeric / nullif(coalesce(tc.total_cards, 0)::numeric, 0),
    1
  ) as coverage_percentage,
  r.created_at,
  r.updated_at
from public.anki_kg_mapping_runs r
left join total_cards tc on tc.mapping_run_id = r.id
left join mapped_cards mc on mc.mapping_run_id = r.id
left join unmapped um on um.mapping_run_id = r.id
left join needs_review nr on nr.mapping_run_id = r.id
left join applied_links al on al.mapping_run_id = r.id
left join rejected rj on rj.mapping_run_id = r.id;

grant select, insert, update on table public.anki_kg_review_actions to service_role;
grant select on table public.v_anki_kg_review_candidates to service_role;
grant select on table public.v_anki_kg_applied_mappings to service_role;
grant select on table public.v_anki_kg_unmapped_cards to service_role;
grant select on table public.v_anki_kg_coverage_by_deck_branch to service_role;
grant select on table public.v_anki_kg_coverage_by_tag to service_role;
grant select on table public.v_anki_kg_alias_suggestions to service_role;
grant select on table public.v_anki_kg_mapping_summary to service_role;
