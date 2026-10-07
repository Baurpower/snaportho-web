# BroBot Path-2 grounding — implementation report

Branch: `brobot-path2-grounding` (from `origin/main`, dirty Orthobullets WIP left untouched on `orthobullets-claims-qbank`).

Date: 2026-10-06 PT

## What shipped (Phases A–C code; D docs)

### Phase A — live shadow + telemetry
- Shadow retrieval now calls live `retrieve_brobot_knowledge_v2` (Path-1 reviewed + Path-2 factory card-claim links).
- `needs_review` links remain excluded by the SQL serving boundary (verified scorecard: 0 leaks).
- Default modes: `BROBOT_KG_MODE=shadow`, `BROBOT_CLAIMS_GROUNDING_MODE=shadow`, `BROBOT_CLAIM_ANKI_MODE=off`, retrieval version `v2`.
- Deadline default raised to **1200ms** (abort→bypass preserved). Local `.env.local` updated accordingly.
- Telemetry: whitelist + fallback so missing v3 columns / CHECK mismatches never kill chat.
- Fixed integer cast bug: `retrieval_latency_ms` is now `Math.round(...)` (was failing inserts with floats → 0 rows).
- Chat route always persists KG telemetry **inline** (no more `DEFERRED_TO_ENRICHMENT` when enrich queue is idle).
- Richer analytics metadata: `kgTelemetryPersisted`, error codes, timeout stage, elapsed, deadline, claim/card counts, answerInfluenced, retrievalMode, policyVersion.

### Phase B — dual-run / scorecard
- Shadow packets carry `claims` / `cardCandidates` / `selected_claim_ids` while `answerInfluenced=false`.
- Script: `npx tsx scripts/brobot-path2-shadow-scorecard.ts` → `reports/brobot-path2-grounding/SHADOW-SCORECARD.md`.

### Phase C — grounding behind flags (default OFF/shadow)
- `answerInfluenced` only when `BROBOT_CLAIMS_GROUNDING_MODE=enabled` (+ optional `BROBOT_CLAIMS_GROUNDING_MODES` allowlist).
- Prompt/quality-gate/parser/anki exact-link wiring present but inert until flags enabled.
- CHECK constraints relaxed so `retrieval_mode in ('shadow','enabled')` and `answer_influenced` boolean are insert-safe.

### Phase D
- Orthobullets QCL / `needs_review` never served (RPC boundary + scorecard invariant).
- Expansion stays documented; no QCL serving.

## Migrations
| Migration | Applied remotely? | Notes |
|---|---|---|
| `20260929021738_brobot_claims_knowledge_v2.sql` | Yes (already) | Added to repo for history |
| `20261007010000_brobot_kg_claims_shadow_telemetry.sql` | **Yes (this pass)** | Additive columns + CHECK relax only |
| `20260929040000_brobot_claims_knowledge_v3.sql` | **No** | File present; NOT applied. Stay on v2. Shadow v3 scorecard previously said NO ENABLE. |

No full `supabase db push` (remote/local history diverges; unsafe backlog).

## How to enable (preview first — do NOT flip prod blindly)

Vercel Preview / local only:

```
BROBOT_KG_MODE=shadow
BROBOT_KNOWLEDGE_RETRIEVAL_VERSION=v2
BROBOT_KG_RETRIEVAL_DEADLINE_MS=1200
BROBOT_CLAIMS_GROUNDING_MODE=shadow          # dual-run
BROBOT_CLAIM_ANKI_MODE=off
```

Later, answer influence (still preview):

```
BROBOT_CLAIMS_GROUNDING_MODE=enabled
BROBOT_CLAIMS_GROUNDING_MODES=consult,or_prep   # optional allowlist
BROBOT_CLAIM_ANKI_MODE=enabled                  # exact claim→card cards
```

## Test results
- Unit: telemetry, knowledge-v2 config, policy, cache, privacy, v2 schema — **pass**
- Live scorecard: needs_review served = **0**
- Live retrieve+persist smoke: timeout rows and hit/partial rows **persist successfully** after latency round fix

## Residual risks
1. Claims RPC latency often 400–900ms+; 1200ms deadline still timeouts under load — monitor `kgTimeoutStage`.
2. Natural-language recall remains weak for some prompts (known from prior audit); shadow dual-run is for measurement, not quality wins yet.
3. Full v3 hybrid RPC not deployed; do not set `BROBOT_KNOWLEDGE_RETRIEVAL_VERSION=v3` until migration applied intentionally.
4. Dirty WIP on `orthobullets-claims-qbank` still has unsafe `enabled` defaults — do not merge that branch’s KG config as-is.
5. Production Vercel env still has `BROBOT_KG_RETRIEVAL_DEADLINE_MS=275` until manually updated — update when deploying this branch’s preview/prod.
