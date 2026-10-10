# Orthobullets claims remediation and integration plan

Date: October 8, 2026. Status: implementation in progress. Ten additive migrations have been applied to the verified connected project; local pipeline, retrieval, and enrichment changes pass the remediation tests. Historical source/evidence recovery, larger pilots, and application rollout remain open. See [operations](orthobullets-remediation-operations.md) and the [implementation report](../../reports/orthobullets-remediation-implementation-2026-10-08.md).

The objective is to make the first 500 questions a trustworthy, resumable source of clinical knowledge that the knowledge graph, Brobot, and Anki can actually use. Fix the audited defects, preserve the accepted work, and make remaining uncertainty explicit. Completing the inventory, accepting an extraction, validating clinical knowledge, resolving entities, finding cards, and serving a claim are separate milestones.

This plan follows the [live audit](../../reports/orthobullets-claims-audit-2026-10-08.md). It includes additional findings from implementation inspection. The user has requested remediation; local implementation, tests, dry runs, and preparation of reviewable changes can proceed under that request. Confirm the real environment and applicable write/deployment authorization before applying migrations or batch changes to shared services; do not infer environment identity from an outdated comment or hostname pattern.

## 1. Baseline and what success means

### Verified starting point

| Measure | Baseline |
|---|---:|
| Original inventory | 500 distinct QIDs |
| Latest accepted extraction outcomes | 489 |
| Latest unresolved outcomes | 11 |
| Missing completed outcomes | 0 |
| Active question–claim links from the production algorithm | 2,130 |
| Distinct claims reached by those links | 2,039 |
| Primary entity populated on claim record | 55 |
| Claims with active Anki links | 31 |
| Questions with usable Anki links | 40 |
| Claims eligible for deployed Brobot retrieval before query ranking | 0 |
| Approved claim parents whose current versions remain unreviewed | 689 |
| Accepted repaired candidates without durable final review decisions | 15 across 13 questions |

The primary-entity count is not a complete graph coverage measure. Additional read-only discovery confirmed that `claim_entities` exists and has current-version edges for some cohort claims: 11 canonical context edges, 12 canonical `teaches_about` edges, three canonical `tested_answer` edges, 14 proposed `tested_answer` edges, and five unresolved `teaches_about` edges. Claims can overlap across these groups. Reconcile the union before reporting authoritative entity coverage; context edges do not substitute for subject resolution.

The original cohort is run `3bf06315-fc96-47b2-99a8-bb70e52a0a27`. The latest completed run is `41b80b41-e787-4388-94d5-d9785bb6d775`, with 370 questions: 310 from the cohort and 60 outside it. Keep these scopes separate.

### Completion criteria

1. Every in-scope question has a reproducible latest processing outcome, with primary-claim coverage distinguished from zero-claim outcomes and partial sets.
2. Every accepted output has durable, versioned review evidence, including each repaired child’s final review.
3. Approval and serving decisions use one version-aware policy across Brobot, graph consumers, and Anki integrations.
4. Genuine conflicts remain quarantined. Comparison errors caused by different populations, conditions, outcomes, or time windows are corrected without weakening validation.
5. Every eligible current claim version has an enrichment outcome for entities and cards, including explicit abstention/no-match results.
6. Validated claims can ground Brobot without requiring an Anki card. Available cards improve the learning path; missing cards do not make a supported claim disappear.
7. Question–claim–card provenance resolves to the correct current version, published release, note GUID, and card ordinal.
8. Blinded source-dependent evaluation and privacy checks support rollout. Unit tests and model agreement alone do not establish clinical accuracy.
9. Replaying or interrupting any stage does not duplicate work, corrupt approval, erase history, or lose progress.

No target requires forced 100% acceptance, entity matching, or card coverage. The target is accurate decisions and complete accounting, with useful supported coverage maximized conservatively.

## 2. Decisions to establish before changing the pipeline

### A. Keep immutable content separate from changing review state

Live discovery confirmed an update/delete guard on `educational_claim_versions`. Do not disable it to repair bulk approval.

Use append-only review/validation attestations pinned to an immutable `claim_version_id`. Keep the content snapshot historical. A version’s effective review/publication state comes from valid attestations and revocations, rather than an editable flag on the parent. The parent review field becomes a compatibility projection of this state.

A review-only change does not create a new content version or invalidate correct content links. Changes to assertion text or semantic applicability create a new version and require affected links to be reassessed. Entity associations use existing version-pinned `claim_entities` where possible; avoid changing content identity merely to add an association.

### B. Separate source fidelity, clinical validity, and educational relationships

Track independently:

- The reviewed question supports the sanitized assertion.
- The assertion has sufficient evidence for its intended clinical use, including whether the source is outdated or disputed.
- The question tests that assertion as primary or secondary knowledge.
- A canonical entity is the claim’s actual subject or another explicitly typed participant.
- A specific card’s recall target teaches the assertion under the same conditions.

