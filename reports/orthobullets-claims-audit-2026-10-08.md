# Orthobullets claims audit — October 8, 2026

The original 500-question inventory has a completed outcome for every question. Its latest outcomes are 489 accepted extractions (97.8%) and 11 unresolved (2.2%), with no missing outcomes. Extraction is making progress. The resulting claims are not yet integrated sufficiently to power Brobot, the knowledge graph, and Anki: zero cohort claims satisfy the deployed Brobot retrieval joins and trust filters.

This was a read-only audit of live Supabase project `geznczcokbgybsseipjg` (project name `snaportho`), plus local implementation and existing tests. No database writes, approvals, reprocessing, answer submissions, or deployments were performed. Older handoff documentation calls this project staging; that label was not relied on to authorize writes. The audit concerns ingestion results, not the user's question-answer performance.

## Scope and reconciliation

The first-500 inventory is the 500 distinct question IDs in run `3bf06315-fc96-47b2-99a8-bb70e52a0a27`. Outcomes were reconciled by question ID across subsequent runs using the most recently completed item. Adding run counters would double-count reprocessed questions.

| Measure | Verified result |
|---|---:|
| Original inventory | 500 questions |
| Latest accepted outcomes | 489 |
| Latest unresolved outcomes | 11 |
| Missing completed outcomes | 0 |
| Accepted questions missing a primary claim link | 0 |
| Active same-algorithm question–claim edges | 2,130 |
| Distinct claims reached by those edges | 2,039 |
| Questions with active edges | 491 |
| Claims with a primary entity | 55 / 2,039 (2.7%) |
| Claims with active card links | 31 / 2,039 (1.5%) |
| Active card links | 32, all approved `teaches` links |
| Questions with usable card links in latest published release | 40 / 500 (8.0%) |
| Claims passing Brobot's pre-anchor eligibility requirements | 0 |

491 questions with links does not mean 491 accepted latest outcomes: QIDs `212341` and `3151` still have two active edges apiece despite their latest extraction being unresolved. Their source hashes match the latest items. The distinction must remain visible; an older edge does not establish acceptance of the latest attempt.

The 2,039 claims include reused claims from other algorithms, not exclusively newly created v5 claims. Entity and card counts describe actual current connections; missing connections do not establish that no appropriate entity/card exists.

## Latest batch

Run `41b80b41-e787-4388-94d5-d9785bb6d775` finished October 7, 2026, 9:30 p.m. Pacific, after about 150 minutes. It contains 370 questions, of which 310 belong to the original inventory and 60 lie outside it.

- 370/370 completed; 361 accepted (97.6%), nine unresolved, zero failed items, zero retained lease owners.
- 1,770 accepted candidate occurrences; 1,714 distinct claims reached by the batch's active edges.
- Reported run cost: $2.1301, within the configured $4 ceiling. This is estimated model cost, not a billing reconciliation. Event cost totals are $2.0654; the aggregate counters include more usage than persisted extraction events alone, so the two should not be presented as identical.
- Manifest pins release `fc9760f8af2b3446492ae8cb65f96e97582135c9`, algorithm `orthobullets-claims-prod.v1`, and prompt set `ob-claims-prod-prompts-v1.0`.
- Every model stage in this batch uses `gpt-4.1-mini`. Separate review calls are useful, but this is not independent empirical proof of clinical precision.

Across the original 500's latest events, model configurations differ: 310 use `gpt-4.1-mini`, 176 `gpt-4o`, nine `gpt-5-nano`, and five `gpt-5-mini`. Evaluate quality by configuration rather than treating all 500 as one homogeneous experiment.

## Findings and priorities

### P1 — Bulk approval does not make the claims retrievable by Brobot

689 of the 2,039 claim records are approved, with metadata naming batch `bulk-2026-10-07`; 1,350 are unreviewed. All 2,039 current version snapshots remain unreviewed: 2,035 have `generated_draft` content and four have `needs_review` content. Parent and version review status therefore disagree for 689 claims.

The deployed `retrieve_brobot_knowledge_v2` function starts from entity anchors, approved card–entity links, and eligible card–claim links in the latest published deck. It checks the **claim version's** review/content state. Its draft exception additionally requires an `auto_approved`, evidenced `card-claim-factory.v1` link. The cohort's 32 active card links are `approved`, so they do not qualify for that exception. Reproducing these joins and filters, before query-specific anchor/ranking limits, returns zero cohort claims.

Repair the version-aware publication/validation contract, then verify actual retrieval. Updating only the parent approval flag cannot fix this. Do not blanket-mark versions `verified` merely to satisfy the filter: extraction source support and independently established medical validity are different decisions.

### P1 — Entity and card enrichment are largely unfinished

Only 55 cohort claims have a primary entity; only 31 have a card link. All 32 existing links are current and usable in published release `7764b632-5622-4f1b-959d-1874908fc46d` under the Anki linker’s version/release checks, covering 40 questions through shared claims.

