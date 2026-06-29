-- ============================================================================
-- Anki mapping-readiness views
-- Lightweight deterministic-mapping surfaces for tag cleanup and bulk review.
-- ============================================================================

drop view if exists public.v_anki_deck_tag_disagreements;
drop view if exists public.v_anki_tag_normalization_candidates;
drop view if exists public.v_anki_weakly_tagged_cards;
drop view if exists public.v_anki_mapping_readiness;
drop view if exists public.v_anki_unreviewed_quality_cards;
drop view if exists public.v_anki_potential_duplicates;
drop view if exists public.v_anki_media_ref_summary;
drop view if exists public.v_anki_cards_by_tag;
drop view if exists public.v_anki_cards_by_deck_path;
drop view if exists public.v_anki_cards_for_review;

create view public.v_anki_cards_for_review as
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
  n.import_batch_id,
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

create view public.v_anki_unreviewed_quality_cards as
select *
from public.v_anki_cards_for_review
where review_status = 'unreviewed' or review_status is null;

create view public.v_anki_cards_by_deck_path as
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

create view public.v_anki_cards_by_tag as
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

create view public.v_anki_media_ref_summary as
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

create view public.v_anki_potential_duplicates as
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

create view public.v_anki_mapping_readiness as
with tag_stats as (
  select
    v.import_batch_id,
    v.canonical_card_id,
    count(tag_value) filter (
      where lower(tag_value) ~ '^(snaportho(?::|$)|pocketpimped$|nettersconciseorthopaedicanatomy$|orthobullets$|aaos|rock$|#ortho::|ortho::|marty mcflyin)'
    )::integer as source_only_tag_count,
    count(tag_value) filter (
      where lower(tag_value) in (
        'ortho',
        'orthopedics',
        'muscles',
        'bones',
        'anatomy',
        'basicscience',
        'basicscience',
        'trauma',
        'pediatrics',
        'spine',
        'hand',
        'shoulder',
        'elbow',
        'foot',
        'ankle',
        'hip',
        'knee',
        'sports',
        'recon',
        'tumor'
      )
    )::integer as broad_tag_count,
    count(tag_value)::integer as total_tag_count,
    array_agg(tag_value order by tag_value) filter (where tag_value is not null) as tags
  from public.v_anki_cards_for_review v
  left join lateral unnest(v.tags) as tag_value on true
  group by v.import_batch_id, v.canonical_card_id
)
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
  ts.tags,
  coalesce(ts.total_tag_count, 0) as total_tag_count,
  coalesce(ts.source_only_tag_count, 0) as source_only_tag_count,
  coalesce(ts.broad_tag_count, 0) as broad_tag_count,
  greatest(coalesce(ts.total_tag_count, 0) - coalesce(ts.source_only_tag_count, 0) - coalesce(ts.broad_tag_count, 0), 0) as likely_topic_tag_count,
  v.media_ref_count,
  v.review_status,
  case
    when coalesce(ts.total_tag_count, 0) = 0 then 'no_tags'
    when coalesce(ts.total_tag_count, 0) = coalesce(ts.source_only_tag_count, 0) then 'source_only_tags'
    when greatest(coalesce(ts.total_tag_count, 0) - coalesce(ts.source_only_tag_count, 0) - coalesce(ts.broad_tag_count, 0), 0) = 0
      and coalesce(ts.broad_tag_count, 0) > 0 then 'broad_only_tags'
    when greatest(coalesce(ts.total_tag_count, 0) - coalesce(ts.source_only_tag_count, 0) - coalesce(ts.broad_tag_count, 0), 0) = 0 then 'no_topic_tags'
    else null
  end as weak_tag_reason,
  (
    coalesce(ts.total_tag_count, 0) = 0
    or coalesce(ts.total_tag_count, 0) = coalesce(ts.source_only_tag_count, 0)
    or (
      greatest(coalesce(ts.total_tag_count, 0) - coalesce(ts.source_only_tag_count, 0) - coalesce(ts.broad_tag_count, 0), 0) = 0
      and coalesce(ts.broad_tag_count, 0) > 0
    )
  ) as is_weakly_tagged
