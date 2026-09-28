# Execution Runbook (REQUIRES USER TERMINAL OR ESCALATED NETWORK)

The agent sandbox cannot reach direct postgres (DNS blocked) and has no
Supabase CLI or management token. All DDL + pg-based DML below must run
either in the user's own terminal (full network) or in an escalated-network
session approved per command. REST-verifiable steps are marked [AGENT].

## E1 — Migrations (Steps 8–10) [USER TERMINAL]

```bash
cd /Users/alexbaur/snaportho_dev/snaportho-web
brew install supabase/tap/supabase   # once
supabase link --project-ref geznczcokbgybsseipjg   # password: POSTGRES_PASSWORD from .env.local
supabase db push --dry-run            # review the 7-file chain SQL
supabase db push                      # applies 170000→240000→250000→260000→270000→280000→281000
```

Verify after push (any SQL path, files are read-only + rollback):

```bash
supabase db execute -f supabase/verification/claim_semantic_identity.sql
supabase db execute -f supabase/verification/phase2_atomic_claims.sql
supabase db execute -f supabase/verification/phase3_entity_promotion.sql
```

Expected: Phase 1 hard gates zero; Phase 2 objects exist; Phase 3 L4 = 1
row (ORIF ×2, pre-existing, carried to governance), P1 ≈ 1,046 rows
(pre-existing OrthoBullets entities), C2 = 2,113 (vacuous pre-backfill —
edges don't exist yet; gates at Step 21, not here). Any OTHER hard rows:
STOP.

[AGENT] post-push REST checks: tables exist, 2,113/2,113 sem coverage,
index presence via merge-key behavior, SQL/TS parity via
`rpc/educational_claim_semantic_fingerprint_hash` vs `/tmp/ts-semantic.json`.

## E2 — Entity decisions (Steps 12–14) [BLOCKED ON STAGING GATE]

The applier's `--apply` hard-refuses non-staging projects
(`requireStagingEnvironment`), and no staging project exists. Options:

- (a) User provisions staging (Supabase dashboard → new project → apply
  chain → run applier `--apply` there → verify → then prod decision).
- (b) User explicitly authorizes a prod-targeted apply path (code change:
  e.g. `--target=production` with double confirmation — requires explicit
  user direction; the agent will NOT weaken the gate unilaterally).
- (c) User executes the applier-emitted `plan.sql` via psql after review
  (exact applier output, but outside the transactional executor — least
  preferred; idempotency keys still recorded on replay).

Dry-runs (already executed by agent, reproducible):

```bash
node --experimental-strip-types scripts/kg-entity-promotion-apply.ts \
  --decisions reports/kg-production-rollout/decisions/safe-aliases.json \
  --snapshot snapshot.json --sql-out plan-aliases.sql
# ... same for safe-promotions.json / safe-rejections.json
```

Note: `--snapshot` needs a live snapshot build; the script builds it from
the reachable DB when `--snapshot` points at a buildable config (pg path —
same transport block; agent used the equivalent TS-level dry run).

## E3 — Backfill (Steps 17–19) [BLOCKED ON INTERLOCK + TRANSPORT]

Step 17 dry-run complete (5,968 claims, metrics stable, resolution +2×
canonical) and Step 18 manifest approved-in-draft (`live-backfill-manifest.md`).
The runner is now E3-ready (null primaries, id-map remap, card-claim-link
persistence, null-safe reuse) but `apply` is hardcoded false and `--apply`
throws by design ("never re-enable an inline --apply escape hatch").
Lifting the interlock for a 4,530-claim production write needs explicit
user authorization + the pg transport above. E3 additionally requires E2
complete (promotions live) + `--entity-id-map` built by joining the E2
apply report (`newEntityIds` by decision key) to
`decisions/safe-promotions.json` (`offlineProposalId` → decision key).

```bash
# after E2, build the map (agent provides the join script at E2 time),
# then (user terminal, exact flags TBD at unlock):
node --experimental-strip-types scripts/run-card-claim-backfill.ts \
  --from-db --entity-id-map entity-id-map.json --out runs/3c-backfill
```

## E4 — Post-verify (Steps 20–25) [AGENT, after E1–E3]

REST-based: outcomes census, C2/P2/full-suite recheck via verification
SQL (user-terminal assist for SQL files), fresh quality sample, primary
parity, idempotency reconciliation (second dry-run → near-zero).