An approved question link does not approve a claim, an approved card link does not certify current medical validity, and a matching topic does not establish the claim’s entity.

### C. Reuse the existing components

Keep the production question ledger, claim/version tables, `question_claim_links`, `claim_entities`, `card_claim_links`, card/deck release inventory, and existing ontology proposal mechanisms. Extend contracts additively or introduce an explicit new contract when semantics change. Do not build a second authentication stack or another complete ontology.

Keep extraction independent of entity and card enrichment. Implement those as subsequent resumable stages. Do not make the production extractor import the legacy extension route merely to obtain card matching.

### D. Retain uncertainty without a mandatory per-question human inbox

Bound automatic repair, evidence retrieval, and escalation. Retain unresolved outputs with reason codes and retry conditions. Reopen them when the relevant source, evaluator, ontology, or card release changes. Account login or final deployment authorization can require user involvement; ordinary claim processing should not.

### E. Preserve legacy behavior until the replacement is verified

Version the new extraction, comparison, enrichment, and serving policies. Historical decisions retain their original meaning. Do not reinterpret existing `machine_consensus`, `approved`, `generated_draft`, or `verified` rows silently.

## 3. Phase 0 — Reconcile releases, live schema, and environment

**Why first:** The latest run pins commit `fc9760f8af2b3446492ae8cb65f96e97582135c9`; this checkout was at `435310d9745accf15ebb8e2c12b1c67bffecede2` during the audit. Relevant files differ substantially. The run commit contains production persistence migrations and run hardening absent here, while this checkout contains a v3 retrieval migration not present at that commit. Tests against this checkout do not prove behavior at the historical run release.

**Work:**

1. Record branch/ref, dirty-file inventory, deployment release, worker release, extension build, applied migration history, relevant RPC signatures/definition hashes, constraints, triggers, and grants.
2. Compare the pinned commit and current checkout for extraction contracts, repair/review logic, claim comparison, persistence RPCs, run hardening, retrieval, and telemetry. Use ordinary Git inspection; preserve unrelated local changes.
3. Establish a coherent implementation baseline that incorporates already deployed fixes. Do not reset the workspace or replay all divergent migrations blindly.
4. Verify project `geznczcokbgybsseipjg` against actual deployment configuration. The project is named `snaportho`; older docs and `kg-staging-guard.ts` label it staging. The labels alone do not demonstrate isolation.
5. Identify an isolated database/test target and a controlled pilot target. Confirm extension/runtime compatibility with the baseline.
6. Inventory all writers to claim parents, versions, review metadata, question links, card links, and entity links. Locate the actual bulk-approval path; metadata naming a batch is not evidence of where the code lives.
7. Confirm migration/RPC source parity. Fetch the current Supabase changelog and relevant documentation before implementing schema/API changes, following the Supabase skill.
8. Verify provider configuration and supported models against the runtime actually used. Do not choose evaluator models based only on old environment defaults.

**Deliverables:** safe environment manifest, release/schema diff, writer inventory, reproducible baseline queries, and an implementation branch with unrelated work preserved.

**Exit gate:** We can explain which code and schema produced the audited outputs, which code will be modified, and where integration tests and pilots will run.

## 4. Phase 1 — Build durable review evidence and repair lineage

**Affected components:**

- `src/lib/brobot/orthobullets/claim-extraction-contract-v1.ts`
- `src/lib/brobot/orthobullets/claim-review-pipeline.ts`
- `src/lib/brobot/orthobullets/ob-production-runner-lib.ts`
- Live `ob_claim_persist_extraction` and candidate/decision schema
- Their unit tests and new database integration tests

**Current defects:** Initial factual/quality judgments are persisted, but final repaired judgments are checked transiently and discarded. `origin_candidate_index` is always null in the payload. Split children inherit an origin-level worst verdict, losing their individual judgments. Repair produces text only and retains the parent’s qualifiers/support/type, which can leave a split child with inappropriate applicability metadata.

**Work:**

1. Represent each draft and repaired child explicitly: stable candidate ID, origin ID/index, child index, repair action, repair pass, and final content hash.
2. Preserve initial and final factual/quality judgments with reasons, actual model identity, prompt/policy version, pass number, timestamp, and evaluated candidate hash.
3. Persist final validator evidence and final set-level coverage as distinct decisions. Do not confuse a set-level validator verdict stamped onto children with independent per-child validation calls.
4. Make split children carry independently checked qualifiers, importance, claim type, support section identifiers, and proposition scope. Apply child-specific review outcomes; retain the parent-level set decision separately.
5. Run final coverage after repair, dropped candidates, and priority changes. A pre-repair `complete` verdict cannot be assumed to describe the final set.
6. Review the `overextracted` path: current local code can accept a reduced set while retaining an `overextracted` coverage result, whereas the persist RPC requires `complete`. Resolve through final coverage evaluation, not by relabeling the old verdict.
7. Treat an accepted zero-claim extraction as a distinct accounted outcome. It must not increment accepted-primary-claim coverage. Keep zero-claim behavior explicit rather than forcing a claim.
8. Strengthen RPC validation: require the exact terminal decisions for the final candidate hashes; reject absent/null categorical gates explicitly. SQL null behavior must not allow a missing field to bypass a guard.
9. Enforce allowed stage transitions, uniqueness per decision/pass, and idempotent attempt persistence. Keep legacy readers working with an explicit legacy evidence classification.

