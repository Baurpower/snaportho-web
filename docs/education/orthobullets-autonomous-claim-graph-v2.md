# Orthobullets autonomous claim graph v2

## Objective and scope

Process every accessible question in the user's intended Orthobullets bank, sequentially through their signed-in browser. Produce original, validated clinical claims, attach question provenance, and accurately link existing Anki cards. No per-question human review, answer selection, or approval is part of the processing workflow. This document is an engineering specification, not a deployed implementation or proof of live database coverage.

The browser runner advances through observed review links after each question is durably checkpointed. It does not wait for the user to study each question. Account login may still require the user. Current code explicitly restricts navigation to completed review pages and prohibits changing test progress. If the account cannot expose the complete bank in that mode, report the uncovered inventory; do not silently submit answers or manufacture URLs to reach it.

Completion has separate meanings: inventory accounted for, claims accepted, and cards linked. A visited question, rejected claim, or missing-card result never counts as an accepted claim. No automatic method guarantees correct claims for every question or a matching card for every claim. The system maximizes supported coverage and reports the unresolved remainder without requiring human adjudication.

## Reuse the existing application

- Keep the BroBot extension, device-token authentication, extractor, background relay, and Next.js backend. Do not introduce a parallel Edge Function/authentication stack.
- Keep `external_sources`, `external_questions`, and `question_canonical_entity_links` for source identity and mapping.
- Keep `educational_claims`, `educational_claim_versions`, `question_claim_links`, existing card-claim links and canonical card versions.
- Keep `educational_claim_gaps` for unresolved clinical, identity, and card coverage work. Distinguish these gaps from runtime jobs.
- Keep existing evidence-packet and ontology-proposal machinery where its actual source support is sufficient. A metadata packet is not automatically clinical evidence.
- Keep Anki launch addressing by note GUID and card ordinal; resolve against the installed deck release. Persist graph links independently of whether Anki is running.

Inspect deployed migrations, source inventory, deck releases, accepted claim coverage, and available job infrastructure before creating new tables. Local source files establish intended behavior, not live state.

## Coverage and sequential browser runner

1. Define the run's bank/subscription scope and snapshot date. Reconcile the site's visible totals and observed question identities with existing metadata.
2. Discover only question IDs, aliases, review locators, and topic IDs from visible account navigation. Keep IDs distinct from aliases; never assume two aliases denote different questions.
3. Record an inventory entry for each identified question. Track undiscovered counts when a site total is known but identities are not available.
4. Use one review tab and one extraction in flight. A deterministic controller loads the next observed locator, waits for stable identity and explanation visibility, processes it, checkpoints, then advances. No LLM click planning.
5. On authentication expiry or a site challenge, stop the runner and preserve progress. On extraction drift, stop affected layouts. Respect server throttling and bounded backoff.
6. Reconcile duplicate aliases, inaccessible questions, observed totals, and accepted results after each run. Never label the bank complete from a cursor reaching its end alone.

Runtime jobs need durable IDs/locators, stage, source hash, version set, retry count, next attempt, lease expiry, last error code, and token/cost accounting. Extend an existing job facility if appropriate; otherwise introduce a small run/item ledger. No source text belongs in a job payload.

## Processing one question

### A. Extract and establish identity

Use the existing extractor to read the stem, choices, revealed answer, explanation, and necessary visible image context transiently. Establish a stable native ID and aliases. Verify that extracted elements belong to the same question before model use. An image-dependent question requires actual transient visual interpretation unless the visible explanation independently resolves the relevant finding; never infer unseen imaging from topic labels.

Look up an accepted processing result for the same source fingerprint and relevant versions before generation. Hashes identify content changes; they are not retained clinical evidence.

### B. Resolve entities and draft claims together

Retrieve plausible canonical entities and existing claims. The existing endpoint's requirement for exactly one prior entity mapping must become a resolution stage, not a permanent entry barrier.

Generate a small claim bundle: normally one primary tested claim, plus a secondary claim only when independently useful and supported. Each claim has one assertion, subject, predicate, object, applicability conditions, polarity, and source role. Preserve numeric operators, units, time windows, population, injury/classification state, and treatment context. Extend the current qualifier contract where necessary; its seven string keys cannot express every clinically decisive distinction.

Allow multiple relevant entities per question, with a primary subject per claim. Prefer existing entities; send missing entities through automatic ontology validation and promotion. Never canonize a new entity solely because a model proposed it or because several cards repeat it.

Keep source fidelity separate from medical validity. A question can test an outdated recommendation. Store its association and conflict outcome, but do not promote that recommendation as current knowledge without support.

### C. Validate automatically

Validate three independent decisions: the question tests the claim, the claim is supported under its stated conditions, and each linked card teaches it.

Use structured schema checks, entity/type checks, contradiction checks, source-text support, and a separate critic with a falsification task. The critic should inspect evidence before seeing the generator's verdict. Model agreement and self-reported confidence are signals, not measured accuracy. Independent evidence must be sufficient for the assertion; a citation URL or abstract with no relevant support does not pass.

Reuse verified evidence for unchanged claim versions. Retrieve additional allowed authoritative evidence only when coverage is missing, changed, disputed, or stale. Record source version/date, locator, support decision, verifier version, and safe provenance. Retain source excerpts only where their license permits it.

