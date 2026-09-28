# Orthobullets autonomous claim graph v4 remediation

## Decision

Do not expand the current v3 runner beyond a small diagnostic cohort. The Day 54 run did not fail because the claim model was weak; all four items were rejected before claim generation. V4 must make claim extraction, ontology resolution, and card linking independently resumable stages. A missing canonical entity must not prevent an otherwise valid claim from being generated or prevent that claim from being checked against Anki.

The target remains unattended, question-by-question processing through completed review pages in the user's signed-in browser. Raw question content remains transient and is never persisted. The system has no per-question human-review step. Uncertain outputs are quarantined from authoritative graph consumers and repaired automatically rather than put in a human inbox.

## Day 54 findings

Run `c3f61010-0a9c-48d1-bac7-d5868b044934` processed QIDs `213078`, `5513`, `8837`, and `5438` in about ten seconds. Every item ended as `ontology_entity_unresolved`; none reached the generator, critic, or card linker.

The immediate causes are:

1. `loadEntityCandidates` searches only exact normalized labels from page breadcrumbs/title and pre-existing question-to-entity links.
2. It accepts only active entities with `review_status = 'approved'` and `status in ('reviewed', 'canonical')`.
3. If that search is empty, the route records a terminal gap before calling `generateAndCritique`.
4. The current entity RPC intentionally returns `null` unless exactly one already-approved entity matches. It no longer creates a proposed entity.
5. Two of the four persisted `topic_raw` values are answer/treatment lists rather than topics. The broad breadcrumb fallback `.mainSection a[href*="/topic/"]` can collect content links outside the actual question breadcrumb container.
6. The deployed ontology contains 763 active curriculum nodes, but only 49 nodes have a canonical-entity bridge. Relevant aliases such as `Replantation` and `Fingertip Amputations & Finger Flaps` exist, but their nodes have no canonical bridge and v3 does not retrieve them.
7. Claims and card links that do succeed are currently stored as `needs_review`/`unreviewed`. That is inconsistent with an unattended pipeline and also makes downstream behavior depend on a review that will never happen.
8. `unresolved_automatic` is counted as completed and is not retried unless a new run/version explicitly reopens it. This turns an engineering defect into a permanent abstention.

## V4 processing state machine

Each run item has independently checkpointed stages:

```text
discovered -> extracted -> claim_validated -> entity_resolved -> cards_evaluated -> complete
                    |              |                 |
                    v              v                 v
              retry_extraction  provisional_entity  no_card
                    |              |                 |
                    +-------- automatic repair ------+
```

Store only safe identifiers, hashes, model/version metadata, derived claims, graph IDs, and outcome codes. Never store the source packet, HTML, question wording, answer choices, explanation, or images.

An item is complete only when it has one of these explicit outcomes:

- `accepted`: validated claim, resolved authoritative entity, card search completed.
- `accepted_provisional_entity`: validated claim attached to a quarantined proposed entity, card search completed.
- `unresolved_claim`: bounded generation/validation attempts failed.
- `unresolved_source`: the completed review page could not be safely extracted.
- `blocked_access`: authentication, subscription, rate-limit, or challenge stopped processing.

`no_card` is a card-stage result, not a claim failure. Entity reconciliation is allowed to continue after the run item is otherwise complete.

## Stage 1: fix and validate extraction

1. Scope breadcrumbs to the question breadcrumb container. Remove `.mainSection a[href*="/topic/"]` as a breadcrumb source; it may remain a separately named, low-trust `contentTopicLinks` signal.
2. Return structured topic hints with provenance: `{ text, href, selector, trust }`. Do not flatten all links into `breadcrumbs`.
3. Prefer stable topic IDs and breadcrumb hrefs over visible text. Add a durable mapping from `(source_id, external_topic_id)` to the existing curriculum node when known.
4. Add semantic guards for topic hints: reject bullet lists, strings over 120 characters, strings containing multiple treatment separators, and strings that overlap an answer choice or explanation span.
5. Add real-layout-derived synthetic fixtures for the two polluted Day 54 shapes. Tests must assert the exact breadcrumb values, not merely `breadcrumbs.length > 0`.
6. Before spending model tokens, validate same-question identity, completed-review state, visible correct answer, visible explanation, and stable content. Retry DOM stabilization separately from clinical processing.