**Historical repair:** Mark the 15 cases as incomplete final-review telemetry. Preserve their existing decisions. Recover final judgments only from trustworthy retained artifacts tied to the exact attempt/hash; otherwise rerun review with freshly accessed transient source material. Do not invent a historical final `good` verdict from validator acceptance.

**Acceptance:** Every newly accepted candidate has durable final factual `supported`, quality `good`, validator `accept`, and final complete-set coverage. Every repaired child has reconstructable lineage and its own evaluated metadata. Historical missing evidence remains clearly identified until repaired.

## 5. Phase 2 — Fix claim comparison and bounded conflict handling

**Affected components:** `ob-claim-resolution.ts`, its tests, candidate retrieval in `scripts/run-ob-claims-production.ts`, production contracts, and run/persist outcomes.

### A. Improve retrieval without confusing similarity with equivalence

Keep verified exact-identity reuse. For nonexact matches, retain lexical relevance scores, exact/semantic channel provenance, and applicability compatibility. The current local resolver pools semantic matches and text neighbors, then sorts by age before truncating, potentially discarding more relevant candidates. Rank channel strength and applicability before stable age/ID tie-breakers.

Scope comparison by condition, anatomy, population, intervention, comparator, outcome, polarity, timing, severity, and numeric thresholds/units. Explicitly distinguish unknown scope from matching scope. Store a versioned proposition/comparison descriptor alongside the final candidate instead of silently adding keys to the frozen seven-key qualifier contract. Audit TypeScript and database identity serialization before changing fingerprints.

### B. Separate equivalence from contradiction

1. Equivalence requires mutual entailment with compatible applicability.
2. Related but distinct propositions remain separate.
3. A contradiction requires overlapping applicability and incompatible statements about the same proposition/outcome.
4. Different outcomes are not contradictions simply because one improves and another does not.
5. Unknown or ambiguous applicability triggers bounded further evaluation or abstention; it does not authorize merging or confidently declaring a contradiction.
6. Reject malformed verdict sets, duplicate candidate IDs, missing verdicts, and unexpected IDs according to the contract. Do not let an incomplete model reply become a create decision by omission.
7. Address the case where one retrieved claim is equivalent but another conflicts. Current local resolution prioritizes any equivalent result over contradictory results. Run the contradiction policy independently; do not let reuse suppress a real live conflict.

### C. Add bounded automatic escalation

A suspected conflict receives a separate scoped evaluation without earlier model reasons. If still unresolved, retrieve permitted clinical evidence when appropriate and escalate within item/run cost limits. Record whether the barrier is a scope mismatch, evidence disagreement, insufficient source, stale guidance, model failure, or confirmed conflict.

Initially retain whole-set abstention when a required primary claim conflicts. Candidate-level quarantine can be introduced only with a new outcome contract: a set missing primary knowledge remains unresolved/partial, while independent supported secondary claims may be retained without falsely reporting full question acceptance. Never change the frozen v1 meaning invisibly.

**Regression examples:** QIDs `211447`, `215157`, and `6087` supply sanitized examples of distinct outcome/time-window/condition scope. Add genuine same-scope contradiction examples as controls. The remaining disagreement cases must be evaluated rather than assumed to be false positives.

**Acceptance:** Distinct-scope adversarial cases never merge or block as contradictions; genuine same-scope conflicts never become approved creates/reuses; ranking retains the strongest applicable neighbors; every conflict has reproducible evidence and a bounded terminal outcome.

## 6. Phase 3 — Introduce version-aware validation and publication

### Proposed state model

| State dimension | Example outcomes | Meaning |
|---|---|---|
| Source fidelity | supported / unsupported / ambiguous / unknown | Whether the transient reviewed source supports this version |
| Clinical validation | validated / disputed / outdated / insufficient / unknown | Whether evidence supports the intended clinical use |
| Quality | good / rewrite / split / remove / unknown | Educational form and atomicity |
| Publication | eligible / quarantined / revoked / superseded | Effective serving decision under a named policy |
| Entity enrichment | canonical / proposed / unresolved / not applicable | Typed graph connection outcome |
| Card enrichment | teaches / no match / rejected / unavailable / stale | Card-stage outcome, independent of claim publication |

