# Orthobullets Claims Production (v5.1)

Production pipeline: Orthobullets question → 0..N excellent durable claims →
question↔claim links. Contract `ob-claims-production.v1`, algorithm
`orthobullets-claims-prod.v1`.

Companion operator doc: [muse runbook](./orthobullets-claims-muse-runbook.md).
Architecture map: [implementation map](./orthobullets-claims-implementation-map.md).

## 1. Pinned versions

| Name | Value |
|---|---|
| Contract | `ob-claims-production.v1` |
| Algorithm | `orthobullets-claims-prod.v1` |
| Prompt set | `ob-claims-prod-prompts-v1.0` |
| Generator prompt | `ob-claims-prod-generator-v1.0` |
| Review prompt | `ob-claims-prod-review-v1.0` |
| Coverage prompt | `ob-claims-prod-coverage-v1.0` |
| Repair prompt | `ob-claims-prod-repair-v1.0` |
| Validator prompt | `ob-claims-prod-validator-v1.0` |
| Equivalence prompt | `ob-claims-prod-equivalence-v1.0` |
| Predicate marker | `v5_assertion` |
| Semantic identity | `v1` (pinned twin of the clinical-claim contract) |

Source of truth: `src/lib/brobot/orthobullets/claim-extraction-contract-v1.ts`.
The persist RPC rejects any envelope whose contract/algorithm differs.

## 2. Pipeline stages (per question)

1. **Identity** (`ob-question-identity.ts`): exact native/alias match against the
   registry → `RESOLVED` (exactly one id), `UNRESOLVED`, or `CONFLICT` (all
   contenders named). No fuzzy matching. Non-resolved outcomes complete the
   item without extraction.
2. **Generator**: drafts 0..N claims with importance (`primary`/`secondary`),
   claim type, qualifiers, support sections, confidence.
3. **Factual + quality review**: per-claim categorical verdicts. Factual:
   `supported`/`unsupported`/`ambiguous`. Quality: `good`/`rewrite`/`split`/
   `remove`. No numeric auto-approve gate exists anywhere.
4. **Repair**: `rewrite`/`split` rewrites are re-reviewed; `remove` drops the
   draft. Lineage (`origin_candidate_index`, `pre_repair_text`) is preserved.
5. **Coverage**: set-level verdict `complete`/`missing_major_concept`/
   `overextracted`/`internally_conflicting`. Accepted extractions require
   `complete`. When drops are applied, the recorded verdict is the RESIDUAL
   `complete` (the persisted set is the post-drop set; the independent
   validator still re-verifies it), with the original verdict + dropped
   indices appended to `coverage.notes` and per-candidate
   `validator.reason = dropped:coverage_drop`. Verdicts without drops that
   cannot proceed (`missing_major_concept`, bare `overextracted` /
   `internally_conflicting`) persist unchanged on unresolved extractions.
6. **Validator**: independent `accept`/`abstain` per surviving claim.
7. **Safety net**: vignette-pattern text can never persist, even if reviewers
   accept it (contract rule + `ob_claim_text_is_safe` CHECK).
8. **Resolution** (`ob-claim-resolution.ts`): exact identity → semantic hash →
   text retrieval → batched LLM equivalence. Decisions: `reuse` (verified
   server-side against live identity), `create`, `unresolved`. Embeddings and
   retrieval never authorize reuse by themselves.
9. **Persist** (`ob_claim_persist_extraction`): one atomic RPC call per item.

Final states: `accepted` or `ai_review_unresolved`. Anything else is a
failure/identity outcome recorded on the item, never an extraction event.

Report semantics (`report.json`): `processed` counts lease completions
(retries repeat); `questions` counts unique questions; `outcomes` counts
per-question FINAL outcomes (last checkpoint per question wins); `items`
keeps the full attempt history. Safety failures carry `reasonCodes`.
`live_attempt_id` names the event the item produced or adopted; after a
later force-reprocess it may name a superseded (retained) event — staleness
there is historical record, not corruption. Lineage integrity is: exactly
one live event per extraction identity + every pointer names its own
identity's event.
The report also includes `databaseTotals`, grouped over the entire persisted
run; use these rather than invocation-local counters when reconciling resumes.
Independent audits bind to the run item's exact `live_attempt_id` and source
fingerprint and emit an immutable pre-model audit manifest.

## 3. Extraction envelope (persist RPC input)

`ob_claim_persist_extraction(p_item_id, p_worker_id, p_extraction jsonb)`.
All keys below are read by the RPC; unknown keys are ignored.