Extraction errors become retryable and selector-version-bound. A newer extractor version automatically reopens prior extraction/ontology failures.

## Stage 2: generate the claim before requiring a canonical entity

The generator receives the transient reviewed-question packet and produces:

- one atomic primary assertion;
- a free-text subject mention and entity type, without a database UUID;
- predicate, object, polarity, and typed qualifiers;
- source-support spans represented only in memory;
- explicit flags for image dependence, outdated guidance, and ambiguity.

The independent critic then verifies source entailment, qualifiers, polarity, numbers, originality, and whether the proposed subject is actually the claim's subject. It must not be forced to choose from a bad or empty candidate list. Only a critic-accepted claim proceeds.

Use the fast model for the first draft and repair. Use the stronger critic once. Invoke a stronger repair model only for schema-valid but clinically disputed drafts. This preserves low cost without letting self-reported confidence determine acceptance.

## Stage 3: resolve entities with a retrieval cascade

Resolve the critic-approved subject after claim generation. Candidate retrieval must combine:

1. an existing active question-to-entity link;
2. exact preferred label and exact active source alias;
3. the question's existing curriculum mapping and `curriculum_node_entities` bridge;
4. Orthobullets topic-ID/alias to curriculum-node mapping, then the same bridge;
5. normalized phrase, abbreviation, and deterministic synonym matching;
6. Postgres trigram/full-text retrieval over approved entities and aliases;
7. optional embedding retrieval only when deterministic retrieval is empty or tied.

A candidate-only entity selector compares the complete claim and subject to the top candidates. Automatically attach an existing authoritative entity only if the top candidate clears an absolute score and a separation margin from runner-up. Store all component scores and versions; do not store source wording.

If no existing entity qualifies, create or reuse a deterministic provisional entity keyed by `(entity_type, normalized_label)` with:

- `status = 'proposed'`;
- `review_status = 'unreviewed'`;
- `metadata.creationMethod = 'machine_consensus_v4'`;
- claim-support count, distinct-question count, card-support count, and model/version provenance;
- no visibility to consumers that require authoritative entities.

The validated claim may reference this provisional entity. This preserves claim coverage without pretending the ontology decision is final.

## Stage 4: automatic ontology reconciliation

Run an inexpensive reconciliation job over provisional entities:

1. merge exact normalized duplicates transactionally;
2. retrieve authoritative entity/alias candidates;
3. test bidirectional semantic equivalence and type compatibility;
4. retarget claims and links when equivalence passes a strict threshold;
5. promote a genuinely new entity only after corroboration from independent questions and/or validated card facts;
6. keep ambiguous entities provisional and retry them when ontology, aliases, or model versions change.

Promotion is automatic, but conservative. Suggested initial gate: at least two distinct reviewed questions plus one validated card fact, or three distinct reviewed questions, with no contradiction/type conflict and agreement from two independent model passes. Tune this gate using pilot measurements rather than weakening it to force coverage.

## Stage 5: decouple Anki linking from ontology authority

Card retrieval starts immediately after claim validation, using the full normalized claim plus subject/object terms. It must not wait for authoritative entity resolution.

1. Search the latest published card release using claim terms, entity/alias terms when available, and optional semantic candidates.
2. Verify each claim-card pair against the actual target cloze/card fact, including polarity, numbers, population, timing, and treatment context.
3. Persist only `teaches` links that pass strict entailment. Record `supports`, `contradicts`, and `unrelated` as evaluation outcomes only if they are useful diagnostically.
4. Set accepted machine links to `auto_approved`; do not use `needs_review` in an unattended workflow.
5. Pin links to claim and card versions, and invalidate them automatically when either version changes.
6. Treat `no_lexical_hit`, `entailment_rejected`, and `verification_unavailable` as distinct outcomes. Only the last is retryable.

## Database and API changes

Implement V4 additively:

