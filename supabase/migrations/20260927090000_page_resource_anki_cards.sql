-- Exact published-deck lookup for the extension's on-page Anki reviewer.
create or replace function public.find_published_anki_cards_by_resource_url(
  resource_url text,
  resource_field text,
  result_limit integer default 50
)
returns table(note_guid text, card_ordinal integer, field_snapshot jsonb, overlay_fields jsonb)
language sql stable security definer
set search_path = public
as $$
  with latest_release as (
    select id from public.anki_deck_releases
    where status = 'published' order by published_at desc limit 1
  ), published_overlay as (
    select id from public.anki_resource_field_overlays
    where deck_release_id = (select id from latest_release) and status = 'published'
    order by published_at desc limit 1
  ), cards as (
    select rc.note_guid, rc.card_ordinal, cv.field_snapshot,
      coalesce(oc.fields, '{}'::jsonb) overlay_fields
    from public.anki_deck_release_cards rc
    join latest_release lr on lr.id = rc.deck_release_id
    join public.canonical_card_versions cv on cv.id = rc.canonical_card_version_id
    left join public.anki_resource_field_overlay_cards oc
      on oc.overlay_id = (select id from published_overlay) and oc.note_guid = rc.note_guid
    where rc.inclusion_status = 'included'
  )
  select c.note_guid, c.card_ordinal, c.field_snapshot, c.overlay_fields
  from cards c
  where lower(trim(trailing '/' from coalesce(
    c.overlay_fields ->> resource_field,
    case when jsonb_typeof(c.field_snapshot) = 'object' then c.field_snapshot ->> resource_field else (
      select coalesce(field ->> 'rawValue', field ->> 'value', '')
      from jsonb_array_elements(c.field_snapshot) field
      where field ->> 'name' = resource_field limit 1
    ) end,
    ''
  ))) = lower(trim(trailing '/' from resource_url))
  order by c.note_guid, c.card_ordinal
  limit least(greatest(result_limit, 1), 50);
$$;

revoke all on function public.find_published_anki_cards_by_resource_url(text, text, integer) from public, anon, authenticated;
grant execute on function public.find_published_anki_cards_by_resource_url(text, text, integer) to service_role;

