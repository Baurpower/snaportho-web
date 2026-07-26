begin;

create or replace function public.search_latest_anki_deck_by_sections(
  section_queries jsonb,
  result_limit integer default 200
)
returns table (
  section_id text,
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
    select id
    from public.anki_deck_releases
    where status = 'published'
    order by published_at desc nulls last, created_at desc
    limit 1
  ),
  queries as (
    select
      left(item->>'id', 80) section_id,
      array(
        select distinct lower(trim(term))
        from jsonb_array_elements_text(item->'terms') term
        where char_length(trim(term)) between 3 and 60
      ) terms
    from jsonb_array_elements(section_queries) item
    where jsonb_typeof(item) = 'object'
      and jsonb_typeof(item->'terms') = 'array'
  ),
  documents as (
    select
      rc.canonical_card_id,
      rc.canonical_card_version_id,
      rc.note_guid,
      rc.card_ordinal,
      rc.content_hash,
      lower(coalesce((
        select string_agg(field->>'plainText', ' ')
        from jsonb_array_elements(v.field_snapshot) field
      ), '')) document
    from latest_release lr
    join public.anki_deck_release_cards rc
      on rc.deck_release_id = lr.id and rc.inclusion_status = 'included'
    join public.canonical_card_versions v on v.id = rc.canonical_card_version_id
  ),
  scored as (
    select
      q.section_id,
      d.*,
      q.terms,
      (select count(*)::integer from unnest(q.terms) term where strpos(d.document, term) > 0) hits,
      to_tsvector('english', d.document) document_vector,
      to_tsquery('english', array_to_string(
        array(select quote_literal(term) from unnest(q.terms) term),
        ' | '
      )) term_query
    from documents d
    cross join queries q
    where cardinality(q.terms) >= 1
  )
  select
    section_id,
    canonical_card_id,
    canonical_card_version_id,
    note_guid,
    card_ordinal,
    content_hash,
    hits,
    hits::double precision / cardinality(terms),
    ts_rank_cd(document_vector, term_query)
  from scored
  where hits >= 1
  order by
    section_id,
    hits::double precision / cardinality(terms) desc,
    ts_rank_cd(document_vector, term_query) desc,
    canonical_card_id
  limit greatest(1, least(result_limit, 500));
$$;

revoke all on function public.search_latest_anki_deck_by_sections(jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.search_latest_anki_deck_by_sections(jsonb, integer)
  to service_role;

comment on function public.search_latest_anki_deck_by_sections(jsonb, integer) is
  'Searches the latest published deck for multiple topic-page sections in one bounded call.';

commit;
