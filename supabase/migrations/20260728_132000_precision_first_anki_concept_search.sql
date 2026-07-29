begin;

create or replace function public.search_latest_anki_deck_by_concept(
  search_terms text[],
  result_limit integer default 50
)
returns table (
  deck_release_id uuid,
  release_version text,
  canonical_card_id uuid,
  canonical_card_version_id uuid,
  note_guid text,
  card_ordinal integer,
  content_hash text,
  matched_terms integer,
  term_coverage double precision,
  text_rank real
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with latest_release as (
    select id, release_version
    from public.anki_deck_releases
    where status = 'published'
    order by published_at desc nulls last, created_at desc
    limit 1
  ),
  normalized_terms as (
    select array_agg(distinct lower(trim(term))) as terms
    from unnest(search_terms) term
    where char_length(trim(term)) between 3 and 60
  ),
  release_documents as (
    select
      lr.id as deck_release_id,
      lr.release_version,
      rc.canonical_card_id,
      rc.canonical_card_version_id,
      rc.note_guid,
      rc.card_ordinal,
      rc.content_hash,
      lower(coalesce(string_agg(
        field.item->>'plainText',
        ' '
      ) filter (
        where lower(coalesce(field.item->>'name', '')) in ('text', 'front', 'question')
          or field.ordinality = 1
      ), '')) as primary_document,
      lower(coalesce(string_agg(
        field.item->>'plainText',
        ' '
      ) filter (
        where lower(coalesce(field.item->>'name', '')) in (
          'back', 'extra', 'orthobullets', 'classifications', 'anatomy'
        )
          or field.ordinality = 2
      ), '')) as supporting_document,
      nt.terms
    from latest_release lr
    join public.anki_deck_release_cards rc
      on rc.deck_release_id = lr.id and rc.inclusion_status = 'included'
    join public.canonical_card_versions v on v.id = rc.canonical_card_version_id
    cross join normalized_terms nt
    cross join lateral jsonb_array_elements(v.field_snapshot)
      with ordinality as field(item, ordinality)
    group by
      lr.id, lr.release_version, rc.canonical_card_id,
      rc.canonical_card_version_id, rc.note_guid, rc.card_ordinal,
      rc.content_hash, nt.terms
  ),
  scored as (
    select d.*,
      (
        select count(*)::integer
        from unnest(d.terms) term
        where strpos(d.primary_document || ' ' || d.supporting_document, term) > 0
      ) as hits,
      (
        select count(*)::integer
        from unnest(d.terms) term
        where strpos(d.primary_document, term) > 0
      ) as primary_hits,
      setweight(to_tsvector('english', d.primary_document), 'A')
        || setweight(to_tsvector('english', d.supporting_document), 'B') as document_vector,
      to_tsquery('english', array_to_string(
        array(select quote_literal(term) from unnest(d.terms) term),
        ' | '
      )) as term_query
    from release_documents d
    where cardinality(d.terms) >= 2
  )
  select
    deck_release_id,
    release_version,
    canonical_card_id,
    canonical_card_version_id,
    note_guid,
    card_ordinal,
    content_hash,
    hits,
    hits::double precision / cardinality(terms),
    ts_rank_cd(document_vector, term_query)
  from scored
  where primary_hits >= 1
    and hits >= greatest(2, ceil(cardinality(terms) * 0.5)::integer)
  order by
    hits::double precision / cardinality(terms) desc,
    primary_hits desc,
    ts_rank_cd(document_vector, term_query) desc,
    canonical_card_id;
$$;

revoke all on function public.search_latest_anki_deck_by_concept(text[], integer)
  from public, anon, authenticated;
grant execute on function public.search_latest_anki_deck_by_concept(text[], integer)
  to service_role;

comment on function public.search_latest_anki_deck_by_concept(text[], integer) is
  'Precision-first search over the latest deck: requires multi-term coverage and at least one primary teaching-field match.';

commit;
