# Orthobullets remediation implementation status

October 8, 2026. Implementation remains in progress; this report does not certify completion or clinical accuracy.

## Verified scope

The original 500-question cohort is `3bf06315-fc96-47b2-99a8-bb70e52a0a27`. Its latest completed outcomes remain 489 accepted and 11 unresolved, with no missing completed outcomes. This describes extraction acceptance, not the user's question-answer score. The later 370-question run includes 60 questions outside this cohort.

The original production algorithm has 2,130 active question–claim links reaching 2,039 distinct current claims. Its verified serving count is zero. The wider all-algorithm union has 2,047 claims and must not be substituted for this scope. Fifteen accepted repaired candidates across 13 questions still lack historical final review receipts.

## Implemented and applied

Ten additive database migrations were tested in an isolated PostgreSQL-compatible fixture and applied to the verified connected Supabase project. They add immutable, version-pinned review attestations; separate source fidelity, clinical validity, quality, and publication decisions; final repaired-child review receipts; shared serving eligibility; direct claim retrieval without a card or entity; bounded enrichment leases; and a durable model invocation budget ledger. The ninth migration makes review ordering monotonic and tightens legacy factory eligibility to an exact teaches relationship, active current card version, and included current release.

Historical bulk approvals were preserved as historical receipts, not upgraded to clinical validation or publication. There are 689 receipts in the original production scope, and 696 in the wider union. Existing immutable claim versions were not rewritten.

Local pipeline changes preserve repaired-child lineage and metadata, validate the full final candidate, repeat coverage checks after repair/pruning, distinguish applicability and outcomes during conflict review, and fail closed on malformed or incomplete model decisions. Retrieval now dispatches the actual v2/v3 RPC and falls back only for a missing function, retaining the same deadline and cancellation signal. Anki and review consumers use current-version serving eligibility.

The entity/card worker has bounded enqueueing, current-version checks, owner-checked leases, resumable results, typed canonical/alias resolution, abstention, proposed entities, and two independent card-entailment passes. Generic entity labels and unsupported proposal types abstain. Production model calls reserve budget before calling the API, disable SDK retries, and retain reservations when usage is unknown. Durable mixed-model production runs are refused until stage-specific event cost attribution is complete.

## Validation and pilots

The reproducible `npm run education:ob:remediation:test` passed all 13 TypeScript suites and the publication/database integration suite on Node 26.3. Full application typecheck and targeted strict script typecheck passed. The same complete suite also passed on Node 22.23.3 in the isolated release checkout. Affected-file ESLint and strict script typecheck passed after replacing untyped model responses with runtime-validated typed results. The fixture checks review/publication gates, revocation, immutable evidence, same-transaction ordering, legacy card eligibility, direct retrieval, exclusive leases, bounded attempts, final-review rejection gates, known/unknown usage, and service-only grants. It is not a full production schema clone.

Small entity/card pilots recorded explicit proposed/unresolved and no-card-match outcomes. Four ledgered model calls used 822 prompt tokens and 168 completion tokens, with estimated cost $0.0005976 and no unknown-usage events. Earlier pilot calls predated the ledger and are not fabricated into it. The newest entity policy v1.2 passes its two-job zero-write preview; the live pilot subsequently completed after explicit user approval on October 9.

Eleven unresolved question sources were captured through the authenticated browser and their fresh fingerprints matched historical fingerprints. All 13 repaired-question sources were also captured and their fingerprints matched historical fingerprints. See the source-only [check manifest](orthobullets-repaired-source-checks-2026-10-08.json). Source capture is not final medical review. Captured source content is held transiently and is excluded from committed reports. The frozen audit manifest selects 25 random accepted questions and 53 targeted questions, with 59 distinct questions in their union. This evaluation is not yet complete or blinded.

## Operational incidents

An early two-job pilot incorrectly queued 1,306 jobs before applying the processing limit. The worker was stopped before model or edge processing for that queue; its pending jobs were terminally cancelled with history retained. The planner was corrected and regression-tested to bound enqueueing before writes. Three obsolete owned retry jobs were terminally retired as policy-superseded, preserving history. The owned generic “severe disease” proposal was rejected with its remediation reason retained.

Initial investigation used an answer-bearing review URL and clicked a choice for QID 211139. This may have affected practice activity; no before-state establishes the impact. Subsequent source capture uses read-only review navigation without answer submission. This report therefore does not claim the entire session left practice progress unchanged.

## Remaining completion gates

- Finish source-dependent evaluation of the frozen 59-question selection and all 15 repaired historical children; preserve absent historical receipts rather than inventing decisions.
- Replay the targeted questions from a committed, reproducible release with fresh source packets and explicit cost limits.
- Complete independent current clinical evidence review. Source fidelity and model agreement do not establish clinical validity.
- Verify entity policy v1.2, and complete the staged larger enrichment pilots before processing all eligible claims.
- Complete source-audit/clinical-evidence worker paths and intermediate conflict-review provenance.
- Complete the production build check, post-migration read-back and advisors, and application deployment/runtime feature flags.
- Publish only claims with all required version-specific evidence and confirm Brobot/graph/Anki behavior after rollout.

The original cohort is not yet ready to serve as a fully validated clinical knowledge source. The changes make the remaining work auditable and resumable, while preserving quarantine.

## Repaired-source findings