```jsonc
{
  "contract_version": "ob-claims-production.v1",
  "algorithm_version": "orthobullets-claims-prod.v1",
  "prompt_set_version": "ob-claims-prod-prompts-v1.0",
  "attempt_id": "uuid (deterministic per provider+qid+hash+algo+prompts+attempt_no)",
  "attempt_no": 0,
  "supersedes_attempt_id": null,
  "source": {
    "provider": "orthobullets",
    "native_question_id": "Q123",
    "source_hash": "64-hex source fingerprint",
    "registry_question_id": null
  },
  "started_at": "timestamptz",
  "completed_at": "timestamptz",
  "final_state": "accepted | ai_review_unresolved",
  "coverage": { "verdict": "complete", "notes": "", "missing_concepts": [] },
  "diagnostics": [],
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "estimated_cost_usd": 0 },
  "models": { "generator": "", "reviewer": "", "coverage": "", "repair": "", "validator": "" },
  "prompt_versions": { "generator": "", "review": "", "coverage": "", "repair": "", "validator": "" },
  "identity": {
    "outcome": "RESOLVED | UNRESOLVED | CONFLICT",
    "registry_question_id": null,
    "method": "registry_native_exact | registry_alias_exact | no_registry_match | native_id_ambiguous | alias_ambiguous | native_alias_mismatch",
    "confidence": "high | medium | low",
    "evidence": [],
    "locator": "https://www.orthobullets.com/testview?qid=Q123",
    "conflicting_ids": []
  },
  "candidates": [
    {
      "candidate_id": "uuid",
      "index": 0,
      "text": "derived assertion, 20-500 chars, vignette-free",
      "importance": "primary | secondary",
      "claim_type": "anatomy (17-value vocabulary, see DDL)",
      "qualifiers": { "anatomy": "humeral shaft" },
      "support": ["stem | answer_choices | correct_answer | explanation | topic_hints"],
      "generator": { "model": "", "prompt_version": "", "confidence": 0.9 },
      "factual": { "verdict": "supported", "reason": "" },
      "quality": { "verdict": "good", "reason": "" },
      "validator": { "verdict": "accept", "reason": "" },
      "final_factual": "supported",
      "final_quality": "good",
      "accepted": true,
      "origin_candidate_index": null,
      "repair_action": null,
      "repair_reason": null,
      "pre_repair_text": null,
      "final_text": null,
      "resolution": {
        "structural_hash": "64-hex (runner-computed, informational)",
        "semantic_hash": "64-hex (runner-computed, informational)",
        "examined": [{ "claim_id": "uuid", "verdict": "equivalent", "reason": "" }],
        "decision": "reuse | create | unresolved",
        "resolved_claim_id": "uuid | null",
        "model": "",
        "prompt_version": "",
        "usage": { "prompt_tokens": 0, "completion_tokens": 0, "estimated_cost_usd": 0 }
      }
    }
  ]
}
```

Before the RPC is ever called, the runner gates every pipeline output through
`isObProdExtraction` (single source: `explainObProdExtraction`, which returns
one stable code per violated check). A rejection completes the item
`failed_permanent` / `safety_violation` with reason codes
`['contract_rejected', 'contract:<code>', ...]` (first 5 codes, length-bounded)
and salvaged stage usage — never zero-token, never undiagnosed. Dry run
applies the identical gate (`failed` / `safety_violation`, no writes).

Rules enforced by the RPC (all fail the whole call, terminal `check_violation`):

- Accepted requires coverage `complete`, and every accepted candidate needs
  `final_factual = supported`, `final_quality = good`, validator `accept`.
- Unresolved extractions must mark zero candidates accepted.
- Accepted candidates need a `reuse`/`create` resolution. `reuse` is verified
  by examined verdict: `exact_identity` requires the target live with stored
  hashes equal to the RPC-recomputed identity; `equivalent` (paraphrase)
  requires the target live (hashes and cross-era type vocabularies cannot
  verify a paraphrase). Any other verdict, or missing examined evidence for
  the target, rejects loudly. Cross-algorithm reuse is intended.
- `identity: null` and `resolution: null` mean absence (explicit JSON null is
  safe, not a crash).
- Claim vocabulary: `review_status = 'unreviewed'`, `approval_method =
  'machine_consensus'`, `content_source = 'generated_draft'` (prod defaults).
  Link vocabulary: `review_status = 'needs_review'`. The two vocabularies are
  different columns with different CHECKs; do not mix them.

## 4. Database

Migrations (apply in order):

- `20260928150816_ob_claims_prod_tables.sql` — 7 tables, guards, trigram
  index, 2 additive link columns, RLS.
- `20260928150846_ob_claims_prod_rpcs.sql` — 6 RPCs, service-role-only.
- `20260929030000_ob_claim_persist_equivalence_reuse.sql` — patch 1:
  verdict-aware reuse verification (`exact_identity` vs `equivalent`).