Use append-only attestations and publication decisions, keyed to version ID/content hash/policy version, with immutable provenance and explicit supersession/revocation. Prefer existing evidence/proposal facilities when they meet this contract; introduce only the missing records. New table names and RPC names are implementation choices, not claims that these already exist.

### Transactional serving boundary

1. A shared database eligibility function/view resolves effective current-version validation and publication state.
2. A single controlled RPC appends the decision and updates the parent compatibility projection atomically, validating expected current version to prevent approving a concurrent replacement.
3. Legacy snapshot flags remain historical. A consumer must not combine an approved parent with an unreviewed version ad hoc.
4. Bulk operations operate on explicit version IDs and have an idempotency key, preview, affected-row manifest, and read-back.
5. Rejection/revocation is immediately effective, with cache invalidation and a durable explanation. Reinstatement requires new evidence/decision, not deletion of the revocation.
6. Content replacement invalidates old serving decisions and stale edges. Review-only attestations do not retarget content pointers.
7. Backend writers use the controlled API. Restrict direct serving-state mutations by grants/RLS where feasible. Any privileged RPC must have explicit grants, restricted callers, a fixed safe search path, and authorization suited to its calling context.

### Repair the 689 approvals conservatively

Import the recorded bulk action as historical provenance, not proof of independent clinical verification. Classify each current version into evidence-sufficient, evidence-incomplete, or disputed. Obtain missing review/clinical evidence as required; append a policy-valid attestation only when gates pass. Update parent compatibility state from the effective version state. Retain original history and report imported-versus-newly-validated counts.

Do not set all versions to `verified`, treat a user batch approval as a sampled clinical audit, or change `approval_method` to a stronger method than the work performed.

**Acceptance:** All serving consumers agree on a version’s effective state; the 689 mismatches are either reconciled through adequate evidence or explicitly quarantined. Immutable snapshots and historical provenance remain intact. An old approval never approves a newer version.

## 7. Phase 4 — Add resumable entity enrichment

**Reuse:** `claim_entities`, canonical entities/aliases, question/curriculum bridges, `entity-resolver-v2.ts`, candidate matching, trusted-entity policy, and ontology proposal/promotion machinery.

1. Build an enrichment inventory over distinct current claim versions. Prioritize primary claims, already card-linked claims, the repaired cohort, and high-use Brobot topics; ultimately account for every eligible version.
2. Extract typed subject and participant mentions from the sanitized assertion and qualifiers. Use question topic/curriculum hints as candidate retrieval signals, never final subject authority.
3. Retrieve candidates from exact canonical labels, approved aliases, trusted existing question mappings, curriculum/topic bridges, deterministic synonyms/abbreviations, and indexed lexical retrieval. Add semantic retrieval only where the deployed infrastructure supports it and evaluation justifies it.
4. Reuse the resolver’s negative-label checks, but add ambiguity/type checks: its current exact/alias path can return the first match. Multiple plausible canonical targets require disambiguation.
5. Evaluate each candidate against the whole assertion and role. Store accepted version-pinned `teaches_about`, `tested_answer`, `context`, `comparison`, or `contraindication` edges. Do not use a context entity as a primary subject by default.
6. Keep uncertain/new entities in existing proposal records, keyed deterministically to prevent duplicate proposals. Corroborate and reconcile before promotion. No independent canonical entity should be invented from a page title.
7. Expose role-aware edges to graph readers. Treat legacy `primary_entity_id` as a compatibility field; populate it only for an unambiguous primary association under an explicit policy.
8. Reevaluate associations after claim changes, alias changes, entity replacement/merge, or resolver policy changes. Retarget via transactional, version-aware operations.

**Stage ledger:** version ID, entity resolver policy, input hash, stage outcome, lease/attempt count, next retry, diagnostics, evidence references, token/cost totals. Reuse a suitable existing queue or extend it minimally after Phase 0 inventory.

**Acceptance:** Every eligible version is accounted for, with an authoritative subject connection or a specific abstention/proposal outcome. Replay yields no duplicate edges/proposals. Deprecated/proposed entities do not enter authoritative serving paths. Measured precision takes precedence over attachment rate.

## 8. Phase 5 — Add resumable claim-to-Anki matching

**Reuse:** canonical cards/versions, published release membership, `card_claim_links`, card-claim extraction/verification utilities, `chat/anki-linker.ts`, and existing Anki launch addressing. The card-first factory is useful machinery but should not be rerun as if it directly solves the new claim-first backlog.

