-- ============================================================================
-- Phase 2: assertion-aware claim merge key.
--
-- The legacy unique key on educational_claims (fingerprint_hash alone) merges
-- distinct propositions that share (claim_type, primary_entity_id, predicate,
-- object_text, qualifiers) — e.g. "The Deltoid origin is Clavicle" vs "The
-- Trapezius insertion is Clavicle". The single-claim factory rarely collided;
-- the atomic multi-claim factory collides routinely (490 fingerprints split
-- into 1,378 claims in the full-corpus dry run), so the second assertion
-- under a known fingerprint can no longer be inserted.
--
-- This migration replaces the fingerprint-only partial unique index with a
-- (fingerprint_hash, semantic_fingerprint_hash) partial unique index. The
-- semantic hash is assertion-inclusive, so distinct assertions coexist while
-- true same-assertion reruns stay idempotent. Legacy rows with a NULL
-- semantic hash keep fingerprint-only semantics via a second partial index.
--
-- DDL only. No backfill, no review-state changes, no merges, no repointing.
-- ============================================================================

begin;

-- Backfill NULL semantic hashes from the deterministic function first, so the
-- legacy-fingerprint index below covers only rows the function cannot hash
-- (none expected; the index is belt-and-braces for idempotent reruns).
update public.educational_claims
set semantic_fingerprint_hash = public.educational_claim_semantic_fingerprint_hash(
      claim_text, claim_type, qualifiers),
    semantic_identity_version = 'v1'
where is_active
  and semantic_fingerprint_hash is null;

drop index if exists public.educational_claims_active_fingerprint_uidx;

-- Primary merge key: same coarse fingerprint AND same assertion.
create unique index if not exists educational_claims_active_identity_uidx
  on public.educational_claims (fingerprint_hash, semantic_fingerprint_hash)
  where is_active
    and predicate <> ''
    and object_text <> ''
    and semantic_fingerprint_hash is not null;

-- Legacy safety net: rows that still lack a semantic hash keep the old
-- fingerprint-only uniqueness so pre-Phase-1 idempotency is preserved.
create unique index if not exists educational_claims_active_legacy_fingerprint_uidx
  on public.educational_claims (fingerprint_hash)
  where is_active
    and predicate <> ''
    and object_text <> ''
    and semantic_fingerprint_hash is null;

commit;
