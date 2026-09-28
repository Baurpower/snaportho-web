# Muse Runbook: Orthobullets Claims Production

Operating manual for the v5.1 pipeline. Design reference:
[production doc](./orthobullets-claims-production.md).

## 0. Standing rules

- `--apply` is required for durable runs. Without `--apply` (or with
  `--dry-run`) the runner performs zero semantic writes.
- Never point a canary at production without explicit authorization. Canaries
  run against staging (or a scratch database) first.
- Packets are transient: fetch fresh with `scripts/fetch-ob-question-packets.mjs`,
  run, then delete. Never commit packet files (they contain OB source text).
- Never claim a canary passed without executing it against the stated
  environment and quoting its output.

## 1. Prerequisites

- `DATABASE_URL` (target database), `OPENAI_API_KEY`, model envs
  (`BROBOT_STRONG_MODEL`, `BROBOT_OB_CLAIMS_GENERATOR_MODEL`,
  `BROBOT_OB_CLAIMS_CRITIC_MODEL`, `BROBOT_OB_CLAIMS_REVIEW_MODEL`).
- Migrations applied to the target, in order (see section 2).
- A transient packet file: JSON array of
  `{ nativeQuestionId, specialty?, packet: { stem, answerChoices,
  correctAnswer, explanationText, topicHints } }`.

## 2. Deploy migrations (staging first)

```bash
DO_NOT_TRACK=1 /private/tmp/supa-cli/supabase db push --db-url "$DATABASE_URL"
# then verify presence (read-only):
#   select tablename from pg_tables where schemaname='public'
#     and tablename like 'ob\_claim\_%' escape '\';
# expect 6 ob_claim_* tables + ob_question_identity_resolutions, 6 RPCs
```

What the migrations do: 7 new tables (RLS, service-role-only), 6 RPCs
(service-role-only), 1 trigram index on `educational_claims(claim_text)`,
2 nullable columns on `question_claim_links`. DDL only; zero rows inserted.

## 3. Pre-flight (every run)

```bash
npm run education:ob:claims:contract:test
npm run education:ob:claims:pipeline:test
npm run education:ob:claims:identity:test
npm run education:ob:claims:resolution:test
npm run education:ob:claims:runner:test
npx tsc --noEmit -p tsconfig.json   # must be clean for orthobullets/(claim-|ob-)*
```

## 4. Dry run (zero writes, always first against a new target)

```bash
npm run ob:claims:run -- --input=/tmp/packets.json --dry-run --max-questions=25
```

Expect: per-item `would_*` outcomes, no `ob_claim_*` rows, exit 0.

## 5. Canaries (staging; authorize before prod)

```bash
# 25-question canary
npm run ob:claims:run -- --input=/tmp/packets-25.json --apply \
  --max-questions=25 --max-errors=5 --max-cost=25 --out=tmp/ob-claims-canary25

# 100-question canary
npm run ob:claims:run -- --input=/tmp/packets-100.json --apply \
  --max-questions=100 --max-errors=10 --max-cost=100 --out=tmp/ob-claims-canary100

# 500-question canary
npm run ob:claims:run -- --input=/tmp/packets-500.json --apply \
  --max-questions=500 --max-errors=25 --max-cost=400 --out=tmp/ob-claims-canary500

# 2000-question canary (only after 500 passes engineering + automated AI-audit gates)
npm run ob:claims:run -- --input=/tmp/packets-2000.json --apply \
  --max-questions=2000 --max-errors=100 --max-cost=1500 --out=tmp/ob-claims-canary2000
```

Useful filters: `--specialty=trauma`, `--question-id=Q123`,
`--worker-id=canary-1`, `--lease-seconds=300`.

## 6. Resume and reprocess

```bash
# Resume an interrupted run (re-leases pending/expired items; terminal items untouched)
npm run ob:claims:resume -- --run-id=<run-uuid> --input=/tmp/packets.json --apply

# Force reprocess (new attempt_no, supersedes live events by pointer; history kept)
npm run ob:claims:run -- --input=/tmp/packets.json --apply \
  --force-reprocess --question-id=Q123
```