Difficult cases enter automatic repair: repair extraction, retrieve better evidence, resolve ontology ambiguity, or escalate to a stronger model. Bound attempts and spending. Exhausted cases become `unresolved_automatic` with a reason and retry condition, not a human-review inbox. Reopen them when evidence, parser, ontology, or model versions materially change.

### D. Canonicalize and commit

Reuse exact fingerprints when applicability and semantics match. For near matches, verify both directions of entailment before merging; related or narrower statements remain separate. Preserve contradictions and temporal changes explicitly.

The current fingerprint normalization strips punctuation, which can collapse meaningful decimal, inequality, or negation syntax. Audit TypeScript and database fingerprint implementations together; introduce a versioned semantic serialization that preserves those distinctions. Do not silently rehash or merge existing claims.

Atomically commit the accepted claim/version, question link, validation outcome, and job checkpoint. Use database uniqueness plus transactional writes to handle duplicate deliveries and crashes. Do not stamp `machine_consensus` before validation succeeds. A content change creates a new version and invalidates affected links instead of inheriting approval.

## Link existing Anki cards

Use the existing card-claim factory and canonical card inventory. Pre-index existing cards once, then process only changed card versions. Treat the card's tested cloze or front/answer as the learning target; a fact mentioned in extra text is weaker than a fact the card requires the learner to recall.

For each accepted question claim:

1. Reuse current validated `teaches` links.
2. Retrieve candidates using entity constraints, lexical search, and available semantic search. Similarity selects candidates only.
3. Verify the exact assertion, applicability, numeric thresholds, polarity, and cloze ordinal. Assign teaches/supports/contradicts/unrelated outcomes explicitly; migrate contracts if more roles are retained.
4. Persist accepted links pinned to both claim and card versions. Automatically invalidate and reassess them when either changes.
5. Deduplicate siblings and select up to three cards for display; the graph may retain more valid links.
6. If no card teaches the claim, record a missing-card gap. Claim acceptance does not depend on card availability. Creating new cards is outside this workstream.

Question-to-card recommendations are derived from accepted question-to-claim and card-to-claim edges. No separate fuzzy question-to-card shortcut. The all-question enrichment path is independent of the existing missed-question learner flow.

Replace blanket category holds with stronger automatic validation where evidence supports it. Unsupported image, pediatric, contraindication, or algorithm cases remain unresolved. Do not simply remove holds or reduce thresholds.

## Privacy, resumption, and costs

Raw question text/images stay in transient browser/server/model requests. Exclude them from database rows, storage, durable queues, analytics, tracing, error bodies, and browser local storage. Add output checks for copied wording and reconstructable question detail before saving derived claims. Provider retention must match the promised handling; transient application memory does not establish zero provider retention.

Complete source-dependent generation and source-fidelity validation while the page is available. After a crash, reopen its saved review locator and re-extract. Derived claim validation and card matching can resume from sanitized artifacts without retaining the question.

Set per-item and per-run hard spending limits, output limits, bounded retries, and escalation budgets. Start with a small automated cohort to measure calls, billed tokens, time, acceptance, evidence reuse, and missing-card rates. Forecast total cost from observed inventory and actual usage; do not promise a dollar total from guessed bank size or model confidence. Sequential browser work can continue over days without increasing the cost of each model call.

## Verification and delivery

Stage 1: read-only deployed-state audit and inventory reconciliation. Confirm actual access to review pages and card/evidence coverage.

Stage 2: versioned claim/qualifier/fingerprint contracts, transactional persistence, processing ledger, source-content exclusion, and automatic decision states.

Stage 3: question factory with automatic metadata/entity resolution, evidence checks, contradiction handling, and bounded repair. Fix current endpoint gaps: generation before cache lookup, qualifier-blind deduplication, hardcoded confidence, nontransactional writes, and draft-only termination.

Stage 4: card entailment verification and link invalidation using existing card identities and releases. Current overlap v1 requires score 0.9; its nonexact scores of 0.85/0.7 currently abstain. Preserve this protection while introducing validated semantic matching.

Stage 5: unattended sequential extension runner and coverage dashboard. Keep navigation independent from expensive inference and checkpoint each source-dependent operation.

Stage 6: automatic staging evaluation, bounded pilot, then controlled deployment and full run. No manual per-item approvals. Existing independent labeled fixtures may measure accuracy; synthetic adversarial tests and model judges alone do not establish real-bank precision.

Required behavioral checks: two aliases/one question; numeric and negation fingerprint collisions; adult/pediatric conflicts; unstable page identity; source updates; image-dependent extraction; outdated answer; unsupported evidence; incorrect sibling cloze; no-card cases; duplicate requests; crashes between writes; expired job leases; missing installed deck; and absence of protected source text in persisted artifacts. Use synthetic fixtures and transient real-page checks rather than saving bank pages.

Report inventory size and unknown remainder, questions visited, accepted primary-claim coverage, unresolved questions by reason, unique accepted claims, supported secondary claims, card-link coverage, missing-card counts, stale versions, actual cost, and automatic-evaluation results. Never merge these into one completion percentage.

The run finishes when every inventoried item has a durable outcome and all eligible automatic retries are exhausted. Full knowledge coverage is a separate milestone: every in-scope question has an accepted primary claim. If that milestone is not achieved, report the exact shortfall without implying that unresolved items passed.
