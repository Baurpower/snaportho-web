-- Read-only verification for the Phase 2 atomic multi-claim migrations
-- (phase2_atomic_claim_entities + phase2_assertion_merge_key).
-- Run only after applying the companion migrations. Fails loudly on any
-- invariant breach; selects are informational.
--
-- Covers: required objects, merge-key index state, claim_entities integrity
-- (orphans, target-kind discipline, role coverage, dupes), quality-flag
-- integrity (orphans, severity mix), backfill-claim children integrity
-- (index contiguity, orphans), and per-card claim distribution.

begin;
set local transaction read only;

-- 0. Required objects exist.
do $$
declare
  missing text := '';
begin
  if to_regclass('public.claim_entities') is null then missing := missing || ' claim_entities'; end if;
  if to_regclass('public.claim_quality_flags') is null then missing := missing || ' claim_quality_flags'; end if;
  if to_regclass('public.card_claim_backfill_claims') is null then missing := missing || ' card_claim_backfill_claims'; end if;
  if to_regclass('public.educational_claims_active_identity_uidx') is null then missing := missing || ' identity_uidx'; end if;
  if missing <> '' then raise exception 'Missing required objects:%', missing; end if;
end;
$$;

-- 1. Merge-key state: no NULL-semantic active claims should remain, and no
-- fingerprint may hold two claims with the same semantic hash.
select
  count(*) filter (where is_active and semantic_fingerprint_hash is null) as active_null_semantic,
  count(*) as active_claims
from public.educational_claims
where is_active;

select fingerprint_hash, semantic_fingerprint_hash, count(*) as members,
  array_agg(id order by created_at) as claim_ids
from public.educational_claims
where is_active and semantic_fingerprint_hash is not null
group by fingerprint_hash, semantic_fingerprint_hash
having count(*) > 1;

-- 2. Fingerprints shared by DISTINCT assertions (expected > 0 after Phase 2;
-- each row is a formerly-silently-merged group, now explicit).
select count(*) as split_fingerprints
from (
  select fingerprint_hash
  from public.educational_claims
  where is_active and semantic_fingerprint_hash is not null
  group by fingerprint_hash
  having count(distinct semantic_fingerprint_hash) > 1
) shared;

-- 3. claim_entities integrity.
select
  count(*) as links,
  count(*) filter (where entity_kind = 'canonical') as canonical,
  count(*) filter (where entity_kind = 'proposed') as proposed,
  count(*) filter (where entity_kind = 'unresolved') as unresolved
from public.claim_entities
where is_active;

select role, count(*) as links
from public.claim_entities
where is_active
group by role
order by links desc;

-- Orphans (must all be zero).
select count(*) as links_missing_claim
from public.claim_entities e
where not exists (select 1 from public.educational_claims c where c.id = e.claim_id);
select count(*) as links_missing_version
from public.claim_entities e
where not exists (select 1 from public.educational_claim_versions v where v.id = e.claim_version_id);
select count(*) as links_missing_canonical
from public.claim_entities e
where e.entity_kind = 'canonical'
  and not exists (select 1 from public.canonical_entities c where c.id = e.canonical_entity_id);

-- Target-kind discipline breaches (must be zero; the check constraint should
-- make these impossible, this is defense in depth).
select count(*) as target_breaches
from public.claim_entities
where not (
  (entity_kind = 'canonical' and canonical_entity_id is not null and proposed_proposal_id is null)
  or (entity_kind = 'proposed' and proposed_proposal_id is not null and canonical_entity_id is null)
  or (entity_kind = 'unresolved' and canonical_entity_id is null and proposed_proposal_id is null)
);

-- Duplicate (claim_version, entity, role) rows (must be zero).
select claim_version_id, entity_kind, canonical_entity_id, proposed_proposal_id, role, count(*) as rows
from public.claim_entities
where is_active
group by claim_version_id, entity_kind, canonical_entity_id, proposed_proposal_id, role
having count(*) > 1;

-- 4. claim_quality_flags integrity.
select severity, count(*) as flags
from public.claim_quality_flags
group by severity
order by flags desc;

select code, count(*) as flags
from public.claim_quality_flags
group by code
order by flags desc
limit 30;

select count(*) as flags_missing_claim
from public.claim_quality_flags f
where not exists (select 1 from public.educational_claims c where c.id = f.claim_id);

select claim_id, code, count(*) as rows
from public.claim_quality_flags
group by claim_id, code
having count(*) > 1;

-- Block-severity flags must never back an auto-approved teaches link.
select count(*) as blocked_but_linked
from public.claim_quality_flags f
join public.card_claim_links l on l.claim_id = f.claim_id and l.is_active
where f.severity = 'block_auto_approve'
  and l.review_status = 'auto_approved';

-- 5. Backfill-claim children integrity.
select count(*) as child_rows,
  count(distinct backfill_item_id) as items_with_claims
from public.card_claim_backfill_claims;

select count(*) as children_missing_item
from public.card_claim_backfill_claims c
where not exists (select 1 from public.card_claim_backfill_items i where i.id = c.backfill_item_id);

-- Index contiguity: every item's claims must run 1..N with no gaps.
select backfill_item_id, claims_in_version, count(*) as rows,
  array_agg(claim_index order by claim_index) as indexes
from public.card_claim_backfill_claims
group by backfill_item_id, claims_in_version
having count(*) <> claims_in_version
   or min(claim_index) <> 1
   or max(claim_index) <> claims_in_version;

-- 6. Per-card claim distribution (informational).
select claims, count(*) as cards
from (
  select backfill_item_id, count(*) as claims
  from public.card_claim_backfill_claims
  group by backfill_item_id
) per_card
group by claims
order by claims;

rollback;