## 7. Monitoring (read-only SQL, target database)

```sql
-- run progress
select status, count(*) from public.ob_claim_production_items
  where run_id = '<run-uuid>' group by status order by 1;

-- run counters (maintained by refresh_ob_claim_production_run)
select completed_count, accepted_count, unresolved_count, failed_count,
       total_prompt_tokens, total_completion_tokens, total_estimated_cost_usd
  from public.ob_claim_production_runs where id = '<run-uuid>';

-- live extraction failures with diagnostics
select native_question_id, last_diagnostic, attempt_count, updated_at
  from public.ob_claim_production_items
  where run_id = '<run-uuid>' and status like 'failed%'
  order by updated_at desc limit 20;

-- unresolved queue for automated follow-up audit (no human gate; abstention preserved)
select i.native_question_id, e.coverage_verdict, e.coverage_notes
  from public.ob_claim_production_items i
  join public.ob_claim_extraction_events e on e.id = i.live_attempt_id
  where i.run_id = '<run-uuid>' and i.status = 'ai_review_unresolved';

-- durable output audit (v5 algorithm only)
select count(*) claims from public.educational_claims
  where algorithm_version = 'orthobullets-claims-prod.v1';
select mapping_role, count(*) from public.question_claim_links
  where algorithm_version = 'orthobullets-claims-prod.v1' and is_active
  group by mapping_role;
```

## 8. Failure triage

| Signal | Meaning | Action |
|---|---|---|
| `failed_transient` + `model_429`/`model_timeout`/`db_timeout` | retriable | resume; runner backs off automatically |
| `failed_permanent` + `model_empty`/`model_malformed`/`model_refused` | model gave nothing usable | leave terminal; feed packet to the automated audit sample; do not force |
| `failed_permanent` + `check_violation ...` | envelope/gate bug or tamper | read the detail; fix code, never hand-edit rows |
| `reuse target failed identity verification` | resolution lied or race | terminal by design; re-extract the item |
| `lease lost or not owned` | worker too slow or duplicate workers | raise `--lease-seconds`, ensure unique `--worker-id`s |
| stuck in `leased` past expiry | crashed worker | resume (leases are re-leasable) |
| `identity_conflict` | registry ambiguity | resolve in registry, then reprocess |

## 9. Rollback

- Stop the runner (`Ctrl-C`); in-flight items keep their leases until expiry,
  then resume cleanly. Nothing half-persists: one item = one RPC = atomic.
- To retire a bad run's edges (same-algorithm only, non-destructive):
  reprocess the affected questions; supersession retires old edges by pointer.
  History (`ob_claim_*`, claim versions) is never deleted.
- To remove the v5 schema entirely (staging only): drop the 6 RPCs, 7 tables,
  trigram index, and 2 link columns in reverse dependency order. There is no
  automated down migration by design.

## 10. Canary acceptance checklist

- [ ] Pre-flight tests + typecheck green (section 3), quoted in the report.
- [ ] Dry run clean against the same target (section 4).
- [ ] Counters reconcile: `completed = accepted + unresolved + failed`.
- [ ] Zero `failed_permanent` with `check_violation` (any = code bug, stop).
- [ ] Transient rate < 5% of items, all resolved by resume.
- [ ] Independent AI audit over the canary's final claim sets (see the rollout
      objective's audit architecture: source packet + final claims only, no
      generator/critic/validator reasoning; PASS/FAIL/UNRESOLVED per question
      with explicit defect categories). Human review is NOT a production
      requirement; unresolved/abstention states are preserved, never forced.
- [ ] Zero-claim and unresolved rates sane vs. the 100-Q pilot baseline.
- [ ] No rows outside the v5 surface: spot-check `educational_claims` rows
      carry `predicate = 'v5_assertion'`, `primary_entity_id IS NULL`,
      `review_status = 'unreviewed'`.
