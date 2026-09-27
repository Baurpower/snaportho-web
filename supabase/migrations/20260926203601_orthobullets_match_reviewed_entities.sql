-- The approved ontology is status reviewed, not only the three canonical rows.
-- This does not insert entities and does not rewrite existing claims.

begin;

create or replace function public.resolve_orthobullets_machine_entity(
  p_source_id uuid,
  p_external_question_id uuid,
  p_entity_type text,
  p_preferred_label text,
  p_normalized_label text,
  p_algorithm_version text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id uuid;
  v_match_count integer;
  v_label text;
begin
  v_label := regexp_replace(lower(trim(coalesce(p_normalized_label, ''))), '^the ', '');
  if v_label = '' or char_length(v_label) > 200 then
    raise exception 'invalid normalized entity label';
  end if;
  if p_source_id is null or p_external_question_id is null then
    raise exception 'entity resolution requires source and question';
  end if;

  select count(*) into v_match_count
  from public.canonical_entities
  where is_active
    and review_status = 'approved'
    and status in ('reviewed', 'canonical')
    and regexp_replace(normalized_label, '^the ', '') = v_label
    and (p_entity_type is null or entity_type = p_entity_type);

  if v_match_count <> 1 then
    return null;
  end if;

  select id into v_entity_id
  from public.canonical_entities
  where is_active
    and review_status = 'approved'
    and status in ('reviewed', 'canonical')
    and regexp_replace(normalized_label, '^the ', '') = v_label
    and (p_entity_type is null or entity_type = p_entity_type);

  insert into public.question_canonical_entity_links (
    external_question_id, canonical_entity_id, retarget_path, match_basis,
    mapping_confidence, review_status, created_by_source, metadata, is_active
  ) values (
    p_external_question_id, v_entity_id, 'direct_exact', 'exact_label',
    0.950, 'unreviewed', 'ai_suggestion',
    jsonb_build_object(
      'algorithmVersion', p_algorithm_version,
      'validation', 'existing_approved_label',
      'preferredLabel', left(p_preferred_label, 200)
    ), true
  )
  on conflict do nothing;

  return v_entity_id;
end;
$$;

revoke all on function public.resolve_orthobullets_machine_entity(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.resolve_orthobullets_machine_entity(uuid, uuid, text, text, text, text) to service_role;

commit;