1. Pin the target published release and immutable card versions for each matching run. Build/cache a bounded candidate index once per release; avoid rereading every card for every claim.
2. Retrieve candidates from full claim text, subject/participant terms, aliases, lexical search, and evaluated semantic candidates if available. Entity uncertainty must not prevent lexical card matching.
3. Evaluate the actual recall target: the specific cloze ordinal, front/answer, polarity, comparator, condition, population, timing, threshold, and units. Facts appearing only in extra text do not automatically justify `teaches`.
4. Record evaluations separately from approved edges. Outcomes include teaches, weaker support, contradiction, unrelated, no lexical candidate, no entailing candidate, verifier unavailable, stale release, and inaccessible card version.
5. Persist only policy-valid `teaches` edges, pinned to both immutable versions, with exact evidence hash/provenance and verifier version. Confidence alone is not approval.
6. Existing 32 approved links receive a read-only compatibility check and reassessment only where evidence is missing/stale. Preserve valid work; do not blanket-retire it.
7. Deduplicate sibling cards and identical learning targets for display. Keep legitimate graph edges beyond the display limit; Brobot may show up to three useful cards.
8. Link invalidation occurs after claim/card version replacement or target release exclusion. Retry unavailable verification; do not repeatedly retry a stable no-match until the release or matcher changes.
9. Derive question recommendations through supported question–claim and claim–card edges. Do not introduce a fuzzy question-to-card bypass.
10. Verify published release membership, actual installed note GUID, card ordinal, missing-deck behavior, and platform-compatible launch. Database eligibility is not proof that a local Anki launch succeeded.

**Acceptance:** Every eligible current claim version has a card-stage outcome. All published teaches links have validated exact recall targets and current version/release pointers. Wrong sibling clozes and context-only mentions never produce teaches links. Missing cards do not block validated clinical knowledge.

Creating new cards is a later deck-authoring workflow; this remediation identifies missing learning targets and builds the infrastructure to use existing cards correctly.

## 9. Phase 6 — Repair Brobot retrieval, dispatch, and grounding

### Additional implementation finding

`config.ts` exposes `BROBOT_KNOWLEDGE_RETRIEVAL_VERSION=v3`, but the inspected local `provider.ts` still calls `retrieve_brobot_knowledge_v2` directly; its version choice changes the policy label. Live discovery found v2 deployed and no `retrieve_brobot_knowledge_v3`. Fixing a flag alone will not deploy or call the newer retrieval path.

### Work

1. Define a typed RPC dispatch map with explicit signature/response adapters. The configured version must select the corresponding deployed function, and telemetry must record the function actually called.
2. Handle a missing optional RPC with a bounded, explicit fallback and truthful trace. Do not fall back on arbitrary malformed results, authorization failures, or other errors that should surface for diagnosis.
3. Use the repository’s v3 implementation as a candidate starting point after release reconciliation. Review its broad approved-card-link eligibility path against the shared validation policy; an approved card link alone must not bypass a quarantined claim.
4. Add direct retrieval of publication-eligible clinical claims through indexed text and typed entity associations. Card linkage is optional for grounding. Preserve current-version checks and clinical applicability constraints before ranking.
5. Use the shared eligibility boundary for legacy approved knowledge and newly validated Orthobullets claims. Source-specific evidence is required when relevant, but serving must not depend solely on algorithm-string special cases.
6. Rank on proposition/query relevance, applicability, evidence quality, clinical use mode, and importance. Keep the trust category visible in the internal packet and distinguish teaching-source provenance from external clinical evidence.
7. Require publication-valid question links when using question provenance. An extraction ledger `accepted` outcome does not automatically authorize serving.
8. Apply packet budgets and prevent conflicting assertions from entering the same answer without conflict handling. Retain established timeout/bypass behavior so unavailable retrieval does not break chat.
9. Invalidate caches by retrieval policy, effective review/publication generation, claim version, graph/deck release, and revoke state. Verify revocations do not wait for the current 30-minute cache TTL.
10. Verify all three controls independently: retrieval (`BROBOT_KNOWLEDGE_V2_MODE`/legacy KG mode), claim grounding (`BROBOT_CLAIMS_GROUNDING_MODE` and allowlist), and card linking (`BROBOT_CLAIM_ANKI_MODE`). SQL availability, shadow execution, prompt inclusion, and rendered cards are separate checks.
11. Roll out in shadow first, with exact claims/versions selected, eligibility reasons, actual RPC/version, fallback reason, latency, and whether the answer prompt was influenced. Log only sanitized identifiers/metrics.
12. Add query-relevance evaluation and answer-level tests: a supported claim must answer the question under the right population/timing; it must not appear merely because its topic matches.

**Acceptance:** Publication-eligible no-card claims are retrievable and can ground enabled Brobot modes; quarantined/revoked/stale claims are excluded. Version dispatch and traces agree. Representative end-to-end questions retrieve expected claims and display exact validated cards when available. Latency stays within the configured deadline, with measured timeout rates reported.

## 10. Phase 7 — Fix inventory reconciliation, stale edges, and run lifecycle

