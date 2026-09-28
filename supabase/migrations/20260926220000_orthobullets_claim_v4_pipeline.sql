-- Claim-first Orthobullets v4 pipeline.
-- Raw source question content is never stored by this migration.

begin;

create extension if not exists pg_trgm with schema extensions;

alter table public.question_canonical_entity_links enable row level security;
alter table public.question_canonical_entity_links force row level security;
revoke all on table public.question_canonical_entity_links from public, anon, authenticated;
grant select, insert, update on table public.question_canonical_entity_links to service_role;

alter table public.orthobullets_claim_run_items
  add column if not exists processing_stage text not null default 'discovered',
  add column if not exists entity_resolution_status text null,
  add column if not exists card_outcome text null,
  add column if not exists retry_class text null,
  add column if not exists next_attempt_at timestamptz null,
  add column if not exists lease_expires_at timestamptz null,
  add column if not exists model_call_count integer not null default 0,
  add column if not exists prompt_token_count integer not null default 0,
  add column if not exists completion_token_count integer not null default 0;

alter table public.orthobullets_claim_run_items
  drop constraint if exists orthobullets_claim_run_items_status_check;
alter table public.orthobullets_claim_run_items
  add constraint orthobullets_claim_run_items_status_check
  check (status in (
    'pending', 'processing', 'accepted', 'accepted_no_card', 'accepted_provisional_entity',
    'retryable', 'unresolved_automatic', 'unresolved_claim', 'unresolved_source', 'blocked_access'
  ));

alter table public.orthobullets_claim_run_items
  add constraint orthobullets_claim_run_items_stage_check
    check (processing_stage in (
      'discovered', 'extracted', 'claim_validating', 'claim_validated',
      'entity_resolved', 'cards_evaluating', 'complete'
    )),
  add constraint orthobullets_claim_run_items_entity_resolution_check
    check (entity_resolution_status is null or entity_resolution_status in ('authoritative', 'provisional')),
  add constraint orthobullets_claim_run_items_card_outcome_check
    check (card_outcome is null or card_outcome in ('linked', 'no_lexical_hit', 'entailment_rejected', 'no_card')),
  add constraint orthobullets_claim_run_items_retry_class_check
    check (retry_class is null or retry_class in ('transient', 'version_change', 'access')),
  add constraint orthobullets_claim_run_items_usage_check
    check (model_call_count >= 0 and prompt_token_count >= 0 and completion_token_count >= 0);

create index if not exists orthobullets_claim_run_items_retry_idx
  on public.orthobullets_claim_run_items (status, next_attempt_at, lease_expires_at)
  where status in ('pending', 'processing', 'retryable');

create unique index if not exists canonical_entities_v4_provisional_identity_uidx
  on public.canonical_entities (entity_type, normalized_label)
  where is_active and status = 'proposed'
    and metadata ->> 'creationMethod' = 'machine_consensus_v4';

create index if not exists canonical_entities_normalized_label_trgm_idx
  on public.canonical_entities using gin (normalized_label extensions.gin_trgm_ops)
  where is_active;

