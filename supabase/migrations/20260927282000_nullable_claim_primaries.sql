-- Phase 3C Step 20/22: allow NULL claim primaries for non-canonical targets.
--
-- The atomic factory emits claims whose primary entity is proposed or
-- unresolved. Those primaries cannot point at canonical_entities rows that
-- do not exist (and must never invent one), so persistence stores NULL and
-- the proposed/unresolved detail lives in claim_entities edges. The legacy
-- fingerprint function is already NULL-safe (concat_ws skips the missing
-- entity segment); the TypeScript twin was updated to match byte-for-byte.
--
-- Additive and safe: all 2,113 existing rows keep non-null primaries; the
-- foreign key still enforces every non-null value. Idempotent.

begin;

alter table public.educational_claims
  alter column primary_entity_id drop not null;

alter table public.educational_claim_versions
  alter column primary_entity_id drop not null;

comment on column public.educational_claims.primary_entity_id is
  'Canonical primary entity, or NULL when the primary is proposed/unresolved (see claim_entities edges). Never a proposal id, never a sentinel.';
comment on column public.educational_claim_versions.primary_entity_id is
  'Canonical primary entity, or NULL when the primary is proposed/unresolved (see claim_entities edges). Never a proposal id, never a sentinel.';

commit;