- `20260929030100_ob_claim_equivalence_live_only.sql` — patch 2:
  equivalence verifies live-only (cross-era type vocabs incomparable).
- `20260929030200_ob_claim_supersede_global.sql` — patch 3: supersede scope
  is the global extraction identity, not the same item.
- `20260929030300_ob_claim_no_self_supersede.sql` — patch 4: link
  supersession excludes edges touched by the current persist call.
- `20260929030400_ob_claim_persist_reset_reason_codes.sql` — patch 5:
  success persist stamps `extraction_accepted` / `extraction_unresolved`,
  clearing stale failure codes from retried items.
- `20261002005124_ob_claim_run_hardening.sql` — immutable release/packet/model
  manifests, explicit pause/resume/finalize lifecycle, and expired-lease recovery.

### 4.1 New tables

| Table | Rows | Mutability |
|---|---|---|
| `ob_claim_production_runs` | one per run | counters only |
| `ob_claim_production_items` | one per question per run | lease machine |
| `ob_claim_extraction_events` | one per attempt | immutable except `superseded_by_attempt_id` (deferred self-FK) |
| `ob_claim_candidates` | one per draft | insert-only |
| `ob_claim_candidate_decisions` | factual+quality+validator per draft, one set-level coverage row | insert-only |
| `ob_claim_candidate_resolutions` | one per examined claim (or one `uncertain` row) | insert-only |
| `ob_question_identity_resolutions` | identity outcomes | insert-only |

All 7 have RLS enabled, revoked from `public`/`anon`/`authenticated`, granted
to `service_role`. No source text (stems, choices, explanations, HTML) is
stored anywhere: provenance is section identifiers + hashes only, enforced by
`ob_claim_text_is_safe` and `educational_metadata_is_safe` CHECKs.

### 4.2 Touched prod tables (verified read-only against prod 2026-09-28)

- `educational_claims`: claims created by v5 carry `predicate = 'v5_assertion'`,
  `primary_entity_id = NULL`, `review_status = 'unreviewed'`. Hashes are
  stamped by the prod `sync_educational_claim_fingerprint` BEFORE trigger
  (legacy structural branch + semantic v1); writers cannot smuggle hashes.
  Dedup is the composite partial unique
  `(fingerprint_hash, semantic_fingerprint_hash) WHERE is_active AND ...`.
  Provenance rides `metadata.source_fingerprint_hash` (claims have no
  source-hash column).
  A v5 link may reuse a live cross-algorithm claim; that pre-existing claim
  retains its original predicate, entity, and algorithm metadata.
- `educational_claim_versions`: writers own version rows (no version trigger
  in prod). The RPC snapshots v1 and maintains `current_version_id`.
- `question_claim_links`: edges are `tests_primary`/`tests_secondary` with
  `review_status = 'needs_review'`. `evidence_locator` (NOT NULL) is the
  identity locator, falling back to the canonical review URL. The migration
  adds nullable `superseded_at` / `superseded_by_claim_id` (absent in prod);
  supersession retires same-algorithm edges only and never touches other
  algorithms' edges.
- `external_questions`: referenced by FK only from the extraction path. The
  extraction pipeline itself never creates registry rows; a separate
  discovery step (`scripts/discover-ob-registry-questions.ts`, v4
  find-or-create convention) must register packet qids first, otherwise
  items complete as `identity_unresolved` without extraction.

### 4.3 RPCs

| Function | Purpose |
|---|---|
| `ob_claim_lease_item` | lease one ready/expired/exhausted item (`SKIP LOCKED`) |
| `ob_claim_heartbeat` | extend an owned live lease |
| `ob_claim_persist_extraction` | atomic persist (section 3) |
| `ob_claim_adopt_live_event` | adopt an existing live accepted event, no re-extraction |
| `ob_claim_complete_item` | terminal identity/failure outcomes |
| `refresh_ob_claim_production_run` | recompute run counters |

### 4.4 Never list

The pipeline never merges claims, never deletes history (supersede-by-pointer
only), never writes entities (`primary_entity_id` is always NULL; no entity
table is referenced), never touches cards/decks/Anki tables, never
auto-approves (no numeric-confidence gate; claims land `unreviewed`, links
land `needs_review`), and never persists vignette text.

## 5. Lease protocol

Items move `pending → leased → (extracting|reviewing|resolving|persisting) →
accepted | ai_review_unresolved | identity_* | failed_*`. Leases expire;
expired leases are re-leasable by any worker. Attempts past `max_attempts`
surface once with `exhausted = true` (no attempt burn) for terminal
conversion. Heartbeats extend live leases; a lost lease fails the persist
loudly (`lease lost or not owned`), and the item is picked up again. Every
persist is idempotent per `attempt_id`: replays reuse and write nothing new.