Manual source review exposed remaining quality defects in the historical accepted children. These observations are source/quality findings, not clinical-validity approvals, and no historical final receipts were fabricated:

| Question | Finding requiring review/replay |
|---|---|
| 3698 | Both repaired surgical claims omit failed conservative treatment; the source also restricts the discussion to articular-sided tears. |
| 3786 | The rewritten diagnostic threshold excludes equality at -2.5 although the source includes it. |
| 5851 | The repaired threshold loses the source population of postmenopausal women and central measurement context. |
| 6342 | A broad giant-cell-tumor location claim carries incidental right-sided laterality. |
| 7436 | A claim generalized from one image carries incidental left-sided laterality and needs image/context-specific review. |
| 220040 | Similar return-to-sport/running outcomes need study-bound interpretation; statistical non-significance does not establish equivalence. |
| 219294 | The 66% recurrence statement needs the source study population and comparator, not universal application. |
| 213987 | The AAOS recommendation wording is historical and requires a guideline-version qualifier and current independent evidence. |

Other repaired assertions still require full final-set review and independent clinical evidence. Images were counted but not interpreted in this pass. Thirteen repaired sources match; that alone does not resolve the 15 missing final receipts.

## Latest operational checks

The live post-migration read-back confirms the original production scope remains 2,039 current claims, zero serving-eligible versions, 689 historical approval receipts, and 15 accepted repaired children without final receipts. No publication receipts were added.

Post-migration security advisors reported no findings on the new remediation objects; existing project-wide findings remain. Performance advisors identified three missing foreign-key indexes on the new tables. The tenth migration adds these indexes and passed the isolated integration suite before application. A newly created invocation index also has an expected unused-index informational notice; it is retained for the planned workload. [Supabase index advisory reference](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

The isolated release branch is `codex/orthobullets-remediation-2026-10-08` at `/private/tmp/snaportho-ob-remediation-release`. Initial tested commit: `fe618628`; follow-up fixes are recorded separately. Nothing has been pushed or deployed as an application release. Production compilation passed, but the default 2GB type-check worker exhausted memory. With a 6GB heap, compilation, lint, and type checks passed; page-data collection then failed because the isolated checkout had no application URL environment. The environment-backed build left completed build artifacts before the chat interruption, but its original exit output was unavailable. A separate Node 22 `next build --experimental-build-mode=generate` finished successfully (exit 0), generating all 314 static pages and final build traces. Compilation, lint/type validation, and final generation are verified in separate stages; application deployment remains open.

Source packet memory was cleared when a later random-sample browser batch timed out and reset the session. Only the sanitized fingerprint/check artifacts and review findings were retained. Replay requires fresh transient source capture; no original packet content was committed.

## October 9 continuation

Six current versions now have append-only `quality=rewrite` attestations under `ob-repaired-source-quality.v1`, attributed to `codex_source_audit` and linked to the verified source fingerprints and exact original candidate provenance. They record missing conservative-treatment prerequisites (two versions), omitted threshold equality, missing source population, and incidental vignette laterality (two versions). They do not assert clinical validation or backfill historical final decisions. The guarded, idempotent [write manifest](../supabase/verification/ob_claim_repaired_quality_findings.sql) preserves the original claim content and decisions.

Live read-back after these findings still shows 489 accepted questions, 11 unresolved, 2,039 current production claims, zero serving-eligible versions, 689 historical approval receipts, and 15 missing historical final receipts. The parent-approved/current-snapshot-unreviewed count is now 685 because the compatibility projection reflects the new quality findings. Six quality findings are not six fully completed clinical reviews.

The edge to the rejected generic “severe disease” proposal was deactivated with history retained. Active-edge read-back now explicitly filters `is_active`.

Automatic approval review rejected interpreting “continue” as authorization for the two-claim OpenAI pilot. After the user explicitly replied “yes i approve,” the exact pilot ran successfully; its results are recorded below.

Final generation verification on October 9 completed successfully with the existing environment loaded in memory. No environment file or source packet was copied into the release checkout.

## Approved two-claim entity pilot — October 9

Entity policy `ob-claim-entity-enrichment.v1.2` completed both selected versions on their first attempt: `eb3db99d-0613-43a4-99a0-d5f0979d5203` and `9f3a83ff-023c-4526-b07f-0e8fa4d85e6d`. Jobs `177ba7bf-0bd8-4561-8813-ae04780ee025` and `5b60abff-ae19-4113-8d67-66a8f0087833` were read back as complete. The two model calls used 501 prompt tokens and 87 completion tokens, with estimated cost $0.0003396, well below the approved $1 cap, and zero unknown-usage invocations. Their conservative pre-call reservations totaled $0.0081236 and were settled using recorded usage.

The model decisions comprised four proposed participants and one unresolved participant; none qualified for canonical attachment. Existing active links were reused for the BTB graft subject, hamstring graft comparison, anterior-knee-pain context, and mild-CTS subject. One new proposed comparison edge names severe carpal tunnel syndrome, replacing the previously rejected generic “severe disease” label. Proposed participants remain subject to ontology review and do not constitute authoritative canonical graph coverage. Job result counts describe resolution decisions, not counts of newly inserted edges.

This confirms the bounded worker, first-attempt completion, recorded cost, and removal of the generic-label defect for these two cases. It does not establish precision across the full inventory, finish clinical validation, or authorize a larger transmission batch. The broader remediation plan remains in progress.
