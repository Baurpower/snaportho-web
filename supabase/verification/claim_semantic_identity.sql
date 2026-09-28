-- Read-only verification for the claim_semantic_identity migration.
-- Run only after applying the companion migration. Fails loudly on any
-- invariant breach; selects are informational.
--
-- Covers: total claims, semantic coverage, NULL counts, duplicate semantic
-- groups, legacy algorithm distribution, orphan versions, broken
-- current_version pointers, and index state.

begin;
set local transaction read only;

-- 0. Required objects exist.
do $$
declare
  missing text := '';
begin
  if to_regclass('public.educational_claims') is null then missing := missing || ' educational_claims'; end if;
  if to_regclass('public.educational_claim_versions') is null then missing := missing || ' educational_claim_versions'; end if;
  if to_regprocedure('public.educational_claim_semantic_fingerprint_hash(text, text, jsonb)') is null then
    missing := missing || ' semantic_hash_fn';
  end if;
  if to_regprocedure('public.educational_claim_semantic_normalize_text(text)') is null then
    missing := missing || ' semantic_normalize_fn';
  end if;
  if missing <> '' then raise exception 'Missing required objects:%', missing; end if;
end;
$$;

-- 1. Totals and semantic coverage.
select
  count(*) as total_claims,
  count(*) filter (where is_active) as active_claims,
  count(*) filter (where semantic_fingerprint_hash is not null) as with_semantic,
  count(*) filter (where semantic_fingerprint_hash is null) as semantic_null,
  count(*) filter (where semantic_identity_version = 'v1') as semantic_v1,
  count(*) filter (where semantic_identity_version is not null and semantic_identity_version <> 'v1') as semantic_unexpected_version
from public.educational_claims;

-- 2. Legacy algorithm distribution (history preserved, not rewritten).
select algorithm_version, count(*) as claims
from public.educational_claims
group by algorithm_version
order by claims desc;

-- 3. Duplicate semantic fingerprint groups (review candidates, never auto-merged).
select semantic_fingerprint_hash, count(*) as members, array_agg(id order by created_at) as claim_ids
from public.educational_claims
where is_active and semantic_fingerprint_hash is not null
group by semantic_fingerprint_hash
having count(*) > 1
order by members desc;

-- 4. Duplicate groups by review state.
select review_status, count(*) as claims_in_dup_groups
from public.educational_claims c
where is_active and semantic_fingerprint_hash is not null
  and exists (
    select 1 from public.educational_claims other
    where other.is_active
      and other.semantic_fingerprint_hash = c.semantic_fingerprint_hash
      and other.id <> c.id
  )
group by review_status;

-- 5. Trigger parity: stored semantic values must equal recomputation.
select count(*) as semantic_parity_breaches
from public.educational_claims
where semantic_fingerprint_hash is not null
  and (
    semantic_fingerprint_hash is distinct from
      public.educational_claim_semantic_fingerprint_hash(claim_text, claim_type, qualifiers)
    or semantic_identity_version is distinct from 'v1'
  );

-- 6. Legacy identity untouched: every active row keeps a well-formed legacy hash.
select count(*) as legacy_hash_missing_or_malformed
from public.educational_claims
where fingerprint_hash is null or fingerprint_hash !~ '^[0-9a-f]{64}$';

-- 7. Orphan versions and broken current_version pointers.
select count(*) as orphan_versions
from public.educational_claim_versions v
where not exists (select 1 from public.educational_claims c where c.id = v.claim_id);

select count(*) as broken_current_version_pointers
from public.educational_claims c
where c.current_version_id is not null
  and not exists (select 1 from public.educational_claim_versions v where v.id = c.current_version_id);

select count(*) as version_claim_mismatch
from public.educational_claims c
join public.educational_claim_versions v on v.id = c.current_version_id
where v.claim_id <> c.id;

-- 8. Version-row semantic coverage.
select
  count(*) as total_versions,
  count(*) filter (where semantic_fingerprint_hash is not null) as versions_with_semantic
from public.educational_claim_versions;

-- 9. Index state.
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'educational_claims_semantic_hash_idx',
    'educational_claim_versions_semantic_hash_idx',
    'educational_claims_active_fingerprint_uidx'
  )
order by indexname;

-- 10. Semantic behavior pins: normalization converges, distinct stays distinct.
do $$
begin
  if public.educational_claim_semantic_fingerprint_hash(
    'Grade II Lachman translation is 5–10 mm.', 'fact', '{"anatomy":"Knee"}'::jsonb
  ) is distinct from public.educational_claim_semantic_fingerprint_hash(
    '  grade ii lachman translation is 5-10 mm ', 'FACT', '{"anatomy":"knee"}'::jsonb
  ) then
    raise exception 'Semantic hash is not stable under allowed normalization';
  end if;

  if public.educational_claim_semantic_fingerprint_hash(
    'Lachman grading: Grade 1 is 3-5 mm translation.', 'fact', '{}'::jsonb
  ) = public.educational_claim_semantic_fingerprint_hash(
    'Press-fit tibial stems carry a 3-5% intraoperative fracture incidence.', 'fact', '{}'::jsonb
  ) then
    raise exception 'Semantic hash collides on the known v1 numeric-collision pair';
  end if;

  if public.educational_claim_semantic_fingerprint_hash(
    'Fixation is needed when displacement is >5 mm.', 'fact', '{}'::jsonb
  ) = public.educational_claim_semantic_fingerprint_hash(
    'Fixation is needed when displacement is <5 mm.', 'fact', '{}'::jsonb
  ) then
    raise exception 'Semantic hash drops clinical comparators';
  end if;
end;
$$;

-- 11. Hard gates: parity breaches, legacy damage, and orphans must all be zero.
do $$
declare
  breaches integer;
begin
  select count(*) into breaches
  from public.educational_claims
  where semantic_fingerprint_hash is not null
    and (
      semantic_fingerprint_hash is distinct from
        public.educational_claim_semantic_fingerprint_hash(claim_text, claim_type, qualifiers)
      or semantic_identity_version is distinct from 'v1'
    );
  if breaches > 0 then raise exception 'semantic parity breaches: %', breaches; end if;

  select count(*) into breaches
  from public.educational_claims
  where fingerprint_hash is null or fingerprint_hash !~ '^[0-9a-f]{64}$';
  if breaches > 0 then raise exception 'legacy fingerprint damage: %', breaches; end if;

  select count(*) into breaches
  from public.educational_claim_versions v
  where not exists (select 1 from public.educational_claims c where c.id = v.claim_id);
  if breaches > 0 then raise exception 'orphan versions: %', breaches; end if;
end;
$$;

rollback;