The v5 production extractor intentionally creates claim/question records without creating entities or linking cards. These counts are therefore a downstream integration backlog, not evidence that extraction failed. Add a resumable enrichment pass over the accepted claims: conservative entity resolution, candidate card retrieval, exact cloze-level entailment checks, and version-pinned links. Keep no-match and verification-failure outcomes separate. Brobot's actual retrieval path requires approved card–entity connections as well as card–claim connections.

### P1 — Comparison stage causes avoidable whole-question abstentions

Eight unresolved questions pass factual, quality, validator, and coverage review for every draft, then hit a blocked claim-resolution decision. The runner deliberately marks the entire set unaccepted when any candidate resolution is unresolved.

Saved comparison reasons include scope mistakes: treating a retear-rate assertion as contradictory to a functional-score assertion (`211447`), an acute-infection definition as contradictory to a chronic-infection definition (`215157`), and a disease risk factor as contradictory to a complication risk factor (`6087`). These are distinct propositions as described by the saved reasons; identifying that logical difference does not independently certify either medical statement. Other disagreements, such as competing treatment recommendations, may be real and require evidence rather than relaxed thresholds.

Add adversarial comparison cases for condition, population, outcome, time window, and treatment context. Reassess the eight blocked sets with explicit contradiction checks and bounded repair. Preserve genuine abstentions. Consider candidate-level quarantine only with an explicit policy for whether the remaining set still has complete question coverage.

### P2 — Post-repair review evidence is not fully durable

15 accepted candidates across 13 cohort questions have a repair action but retain initial `rewrite`/`split` quality decisions; two retain initial `ambiguous` factual decisions. All have validator `accept` records. The deployed persist RPC checks transient `final_factual = supported` and `final_quality = good`, but stores the initial factual/quality judgments in the decision table. This is an auditability gap, not proof that those claims bypassed review.

Persist both initial and final review passes, repair lineage, and the final verdict/reason/model/version. Local `buildPersistPayload` also sends `origin_candidate_index: null`, including repaired candidates. Make repaired/split lineage reconstructable without source packets.

### P2 — Completed inventory and stale run headers need separate reporting

The original run still says `paused` with 171 completed items; the later 329-item run says `paused` with five completed. Several historical runs say `running` even though every item is terminal. Their headers do not describe the reconciled 500-question result. Use question-level reconciliation for coverage and report old run status independently. Reconcile headers through the supported run lifecycle when fixing operations.

## Unresolved queue

| QID | Latest barrier |
|---|---|
| 211139 | Missing major concept; validator abstentions |
| 212341 | Coverage complete; validator abstentions; older active edges remain |
| 3151 | Coverage complete; validator abstentions; older active edges remain |
| 211447 | Claim resolution blocked after all review gates pass |
| 215157 | Claim resolution blocked after all review gates pass |
| 2892 | Claim resolution blocked after all review gates pass |
| 4600 | Claim resolution blocked after all review gates pass |
| 5503 | Claim resolution blocked after all review gates pass |
| 6087 | Claim resolution blocked after all review gates pass |
| 6764 | Claim resolution blocked after all review gates pass |
| 8853 | Claim resolution blocked after all review gates pass |

## Verification and limits

Verified across the cohort's active v5 edges: zero duplicate question/claim/role edges, zero duplicate composite structural/semantic claim identities, zero inactive target claims, zero missing current versions, zero stale claim-version pointers, and zero source-hash mismatches against latest completed items. Every accepted latest item has an extraction event and complete coverage; every accepted candidate has a validator-accept decision. These checks establish structural consistency, not semantic near-duplicate absence or clinical correctness.

Executed locally, all passing: `education:ob:claims:contract:test`, `pipeline:test`, `identity:test`, `resolution:test`, and `runner:test`. Local HEAD was `435310d9745accf15ebb8e2c12b1c67bffecede2`, different from the latest run's pinned release. These are current-checkout unit tests, not a live source-dependent canary or a test of that exact historical release. No full-project typecheck was run.

No original question pages were reopened and no new blinded source-dependent clinical audit was performed. A small deterministic inspection of sanitized claims and decision records cannot establish medical accuracy or source entailment for the whole batch. No standalone independent audit table was found among the inspected public table names; this does not rule out audit artifacts elsewhere. Zero persisted source-content leakage was not comprehensively certified. Those quality/privacy gates remain unverified.

## Recommended next work

1. Repair durable final-review telemetry and scoped contradiction evaluation; replay the 11 unresolved questions with bounded attempts and fresh transient source access.
2. Run a blinded source-dependent evaluation of final claim sets, oversampling repaired claims, numeric/negative assertions, unresolved questions, and each model configuration. Keep source material transient and report defects separately from abstentions.
3. Implement entity and Anki enrichment over the existing accepted claims, with explicit missing-card outcomes and strict version checks.
4. Make validation/publication version-aware and consistent with Brobot's deployed trust rules; verify retrieval on representative question topics and exact Anki launches.
5. Expand ingestion after quality evaluation and useful downstream retrieval pass. Additional extraction alone will mostly grow a disconnected claim inventory.