from public.v_anki_cards_for_review v
left join tag_stats ts
  on ts.import_batch_id = v.import_batch_id
 and ts.canonical_card_id = v.canonical_card_id;

create view public.v_anki_weakly_tagged_cards as
select *
from public.v_anki_mapping_readiness
where is_weakly_tagged = true;

create view public.v_anki_tag_normalization_candidates as
with normalized as (
  select
    t.import_batch_id,
    lower(t.raw_name) as normalized_tag_name,
    count(*)::integer as variant_count,
    array_agg(distinct t.raw_name order by t.raw_name) as raw_variants,
    sum(coalesce(bt.card_count, 0))::bigint as card_count
  from public.anki_tags t
  left join public.v_anki_cards_by_tag bt
    on bt.import_batch_id = t.import_batch_id
   and bt.tag_id = t.id
  where t.is_active = true
  group by t.import_batch_id, lower(t.raw_name)
)
select *
from normalized
where variant_count > 1;

create view public.v_anki_deck_tag_disagreements as
with specialty_signals as (
  select
    v.import_batch_id,
    v.canonical_card_id,
    v.deck_name,
    v.tags,
    array_remove(array[
      case when lower(coalesce(v.deck_name, '')) like '%trauma%' then 'trauma' end,
      case when lower(coalesce(v.deck_name, '')) like '%pediatr%' then 'pediatrics' end,
      case when lower(coalesce(v.deck_name, '')) like '%spine%' then 'spine' end,
      case when lower(coalesce(v.deck_name, '')) like '%hand%' then 'hand' end,
      case when lower(coalesce(v.deck_name, '')) like '%shoulder%' then 'shoulder' end,
      case when lower(coalesce(v.deck_name, '')) like '%elbow%' then 'elbow' end,
      case when lower(coalesce(v.deck_name, '')) like '%foot%' then 'foot' end,
      case when lower(coalesce(v.deck_name, '')) like '%ankle%' then 'ankle' end,
      case when lower(coalesce(v.deck_name, '')) like '%hip%' then 'hip' end,
      case when lower(coalesce(v.deck_name, '')) like '%knee%' then 'knee' end,
      case when lower(coalesce(v.deck_name, '')) like '%sports%' then 'sports' end,
      case when lower(coalesce(v.deck_name, '')) like '%recon%' then 'recon' end,
      case when lower(coalesce(v.deck_name, '')) like '%tumor%' then 'tumor' end
    ], null) as deck_specialties,
    array_remove(array[
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%trauma%') then 'trauma' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%pediatr%') then 'pediatrics' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%spine%') then 'spine' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%hand%') then 'hand' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%shoulder%') then 'shoulder' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%elbow%') then 'elbow' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%foot%') then 'foot' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%ankle%') then 'ankle' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%hip%') then 'hip' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%knee%') then 'knee' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%sports%') then 'sports' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%recon%') then 'recon' end,
      case when exists (select 1 from unnest(v.tags) tag where lower(tag) like '%tumor%') then 'tumor' end
    ], null) as tag_specialties
  from public.v_anki_cards_for_review v
)
select *
from specialty_signals
where cardinality(deck_specialties) > 0
  and cardinality(tag_specialties) > 0
  and not (deck_specialties && tag_specialties);

grant select on table public.v_anki_cards_for_review to service_role;
grant select on table public.v_anki_unreviewed_quality_cards to service_role;
grant select on table public.v_anki_cards_by_deck_path to service_role;
grant select on table public.v_anki_cards_by_tag to service_role;
grant select on table public.v_anki_media_ref_summary to service_role;
grant select on table public.v_anki_potential_duplicates to service_role;
grant select on table public.v_anki_mapping_readiness to service_role;
grant select on table public.v_anki_weakly_tagged_cards to service_role;
grant select on table public.v_anki_tag_normalization_candidates to service_role;
grant select on table public.v_anki_deck_tag_disagreements to service_role;
