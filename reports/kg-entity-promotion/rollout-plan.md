# Rollout Plan — Entity Promotion to Production

## Preconditions (all must hold before any apply)

1. Live DB reachable from the migration/apply environment.
2. Phase 1 + Phase 2 + Phase 3 (`20260927260000`) migrations applied via the
   normal pipeline; Phase 3 verification (`supabase/verification/
   phase3_entity_promotion.sql`) hard checks return zero rows.
3. Phase 2 claim backfill completed (claim_entities + kg_automation_proposals
   rows exist) so decision `kgProposalId`s resolve.
4. Consumer trusted-definition update (Step 21 finding): the six
   `status='canonical'`-only consumers adopt
   `is_active + approved + (reviewed,canonical)`. Without this, promoted
   entities are invisible to reviewer/incorporation surfaces.

## Step 1 — compile the decision file

- Review `reports/kg-entity-promotion/high-impact-review.csv` (200 rows).
- For each row the reviewer chooses: promote / alias / merge / reject /
  defer, optionally editing canonical label, type, or target.
- Compile reviewed rows to `decisions.json` (schema:
  `ReviewDecisionInput` in `promotion-applier.ts`), resolving live
  `kgProposalId`s and canonical target ids against the reachable DB.

## Step 2 — dry run

```
node --experimental-strip-types scripts/kg-entity-promotion-apply.ts \
  --decisions decisions.json --snapshot snapshot.json --sql-out plan.sql
```

- Build `snapshot.json` from live `canonical_entities` (1,084),
  `canonical_entity_aliases`, `kg_automation_proposals`,
  applied decision keys, and proposal edges.
- Review `plan.sql` + stats. Expected: `needs_rereview` conversions for any
  promote whose label now matches a full-DB canonical — re-decide those as
  alias, then re-run. Zero `errors` required to proceed.

## Step 3 — apply (staging first, explicit authorization)

```
node --experimental-strip-types scripts/kg-entity-promotion-apply.ts \
  --decisions decisions.json --apply --reviewer <email>
```

- Staging-gated (`requireStagingEnvironment`); per-decision idempotent
  writes; decision log recorded last per decision (restart replays safely).
- Abort condition: any `errors` in the report → fix decisions, re-run
  (applied keys skip).

## Step 4 — verify

- Re-run Phase 3 verification SQL; all hard checks zero.
- Re-run coverage query (C1) and confirm the expected +316 canonical edges
  (Scenario A) within review edits.
- Re-run resolver re-evaluation to refresh the deferred queue.

## Step 5 — integrate the resolver (factory wiring, separate change)

1. Index builder unions approved `canonical_entity_aliases` into
   `EntityIndexRow.aliases` (factory lookups already consult row aliases).
2. Factory proposal path consults `entity_review_decisions` rejected labels
   (via `resolveEntityLabelForPropose` negative check) before proposing.
3. Factory trusted reads exclude `status='proposed'` rows.
4. Each wiring step ships with its existing snapshot tests green; any
   snapshot change is reviewed as a contract change.

## Step 6 — next review slices

- Queue files: `alias-candidates.json` (21), `new-canonical-candidates.json`
  (667), `reject-candidates.json` (157), `type-correction-candidates.json`
  (530), plus the deferred tail in the full row set. Prioritize alias +
  reject queues (cheap, high-precision), then promote slices by impact.
- Canonical-dedup backlog (governance merges, human-led): Deep Posterior
  Compartment ×2, Anterior/Lateral Compartment ×2, hub overlaps; joint-sense
  split for MCL/LCL ligament canonicals.

## Rollback

- Decisions are reversible: aliases deactivate (`is_active=false`),
  promotions deprecate (`status='deprecated'`, `replacement_entity_id`),
  edges re-activate from deactivated rows (never deleted). Every mutation
  carries its `decision_key` for targeted reversal.
