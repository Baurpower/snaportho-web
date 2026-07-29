begin;
set local transaction read only;

do $$
declare
  table_name text;
  forced boolean;
begin
  foreach table_name in array array[
    'metadata_taxonomy_versions','metadata_concepts','metadata_concept_aliases',
    'metadata_pipeline_runs','metadata_pipeline_batches','metadata_pipeline_stage_results',
    'card_metadata_assertions','anki_tag_dispositions','anki_tag_disposition_targets',
    'metadata_releases','metadata_release_assertions','rendered_anki_tag_manifests',
    'rendered_anki_tag_manifest_cards','rendered_anki_tag_sources'
  ] loop
    select relforcerowsecurity into forced
    from pg_class where oid = ('public.' || table_name)::regclass;
    if forced is not true then raise exception '% does not force RLS', table_name; end if;
    if has_table_privilege('anon', 'public.' || table_name, 'SELECT')
      or has_table_privilege('authenticated', 'public.' || table_name, 'SELECT') then
      raise exception '% has a client SELECT grant', table_name;
    end if;
  end loop;

  if not has_function_privilege(
    'service_role', 'public.claim_metadata_pipeline_batch(uuid,text,integer)', 'EXECUTE'
  ) then raise exception 'service role cannot claim metadata batches'; end if;

  if has_function_privilege(
    'authenticated', 'public.claim_metadata_pipeline_batch(uuid,text,integer)', 'EXECUTE'
  ) then raise exception 'authenticated can claim administrative metadata batches'; end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'card_metadata_assertions_active_identity_idx'
  ) then raise exception 'active assertion uniqueness index is missing'; end if;

  if exists (
    select 1 from public.card_metadata_assertions
    where decision = 'accepted'
      and not (
        (decision_method = 'human_review' and reviewer_user_id is not null)
        or (decision_method = 'automated_policy' and reviewer_user_id is null
          and confidence >= 0.9800 and decision_policy_version is not null)
      )
  ) then raise exception 'accepted metadata assertion lacks a valid decision path'; end if;

  if exists (
    select 1
    from public.metadata_release_assertions ra
    join public.card_metadata_assertions a on a.id = ra.assertion_id
    where a.decision <> 'accepted'
  ) then raise exception 'metadata release contains a non-accepted assertion'; end if;

  if exists (
    select 1
    from public.rendered_anki_tag_manifest_cards mc
    cross join lateral unnest(mc.rendered_tags) tag
    where tag !~ '^(SnapOrtho|Legacy)(::[A-Za-z0-9][A-Za-z0-9_]*)+$'
  ) then raise exception 'rendered manifest contains an invalid tag path'; end if;
end $$;

rollback;
