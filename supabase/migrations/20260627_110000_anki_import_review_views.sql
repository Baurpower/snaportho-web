-- ============================================================================
-- Anki import review views
-- First-pass read-only workflow surfaces for validation and human review.
-- ============================================================================

create or replace view public.v_anki_import_batch_summary as
with note_counts as (
  select import_batch_id, count(*)::bigint as note_count
  from public.anki_notes
  group by import_batch_id
),
card_counts as (
  select import_batch_id, count(*)::bigint as card_count
  from public.anki_cards
  group by import_batch_id
),
deck_counts as (
  select import_batch_id, count(*)::bigint as deck_count
  from public.anki_decks
  group by import_batch_id
),
model_counts as (
  select import_batch_id, count(*)::bigint as model_count
  from public.anki_note_models
  group by import_batch_id
),
tag_counts as (
  select import_batch_id, count(*)::bigint as tag_count
  from public.anki_tags
  group by import_batch_id
),
media_counts as (
  select import_batch_id, count(*)::bigint as media_ref_count
  from public.anki_media_refs
  group by import_batch_id
),
canonical_counts as (
  select n.import_batch_id, count(*)::bigint as canonical_card_count
  from public.canonical_cards cc
  join public.anki_notes n on n.id = cc.anki_note_id
  group by n.import_batch_id
),
quality_counts as (
  select qr.import_batch_id, count(*)::bigint as quality_review_count
  from public.card_quality_reviews qr
  group by qr.import_batch_id
)
select
  b.id as import_batch_id,
  b.file_name,
  b.file_type,
  b.importer_version,
  b.import_mode,
  b.status,
  b.created_at,
  coalesce(d.deck_count, 0) as deck_count,
  coalesce(m.model_count, 0) as model_count,
  coalesce(n.note_count, 0) as note_count,
  coalesce(c.card_count, 0) as card_count,
  coalesce(t.tag_count, 0) as tag_count,
  coalesce(mr.media_ref_count, 0) as media_ref_count,
  coalesce(cc.canonical_card_count, 0) as canonical_card_count,
  coalesce(q.quality_review_count, 0) as quality_review_count,
  b.warnings,
  b.metadata
from public.anki_import_batches b
left join deck_counts d on d.import_batch_id = b.id
left join model_counts m on m.import_batch_id = b.id
left join note_counts n on n.import_batch_id = b.id
left join card_counts c on c.import_batch_id = b.id
left join tag_counts t on t.import_batch_id = b.id
left join media_counts mr on mr.import_batch_id = b.id
left join canonical_counts cc on cc.import_batch_id = b.id
left join quality_counts q on q.import_batch_id = b.id;

create or replace view public.v_anki_cards_for_review as
with note_tag_agg as (
  select
    nt.note_id,
    array_agg(distinct t.raw_name order by t.raw_name) as tags
  from public.anki_note_tags nt
  join public.anki_tags t on t.id = nt.tag_id
  where nt.is_active = true
    and t.is_active = true
  group by nt.note_id
),
field_text_agg as (
  select
    n.id as note_id,
    string_agg(nullif(trim(field_item ->> 'plainText'), ''), ' | ' order by field_ordinal) as field_text
  from public.anki_notes n
  cross join lateral jsonb_array_elements(n.field_values) with ordinality as field_elements(field_item, field_ordinal)
  group by n.id
),
media_counts as (
  select
    note_id,
    count(*)::bigint as media_ref_count
  from public.anki_media_refs
  where is_active = true
  group by note_id
)
select
  cc.id as canonical_card_id,
  cc.current_version_id,
  n.id as source_note_id,
  c.id as source_card_id,
  n.anki_note_id,
  c.anki_card_id,
  n.anki_note_guid as anki_guid,
  d.full_name as deck_name,
  m.model_name,
  coalesce(n.field_values -> 0 ->> 'rawValue', '') as front_html,
  coalesce(n.field_values -> 1 ->> 'rawValue', '') as back_html,
  coalesce(ft.field_text, '') as field_text,
  coalesce(nta.tags, '{}'::text[]) as tags,
  coalesce(mc.media_ref_count, 0) as media_ref_count,
  qr.review_status,
  qr.suggested_training_level,
  qr.min_training_level,
  qr.max_training_level,
  qr.is_core_knowledge,
  qr.is_rotation_level,
  qr.is_oite_level,
  qr.is_boards_level,
  qr.is_attending_nuance,
  cc.created_at