### Cohort truth

Build a durable safe cohort snapshot of QIDs and source locators/hashes, then derive latest relevant outcomes by source revision and policy version. Tie-break timestamps deterministically. A later older-source attempt must not automatically become the current clinical source; use source/policy lineage rather than wall-clock order alone.

Report inventory accounted, accepted primary coverage, complete sets, partial sets, zero-claim outcomes, unresolved by stage/reason, entity coverage by role/authority, usable card coverage, and serving eligibility separately.

### Historical edge policy

For `212341` and `3151`, inspect the old accepted attempt, latest abstention, source hash, edge evidence, and shared claim usage. Same source hash is useful but not sufficient to decide which judgment is correct.

- A model/runtime failure can leave the last validated result available, explicitly marked as a prior successful result rather than latest acceptance.
- A substantive source-fidelity/clinical rejection invalidates the affected question relationship and may quarantine the claim version where the evidence warrants it.
- A coverage-only failure may preserve independently supported edges, but the question remains incomplete.

Record the decision transactionally and restrict edge changes to the affected source/algorithm/provenance. Do not globally deactivate a shared claim used by other supported questions.

### Run lifecycle

Reconcile against the pinned release’s existing run-hardening work. Make terminal finalization derived from item states and active leases; run exit alone does not establish completion. A queue-empty response while another worker holds leases is not terminal completion. Budget/cancellation/source-access stops preserve resumable work with explicit reasons. Refresh counters/finalize idempotently on normal exit, bounded error, and recovery; never force a paused parent run complete solely because another run processed its QIDs.

Legacy headers may remain historical, with a clearly separate cohort report. Correct truly inconsistent terminal headers through supported lifecycle operations, preserving manual cancellation/stop intent.

**Acceptance:** The dashboard reports the original 500 without double counting; no active edge is misrepresented as latest acceptance. Finished runs have accurate headers; interrupted runs remain resumable; concurrent workers do not finalize each other prematurely.

## 11. Phase 8 — Make cost, retries, and operational diagnostics trustworthy

The latest run reports $2.1301 versus $2.0654 in extraction events, a $0.0647496 difference. Determine its source before calling it a bug. Resolution, failed attempts, reused events, and stage retries can legitimately produce different totals.

1. Record usage once per unique invocation/attempt/stage, including errors when usage is known. Do not sum repeated usage embedded once per examined resolution candidate.
2. Use one pinned provider/pricing profile per execution manifest, with per-model rates if stages differ. Separate observed token usage, estimated cost, unavailable usage, and billing reconciliation.
3. Distinguish spend incurred in this run from logical attribution of adopted prior events. Adoption must not bill or count the old model work again as new spend.
4. Track budgets across resume sessions and concurrent workers, not only in-process counters. Add a transactionally reserved budget or equivalent bound before spending.
5. Establish output/request limits and escalation reserves. Report unavoidable in-flight overrun bounds; do not claim an exact hard ceiling if a provider can exceed an unreserved estimate.
6. Retry stages by error class. Stale source access, model refusal, malformed schema, confirmed conflict, no-card, ontology ambiguity, and network timeouts have different retry conditions.
7. Persist stop reason, retry policy version, next attempt, component version, and bounded attempt counts. Sanitize error details before durable logging.

**Acceptance:** Unique-invocation costs reconcile with run totals and attribution rules; no per-neighbor multiplication or resume double counting; pilots respect configured budgets with documented bounds; every retry is justified by a recoverable condition or version change.

## 12. Phase 9 — Privacy and blinded source-dependent evaluation

### Source handling

The inspected legacy fetcher decrypts the Chrome session and writes packets to disk. Do not broaden this pattern. Inspect the user's in-progress fetcher edits and the actual deployed workflow before changing it. Prefer supported authenticated browser extraction from completed review pages with source packets held transiently in memory. Never submit answers or alter study/test progress.

Where a bounded existing replay must use a transient local packet file, restrict access/lifetime, prevent logging/committing/uploading it, clean it on success/failure, and verify deletion. Do not retain copied cookie databases or authentication material. Application-memory handling does not establish provider zero retention; verify the actual provider handling promised by the workflow.

Add checks at persistence boundaries and logging/error paths for stems, choices, explanations, HTML, URLs with credentials, source image data, source-shaped field names, and reconstructable vignette output. Allow useful original clinical assertions; do not treat a key blacklist as comprehensive source-leak protection.

### Evaluation design

