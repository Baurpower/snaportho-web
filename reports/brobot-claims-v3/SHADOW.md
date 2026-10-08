# BroBot claims retrieval v3 — shadow-mode evaluation report

Date: 2026-09-29. Versions: query-understanding `brobot-query-understanding.v1`,
rerank `brobot-claims-rerank.v1`, policy `brobot-claims-v3`, packet
`brobot-knowledge-packet.v2`, migration
`supabase/migrations/20260929040000_brobot_claims_knowledge_v3.sql`.

## Method

- Benchmark `benchmarks/brobot-claims-retrieval/v1/benchmark.json`: 77 prompts
  frozen before tuning (train 46 / holdout 31), each with expected claim IDs,
  hard negatives, and no-claim-expected flags for unsupported prompts.
- Retrieval evaluated against a PGlite prod-clone (`intent -> QU -> v3 RPC
  pool-48 -> TS rerank maxClaims 8`), same code path the provider uses.
- Baseline: v2 production RPC recall ~0.013 on the same benchmark; live canary
  (2026-09-29) returned 0 claims for a Garden query in 809 ms.
- Train was tuned (grid + ablations). Holdout was run ONCE for pools and ONCE
  for served selection, then inspected for this report. The holdout is now
  contaminated: it must not validate future tuning (see Re-validation).

## Metrics

Pool stage (expected claims in 48-pool):

| Split | Mean pool recall | Full | Zero | Pool leaks | P50 / P95 |
|---|---|---|---|---|---|
| Train (46) | 0.937 | 37 | 0 | 29 | 1521 / 2402 ms |
| Holdout (31) | 0.978 | 25 | 0 | 18 | 1548 / 2504 ms |

(PGlite/WASM latencies; production Postgres will differ. Pool leaks are
hard negatives present in the broad pool — the rerank exists to filter them.)

Served selection (maxClaims 8, minScore 0.22):

| Split | Mean recall | Leak rate | Unsup rate | Empty rate |
|---|---|---|---|---|
| Train (46) | 0.815 | 0.000 (0) | 0.000 | 0.000 |
| Holdout (31) | 0.747 | 0.161 (5) | 1.000 (4/4) | 0.000 |

Shadow quality metrics (same rerank outputs):

| Split | P@5 | Facet recall | Ineligible served | Coverage full/partial/unknown | Card-link yield |
|---|---|---|---|---|---|
| Train | 0.331 | 0.887 | 0 | 32/12/2 | 264/265 (99.6%) |
| Holdout | 0.235 | 0.892 | 0 | 24/7/0 | 216/217 (99.5%) |

Notes:

- P@5 counts only benchmark-expected IDs as correct; most served claims are
  unlabeled topical claims, so this understates true precision. The
  hard-negative-free rate (train 1.000, holdout 0.839) is the cleaner
  benchmark precision signal.
- Facet recall = requested QU facets covered by `inferClaimFacets` of
  selected claims.
- Card-link yield = served claims with an approved/auto_approved in-release
  card link (exact-link upper bound via `linkAnkiCardsForClaimIds`). v2
  paired audit yielded 0 cards; v3 serves almost exclusively linkable claims.
- Attribution yield (model-cited usedClaimIds) and grounded-win rate need
  real BroBot chats with auth; pending paired audit.
- Eligibility recheck drops: 0 on both splits (SQL boundary held; nothing
  ineligible reached selection).

## Gate scorecard

| Gate | Target | Train | Holdout | Verdict |
|---|---|---|---|---|
| Ineligible served | 0 | 0 | 0 | PASS |
| P@5 | >= 0.85 | 0.331 | 0.235 | FAIL (sparse-label caveat above) |
| Facet recall | >= 0.80 | 0.887 | 0.892 | PASS |
| Leak rate | <= 0.02 | 0.000 | 0.161 | FAIL |
| Coverage (no empty claimed) | 0 empty | 0 | 0 | PASS |
| Attribution yield | nonzero | — | — | PENDING (paired audit) |
| Card yield | nonzero | 99.6% | 99.5% | PASS (linkability) |
| Grounded wins | > baseline | — | — | PENDING (paired audit) |
| Latency P95 | budget | PGlite 2.4 s | PGlite 2.5 s | UNKNOWN for prod |

Verdict: NO ENABLE. Holdout fails leak, recall, and unsupported gates.

## Miss inspection (holdout)

Leaks (hard negative served; expected recall stayed 1.0 in 4 of 5):

1. `oite-spondylo-level` — exam-maneuver claim served for a "most common
   level" question. Same condition, wrong aspect; `level` excused from
   topic-miss because the claim covers rare `spondylolisthesis`.
2. `consult-supracondylar` — flexion-type nerve-injury claim tied 0.71 with
   the extension-type HIT. The question's `extension-type` qualifier was
   excused the same way. Safety-critical pair (ulnar vs median/AIN).
3. `or-forearm-fasciotomy` — volar finger-approach claim for a forearm
   compartment question; `forearm` excused via `volar` coverage.
4. `or-pavlik` — DDH treatment claim @0.27, just above minScore 0.22;
   facet-mismatch factor fired but not enough. Marginal-threshold leak.