## 6. Release-gated operation

New durable runs bind to the current Git SHA, the byte-for-byte packet-file
SHA-256, all stage models, request/lease/pacing controls, limits, and pricing.
Resume rejects any mismatch. A worker pause is explicit; a run becomes
`completed` or `completed_with_gaps` only when its item count equals the
declared count and every item is terminal. Both integrity and AI audit gates
reject nonterminal runs before performing their substantive checks or making
model calls.

Use the cheap-model profile explicitly (prices are recorded in the run):

```sh
npm run ob:claims:run -- --input=/absolute/packets.json --apply \
  --model-profile=gpt5-nano --inter-item-delay-ms=1500 \
  --request-timeout-ms=180000 --max-cost=10
```

`gpt5-mini` is the pinned OpenAI profile for the viability gate (`gpt-5-mini`,
$0.25 / $2.00 per 1M tokens, pricing version `openai-gpt5-mini-2026-10-06`).
It keeps default GPT-5 reasoning and sets `max_completion_tokens` to 8192.
`--max-item-cost` stops a run after the first item whose own cost exceeds the
cap. The 50-question gate stays zero-write until `viability.json` passes.

Meta Model API is available as a run-bound fallback. Keep the full key only in
the local environment; never put it in a command, report, or repository:

```sh
export MODEL_API_KEY='<key from dev.meta.ai>'
node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
  scripts/test-ob-model-provider.ts --model-profile=muse-spark
npm run ob:claims:run -- --input=/absolute/packets.json --apply \
  --model-profile=muse-spark --inter-item-delay-ms=1500 \
  --request-timeout-ms=180000 --max-cost=10
```

The pinned standard Muse profile uses `https://api.meta.ai/v1`,
`muse-spark-1.3`, minimal reasoning, a 4,096-token per-call ceiling, and the
recorded standard-tier prices. The reasoning controls are mandatory cost
guards: Muse reasoning tokens are billed as completion tokens even though
they are not present in the visible JSON response. For another
OpenAI-compatible endpoint, use `custom-compatible` with
`OB_MODEL_API_KEY`, `OB_MODEL_BASE_URL`, `OB_MODEL_ID`, and explicit pricing
environment variables. Never change provider or model while resuming a
manifest-locked run. On quota exhaustion, pause it and create a new run over
the remaining-question packet:

```sh
node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
  scripts/build-ob-fallback-packet.ts --run-id=SOURCE_RUN_UUID \
  --input=/absolute/full-packets.json --out=/absolute/muse-fallback-packets.json
npm run ob:claims:run -- --input=/absolute/muse-fallback-packets.json --apply \
  --model-profile=muse-spark --inter-item-delay-ms=1500 \
  --request-timeout-ms=180000 --max-cost=10
```

If a transient packet is lost, export the non-source recovery manifest before
refetching:

```sh
node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
  scripts/export-ob-run-recovery-manifest.ts --run-id=RUN_UUID \
  --out=private/orthobullets-runs/RUN_UUID
node scripts/fetch-ob-question-packets.mjs \
  --qids-file=private/orthobullets-runs/RUN_UUID/recovery-manifest.json \
  --out=private/orthobullets-runs/RUN_UUID/packets.json --delay-ms=2000
node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
  scripts/verify-ob-recovered-packets.ts \
  --manifest=private/orthobullets-runs/RUN_UUID/recovery-manifest.json \
  --packets=private/orthobullets-runs/RUN_UUID/packets.json \
  --out=private/orthobullets-runs/RUN_UUID/recovery-verification.json
```

The private run directory is gitignored. Resume is allowed only when the
verification report passes; otherwise preserve the old run and launch a new
deterministic canary.

Create immutable full-inventory shards only in a new empty directory:

```sh
node scripts/shard-ob-question-packets.mjs --input=/absolute/all.json \
  --out=/absolute/shards --shard-size=1000
```

Before approving a model profile, run a deterministic dry-run evaluation set
and gate its report (defaults: 50 questions, ≥70% accepted, ≤5% failed,
≤25% unresolved, ≤$0.02/question):

```sh
node scripts/evaluate-ob-model-viability.mjs \
  --reports=/absolute/dry-run/report.json --out=/absolute/viability.json
```

After a run is terminal, execute both gates with the exact packet file:

```sh
npm run ob:claims:integrity -- --run-id=RUN_UUID --out=/absolute/integrity
node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs \
  scripts/audit-ob-claims-canary.ts --run-id=RUN_UUID \
  --input=/absolute/packets.json --out=/absolute/audit
```