from public.canonical_cards cc
join public.anki_notes n on n.id = cc.anki_note_id
join public.anki_cards c on c.id = cc.anki_card_id
left join public.anki_decks d on d.id = c.deck_id
left join public.anki_note_models m on m.id = n.note_model_id
left join public.card_quality_reviews qr
  on qr.canonical_card_id = cc.id
 and qr.is_current = true
left join note_tag_agg nta on nta.note_id = n.id
left join field_text_agg ft on ft.note_id = n.id
left join media_counts mc on mc.note_id = n.id
where cc.is_active = true
  and n.is_active = true
  and c.is_active = true;

create or replace view public.v_anki_unreviewed_quality_cards as
select *
from public.v_anki_cards_for_review
where review_status = 'unreviewed' or review_status is null;

create or replace view public.v_anki_cards_by_deck_path as
select
  b.id as import_batch_id,
  d.id as deck_id,
  d.full_name as deck_name,
  d.deck_path,
  count(c.id)::bigint as card_count,
  count(distinct c.note_id)::bigint as note_count,
  min(c.created_at) as first_card_created_at,
  max(c.created_at) as last_card_created_at
from public.anki_cards c
join public.anki_notes n on n.id = c.note_id
left join public.anki_decks d on d.id = c.deck_id
left join public.anki_import_batches b on b.id = c.import_batch_id
where c.is_active = true
group by b.id, d.id, d.full_name, d.deck_path;

create or replace view public.v_anki_cards_by_tag as
select
  n.import_batch_id,
  t.id as tag_id,
  t.raw_name as tag_name,
  t.slug as tag_slug,
  count(distinct nt.note_id)::bigint as note_count,
  count(c.id)::bigint as card_count
from public.anki_note_tags nt
join public.anki_tags t on t.id = nt.tag_id
join public.anki_notes n on n.id = nt.note_id
join public.anki_cards c on c.note_id = n.id
where nt.is_active = true
  and t.is_active = true
  and n.is_active = true
  and c.is_active = true
group by n.import_batch_id, t.id, t.raw_name, t.slug;

create or replace view public.v_anki_media_ref_summary as
select
  mr.import_batch_id,
  mr.media_kind,
  count(*)::bigint as media_ref_count,
  count(distinct mr.note_id)::bigint as note_count,
  count(*) filter (where mr.exists_in_package)::bigint as matched_package_ref_count,
  count(*) filter (where not mr.exists_in_package)::bigint as unmatched_package_ref_count
from public.anki_media_refs mr
where mr.is_active = true
group by mr.import_batch_id, mr.media_kind;

create or replace view public.v_anki_potential_duplicates as
with normalized_cards as (
  select
    cc.id as canonical_card_id,
    n.import_batch_id,
    c.id as source_card_id,
    coalesce(d.full_name, '') as deck_name,
    lower(regexp_replace(coalesce(n.field_values -> 0 ->> 'plainText', ''), '\s+', ' ', 'g')) as normalized_front_text,
    cc.source_content_hash
  from public.canonical_cards cc
  join public.anki_notes n on n.id = cc.anki_note_id
  join public.anki_cards c on c.id = cc.anki_card_id
  left join public.anki_decks d on d.id = c.deck_id
  where cc.is_active = true
    and n.is_active = true
    and c.is_active = true
),
front_duplicates as (
  select
    import_batch_id,
    normalized_front_text as duplicate_key,
    'normalized_front_text'::text as duplicate_reason,
    count(*)::bigint as duplicate_count,
    array_agg(canonical_card_id order by canonical_card_id) as canonical_card_ids
  from normalized_cards
  where normalized_front_text <> ''
  group by import_batch_id, normalized_front_text
  having count(*) > 1
),
hash_duplicates as (
  select
    import_batch_id,
    source_content_hash as duplicate_key,
    'source_content_hash'::text as duplicate_reason,
    count(*)::bigint as duplicate_count,
    array_agg(canonical_card_id order by canonical_card_id) as canonical_card_ids
  from normalized_cards
  group by import_batch_id, source_content_hash
  having count(*) > 1
)
select * from front_duplicates
union all
select * from hash_duplicates;

grant select on table public.v_anki_import_batch_summary to service_role;
grant select on table public.v_anki_cards_for_review to service_role;
grant select on table public.v_anki_unreviewed_quality_cards to service_role;
grant select on table public.v_anki_cards_by_deck_path to service_role;
grant select on table public.v_anki_cards_by_tag to service_role;
grant select on table public.v_anki_media_ref_summary to service_role;
grant select on table public.v_anki_potential_duplicates to service_role;