5. `or-achilles-infected` — nonoperative-rupture and rupture-location
   claims @0.53 for an infected re-rupture; `infection`/`deep` excused
   via `achilles` coverage.

Root cause (1, 2, 3, 5): the topic-miss maxCov rule lets coverage of one
rare term waive every other query term, including safety-critical
qualifiers (level, extension-type, anatomy, infection). The rule was kept
during train tuning because removing it fractured train sets; it is too
permissive for unseen qualifier-distinguished pairs.

Zero-recall prompts (all had expected claims IN the pool — rerank-level
crowding, 8 distractors selected above them):

- `regress-garden-elderly` 0/4, `oite-translocation-rhabdo` 0/1,
  `consult-open-femur` 0/1, `consult-followup-syndesmosis` 0/3 (follow-up
  "What about the syndesmosis?"), `or-misspelling` 0/2 ("supracondyler"
  typo), `general-shenton` 0/1. Partials: `clinic-acl-mri` 2/3,
  `consult-bosworth` 1/2.

Unsupported prompts (all 4 served 8 claims):

- `consult-unsupported-stemcells`, `or-unsupported-implant`: topical but
  off-topic claims (cartilage-wear, distal-radius). QU unsupported
  taxonomy covers billing/coding only, not regenerative medicine or
  implant hardware.
- `general-unsupported-rare` (Erdheim-Chester): femur+treatment matches
  scored high via the same maxCov excuse; the KG has no ECD claims, so
  the correct output is empty with a limitation.
- `regress-acl-indications-variant`: flagged noClaimExpected, but it is a
  legitimate indications question — likely benchmark mislabel. Served
  topical ACL claims (correct) plus scoliosis/rheumatoid indication junk
  (facet `indication` matching any-indication claims — real precision gap).

## Production canary (read-only, 2026-09-29)

- Boundary stable: 3,309 active links = 3,290 approved/auto_approved +
  19 needs_review (excluded); published release `7764b632-…` unchanged;
  6,679 active claims.
- v2 RPC healthy, 809 ms, 0 claims for the Garden probe (matches baseline).
- v3 RPC absent (migration unapplied, as expected).
- `brobot_kg_retrieval_events` is empty: no live KG traffic baseline; v3
  telemetry columns will see first writes on rollout.
- Direct REST reads of `educational_claim_versions` fail with an empty
  error; RPC paths (v2 today, v3 after migration) are unaffected.

## What changed (this delivery)

- `supabase/migrations/20260929040000_brobot_claims_knowledge_v3.sql`:
  hybrid v3 RPC (claim FTS/token/phrase/trigram, card-text, entity
  traversal, relationship hop; eligibility before ranking; pool 48 with
  IDF packet), v3 telemetry columns, serving indexes; invoker, empty
  search_path, service_role-only grants.
- `src/lib/brobot/kg/`: `query-understanding.ts`, `abbreviations.ts`,
  `rerank.ts` (calibrated scoring, MMR, thresholds, conflicts),
  provider v3 path behind `BROBOT_KNOWLEDGE_RETRIEVAL_VERSION`
  (default v2), telemetry row keys, conflict warning in quality gate,
  packet `claimConflicts`.
- Prompt/parser/Anki unchanged: grounding, conflict-uncertainty,
  usedClaimIds-from-packet-only, and exact-cards-from-usedClaimIds were
  already in place and verified.
- Tests: `brobot:test:claims-knowledge-v3` (schema contract + runtime:
  thresholds, MMR, conflicts, eligibility recheck, mapping, gate,
  telemetry, config). Existing v2/chat/telemetry/typecheck all pass.

## Rollout / rollback (gated — do not enable yet)

Preconditions (all unmet): qualifier-protection fix designed from spec
and validated on train + a FRESH held-out sample; unsupported taxonomy
extended (regenerative medicine, implant hardware); v3 prod latency
measured P95 within deadline; paired audit with nonzero attribution,
card yield, grounded wins.

1. Reconcile remote migration history first (AUDIT.md notes a normal
   push is unsafe: remote is missing a large local backlog). Deploy ONLY
   the intended BroBot migration.
2. Apply migration, then deploy code (telemetry writes new columns;
   code-before-migration breaks persistence non-fatally).
3. Set `BROBOT_KNOWLEDGE_RETRIEVAL_VERSION=v3` with claims grounding in
   shadow; raise `BROBOT_KG_RETRIEVAL_DEADLINE_MS` toward 1000 (v2
   already takes ~800 ms in prod).
4. Shadow-compare v2/v3 traces (policy_version distinguishes), then
   paired audit per AUDIT.md priorities; require gates before `enabled`.
5. Rollback: unset the version flag (instant, v2 path untouched) or
   revert grounding mode to shadow; migration is additive (new function
   + columns + indexes) and needs no rollback.

## Re-validation protocol

The current holdout was inspected for this report and cannot validate
future tuning. Next validation must use a fresh held-out sample drawn
after the fix set is frozen (new prompts + labels, same schema), or a
re-split with fresh labels. Re-tune thresholds only on train.
