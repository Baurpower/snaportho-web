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
   `complete`.
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

Rules enforced by the RPC (all fail the whole call, terminal `check_violation`):

- Accepted requires coverage `complete`, and every accepted candidate needs
  `final_factual = supported`, `final_quality = good`, validator `accept`.
- Unresolved extractions must mark zero candidates accepted.
- Accepted candidates need a `reuse`/`create` resolution. `reuse` re-verifies
  the target is live AND its stored hashes equal the RPC-recomputed identity;
  mismatch raises `reuse target failed identity verification`.
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

- `educational_claims`: v5 rows carry `predicate = 'v5_assertion'`,
  `primary_entity_id = NULL`, `review_status = 'unreviewed'`. Hashes are
  stamped by the prod `sync_educational_claim_fingerprint` BEFORE trigger
  (legacy structural branch + semantic v1); writers cannot smuggle hashes.
  Dedup is the composite partial unique
  `(fingerprint_hash, semantic_fingerprint_hash) WHERE is_active AND ...`.
  Provenance rides `metadata.source_fingerprint_hash` (claims have no
  source-hash column).
- `educational_claim_versions`: writers own version rows (no version trigger
  in prod). The RPC snapshots v1 and maintains `current_version_id`.
- `question_claim_links`: edges are `tests_primary`/`tests_secondary` with
  `review_status = 'needs_review'`. `evidence_locator` (NOT NULL) is the
  identity locator, falling back to the canonical review URL. The migration
  adds nullable `superseded_at` / `superseded_by_claim_id` (absent in prod);
  supersession retires same-algorithm edges only and never touches other
  algorithms' edges.
- `external_questions`: referenced by FK only; the pipeline never creates
  registry rows.

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
