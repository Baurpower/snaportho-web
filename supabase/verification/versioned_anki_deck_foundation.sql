-- Read-only verification for an explicitly migrated disposable/staging database.
do $$ declare t text; policies integer; begin
  foreach t in array array['anki_deck_releases','anki_deck_release_cards','anki_card_entity_mapping_runs_v2','anki_card_entity_version_mappings'] loop
    if to_regclass('public.'||t) is null then raise exception 'Missing public.%',t; end if;
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t and c.relrowsecurity and c.relforcerowsecurity) then raise exception 'Forced RLS missing on %',t; end if;
    select count(*) into policies from pg_policies where schemaname='public' and tablename=t and roles=array['service_role']::name[] and cmd='ALL' and qual='true' and with_check='true';
    if policies<>1 then raise exception 'Exact service-role policy missing on %',t; end if;
    if has_table_privilege('anon','public.'||t,'select') or has_table_privilege('authenticated','public.'||t,'select') then raise exception 'Client access found on %',t; end if;
  end loop;
  if (select count(*) from pg_trigger where not tgisinternal and tgname in ('guard_anki_deck_release_lifecycle','guard_anki_deck_release_card_mutation','validate_anki_deck_release_card','validate_anki_version_mapping','guard_reviewed_anki_version_mapping','mark_anki_version_mappings_stale'))<>6 then raise exception 'Release/mapping integrity triggers missing'; end if;
  if not exists(select 1 from pg_constraint where conname='anki_deck_release_cards_identity_key') then raise exception 'GUID/ordinal uniqueness missing'; end if;
  if not exists(select 1 from pg_constraint where conname='anki_deck_releases_checksum_check') then raise exception 'Manifest checksum constraint missing'; end if;
  if not public.educational_metadata_is_safe('{"safe":"id"}'::jsonb) or public.educational_metadata_is_safe('{"nested":{"cardBody":"forbidden"}}'::jsonb) then raise exception 'Recursive metadata safety failed'; end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name in ('anki_deck_releases','anki_deck_release_cards','anki_card_entity_mapping_runs_v2','anki_card_entity_version_mappings') and lower(column_name) in ('front','back','card_body','field_text','raw_html')) then raise exception 'Protected content column found'; end if;
  -- No canonical_relationships dependency: all clinical FKs target canonical_entities.
  if exists(select 1 from pg_constraint where conrelid in ('public.anki_deck_releases'::regclass,'public.anki_deck_release_cards'::regclass,'public.anki_card_entity_mapping_runs_v2'::regclass,'public.anki_card_entity_version_mappings'::regclass) and confrelid='public.canonical_relationships'::regclass) then raise exception 'No canonical_relationships dependency allowed'; end if;
end $$;