1. Freeze a safe evaluation manifest containing QIDs, selected claim/version IDs, source hashes, selection strata, model configuration, and evaluation policy; no original question content.
2. Audit all 11 unresolved questions and all 15 repaired candidates/13 repaired questions. Select a deterministic random sample of accepted questions, plus risk strata for numeric thresholds, negation, treatment comparisons, image dependence, pediatrics, and each generating configuration.
3. Report random-sample results separately from deliberately oversampled risk strata; do not use their pooled pass rate as a population estimate.
4. Reopen the completed sources transiently. A blinded evaluator sees source plus final claims, not generator/reviewer/validator reasons. Evaluate exact source support, medical evidence where needed, qualifiers, atomicity, primary/secondary priority, complete-set coverage, and copied/vignette content.
5. A separately configured evaluator/model and independent evidence reduce correlated errors; they do not alone establish ground-truth accuracy. Use an adjudicated stable evaluation set and calibration where available. Keep inaccessible source cases unresolved, not passed.
6. Evaluate entity links and claim-card pairs independently, including wrong cloze siblings and context-only matches.
7. Report PASS/FAIL/UNRESOLVED with defect categories, denominators, source-access rate, and confidence intervals when appropriate. An extraction acceptance rate is not a precision estimate.
8. Revoke/quarantine confirmed defective relationships through the controlled API. Repair and reevaluate bounded cases; never silently edit the audit result to pass.

**Initial quality targets:** source extraction completeness at least 99% on accessible completed pages; entity and teaches-link precision target at least 98% on the evaluated benchmark; zero critical polarity/threshold/unsupported-treatment defects in release blockers; zero observed protected source persistence in the tested paths. Declare targets unmet or unmeasured when sample size/ground truth is insufficient. For orientation, zero errors in 150 independent observations gives only an approximate 2% upper error bound; stratification and model-judge limitations must still be stated.

**Acceptance:** A source-dependent report exists with reproducible sampling, explicit limitations, and defect remediation. Privacy failure or a critical confirmed clinical defect blocks publication of affected outputs. No mandatory per-question human approval is introduced into the unattended processing loop.

## 13. Test matrix

Existing passing suites remain regression checks; add behavior and database tests that specifically exercise the failures. Do not rely solely on SQL text regex assertions.

| Area | Required cases |
|---|---|
| Repair lineage | Rewrite; split siblings with different qualifiers/importance; child-specific rejection; missing final review; duplicate pass; stable replay IDs |
| Final coverage | Drop a primary; repaired set changes scope; overextracted set becomes complete; conflicting set remains unresolved; zero-claim accounting |
| Persistence | Missing/null final gates; incorrect candidate hash; wrong run/item; lost lease; duplicate attempt; rollback between writes; foreign version reference |
| Comparison | Retear vs functional scores; acute vs chronic; disease vs complication risks; adult vs pediatric; timing/severity/laterality differences; real same-scope contradiction |
| Numeric identity | Decimal, inequality direction, boundary operator, units, negation; TypeScript/database parity; legacy hash preservation |
| Comparison reply | Missing/duplicate/unexpected IDs; equivalent plus contradictory neighbors; irrelevant oldest neighbor; malformed/timeout reply |
| Review/publication | Parent-only approval; stale approval after content change; review-only attestation; revocation/reinstatement; idempotent bulk action; concurrent replacement |
| Entities | Exact trusted alias; ambiguous alias; rejected label; proposed/deprecated entity; subject vs context; duplicate proposal; entity merge invalidation |
| Anki | Wrong cloze sibling; extra-only fact; opposite polarity; threshold/population mismatch; excluded release; stale card/claim; missing installed deck |
| Retrieval | Eligible no-card claim; quarantine exclusion; actual v2/v3 dispatch; missing-RPC fallback; timeout; query relevance; mode flags; revocation cache invalidation |
| Provenance | Shared claim across questions; latest abstention plus old edge; source change; repeated older source; partial set not reported complete |
| Lifecycle | Interrupt/resume; worker with active lease; queue-empty during another lease; budget stop; cancelled run; terminal refresh replay |
| Usage | Resolution with several examined neighbors; failed call; adoption; resume; concurrent budgets; mixed models; unknown usage |
| Privacy | Source text in errors/metadata/traces; copied vignette; temporary packet cleanup on failure; no stored cookies/source images |

Run isolated database tests against actual RPC behavior, including RLS/grants/immutable guards and transaction boundaries. Run TypeScript checks and affected lint/build checks after implementation; separate pre-existing unrelated failures from regressions. Rebuild/test the extension only when extraction/relay changes affect its contract. End-to-end live checks use bounded completed-review cohorts and exact Anki targets.

## 14. Implementation packages and dependencies

