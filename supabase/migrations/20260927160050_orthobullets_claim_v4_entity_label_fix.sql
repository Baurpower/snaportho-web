-- Preserve the requested label when SELECT INTO finds no authoritative entity.

begin;

create or replace function public.resolve_or_create_orthobullets_v4_entity(
  p_source_id uuid,
  p_external_question_id uuid,
  p_entity_type text,
  p_preferred_label text,
  p_normalized_label text,
  p_candidate_entity_id uuid,
  p_match_method text,
  p_match_confidence numeric,
  p_algorithm_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_entity_id uuid;
  v_label text;
  v_requested_label text;
  v_resolved_label text;
  v_resolution_status text;
  v_link_review_status text;
begin
  if p_algorithm_version <> 'orthobullets-autonomous-claim.v4' then
    raise exception 'unsupported_claim_algorithm';
  end if;
  if p_source_id is null or p_external_question_id is null then
    raise exception 'entity resolution requires source and question';
  end if;
  v_label := public.educational_claim_normalize_text(p_normalized_label);
  v_requested_label := trim(regexp_replace(coalesce(p_preferred_label, ''), '\s+', ' ', 'g'));
  if v_label = '' or char_length(v_label) > 200 or char_length(v_requested_label) not between 1 and 200 then
    raise exception 'invalid normalized entity label';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_entity_type || ':' || v_label, 0));

  if p_candidate_entity_id is not null then
    select ce.id, ce.preferred_label into v_entity_id, v_resolved_label
    from public.canonical_entities ce
    where ce.id = p_candidate_entity_id and ce.is_active
      and ce.review_status = 'approved' and ce.status in ('reviewed', 'canonical')
      and ce.entity_type = p_entity_type;
  end if;

  if v_entity_id is null then
    select ce.id, ce.preferred_label into v_entity_id, v_resolved_label
    from public.canonical_entities ce
    where ce.is_active and ce.review_status = 'approved'
      and ce.status in ('reviewed', 'canonical') and ce.entity_type = p_entity_type
      and public.educational_claim_normalize_text(ce.normalized_label) = v_label
    order by ce.status = 'canonical' desc, ce.created_at
    limit 1;
  end if;

  if v_entity_id is not null then
    v_resolution_status := 'authoritative';
    v_link_review_status := 'approved';
  else
    select ce.id, ce.preferred_label into v_entity_id, v_resolved_label
    from public.canonical_entities ce
    where ce.is_active and ce.status = 'proposed' and ce.review_status = 'unreviewed'
      and ce.entity_type = p_entity_type and ce.normalized_label = v_label
      and ce.metadata ->> 'creationMethod' = 'machine_consensus_v4'
    order by ce.created_at
    limit 1;

    if v_entity_id is null then
      v_resolved_label := v_requested_label;
      insert into public.canonical_entities (
        entity_type, preferred_label, normalized_label, status, review_status,
        created_from_source_id, metadata, is_active
      ) values (
        p_entity_type, v_requested_label, v_label, 'proposed', 'unreviewed',
        p_source_id,
        jsonb_build_object(
          'creationMethod', 'machine_consensus_v4',
          'validationStatus', 'provisional',
          'algorithmVersion', p_algorithm_version,
          'distinctQuestionCount', 1
        ),
        true
      ) returning id into v_entity_id;
    else
      update public.canonical_entities
      set metadata = jsonb_set(
            metadata,
            '{distinctQuestionCount}',
            to_jsonb(coalesce((metadata ->> 'distinctQuestionCount')::integer, 0) + 1),
            true
          ),
          updated_at = now()
      where id = v_entity_id;
    end if;
    v_resolution_status := 'provisional';
    v_link_review_status := 'unreviewed';
  end if;

  insert into public.question_canonical_entity_links (
    external_question_id, canonical_entity_id, retarget_path, match_basis,
    mapping_confidence, review_status, created_by_source, metadata, is_active
  ) values (
    p_external_question_id, v_entity_id, 'direct_exact',
    case when p_match_method = 'curriculum_node_bridge' then 'curriculum_inferred'
         when p_match_method in ('exact_source_alias', 'trigram_label') then 'alias'
         else 'exact_label' end,
    least(1, greatest(0, coalesce(p_match_confidence, 0))),
    v_link_review_status,
    case when v_resolution_status = 'authoritative' then 'system' else 'ai_suggestion' end,
    jsonb_build_object(
      'algorithmVersion', p_algorithm_version,
      'validationStatus', case when v_resolution_status = 'authoritative' then 'auto_validated' else 'provisional' end,
      'matchMethod', left(coalesce(p_match_method, 'machine_provisional'), 80)
    ),
    true
  )
  on conflict do nothing;

  return jsonb_build_object(
    'entityId', v_entity_id,
    'preferredLabel', coalesce(v_resolved_label, v_requested_label),
    'resolutionStatus', v_resolution_status
  );
end;
$$;

revoke all on function public.resolve_or_create_orthobullets_v4_entity(uuid, uuid, text, text, text, uuid, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.resolve_or_create_orthobullets_v4_entity(uuid, uuid, text, text, text, uuid, text, numeric, text)
  to service_role;

commit;
