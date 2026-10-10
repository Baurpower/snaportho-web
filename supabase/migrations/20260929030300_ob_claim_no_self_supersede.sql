-- ob-claims-production.v1 patch 4: no intra-persist link cannibalization.
--
-- Canary-exposed defect: the resolution layer authorizes reuse for LLM-judged
-- paraphrases (verdict 'equivalent'), but the persist RPC demanded exact hash
-- equality for ALL reuses, failing every equivalence reuse terminally. The
-- examined verdict now selects the mode: exact_identity keeps hash verification;
-- equivalent verifies live + type-consistent (hashes differ by definition).
-- Canary-exposed defect: the live partial unique is GLOBAL per extraction
-- identity, but supersede validation required the target on the SAME item,
-- making every cross-run re-extraction fail. Scope is now the extraction
-- identity (provider, qid, hash, algorithm, prompt set) on any item.
--
-- Canary-exposed defect: step 10 retired same-role links created EARLIER IN
-- THE SAME persist call, so multi-secondary extractions kept only their last
-- secondary edge (39/85 canary links lost). Edges touched by this call are now
-- excluded; cross-attempt replacement still retires older attempts' edges.
-- Additive function replacement only; no table changes.

begin;

-- Atomic persistence of one extraction (accepted or unresolved) ----------------
create or replace function public.ob_claim_persist_extraction(
  p_item_id uuid,
  p_worker_id text,
  p_extraction jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_src jsonb;
  v_identity jsonb;
  v_usage jsonb;
  v_attempt_id uuid;
  v_event_preexisted boolean;
  v_candidate jsonb;
  v_examined jsonb;
  v_examined_count integer;
  v_superseded_count integer;
  v_resolution jsonb;
  v_resolved_claim_id uuid;
  v_reuse_verdict text;
  v_claim_version_id uuid;
  v_new_version_id uuid;
  v_new_fp_hash text;
  v_new_sem_hash text;
  v_new_sem_ver text;
  v_locator text;
  v_claim_metadata jsonb;
  v_claim_id uuid;
  v_struct_hash text;
  v_sem_hash text;
  v_qualifiers jsonb;
  v_object_text text;
  v_role text;
  v_link_id uuid;
  v_touched_link_ids uuid[] := '{}';
  v_claims_created integer := 0;
  v_claims_reused integer := 0;
  v_links_created integer := 0;
  v_links_reactivated integer := 0;
  v_links_superseded integer := 0;
  v_final_state text;
  v_coverage_verdict text;
begin
  -- 1+2. Lock the run item and verify lease ownership.
  select * into v_item
  from public.ob_claim_production_items
  where id = p_item_id
  for update;
  if not found then
    raise exception 'item missing' using errcode = 'no_data_found';
  end if;
  if v_item.lease_owner is distinct from p_worker_id
    or v_item.lease_expires_at is null
    or v_item.lease_expires_at <= now() then
    raise exception 'lease lost or not owned' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_item.status not in ('leased', 'extracting', 'reviewing', 'resolving', 'persisting') then
    raise exception 'item not persistable from status %', v_item.status
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  -- Envelope validation.
  if coalesce(p_extraction ->> 'contract_version', '') <> 'ob-claims-production.v1'
    or coalesce(p_extraction ->> 'algorithm_version', '') <> 'orthobullets-claims-prod.v1' then
    raise exception 'contract/algorithm mismatch' using errcode = 'check_violation';
  end if;
  v_final_state := p_extraction ->> 'final_state';
  if v_final_state not in ('accepted', 'ai_review_unresolved') then
    raise exception 'persist requires accepted or unresolved extraction' using errcode = 'check_violation';
  end if;
  v_src := p_extraction -> 'source';
  if coalesce(v_src ->> 'provider', '') <> 'orthobullets'
    or coalesce(v_src ->> 'native_question_id', '') <> v_item.native_question_id then
    raise exception 'extraction identity mismatch' using errcode = 'check_violation';
  end if;
  if coalesce(v_src ->> 'source_hash', '') !~ '^[0-9a-f]{64}$' then
    raise exception 'bad source hash' using errcode = 'check_violation';
  end if;
  v_attempt_id := nullif(p_extraction ->> 'attempt_id', '')::uuid;
  v_usage := coalesce(p_extraction -> 'usage', '{}'::jsonb);
  v_coverage_verdict := p_extraction #>> '{coverage,verdict}';

  -- Pre-validate the supersede target so a bogus id fails closed with a
  -- terminal code (not a foreign-key violation the runner would retry).
  -- A target already pointing at THIS attempt is an idempotent replay: allow.
  if nullif(p_extraction ->> 'supersedes_attempt_id', '') is not null
    and not exists (
      select 1 from public.ob_claim_extraction_events e
      where e.id = nullif(p_extraction ->> 'supersedes_attempt_id', '')::uuid
        and e.provider = (v_src ->> 'provider')
        and e.native_question_id = (v_src ->> 'native_question_id')
        and e.source_fingerprint_hash = (v_src ->> 'source_hash')
        and e.algorithm_version = 'orthobullets-claims-prod.v1'
        and e.prompt_set_version = coalesce(p_extraction ->> 'prompt_set_version', 'ob-claims-prod-prompts-v1.0')
        and (e.superseded_by_attempt_id is null or e.superseded_by_attempt_id = v_attempt_id)
    ) then
    raise exception 'supersede target missing or already superseded' using errcode = 'check_violation';
  end if;

  -- 3. Verify accepted categorical review states (numeric confidence ignored).
  if v_final_state = 'accepted' then
    if v_coverage_verdict <> 'complete' then
      raise exception 'accepted requires complete coverage' using errcode = 'check_violation';
    end if;
    for v_candidate in select * from jsonb_array_elements(coalesce(p_extraction -> 'candidates', '[]'::jsonb)) loop
      if coalesce(v_candidate ->> 'accepted', 'false') = 'true' then
        if v_candidate ->> 'final_factual' <> 'supported'
          or v_candidate ->> 'final_quality' <> 'good'
          or v_candidate #>> '{validator,verdict}' <> 'accept' then
          raise exception 'accepted claim fails categorical gates' using errcode = 'check_violation';
        end if;
      end if;
    end loop;
  else
    for v_candidate in select * from jsonb_array_elements(coalesce(p_extraction -> 'candidates', '[]'::jsonb)) loop
      if coalesce(v_candidate ->> 'accepted', 'false') = 'true' then
        raise exception 'unresolved extraction marks claims accepted' using errcode = 'check_violation';
      end if;
    end loop;
  end if;

  -- 4. Insert/reuse the immutable extraction event (idempotent replay).
  select exists(
    select 1 from public.ob_claim_extraction_events e where e.id = v_attempt_id
  ) into v_event_preexisted;

  -- Retire the old live row BEFORE inserting its replacement: the live partial
  -- unique would reject the new event while the old one is still live. Skipped
  -- on idempotent replay (the pointer is already set to this attempt).
  if nullif(p_extraction ->> 'supersedes_attempt_id', '') is not null and not v_event_preexisted then
    update public.ob_claim_extraction_events set
      superseded_by_attempt_id = v_attempt_id
    where id = nullif(p_extraction ->> 'supersedes_attempt_id', '')::uuid
      and provider = (v_src ->> 'provider')
      and native_question_id = (v_src ->> 'native_question_id')
      and source_fingerprint_hash = (v_src ->> 'source_hash')
      and algorithm_version = 'orthobullets-claims-prod.v1'
      and prompt_set_version = coalesce(p_extraction ->> 'prompt_set_version', 'ob-claims-prod-prompts-v1.0')
      and superseded_by_attempt_id is null;
    if not found then
      raise exception 'supersede target missing or already superseded' using errcode = 'check_violation';
    end if;
  end if;
  insert into public.ob_claim_extraction_events (
    id, item_id, run_id, provider, native_question_id, source_fingerprint_hash,
    algorithm_version, prompt_set_version, attempt_no, supersedes_attempt_id,
    contract_version, prompt_versions, models, registry_question_id,
    started_at, completed_at, final_state, coverage_verdict, coverage_notes,
    missing_concepts, diagnostics, prompt_tokens, completion_tokens, estimated_cost_usd
  ) values (
    v_attempt_id, v_item.id, v_item.run_id, 'orthobullets', v_item.native_question_id,
    v_src ->> 'source_hash',
    p_extraction ->> 'algorithm_version',
    coalesce(p_extraction ->> 'prompt_set_version', 'ob-claims-prod-prompts-v1.0'),
    coalesce((p_extraction ->> 'attempt_no')::integer, 0),
    nullif(p_extraction ->> 'supersedes_attempt_id', '')::uuid,
    p_extraction ->> 'contract_version',
    coalesce(p_extraction -> 'prompt_versions', '{}'::jsonb),
    coalesce(p_extraction -> 'models', '{}'::jsonb),
    nullif(v_src ->> 'registry_question_id', '')::uuid,
    (p_extraction ->> 'started_at')::timestamptz,
    (p_extraction ->> 'completed_at')::timestamptz,
    v_final_state,
    v_coverage_verdict,
    coalesce(p_extraction #>> '{coverage,notes}', ''),
    coalesce(array(select jsonb_array_elements_text(p_extraction #> '{coverage,missing_concepts}')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_extraction -> 'diagnostics')), '{}'),
    coalesce((v_usage ->> 'prompt_tokens')::bigint, 0),
    coalesce((v_usage ->> 'completion_tokens')::bigint, 0),
    coalesce((v_usage ->> 'estimated_cost_usd')::numeric, 0)
  )
  on conflict (id) do nothing;

  -- Identity resolution history (dedupe identical repeats). Explicit JSON
  -- null is absence too: clients may serialize {identity: null}.
  v_identity := nullif(p_extraction -> 'identity', 'null'::jsonb);
  -- Evidence locator for question_claim_links (NOT NULL in prod): prefer the
  -- resolved identity locator, else the canonical Orthobullets review URL.
  v_locator := coalesce(
    nullif(v_identity ->> 'locator', ''),
    'https://www.orthobullets.com/testview?qid=' || v_item.native_question_id
  );
  v_claim_metadata := jsonb_build_object('source_fingerprint_hash', v_src ->> 'source_hash');
  if v_identity is not null and not v_event_preexisted then
    insert into public.ob_question_identity_resolutions (
      item_id, run_id, native_question_id, outcome, registry_question_id,
      method, confidence, evidence, locator, conflicting_ids
    )
    select v_item.id, v_item.run_id, v_item.native_question_id,
      v_identity ->> 'outcome',
      nullif(v_identity ->> 'registry_question_id', '')::uuid,
      v_identity ->> 'method',
      v_identity ->> 'confidence',
      coalesce(array(select jsonb_array_elements_text(v_identity -> 'evidence')), '{}'),
      coalesce(v_identity ->> 'locator', ''),
      coalesce(array(select nullif(jsonb_array_elements_text(v_identity -> 'conflicting_ids'), '')::uuid), '{}')
    where not exists (
      select 1 from public.ob_question_identity_resolutions existing
      where existing.item_id = v_item.id
        and existing.outcome = (v_identity ->> 'outcome')
        and coalesce(existing.registry_question_id::text, '') = coalesce(nullif(v_identity ->> 'registry_question_id', ''), '')
        and existing.method = (v_identity ->> 'method')
    );
  end if;

  -- 5+6+7. Candidates, decisions, resolutions, claim materialization.
  for v_candidate in select * from jsonb_array_elements(coalesce(p_extraction -> 'candidates', '[]'::jsonb)) loop
    -- Read outside the replay guard: materialization below needs the resolution
    -- on idempotent replay too. Explicit JSON null is absence.
    v_resolution := nullif(v_candidate -> 'resolution', 'null'::jsonb);
    if not v_event_preexisted then
    insert into public.ob_claim_candidates (
      id, extraction_event_id, item_id, run_id, candidate_index, claim_text,
      importance, claim_type, qualifiers, support_sections, generator_model,
      generator_prompt_version, generator_confidence, origin_candidate_index,
      repair_action, repair_reason, pre_repair_text, final_text, accepted
    ) values (
      (v_candidate ->> 'candidate_id')::uuid, v_attempt_id, v_item.id, v_item.run_id,
      (v_candidate ->> 'index')::integer, v_candidate ->> 'text',
      v_candidate ->> 'importance', v_candidate ->> 'claim_type',
      coalesce(v_candidate -> 'qualifiers', '{}'::jsonb),
      coalesce(array(select jsonb_array_elements_text(v_candidate -> 'support')), '{}'),
      v_candidate #>> '{generator,model}', v_candidate #>> '{generator,prompt_version}',
      coalesce((v_candidate #>> '{generator,confidence}')::numeric, 0),
      nullif(v_candidate ->> 'origin_candidate_index', '')::integer,
      nullif(v_candidate ->> 'repair_action', ''),
      nullif(v_candidate ->> 'repair_reason', ''),
      nullif(v_candidate ->> 'pre_repair_text', ''),
      coalesce(nullif(v_candidate ->> 'final_text', ''), v_candidate ->> 'text'),
      coalesce((v_candidate ->> 'accepted')::boolean, false)
    )
    on conflict (extraction_event_id, candidate_index) do nothing;

    -- Review-stage judgments (factual, quality, validator verdict per candidate).
    insert into public.ob_claim_candidate_decisions
      (candidate_id, extraction_event_id, item_id, run_id, stage, verdict, reason, model, prompt_version)
    values
      ((v_candidate ->> 'candidate_id')::uuid, v_attempt_id, v_item.id, v_item.run_id,
        'factual', v_candidate #>> '{factual,verdict}', coalesce(v_candidate #>> '{factual,reason}', ''),
        coalesce(p_extraction #>> '{models,reviewer}', ''), coalesce(p_extraction #>> '{prompt_versions,review}', '')),
      ((v_candidate ->> 'candidate_id')::uuid, v_attempt_id, v_item.id, v_item.run_id,
        'quality', v_candidate #>> '{quality,verdict}', coalesce(v_candidate #>> '{quality,reason}', ''),
        coalesce(p_extraction #>> '{models,reviewer}', ''), coalesce(p_extraction #>> '{prompt_versions,review}', '')),
      ((v_candidate ->> 'candidate_id')::uuid, v_attempt_id, v_item.id, v_item.run_id,
        'validator', v_candidate #>> '{validator,verdict}', coalesce(v_candidate #>> '{validator,reason}', ''),
        coalesce(p_extraction #>> '{models,validator}', ''), coalesce(p_extraction #>> '{prompt_versions,validator}', ''))
    on conflict do nothing;

    if v_resolution is not null then
      v_examined_count := coalesce(jsonb_array_length(v_resolution -> 'examined'), 0);
      if v_examined_count > 0 then
        -- Resolution evidence rows (one per examined claim).
        for v_examined in select * from jsonb_array_elements(v_resolution -> 'examined') loop
          insert into public.ob_claim_candidate_resolutions (
            candidate_id, extraction_event_id, item_id, run_id, examined_claim_id,
            structural_hash, semantic_hash, verdict, reason, decision, resolved_claim_id,
            model, prompt_version, prompt_tokens, completion_tokens, estimated_cost_usd
          ) values (
            (v_candidate ->> 'candidate_id')::uuid, v_attempt_id, v_item.id, v_item.run_id,
            nullif(v_examined ->> 'claim_id', '')::uuid,
            v_resolution ->> 'structural_hash', v_resolution ->> 'semantic_hash',
            v_examined ->> 'verdict', coalesce(v_examined ->> 'reason', ''),
            v_resolution ->> 'decision',
            nullif(v_resolution ->> 'resolved_claim_id', '')::uuid,
            coalesce(v_resolution ->> 'model', ''), coalesce(v_resolution ->> 'prompt_version', ''),
            coalesce(((v_resolution -> 'usage') ->> 'prompt_tokens')::bigint, 0),
            coalesce(((v_resolution -> 'usage') ->> 'completion_tokens')::bigint, 0),
            coalesce(((v_resolution -> 'usage') ->> 'estimated_cost_usd')::numeric, 0)
          );
        end loop;
      else
        -- No-candidate resolutions (create without examination).
        insert into public.ob_claim_candidate_resolutions (
          candidate_id, extraction_event_id, item_id, run_id, examined_claim_id,
          structural_hash, semantic_hash, verdict, reason, decision, resolved_claim_id,
          model, prompt_version, prompt_tokens, completion_tokens, estimated_cost_usd
        ) values (
          (v_candidate ->> 'candidate_id')::uuid, v_attempt_id, v_item.id, v_item.run_id, null,
          v_resolution ->> 'structural_hash', v_resolution ->> 'semantic_hash',
          'uncertain', 'no retrieval candidates',
          v_resolution ->> 'decision', nullif(v_resolution ->> 'resolved_claim_id', '')::uuid,
          coalesce(v_resolution ->> 'model', ''), coalesce(v_resolution ->> 'prompt_version', ''),
          0, 0, 0
        );
      end if;
    end if;
    end if; -- not v_event_preexisted

    -- 6+7. Materialize durable claims for accepted candidates only.
    if v_final_state = 'accepted' and coalesce((v_candidate ->> 'accepted')::boolean, false) then
      if v_resolution is null or (v_resolution ->> 'decision') not in ('reuse', 'create') then
        raise exception 'accepted candidate lacks reuse/create resolution' using errcode = 'check_violation';
      end if;
      v_qualifiers := (
        select coalesce(jsonb_object_agg("key", "value"), '{}'::jsonb)
        from jsonb_each_text(coalesce(v_candidate -> 'qualifiers', '{}'::jsonb)) as kv
        where btrim(kv."value") <> ''
      );
      v_object_text := left(
        btrim(regexp_replace(lower(coalesce(nullif(v_candidate ->> 'final_text', ''), v_candidate ->> 'text')), '\s+', ' ', 'g')),
        200
      );
      -- SQL-side identity (trigger-identical by construction). digest is
      -- schema-qualified: this RPC pins search_path = public while pgcrypto
      -- lives in extensions (unqualified digest would not resolve here).
      v_struct_hash := encode(extensions.digest(
        public.educational_claim_fingerprint_payload(
          v_candidate ->> 'claim_type', null::uuid, 'v5_assertion', v_object_text, v_qualifiers
        ), 'sha256'
      ), 'hex');
      v_sem_hash := public.educational_claim_semantic_fingerprint_hash(
        coalesce(nullif(v_candidate ->> 'final_text', ''), v_candidate ->> 'text'),
        v_candidate ->> 'claim_type',
        v_qualifiers
      );

      if (v_resolution ->> 'decision') = 'reuse' then
        v_resolved_claim_id := nullif(v_resolution ->> 'resolved_claim_id', '')::uuid;
        if v_resolved_claim_id is null then
          raise exception 'reuse without claim id' using errcode = 'check_violation';
        end if;
        -- The examined verdict for this target selects the verification mode.
        select x.verdict into v_reuse_verdict
        from jsonb_array_elements(coalesce(v_resolution -> 'examined', '[]'::jsonb)) e,
             lateral (select e ->> 'verdict' as verdict, nullif(e ->> 'claim_id', '')::uuid as claim_id) x
        where x.claim_id = v_resolved_claim_id
        limit 1;
        if v_reuse_verdict is null then
          raise exception 'reuse without examined evidence' using errcode = 'check_violation';
        end if;
        if v_reuse_verdict = 'exact_identity' then
          -- Verify the target is live AND identity-consistent (loud on mismatch).
          perform 1
          from public.educational_claims c
          where c.id = v_resolved_claim_id
            and c.is_active
            and c.fingerprint_hash = v_struct_hash
            and c.semantic_fingerprint_hash = v_sem_hash;
          if not found then
            raise exception 'reuse target failed identity verification' using errcode = 'check_violation';
          end if;
        elsif v_reuse_verdict = 'equivalent' then
          -- Paraphrase reuse: hashes differ by definition, and claim_type
          -- vocabularies differ across eras (legacy fact/anatomy_pearl vs v5
          -- anatomy/...), so neither can verify the link. Verify the target is
          -- live; the examined equivalence verdict + reason is the auditable
          -- justification, and the independent audit is the quality control.
          perform 1
          from public.educational_claims c
          where c.id = v_resolved_claim_id
            and c.is_active;
          if not found then
            raise exception 'equivalent reuse target is not live' using errcode = 'check_violation';
          end if;
        else
          raise exception 'reuse requires exact_identity or equivalent verdict' using errcode = 'check_violation';
        end if;
        v_claims_reused := v_claims_reused + 1;
      else
        -- Advisory lock + re-check, then create (NULL entity: no canonical prerequisite).
        perform pg_advisory_xact_lock(hashtextextended(v_struct_hash, 0));
        select c.id into v_resolved_claim_id
        from public.educational_claims c
        where c.is_active and c.fingerprint_hash = v_struct_hash and c.semantic_fingerprint_hash = v_sem_hash
        order by c.created_at asc, c.id asc
        limit 1;
        if v_resolved_claim_id is null then
          begin
            -- Prod review_status vocabulary is unreviewed/in_review/approved/
            -- rejected/conflicted ('needs_review' belongs to links, not claims).
            -- Provenance rides metadata (claims have no source-hash column).
            insert into public.educational_claims (
              claim_text, claim_type, primary_entity_id, predicate, object_text,
              qualifiers, review_status, approval_method, algorithm_version, metadata
            ) values (
              coalesce(nullif(v_candidate ->> 'final_text', ''), v_candidate ->> 'text'),
              v_candidate ->> 'claim_type', null, 'v5_assertion', v_object_text,
              v_qualifiers, 'unreviewed', 'machine_consensus',
              'orthobullets-claims-prod.v1', v_claim_metadata
            )
            returning id, fingerprint_hash, semantic_fingerprint_hash, semantic_identity_version
              into v_resolved_claim_id, v_new_fp_hash, v_new_sem_hash, v_new_sem_ver;
            -- Writers own version rows (no version trigger in prod): snapshot v1
            -- and point current_version_id, mirroring the v4 commit convention.
            insert into public.educational_claim_versions (
              claim_id, version_number, fingerprint_hash, claim_text, claim_type, predicate,
              object_text, qualifiers, primary_entity_id, approval_method, content_source,
              review_status, algorithm_version, metadata,
              semantic_fingerprint_hash, semantic_identity_version
            ) values (
              v_resolved_claim_id, 1, v_new_fp_hash,
              coalesce(nullif(v_candidate ->> 'final_text', ''), v_candidate ->> 'text'),
              v_candidate ->> 'claim_type', 'v5_assertion', v_object_text, v_qualifiers, null,
              'machine_consensus', 'generated_draft', 'unreviewed',
              'orthobullets-claims-prod.v1', v_claim_metadata,
              v_new_sem_hash, v_new_sem_ver
            )
            returning id into v_new_version_id;
            update public.educational_claims set current_version_id = v_new_version_id
            where id = v_resolved_claim_id;
            v_claims_created := v_claims_created + 1;
          exception when unique_violation then
            -- Lost a race: reuse the conflicting live row.
            select c.id into v_resolved_claim_id
            from public.educational_claims c
            where c.is_active and c.fingerprint_hash = v_struct_hash and c.semantic_fingerprint_hash = v_sem_hash
            order by c.created_at asc, c.id asc
            limit 1;
            if v_resolved_claim_id is null then
              raise;
            end if;
            v_claims_reused := v_claims_reused + 1;
          end;
        else
          v_claims_reused := v_claims_reused + 1;
        end if;
      end if;

      -- Current version id for the link row (latest version wins; versions
      -- have no is_active column in prod).
      select v.id into v_claim_version_id
      from public.educational_claim_versions v
      where v.claim_id = v_resolved_claim_id
      order by v.version_number desc
      limit 1;
      if v_claim_version_id is null then
        raise exception 'claim version missing for claim %', v_resolved_claim_id
          using errcode = 'check_violation';
      end if;

      -- 8. Idempotent question→claim link (reactivate or insert-or-refresh).
      v_role := case when (v_candidate ->> 'importance') = 'primary' then 'tests_primary' else 'tests_secondary' end;
      update public.question_claim_links set
        is_active = true,
        superseded_at = null,
        superseded_by_claim_id = null,
        claim_version_id = v_claim_version_id,
        source_fingerprint_hash = v_src ->> 'source_hash',
        confidence = least(1, greatest(0, coalesce((v_candidate #>> '{generator,confidence}')::numeric, 0))),
        review_status = 'needs_review',
        mapping_role = v_role,
        reason_codes = array['v5_review_accepted', 'v5_' || (v_candidate ->> 'importance')],
        evidence_hashes = array[v_src ->> 'source_hash'],
        approval_method = 'machine_consensus',
        algorithm_version = 'orthobullets-claims-prod.v1',
        metadata = jsonb_build_object(
          'candidate_id', v_candidate ->> 'candidate_id',
          'attempt_id', p_extraction ->> 'attempt_id',
          'importance', v_candidate ->> 'importance',
          'claim_type', v_candidate ->> 'claim_type',
          'coverage_verdict', v_coverage_verdict
        ),
        updated_at = now()
      where provider = 'orthobullets'
        and native_question_id = v_item.native_question_id
        and claim_id = v_resolved_claim_id
        and not is_active
      returning id into v_link_id;
      if found then
        v_links_reactivated := v_links_reactivated + 1;
      else
        -- Select-first refresh avoids partial-index inference; the exception
        -- handler covers the residual race (same question is item-locked).
        select l.id into v_link_id
        from public.question_claim_links l
        where l.provider = 'orthobullets'
          and l.native_question_id = v_item.native_question_id
          and l.claim_id = v_resolved_claim_id
          and l.is_active;
        if found then
          update public.question_claim_links set
            claim_version_id = v_claim_version_id,
            source_fingerprint_hash = v_src ->> 'source_hash',
            confidence = least(1, greatest(0, coalesce((v_candidate #>> '{generator,confidence}')::numeric, 0))),
            mapping_role = v_role,
            reason_codes = array['v5_review_accepted', 'v5_' || (v_candidate ->> 'importance')],
            evidence_hashes = array[v_src ->> 'source_hash'],
            algorithm_version = 'orthobullets-claims-prod.v1',
            metadata = jsonb_build_object(
              'candidate_id', v_candidate ->> 'candidate_id',
              'attempt_id', p_extraction ->> 'attempt_id',
              'importance', v_candidate ->> 'importance',
              'claim_type', v_candidate ->> 'claim_type',
              'coverage_verdict', v_coverage_verdict
            ),
            updated_at = now()
          where id = v_link_id;
        else
          begin
            insert into public.question_claim_links (
              provider, native_question_id, external_question_id, claim_id, claim_version_id,
              source_fingerprint_hash, evidence_locator, confidence, review_status, mapping_role, reason_codes,
              evidence_hashes, approval_method, algorithm_version, metadata, is_active
            ) values (
              'orthobullets', v_item.native_question_id,
              nullif(v_src ->> 'registry_question_id', '')::uuid,
              v_resolved_claim_id, v_claim_version_id,
              v_src ->> 'source_hash', v_locator,
              least(1, greatest(0, coalesce((v_candidate #>> '{generator,confidence}')::numeric, 0))),
              'needs_review', v_role,
              array['v5_review_accepted', 'v5_' || (v_candidate ->> 'importance')],
              array[v_src ->> 'source_hash'],
              'machine_consensus', 'orthobullets-claims-prod.v1',
              jsonb_build_object(
                'candidate_id', v_candidate ->> 'candidate_id',
                'attempt_id', p_extraction ->> 'attempt_id',
                'importance', v_candidate ->> 'importance',
                'claim_type', v_candidate ->> 'claim_type',
                'coverage_verdict', v_coverage_verdict
              ),
              true
            )
            returning id into v_link_id;
            v_links_created := v_links_created + 1;
          exception when unique_violation then
            -- Residual race: refresh the conflicting live row.
            update public.question_claim_links set
              claim_version_id = v_claim_version_id,
              source_fingerprint_hash = v_src ->> 'source_hash',
              mapping_role = v_role,
              metadata = jsonb_build_object(
                'candidate_id', v_candidate ->> 'candidate_id',
                'attempt_id', p_extraction ->> 'attempt_id',
                'importance', v_candidate ->> 'importance',
                'claim_type', v_candidate ->> 'claim_type',
                'coverage_verdict', v_coverage_verdict
              ),
              updated_at = now()
            where provider = 'orthobullets'
              and native_question_id = v_item.native_question_id
              and claim_id = v_resolved_claim_id
              and is_active;
            select l.id into v_link_id
            from public.question_claim_links l
            where l.provider = 'orthobullets'
              and l.native_question_id = v_item.native_question_id
              and l.claim_id = v_resolved_claim_id
              and l.is_active;
          end;
        end if;
      end if;

      -- Track edges touched by THIS call so step 10 cannot retire them:
      -- a single extraction may link many same-role claims.
      if v_link_id is not null then
        v_touched_link_ids := v_touched_link_ids || v_link_id;
      end if;

      -- 10. Non-destructive supersession of same-algorithm older links only
      -- (other attempts' edges; never this call's own).
      update public.question_claim_links set
        is_active = false,
        review_status = 'superseded',
        superseded_at = now(),
        superseded_by_claim_id = v_resolved_claim_id,
        updated_at = now()
      where provider = 'orthobullets'
        and native_question_id = v_item.native_question_id
        and mapping_role = v_role
        and claim_id <> v_resolved_claim_id
        and id <> all(v_touched_link_ids)
        and is_active
        and algorithm_version = 'orthobullets-claims-prod.v1';
      get diagnostics v_superseded_count = row_count;
      v_links_superseded := v_links_superseded + v_superseded_count;
    end if;
  end loop;

  -- Set-level coverage decision (skipped on idempotent replay).
  if not v_event_preexisted then
  insert into public.ob_claim_candidate_decisions
    (candidate_id, extraction_event_id, item_id, run_id, stage, verdict, reason, model, prompt_version)
  values (null, v_attempt_id, v_item.id, v_item.run_id,
    'coverage', v_coverage_verdict, coalesce(p_extraction #>> '{coverage,notes}', ''),
    coalesce(p_extraction #>> '{models,coverage}', ''), coalesce(p_extraction #>> '{prompt_versions,coverage}', ''));
  end if;

  -- 11+12. Complete the item and update metrics.
  update public.ob_claim_production_items set
    status = case when v_final_state = 'accepted' then 'accepted'::text else 'ai_review_unresolved'::text end,
    source_fingerprint_hash = v_src ->> 'source_hash',
    identity_outcome = coalesce(nullif((p_extraction #>> '{identity,outcome}'), ''), identity_outcome),
    registry_question_id = coalesce(nullif(v_src ->> 'registry_question_id', '')::uuid, registry_question_id),
    live_attempt_id = v_attempt_id,
    lease_owner = null,
    lease_expires_at = null,
    last_diagnostic = null,
    prompt_tokens = prompt_tokens + coalesce((v_usage ->> 'prompt_tokens')::bigint, 0),
    completion_tokens = completion_tokens + coalesce((v_usage ->> 'completion_tokens')::bigint, 0),
    estimated_cost_usd = estimated_cost_usd + coalesce((v_usage ->> 'estimated_cost_usd')::numeric, 0),
    completed_at = now(),
    updated_at = now()
  where id = v_item.id;

  perform public.refresh_ob_claim_production_run(v_item.run_id);

  -- 13. Single RPC = all-or-nothing.
  return jsonb_build_object(
    'ok', true,
    'attempt_id', v_attempt_id,
    'final_state', v_final_state,
    'claims_created', v_claims_created,
    'claims_reused', v_claims_reused,
    'links_created', v_links_created,
    'links_reactivated', v_links_reactivated,
    'links_superseded', v_links_superseded
  );
end;
$$;

comment on function public.ob_claim_persist_extraction(uuid, text, jsonb) is
  'Atomic v5 persistence (equivalence-aware reuse): verifies lease + categorical gates, records immutable extraction artifacts, reuses/creates durable claims (NULL entity), writes idempotent question_claim_links (needs_review), supersedes same-algorithm older links only. Never merges; never touches entities or cards.';

commit;