| Package | Scope | Depends on | Reviewable result |
|---|---|---|---|
| 0 | Release/schema/environment reconciliation | Existing audit | Baseline manifest and safe test target |
| 1 | Final decisions, child lineage, final coverage | 0 | Contract + pipeline + persist integration tests |
| 2 | Scoped comparison and conflict repair | 0, 1 | Resolution fixes + adversarial benchmark |
| 3 | Version-aware attestations/publication | 0, 1 | Shared effective-state boundary and controlled writer |
| 4 | Lifecycle/provenance/cost accounting | 0, 1 | Reconciliation report and resumable runner tests |
| 5 | Entity enrichment | 1, 3 | Versioned entity outcomes and graph adapters |
| 6 | Claim-to-card enrichment | 1, 3; benefits from 5 | Verified card outcomes and exact launch checks |
| 7 | Retrieval dispatch and direct validated claims | 3; integrates 5/6 | Shadow retrieval and answer/Anki integration |
| 8 | Source-dependent audit and historical replay | 1, 2, 3, 4 | Quality report, repaired queue, evidence manifest |
| 9 | First-500 backfill and controlled rollout | 5, 6, 7, 8 | Before/after audit and deployed bounded proof |

Implement in dependency order, using small commits/packages so changes can be reviewed and rolled back independently. Shared database policy comes before broad data repair. Planning does not require parallel agents, and no subagents have been used for this plan.

## 15. Pilot, backfill, and rollout sequence

1. **Local/isolated proof:** synthetic/adversarial tests, real database RPC tests, dry-run migration/backfill preview, and clean idempotent replay. Confirm the baseline's deployed hardening is retained.
2. **Targeted repair pilot:** the 11 unresolved QIDs plus the 13 questions containing repaired candidates, deduplicated. Fresh source access; bounded model/review spending; no blanket approvals. Keep unresolved cases unresolved if evidence does not settle them.
3. **Integration pilot:** 25 representative questions, spanning no-card claims, shared claims, entity ambiguity, numerical facts, and repaired output. Verify entities, exact card targets, effective publication, actual RPC dispatch, and shadow Brobot packets.
4. **100-question verification:** stratified evaluation, crash/resume, cost reconciliation, queue accounting, cache revocation, latency, and publication exclusion controls. Quote executed checks and target environment in the report.
5. **Original-500 backfill:** process distinct eligible claim versions, not 500 re-extractions by default. Repair missing historical evidence only where needed; preserve valid existing links. Track the 60 extra latest-batch questions separately until deliberately added to scope.
6. **Shadow retrieval review:** run representative query sets by clinical mode; inspect claim relevance and answer implications. Measure useful retrieval and false inclusion independently.
7. **Controlled enablement:** enable grounded answers and exact Anki references only after the relevant gates pass. Confirm actual runtime configuration; a migration or source edit alone is not enablement.
8. **Post-rollout read-back:** reconcile the same cohort metrics, independently verify a selected live sample, and compare before/after outcomes. Further qbank expansion follows this proof rather than growing the disconnected inventory first.

Capture per-stage cost/time/acceptance measurements during pilots before estimating full-bank effort. The $2.13 latest extraction estimate does not include the forthcoming clinical audit, entity/card enrichment, or operational work.

## 16. Rollback and incident handling

- Disable the new serving/grounding policy or return it to shadow through the existing controls; retain chat timeout/bypass behavior.
- Revoke the affected publication decisions and invalidate caches immediately. Leave immutable claim/version/attempt history intact.
- Stop enrichment workers while preserving leases/checkpoints; resume only after the blocking component is repaired.
- Retire edges by scoped supersession/revocation rather than deleting claims or globally removing shared evidence.
- Use an explicit apply manifest containing affected version/edge IDs and policy versions. A retry applies the same manifest idempotently.
- Additive schema remains in place during rollback; revert consumer selection before considering schema removal. Do not drop shared tables or disable immutability to undo data work.
- Roll back on protected-source persistence, critical clinical defects, incorrect cloze links, eligibility bypass, duplicate writes, unrecoverable lifecycle errors, or retrieval regression outside the agreed pilot bounds.

## 17. Final delivery and proof of completion

Deliver the implementation changes, new migrations, verification SQL, tests, operator runbook, and a before/after cohort report. The report must show:

- 500-question accounting, accepted primary coverage, complete/partial/zero-claim outcomes, and unresolved QIDs by actual stage/reason.
- Accepted claims with complete durable final-review evidence; historical evidence gaps still outstanding.
- Effective version-aware publication states, revoked/disputed/outdated claims, and parent projection consistency.
- Authoritative subject/participant coverage through `claim_entities`, separate from proposed/context-only connections.
- Exact teaches-link coverage, missing-card outcomes, current release/card pointers, and verified launches.
- Brobot pre-ranking eligibility, query retrieval, prompt grounding, rendered references, actual RPC/version, and latency.
- Source-dependent quality results, sample selection, limitations, privacy verification, and defect repairs.
- Actual observed usage, estimated cost, scope of each backfill, and resume/idempotency evidence.

The remediation is complete when these requirements pass or every genuinely unresolved knowledge gap is explicitly accounted for under the bounded repair policy. It is not complete merely because the 500 items are terminal or the retrieval query returns a nonzero count.