- Add stage/status fields or a child stage-attempt table so extraction, claim validation, entity resolution, reconciliation, and card evaluation have separate attempts and version keys.
- Add `next_attempt_at`, `lease_expires_at`, `retry_class`, and bounded per-stage attempt counts.
- Add safe model/token/cost counters per stage and run.
- Add a unique active provisional-entity key on `(entity_type, normalized_label)` to make retries idempotent.
- Add an Orthobullets topic-ID mapping table or reuse `source_aliases.external_id` consistently; backfill only safe IDs and labels.
- Add indexed normalized alias search and a retrieval RPC returning score components and provenance.
- Add an atomic commit RPC for claim, claim version, question link, chosen/provisional entity, and item checkpoint.
- Add an atomic retarget RPC for provisional-to-authoritative merges.
- Add explicit machine validation fields instead of overloading human `review_status`. Downstream graph queries should consume `validation_status = 'auto_validated'` and exclude provisional entities unless explicitly requested.
- Version all decisions under `orthobullets-autonomous-claim.v4`; never silently reinterpret v3 rows.

The endpoint should return a stage-specific outcome. It must not collapse extraction, claim, entity, and card errors into one terminal `unresolved_automatic` state.

## Runner changes for the whole qbank

1. Keep one deterministic browser tab and process one completed review page at a time. Do not use an LLM to navigate.
2. Build a durable inventory of question IDs and observed review locators page by page. Inventory contains no question content.
3. Checkpoint each question before advancing. Resume from the first nonterminal stage, not from the beginning.
4. Discover and reconcile every results page in scope. Record visible totals and unknown remainder; never infer full-bank completion from one page.
5. Pause on login expiry, access challenges, selector-health failures, or sustained server errors. Apply jittered, bounded backoff and a configurable request rate.
6. Enforce daily token/cost ceilings and a kill switch. Cache by source fingerprint and component version so unchanged pages do not repeat model work.
7. Automatically reopen eligible failures when their blocking component version changes. Do not retry stable safety abstentions on every run.

## Automated quality gates without per-question human review

Unattended does not mean unmeasured. Use synthetic/adversarial fixtures plus independent automated audits:

- extraction completeness at least 99% on completed review pages;
- polluted-topic rate below 0.5%;
- primary-claim production at least 95% for non-image-dependent questions;
- source-entailment critic acceptance calibrated on a fixed labeled evaluation set before full rollout;
- authoritative entity precision target at least 98%; uncertain cases use provisional entities instead;
- card `teaches` precision target at least 98%; low recall is preferable to false links;
- zero persisted raw stems, choices, explanations, HTML, or reconstructable source packets;
- duplicate claim/entity creation below 0.1% under repeated delivery;
- every inventoried question has a durable, stage-specific outcome and reproducible version metadata.

For ongoing audits, a second model can re-evaluate a deterministic rotating sample of sanitized claim/link outputs against transiently reopened source pages. Disagreement automatically invalidates or quarantines the affected edge; it does not create a human-review requirement.

## Rollout sequence

1. **Stop expansion:** preserve v3 results, but do not treat `ontology_entity_unresolved` as evidence that a question lacks a claim.
2. **Extractor repair:** fix breadcrumb scoping and add the Day 54 regression fixtures.
3. **V4 vertical slice:** implement staged processing, claim-first generation, provisional entities, and ontology-independent card linking.
4. **Replay Day 54:** rerun the same four QIDs under v4. Required result: all four reach claim validation; every item reaches card evaluation; entity outcomes may be authoritative or provisional but not blocked merely by missing ontology coverage.
5. **Twenty-five-question pilot:** require zero raw-source persistence, no stuck leases, idempotent replay, and acceptable cost/error rates.
6. **One-hundred-question pilot:** measure claim acceptance, provisional-entity rate, entity reconciliation, card precision, and actual cost. Tune thresholds, not outcomes.
7. **One specialty:** validate pagination, resumption, topic mapping, and ontology growth over several days.
8. **Whole qbank:** expand only after the runner can account for every page and all safety/cost gates hold. Report accepted claims, provisional entities, unresolved claims, card links, missing cards, inaccessible inventory, and cost as separate metrics.

## Immediate acceptance test for the reported failure

The Day 54 cohort is fixed only when:

- QIDs `213078`, `5513`, `8837`, and `5438` no longer terminate before generation;
- bullet-list content is absent from extracted breadcrumbs/topic labels;
- the generator and critic run exactly as recorded by stage telemetry;
- each accepted claim is committed even if its entity remains provisional;
- card linking runs for every accepted claim;
- replaying the cohort creates no duplicate claims, entities, or links;
- no raw Orthobullets content is present in database rows, logs, browser storage, or error payloads.

