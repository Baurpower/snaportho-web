-- Orthobullets machine claims keep the existing structural fingerprint for older rows.
-- New v3 claims add the assertion text so two facts about one entity stay two claims.
-- This migration does not backfill or rewrite fingerprint_hash on existing rows.

begin;

create or replace function public.educational_claim_assertion_text(value text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(both from regexp_replace(lower(coalesce(value, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.educational_claim_assertion_fingerprint_hash(
  claim_type text,
  primary_entity_id uuid,
  predicate text,
  object_text text,
  qualifiers jsonb,
  claim_text text
)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select encode(
    digest(
      convert_to(
        public.educational_claim_fingerprint_payload(
          claim_type, primary_entity_id, predicate, object_text, qualifiers
        ) || chr(10) || 'assertion=' || public.educational_claim_assertion_text(claim_text),
        'utf8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function public.educational_claim_assertion_text(text) from public, anon, authenticated;
grant execute on function public.educational_claim_assertion_text(text) to service_role;

revoke all on function public.educational_claim_assertion_fingerprint_hash(text, uuid, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.educational_claim_assertion_fingerprint_hash(text, uuid, text, text, jsonb, text) to service_role;

create or replace function public.sync_educational_claim_fingerprint()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.algorithm_version = 'orthobullets-autonomous-claim.v3' then
    new.fingerprint_hash := public.educational_claim_assertion_fingerprint_hash(
      new.claim_type, new.primary_entity_id, new.predicate, new.object_text, new.qualifiers, new.claim_text
    );
  else
    new.fingerprint_hash := public.educational_claim_fingerprint_hash(
      new.claim_type, new.primary_entity_id, new.predicate, new.object_text, new.qualifiers
    );
  end if;
  return new;
end;
$$;

drop trigger if exists sync_educational_claim_fingerprint on public.educational_claims;
create trigger sync_educational_claim_fingerprint
  before insert or update of claim_type, primary_entity_id, predicate, object_text, qualifiers, claim_text
  on public.educational_claims
  for each row execute function public.sync_educational_claim_fingerprint();

create or replace function public.sync_educational_claim_version_fingerprint()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.algorithm_version = 'orthobullets-autonomous-claim.v3' then
    new.fingerprint_hash := public.educational_claim_assertion_fingerprint_hash(
      new.claim_type, new.primary_entity_id, new.predicate, new.object_text, new.qualifiers, new.claim_text
    );
  else
    new.fingerprint_hash := public.educational_claim_fingerprint_hash(
      new.claim_type, new.primary_entity_id, new.predicate, new.object_text, new.qualifiers
    );
  end if;
  return new;
end;
$$;

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
begin
  if p_normalized_label = '' or char_length(p_normalized_label) > 200 then
    raise exception 'invalid normalized entity label';
  end if;
  if p_source_id is null or p_external_question_id is null then
    raise exception 'entity resolution requires source and question';
  end if;

  select count(*) into v_match_count
  from public.canonical_entities
  where entity_type = p_entity_type
    and normalized_label = p_normalized_label
    and is_active
    and status = 'canonical'
    and review_status = 'approved';

  if v_match_count <> 1 then
    return null;
  end if;

  select id into v_entity_id
  from public.canonical_entities
  where entity_type = p_entity_type
    and normalized_label = p_normalized_label
    and is_active
    and status = 'canonical'
    and review_status = 'approved';

  insert into public.question_canonical_entity_links (
    external_question_id, canonical_entity_id, retarget_path, match_basis,
    mapping_confidence, review_status, created_by_source, metadata, is_active
  ) values (
    p_external_question_id, v_entity_id, 'direct_exact', 'exact_label',
    0.950, 'unreviewed', 'ai_suggestion',
    jsonb_build_object(
      'algorithmVersion', p_algorithm_version,
      'validation', 'existing_canonical_label',
      'preferredLabel', left(p_preferred_label, 200)
    ), true
  )
  on conflict do nothing;

  return v_entity_id;
end;
$$;

revoke all on function public.resolve_orthobullets_machine_entity(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.resolve_orthobullets_machine_entity(uuid, uuid, text, text, text, text) to service_role;

create or replace function public.commit_orthobullets_machine_claim(
  p_user_id uuid,
  p_run_item_id uuid,
  p_native_question_id text,
  p_external_question_id uuid,
  p_primary_entity_id uuid,
  p_claim_text text,
  p_claim_type text,
  p_predicate text,
  p_object_text text,
  p_qualifiers jsonb,
  p_source_fingerprint_hash text,
  p_confidence numeric,
  p_algorithm_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_fingerprint text;
  v_claim_id uuid;
  v_version_id uuid;
  v_run_id uuid;
  v_assertion text;
begin
  if p_algorithm_version <> 'orthobullets-autonomous-claim.v3' then
    raise exception 'unsupported_claim_algorithm';
  end if;
  if p_confidence < 0.90 or p_confidence > 1 then
    raise exception 'machine claim confidence outside automatic acceptance range';
  end if;
  if not public.educational_claim_qualifiers_are_valid(coalesce(p_qualifiers, '{}'::jsonb)) then
    raise exception 'invalid claim qualifiers';
  end if;
  v_assertion := public.educational_claim_assertion_text(p_claim_text);
  if char_length(v_assertion) < 20 or char_length(v_assertion) > 500 then
    raise exception 'invalid claim assertion';
  end if;
  if p_claim_text ~* '\d{1,3}[[:space:]]*-?[[:space:]]*years?[[:space:]]*-?[[:space:]]*old'
     or p_claim_text ~* '\m(male|female)[[:space:]]+(laborer|carpenter|farmer|mechanic)\M' then
    raise exception 'vignette_in_claim';
  end if;

  select run_id into v_run_id
  from public.orthobullets_claim_run_items
  where id = p_run_item_id and user_id = p_user_id and native_question_id = p_native_question_id
  for update;
  if not found then raise exception 'claim run item ownership mismatch'; end if;

  perform pg_advisory_xact_lock(hashtextextended(
    public.educational_claim_fingerprint_payload(
      p_claim_type, p_primary_entity_id, p_predicate, p_object_text, coalesce(p_qualifiers, '{}'::jsonb)
    ) || chr(10) || 'assertion=' || v_assertion,
    0
  ));

  select id, current_version_id into v_claim_id, v_version_id
  from public.educational_claims
  where is_active
    and primary_entity_id = p_primary_entity_id
    and public.educational_claim_fingerprint_hash(
      claim_type, primary_entity_id, predicate, object_text, qualifiers
    ) = public.educational_claim_fingerprint_hash(
      p_claim_type, p_primary_entity_id, p_predicate, p_object_text, coalesce(p_qualifiers, '{}'::jsonb)
    )
    and public.educational_claim_assertion_text(claim_text) = v_assertion
  order by created_at asc
  limit 1;

  if v_claim_id is not null and v_version_id is null then
    select id into v_version_id
    from public.educational_claim_versions
    where claim_id = v_claim_id
    order by version_number desc
    limit 1;
  end if;

  v_fingerprint := public.educational_claim_assertion_fingerprint_hash(
    p_claim_type, p_primary_entity_id, p_predicate, p_object_text,
    coalesce(p_qualifiers, '{}'::jsonb), p_claim_text
  );

  if v_claim_id is null then
    insert into public.educational_claims (
      primary_entity_id, claim_text, claim_type, predicate, object_text, qualifiers,
      approval_method, algorithm_version, content_source, review_status, metadata
    ) values (
      p_primary_entity_id, p_claim_text, p_claim_type, p_predicate, p_object_text,
      coalesce(p_qualifiers, '{}'::jsonb), 'machine_consensus', p_algorithm_version,
      'needs_review', 'unreviewed',
      jsonb_build_object('sourceProvider', 'orthobullets', 'validation', 'generator_critic_consensus')
    ) returning id into v_claim_id;

    insert into public.educational_claim_versions (
      claim_id, version_number, fingerprint_hash, claim_text, claim_type, predicate,
      object_text, qualifiers, primary_entity_id, approval_method, content_source,
      review_status, algorithm_version, metadata
    ) values (
      v_claim_id, 1, v_fingerprint, p_claim_text, p_claim_type, p_predicate,
      p_object_text, coalesce(p_qualifiers, '{}'::jsonb), p_primary_entity_id,
      'machine_consensus', 'needs_review', 'unreviewed', p_algorithm_version,
      jsonb_build_object('sourceProvider', 'orthobullets', 'validation', 'generator_critic_consensus')
    ) returning id into v_version_id;

    update public.educational_claims set current_version_id = v_version_id where id = v_claim_id;
  end if;

  update public.question_claim_links
  set is_active = false, review_status = 'superseded', updated_at = now()
  where provider = 'orthobullets' and native_question_id = p_native_question_id
    and mapping_role = 'tests_primary' and is_active and claim_id <> v_claim_id;

  update public.question_claim_links
  set external_question_id = p_external_question_id,
      claim_version_id = v_version_id,
      confidence = p_confidence,
      approval_method = 'machine_consensus',
      review_status = 'needs_review',
      algorithm_version = p_algorithm_version,
      source_fingerprint_hash = p_source_fingerprint_hash,
      evidence_hashes = array[p_source_fingerprint_hash],
      reason_codes = array['completed_review_page', 'generator_critic_consensus', 'assertion_identity'],
      metadata = jsonb_build_object('sourceProvider', 'orthobullets', 'validation', 'generator_critic_consensus'),
      is_active = true,
      updated_at = now()
  where provider = 'orthobullets' and native_question_id = p_native_question_id
    and claim_id = v_claim_id and is_active;

  if not found then
    insert into public.question_claim_links (
      provider, native_question_id, external_question_id, claim_id, claim_version_id,
      mapping_role, confidence, approval_method, review_status, algorithm_version,
      evidence_locator, source_fingerprint_hash, evidence_hashes, reason_codes, metadata
    ) values (
      'orthobullets', p_native_question_id, p_external_question_id, v_claim_id, v_version_id,
      'tests_primary', p_confidence, 'machine_consensus', 'needs_review', p_algorithm_version,
      'reviewed-question', p_source_fingerprint_hash, array[p_source_fingerprint_hash],
      array['completed_review_page', 'generator_critic_consensus', 'assertion_identity'],
      jsonb_build_object('sourceProvider', 'orthobullets', 'validation', 'generator_critic_consensus')
    );
  end if;

  update public.orthobullets_claim_run_items
  set status = 'accepted_no_card', claim_id = v_claim_id, claim_version_id = v_version_id,
      source_fingerprint_hash = p_source_fingerprint_hash, last_error_code = null,
      reason_codes = array['generator_critic_consensus', 'claim_needs_review'], completed_at = now(), updated_at = now()
  where id = p_run_item_id;
  perform public.refresh_orthobullets_claim_run(v_run_id);

  return jsonb_build_object('claimId', v_claim_id, 'claimVersionId', v_version_id, 'fingerprintHash', v_fingerprint);
end;
$$;

revoke all on function public.commit_orthobullets_machine_claim(uuid, uuid, text, uuid, uuid, text, text, text, text, jsonb, text, numeric, text) from public, anon, authenticated;
grant execute on function public.commit_orthobullets_machine_claim(uuid, uuid, text, uuid, uuid, text, text, text, text, jsonb, text, numeric, text) to service_role;

comment on function public.educational_claim_assertion_fingerprint_hash(text, uuid, text, text, jsonb, text) is
  'Structural fingerprint plus whitespace-normalized assertion text. Used by orthobullets-autonomous-claim.v3 only. Does not rewrite older hashes.';

commit;
