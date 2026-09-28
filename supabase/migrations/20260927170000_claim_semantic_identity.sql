-- Canonical semantic claim identity (v1), Pattern A coexistence.
--
-- Adds semantic_fingerprint_hash + semantic_identity_version alongside the
-- legacy fingerprint_hash on educational_claims and educational_claim_versions.
-- Legacy IDs, fingerprints, links, and review history are untouched; no rows
-- are merged, repointed, or deleted by this migration.
--
-- The semantic fingerprint identifies the PROPOSITION asserted
-- (normalized claim_text + claim_type + qualifiers), independent of entity
-- resolution, source provenance, extractor, or review state. The TypeScript
-- twin lives in contracts/clinical-claim-v1.ts
-- (normalizeSemanticClaimText / semanticClaimFingerprintPayload /
-- semanticClaimFingerprintHash) and claim-semantic-identity.test.ts pins the
-- same worked example below. Both implementations MUST apply the identical
-- normalization order:
--
--   1. HTML entity decode (&nbsp; &lt; &gt; &quot; &#39; &apos; &deg; &ge;
--      &le; &plusmn; &times;, then &amp; LAST for single-decode)
--   2. Unicode variant map (nbsp, en/em/minus dashes, curly quotes,
--      >=, <=, x, deg, +/-)
--   3. lowercase (same DB-locale caveat as the legacy v1 function)
--   4. Anki cloze-marker strip ({{cN:: and }})
--   5. Known inline-HTML tag strip (never a generic <[^>]+>: it would eat
--      clinical comparators such as "<5 mm and >2 mm")
--   6. Keep [a-z0-9 +\-/.,<>=%'] plus space; comparators, decimals, and
--      percent survive (v1 dropped them, which is how thresholds collided)
--   7. Collapse whitespace, trim, strip one trailing ".", trim again.
--
-- Worked parity example (also pinned in claim-semantic-identity.test.ts):
--   input:  text "Grade II Lachman translation is 5–10 mm.",
--           type "fact", qualifiers {"anatomy": "Knee"}
--   payload:
--     semantic=v1
--     assertion=grade ii lachman translation is 5-10 mm
--     type=fact
--     qualifiers=anatomy=knee
--
-- DDL + deterministic additive backfill only. No inserts into link tables,
-- no review-state changes, no unique constraint on the semantic hash yet:
-- candidate duplicates must be reviewed (merge phase) before any merge-key
-- unique index is even considered.

begin;

create or replace function public.educational_claim_semantic_normalize_text(value text)
returns text
language plpgsql
immutable
parallel safe
as $$
declare
  out text := coalesce(value, '');
begin
  -- 1. HTML entity decode; &amp; LAST so "&amp;lt;" yields "&lt;", never "<".
  out := replace(out, '&nbsp;', ' ');
  out := replace(out, '&lt;', '<');
  out := replace(out, '&gt;', '>');
  out := replace(out, '&quot;', '"');
  out := replace(out, '&#39;', '''');
  out := replace(out, '&apos;', '''');
  out := replace(out, '&deg;', 'deg');
  out := replace(out, '&ge;', '>=');
  out := replace(out, '&le;', '<=');
  out := replace(out, '&plusmn;', '+/-');
  out := replace(out, '&times;', 'x');
  out := replace(out, '&amp;', '&');
  -- 2. Unicode variants via chr() (encoding-proof): nbsp, dashes, quotes,
  --    U+2265/2264, U+00D7, U+00B0, U+00B1.
  out := replace(out, chr(160), ' ');
  out := replace(out, chr(8211), '-');
  out := replace(out, chr(8212), '-');
  out := replace(out, chr(8722), '-');
  out := replace(out, chr(8216), '''');
  out := replace(out, chr(8217), '''');
  out := replace(out, chr(8220), '"');
  out := replace(out, chr(8221), '"');
  out := replace(out, chr(8805), '>=');
  out := replace(out, chr(8804), '<=');
  out := replace(out, chr(215), 'x');
  out := replace(out, chr(176), 'deg');
  out := replace(out, chr(177), '+/-');
  -- 3. Lowercase.
  out := lower(out);
  -- 4. Cloze markers.
  out := regexp_replace(out, '\{\{c[0-9]+::', '', 'g');
  out := replace(out, '}}', '');
  -- 5. Known inline-HTML tags only.
  out := regexp_replace(
    out,
    '</?(b|i|u|em|strong|sub|sup|br|p|div|span|table|tr|td|th|ul|ol|li)\y[^>]*>',
    '',
    'g'
  );
  -- 6. Allowed characters; everything else becomes a space.
  out := regexp_replace(out, '[^a-z0-9 +\-/.,<>=%'']', ' ', 'g');
  -- 7. Collapse whitespace, trim, strip one trailing period, trim again
  --    (the TS twin applies the identical final trim).
  out := regexp_replace(out, '\s+', ' ', 'g');
  out := btrim(out);
  out := regexp_replace(out, '\.$', '');
  out := btrim(out);
  return out;
end;
$$;

create or replace function public.educational_claim_semantic_fingerprint_payload(
  p_claim_text text,
  p_claim_type text,
  p_qualifiers jsonb
)
returns text
language sql
immutable
parallel safe
as $$
  select concat_ws(
    chr(10),
    'semantic=v1',
    'assertion=' || public.educational_claim_semantic_normalize_text(p_claim_text),
    'type=' || public.educational_claim_semantic_normalize_text(p_claim_type),
    'qualifiers=' || coalesce((
      select string_agg(
        kv.key || '=' || public.educational_claim_semantic_normalize_text(kv.value #>> '{}'),
        ';'
        order by kv.key
      )
      from jsonb_each(coalesce(p_qualifiers, '{}'::jsonb)) kv
      where btrim(kv.value #>> '{}') <> ''
    ), '')
  );
$$;

create or replace function public.educational_claim_semantic_fingerprint_hash(
  p_claim_text text,
  p_claim_type text,
  p_qualifiers jsonb
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
        public.educational_claim_semantic_fingerprint_payload(
          p_claim_text, p_claim_type, p_qualifiers
        ),
        'utf8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function public.educational_claim_semantic_normalize_text(text) from public, anon, authenticated;
grant execute on function public.educational_claim_semantic_normalize_text(text) to service_role;

revoke all on function public.educational_claim_semantic_fingerprint_payload(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.educational_claim_semantic_fingerprint_payload(text, text, jsonb) to service_role;

revoke all on function public.educational_claim_semantic_fingerprint_hash(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.educational_claim_semantic_fingerprint_hash(text, text, jsonb) to service_role;

alter table public.educational_claims
  add column if not exists semantic_fingerprint_hash text null,
  add column if not exists semantic_identity_version text null;

alter table public.educational_claim_versions
  add column if not exists semantic_fingerprint_hash text null,
  add column if not exists semantic_identity_version text null;

alter table public.educational_claims
  drop constraint if exists educational_claims_semantic_format_check;
alter table public.educational_claims
  add constraint educational_claims_semantic_format_check
  check (semantic_fingerprint_hash is null or semantic_fingerprint_hash ~ '^[0-9a-f]{64}$');

alter table public.educational_claims
  drop constraint if exists educational_claims_semantic_version_check;
alter table public.educational_claims
  add constraint educational_claims_semantic_version_check
  check (semantic_identity_version is null or semantic_identity_version = 'v1');

alter table public.educational_claim_versions
  drop constraint if exists educational_claim_versions_semantic_format_check;
alter table public.educational_claim_versions
  add constraint educational_claim_versions_semantic_format_check
  check (semantic_fingerprint_hash is null or semantic_fingerprint_hash ~ '^[0-9a-f]{64}$');

alter table public.educational_claim_versions
  drop constraint if exists educational_claim_versions_semantic_version_check;
alter table public.educational_claim_versions
  add constraint educational_claim_versions_semantic_version_check
  check (semantic_identity_version is null or semantic_identity_version = 'v1');

-- Legacy era branching is preserved exactly; semantic identity is computed
-- for EVERY row regardless of algorithm_version.
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
  new.semantic_fingerprint_hash := public.educational_claim_semantic_fingerprint_hash(
    new.claim_text, new.claim_type, new.qualifiers
  );
  new.semantic_identity_version := 'v1';
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
  new.semantic_fingerprint_hash := public.educational_claim_semantic_fingerprint_hash(
    new.claim_text, new.claim_type, new.qualifiers
  );
  new.semantic_identity_version := 'v1';
  return new;
end;
$$;

-- Additive deterministic backfill. Recomputes ONLY the new nullable columns;
-- legacy fingerprint_hash, ids, links, and review state are untouched.
-- Rerunning this migration's backfill is idempotent.
update public.educational_claims
set semantic_fingerprint_hash = public.educational_claim_semantic_fingerprint_hash(
      claim_text, claim_type, qualifiers
    ),
    semantic_identity_version = 'v1'
where semantic_fingerprint_hash is null
   or semantic_identity_version is distinct from 'v1'
   or semantic_fingerprint_hash is distinct from public.educational_claim_semantic_fingerprint_hash(
     claim_text, claim_type, qualifiers
   );

-- Version rows are normally immutable. This migration is the one controlled
-- exception: it backfills only the new semantic identity columns, inside the
-- migration transaction, and restores the guard before commit.
alter table public.educational_claim_versions
  disable trigger guard_educational_claim_versions_immutable;

update public.educational_claim_versions
set semantic_fingerprint_hash = public.educational_claim_semantic_fingerprint_hash(
      claim_text, claim_type, qualifiers
    ),
    semantic_identity_version = 'v1'
where semantic_fingerprint_hash is null
   or semantic_identity_version is distinct from 'v1'
   or semantic_fingerprint_hash is distinct from public.educational_claim_semantic_fingerprint_hash(
     claim_text, claim_type, qualifiers
   );

alter table public.educational_claim_versions
  enable trigger guard_educational_claim_versions_immutable;

-- Candidate-lookup index (NON-unique by design: duplicates are review
-- candidates until the merge phase; a merge-key unique index is deferred).
create index if not exists educational_claims_semantic_hash_idx
  on public.educational_claims (semantic_fingerprint_hash)
  where semantic_fingerprint_hash is not null;

create index if not exists educational_claim_versions_semantic_hash_idx
  on public.educational_claim_versions (semantic_fingerprint_hash)
  where semantic_fingerprint_hash is not null;

comment on column public.educational_claims.semantic_fingerprint_hash is
  'Canonical v1 semantic identity: sha256 over normalized (claim_text, claim_type, qualifiers). Coexists with legacy fingerprint_hash; never merged automatically.';
comment on column public.educational_claims.semantic_identity_version is
  'Semantic identity function version. v1 for all rows after backfill.';

-- Orthobullets v4 commit path: assertion-dedup behavior is UNCHANGED (this
-- phase records candidates; it does not merge). The commit now stamps the
-- canonical semantic fingerprint into link metadata, run-item reason codes,
-- and the return payload so downstream review can join on it.
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
  v_semantic text;
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
  v_semantic := public.educational_claim_semantic_fingerprint_hash(
    p_claim_text, p_claim_type, coalesce(p_qualifiers, '{}'::jsonb)
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
      metadata = jsonb_build_object(
        'sourceProvider', 'orthobullets',
        'validationStatus', 'auto_validated',
        'semanticFingerprintHash', v_semantic,
        'semanticIdentityVersion', 'v1'
      ),
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
      jsonb_build_object(
        'sourceProvider', 'orthobullets',
        'validationStatus', 'auto_validated',
        'semanticFingerprintHash', v_semantic,
        'semanticIdentityVersion', 'v1'
      )
    );
  end if;

  update public.orthobullets_claim_run_items
  set status = 'processing', processing_stage = 'cards_evaluating',
      claim_id = v_claim_id, claim_version_id = v_version_id,
      source_fingerprint_hash = p_source_fingerprint_hash, last_error_code = null,
      reason_codes = array['generator_critic_consensus', 'claim_auto_validated', 'semantic_identity_v1'],
      updated_at = now()
  where id = p_run_item_id;
  perform public.refresh_orthobullets_claim_run(v_run_id);

  return jsonb_build_object(
    'claimId', v_claim_id,
    'claimVersionId', v_version_id,
    'fingerprintHash', v_fingerprint,
    'semanticFingerprintHash', v_semantic,
    'semanticIdentityVersion', 'v1'
  );
end;
$$;

revoke all on function public.commit_orthobullets_machine_claim(uuid, uuid, text, uuid, uuid, text, text, text, text, jsonb, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.commit_orthobullets_machine_claim(uuid, uuid, text, uuid, uuid, text, text, text, text, jsonb, text, numeric, text)
  to service_role;

comment on function public.educational_claim_semantic_fingerprint_hash(text, text, jsonb) is
  'Canonical v1 semantic identity: sha256 over normalized (claim_text, claim_type, qualifiers). Entity/source/algorithm excluded so cross-source propositions converge. TS twin: semanticClaimFingerprintHash.';

commit;