create or replace function public.refresh_orthobullets_claim_run(p_run_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected integer;
  v_completed integer;
  v_accepted integer;
  v_unresolved integer;
begin
  select count(*),
         count(*) filter (where status in (
           'accepted', 'accepted_no_card', 'accepted_provisional_entity',
           'unresolved_automatic', 'unresolved_claim', 'unresolved_source', 'blocked_access'
         )),
         count(*) filter (where status in ('accepted', 'accepted_no_card', 'accepted_provisional_entity')),
         count(*) filter (where status in ('unresolved_automatic', 'unresolved_claim', 'unresolved_source', 'blocked_access'))
    into v_expected, v_completed, v_accepted, v_unresolved
  from public.orthobullets_claim_run_items
  where run_id = p_run_id;

  update public.orthobullets_claim_runs
  set expected_count = v_expected,
      completed_count = v_completed,
      accepted_count = v_accepted,
      unresolved_count = v_unresolved,
      status = case
        when v_completed < v_expected then 'running'
        when v_unresolved > 0 then 'completed_with_gaps'
        else 'completed'
      end,
      completed_at = case when v_completed = v_expected then coalesce(completed_at, now()) else null end,
      updated_at = now()
  where id = p_run_id;
end;
$$;

revoke all on function public.refresh_orthobullets_claim_run(uuid) from public, anon, authenticated;
grant execute on function public.refresh_orthobullets_claim_run(uuid) to service_role;

create or replace function public.search_orthobullets_v4_entity_candidates(
  p_external_question_id uuid,
  p_entity_type text,
  p_label text,
  p_limit integer default 8
)
returns table (
  entity_id uuid,
  preferred_label text,
  entity_type text,
  normalized_label text,
  score numeric,
  match_method text
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_label text;
begin
  v_label := public.educational_claim_normalize_text(p_label);
  if v_label = '' or char_length(v_label) > 200 then
    return;
  end if;

  return query
  with candidates as (
    select ce.id, ce.preferred_label, ce.entity_type, ce.normalized_label,
           1.000::numeric as score, 'existing_question_link'::text as match_method
    from public.question_canonical_entity_links ql
    join public.canonical_entities ce on ce.id = ql.canonical_entity_id
    where ql.external_question_id = p_external_question_id
      and ql.is_active and ce.is_active and ce.review_status = 'approved'
      and ce.status in ('reviewed', 'canonical') and ce.entity_type = p_entity_type

    union all

    select ce.id, ce.preferred_label, ce.entity_type, ce.normalized_label,
           0.990::numeric, 'exact_preferred_label'::text
    from public.canonical_entities ce
    where ce.is_active and ce.review_status = 'approved'
      and ce.status in ('reviewed', 'canonical') and ce.entity_type = p_entity_type
      and public.educational_claim_normalize_text(ce.normalized_label) = v_label

    union all

    select ce.id, ce.preferred_label, ce.entity_type, ce.normalized_label,
           0.960::numeric, 'exact_source_alias'::text
    from public.source_aliases sa
    join public.canonical_entities ce on ce.id = sa.entity_id
    where sa.is_active and sa.entity_type = 'canonical_entity'
      and ce.is_active and ce.review_status = 'approved'
      and ce.status in ('reviewed', 'canonical') and ce.entity_type = p_entity_type
      and public.educational_claim_normalize_text(sa.alias_value) = v_label

    union all

    select ce.id, ce.preferred_label, ce.entity_type, ce.normalized_label,
           least(0.900, greatest(0.500, qm.mapping_confidence * cne.confidence))::numeric,
           'curriculum_node_bridge'::text
    from public.external_question_curriculum_mappings qm
    join public.curriculum_node_entities cne
      on cne.curriculum_node_id = qm.curriculum_node_id and cne.is_active
    join public.canonical_entities ce on ce.id = cne.canonical_entity_id
    where qm.external_question_id = p_external_question_id and qm.is_active
      and ce.is_active and ce.review_status = 'approved'
      and ce.status in ('reviewed', 'canonical') and ce.entity_type = p_entity_type

    union all

    select ce.id, ce.preferred_label, ce.entity_type, ce.normalized_label,
           (0.500 + 0.350 * extensions.similarity(ce.normalized_label, v_label))::numeric,
           'trigram_label'::text
    from public.canonical_entities ce
    where ce.is_active and ce.review_status = 'approved'
      and ce.status in ('reviewed', 'canonical') and ce.entity_type = p_entity_type
      and extensions.similarity(ce.normalized_label, v_label) >= 0.35
  ), ranked as (
    select distinct on (c.id)
      c.id, c.preferred_label, c.entity_type, c.normalized_label, c.score, c.match_method
    from candidates c
    order by c.id, c.score desc, c.match_method
  )
  select r.id, r.preferred_label, r.entity_type, r.normalized_label, r.score, r.match_method
  from ranked r
  order by r.score desc, r.preferred_label
  limit greatest(1, least(coalesce(p_limit, 8), 20));
end;
$$;

revoke all on function public.search_orthobullets_v4_entity_candidates(uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.search_orthobullets_v4_entity_candidates(uuid, text, text, integer)
  to service_role;

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
  v_preferred_label text;
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
  v_preferred_label := trim(regexp_replace(coalesce(p_preferred_label, ''), '\s+', ' ', 'g'));
  if v_label = '' or char_length(v_label) > 200 or char_length(v_preferred_label) not between 1 and 200 then
    raise exception 'invalid normalized entity label';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_entity_type || ':' || v_label, 0));

  if p_candidate_entity_id is not null then
    select ce.id, ce.preferred_label into v_entity_id, v_preferred_label
    from public.canonical_entities ce
    where ce.id = p_candidate_entity_id and ce.is_active
      and ce.review_status = 'approved' and ce.status in ('reviewed', 'canonical')
      and ce.entity_type = p_entity_type;
  end if;

  if v_entity_id is null then
    select ce.id, ce.preferred_label into v_entity_id, v_preferred_label
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
    select ce.id, ce.preferred_label into v_entity_id, v_preferred_label
    from public.canonical_entities ce
    where ce.is_active and ce.status = 'proposed' and ce.review_status = 'unreviewed'
      and ce.entity_type = p_entity_type and ce.normalized_label = v_label
      and ce.metadata ->> 'creationMethod' = 'machine_consensus_v4'
    order by ce.created_at
    limit 1;

    if v_entity_id is null then
      insert into public.canonical_entities (
        entity_type, preferred_label, normalized_label, status, review_status,
        created_from_source_id, metadata, is_active
      ) values (
        p_entity_type, v_preferred_label, v_label, 'proposed', 'unreviewed',
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
    'preferredLabel', v_preferred_label,
    'resolutionStatus', v_resolution_status
  );
end;
$$;

revoke all on function public.resolve_or_create_orthobullets_v4_entity(uuid, uuid, text, text, text, uuid, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.resolve_or_create_orthobullets_v4_entity(uuid, uuid, text, text, text, uuid, text, numeric, text)
  to service_role;

create or replace function public.sync_educational_claim_fingerprint()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.algorithm_version in ('orthobullets-autonomous-claim.v3', 'orthobullets-autonomous-claim.v4') then
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

create or replace function public.sync_educational_claim_version_fingerprint()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.algorithm_version in ('orthobullets-autonomous-claim.v3', 'orthobullets-autonomous-claim.v4') then
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
  if p_algorithm_version <> 'orthobullets-autonomous-claim.v4' then
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
  where is_active and primary_entity_id = p_primary_entity_id
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
      'verified', 'approved',
      jsonb_build_object('sourceProvider', 'orthobullets', 'validationStatus', 'auto_validated')
    ) returning id into v_claim_id;

    insert into public.educational_claim_versions (
      claim_id, version_number, fingerprint_hash, claim_text, claim_type, predicate,
      object_text, qualifiers, primary_entity_id, approval_method, content_source,
      review_status, algorithm_version, metadata
    ) values (
      v_claim_id, 1, v_fingerprint, p_claim_text, p_claim_type, p_predicate,
      p_object_text, coalesce(p_qualifiers, '{}'::jsonb), p_primary_entity_id,
      'machine_consensus', 'verified', 'approved', p_algorithm_version,
      jsonb_build_object('sourceProvider', 'orthobullets', 'validationStatus', 'auto_validated')
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
      review_status = 'auto_approved',
      algorithm_version = p_algorithm_version,
      source_fingerprint_hash = p_source_fingerprint_hash,
      evidence_hashes = array[p_source_fingerprint_hash],
      reason_codes = array['completed_review_page', 'generator_critic_consensus', 'claim_first_v4'],
      metadata = jsonb_build_object('sourceProvider', 'orthobullets', 'validationStatus', 'auto_validated'),
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
      'tests_primary', p_confidence, 'machine_consensus', 'auto_approved', p_algorithm_version,
      'reviewed-question', p_source_fingerprint_hash, array[p_source_fingerprint_hash],
      array['completed_review_page', 'generator_critic_consensus', 'claim_first_v4'],
      jsonb_build_object('sourceProvider', 'orthobullets', 'validationStatus', 'auto_validated')
    );
  end if;

  update public.orthobullets_claim_run_items
  set status = 'processing', processing_stage = 'cards_evaluating',
      claim_id = v_claim_id, claim_version_id = v_version_id,
      source_fingerprint_hash = p_source_fingerprint_hash, last_error_code = null,
      reason_codes = array['generator_critic_consensus', 'claim_auto_validated'], updated_at = now()
  where id = p_run_item_id;
  perform public.refresh_orthobullets_claim_run(v_run_id);

  return jsonb_build_object(
    'claimId', v_claim_id,
    'claimVersionId', v_version_id,
    'fingerprintHash', v_fingerprint
  );
end;
$$;

revoke all on function public.commit_orthobullets_machine_claim(uuid, uuid, text, uuid, uuid, text, text, text, text, jsonb, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.commit_orthobullets_machine_claim(uuid, uuid, text, uuid, uuid, text, text, text, text, jsonb, text, numeric, text)
  to service_role;

comment on function public.search_orthobullets_v4_entity_candidates(uuid, text, text, integer) is
  'Retrieves approved entity candidates from existing question links, exact labels, aliases, curriculum bridges, and trigram similarity.';
comment on function public.resolve_or_create_orthobullets_v4_entity(uuid, uuid, text, text, text, uuid, text, numeric, text) is
  'Resolves a validated claim subject to an authoritative entity or creates/reuses a quarantined idempotent v4 provisional entity.';

commit;
