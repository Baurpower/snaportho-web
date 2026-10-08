# Muse Instructions: Make BroBot Claims Retrieval Excellent

You are improving the production BroBot knowledge-retrieval and Anki-card pipeline. Complete the implementation, verify it against production-shaped data, and leave a durable report. Do not stop at a plan or a plausible SQL query.

## Mission

Make BroBot retrieve a small set of claims that directly answer the user's actual clinical question, use those claims in the response, and display the exact Anki cards that teach the used claims.

The feature is successful only when it measurably improves real BroBot chats. High candidate counts, broad topical relatedness, or a functioning RPC are not success criteria.

## Current production state

- `retrieve_brobot_knowledge_v2` is deployed and service-role-only.
- There are 3,309 active card-to-claim links:
  - 3,290 `auto_approved`, `machine_consensus`, `card-claim-factory.v1` links.
  - 19 `needs_review` links that must never be served.
- Factory claims are intentionally stored as `generated_draft/unreviewed`. They may be served only through an active, version-exact, auto-approved factory link in the current published deck.
- Human-reviewed `approved/verified` claims remain eligible at the highest trust tier.
- BroBot grounding and claim-first Anki linking are implemented.

The latest six-chat audit failed:

- Grounded wins: 0; baseline wins: 2; ties: 4.
- Natural-chat coverage: 1/6.
- Claims cited by the model: 0.
- Exact cards displayed: 0.
- Exact `ankle fracture` retrieves 8 claims and 6 cards, but the natural consult question retrieves none.
- Distal-radius ORIF retrieves loosely related `Radius` claims such as generic forearm-fracture indications and FPL insertion. BroBot correctly ignores them.

Read before changing code:

- `reports/brobot-claims-live-audit/AUDIT.md`
- `reports/brobot-claims-live-audit/summary.md`
- `supabase/migrations/20260929021738_brobot_claims_knowledge_v2.sql`
- `src/lib/brobot/kg/provider.ts`
- `src/lib/brobot/kg/contracts.ts`
- `src/lib/brobot/chat/context-builder.ts`
- `src/lib/brobot/chat/prompt-builder.ts`
- `src/lib/brobot/chat/response-parser.ts`
- `src/lib/brobot/chat/quality-gate.ts`
- `src/lib/brobot/chat/anki-linker.ts`
- `src/app/api/brobot/messages/[messageId]/anki-references/route.ts`
- `src/lib/education/card-claim-factory.ts`

Preserve unrelated working-tree changes.

## Non-negotiable serving boundary

Apply these eligibility rules before relevance ranking. Ranking must never turn an ineligible row into an eligible one.

A served claim must be current and active and satisfy one of these paths:

1. Human/reviewed path:
   - Current claim version.
   - `review_status = 'approved'`.
   - `content_source = 'verified'`.
   - Permitted approval method.

2. Factory path:
   - Active `card_claim_links` row.
   - Exact current claim and card version IDs.
   - Card is included in the current published deck release.
   - Link status is `auto_approved` or `approved`.
   - For automatic admission, `approval_method = 'machine_consensus'` and `algorithm_version = 'card-claim-factory.v1'`.
   - Evidence hashes are present.
   - Claim version is the active/current version produced by the factory contract.

Always exclude:

- `needs_review`, `rejected`, `superseded`, inactive, stale-version, unpublished-deck, and claimless rows.
- The 19 current review-queue links.
- Claims admitted solely because their entity is vaguely related.
- Raw source-question text or protected source material.

Keep the RPC `security invoker`, use an explicit empty `search_path`, revoke execution from `public`, `anon`, and `authenticated`, and grant only `service_role`.

## Required retrieval architecture

Implement a hybrid retrieval pipeline. Do not rely on one canonical entity ID or substring matching.

### 1. Query understanding

Derive a compact retrieval query from the complete chat state:

- Primary procedure/topic.
- Clinical mode and subintent.
- Requested facets: diagnosis, classification, indication, threshold, imaging, anatomy, exposure, complication, treatment, prognosis, or technique.
- Important anatomy, procedure, injury, population, timing, laterality, numeric, and polarity terms.
- Recent conversational topic and selected branch when present.

Preserve the original user wording. Do not replace it with a lossy single label.

Produce deterministic query variants, including singular/plural and standard abbreviation expansion. Examples: `ACL` ↔ `anterior cruciate ligament`, `CTR` ↔ `carpal tunnel release`, `ORIF` ↔ `open reduction internal fixation`. Use existing aliases where possible; do not hard-code a tiny benchmark-only synonym list as the primary solution.

### 2. Candidate generation

Union candidates from independent channels so failure in one channel does not eliminate a relevant claim:

- Exact canonical label and active alias matches.
- Token-aware and trigram/fuzzy entity matches with medical stop-word handling.
- Direct full-text/trigram search over eligible claim text, predicate, object text, and safe qualifiers.
- Direct search over current published card fields or an existing card-search document.
- Card → canonical entity → claim traversal.
- Entity → current claim traversal for reviewed claims.
- One-hop reviewed relationship or alias-family expansion where it improves recall.
- Session/procedure context boosts, never hard eligibility.

Generate a reasonably broad internal pool, then rerank. Do not send the raw broad pool to the model.

Entity identity fragmentation must not break retrieval. A natural ankle-fracture consult must reach claims attached to equivalent labels such as `Ankle Fracture`, `Ankle Fractures`, and `Ankle Fracture Classification` when their content is relevant. Conversely, the word `radius` must not make generic forearm claims outrank distal-radius operative claims.

### 3. Claim-level relevance scoring

Rank the proposition, not merely its connected entity.

The score must incorporate:

- Claim-text match to the full question and requested facets.
- Card-text match to the full question.
- Exact phrase and medically meaningful token coverage.
- Entity/alias match strength and specificity.
- Mode/subintent fit.
- Trust path and link confidence.
- Published-deck membership and version exactness.
- Graph distance.
- Penalties for generic entities, low-information claims, and topic drift.

A useful conceptual scoring model is:

```text
relevance =
  claim_text_relevance
  + card_text_relevance
  + facet_alignment
  + specific_entity_match
  + mode_fit
  + trust_and_link_quality
  - generic_entity_penalty
  - graph_distance_penalty
  - contradiction_or_qualifier_penalty
```

Do not copy these as arbitrary constants without calibration. Measure score distributions on the benchmark and choose thresholds from evidence.

Add a hard minimum relevance threshold. Returning no claims is better than injecting irrelevant claims. Coverage must be `unknown` or `partial` when the threshold is not met.

### 4. Reranking and diversity

Rerank the top candidate pool using deterministic relevance features and, if justified by measured improvement, a bounded semantic reranker. Any model reranker must receive only safe claim/card text, use structured output, time out safely, and never bypass eligibility gates.

Use diversity/maximum-marginal-relevance so the final packet covers distinct requested facets rather than eight paraphrases of one fact. For an OR-prep question, prefer a balanced packet containing exposure, anatomy at risk, key decision/check, and complication/pitfall when relevant claims exist.

Return no more claims than BroBot can actually use. Default target: 4–8 highly relevant claims.

### 5. Conflict, qualifier, and numeric safety

Before claims enter the prompt:

- Detect opposite polarity, conflicting numbers, laterality, age/population, timing, certainty, and treatment-indication mismatches.
- Preserve qualifiers verbatim in the structured packet.
- Do not merge superficially similar claims whose qualifiers change clinical meaning.
- If top claims conflict, downgrade coverage and state the limitation; never silently choose based on retrieval score alone.

### 6. Reliable attribution

The current model often omits `usedClaimIds`. Fix this as a contract problem, not with string guessing after the fact.

- Use a strict structured-output schema when supported, rather than generic JSON mode alone.
- Give each claim a short stable packet index plus its UUID; make the model return the indices/UUIDs supporting each answer section.
- Validate returned IDs against the packet allowlist.
- Require `usedClaimIds = []` when claims are irrelevant or unused.
- Add a bounded repair pass only for malformed attribution, not to coerce claim use.
- Never count a claim as used merely because it shares words with the answer.

The model must remain free to ignore a bad or irrelevant packet. The retrieval layer—not the answer model—owns relevance quality.

### 7. Exact Anki behavior

- Resolve cards only from validated `usedClaimIds`.
- Require exact claim version, exact current card version, active approved/auto-approved link, and inclusion in the current published release.
- Rank cards by claim support and link confidence; deduplicate canonical cards.
- Never fall back to a vaguely related claim-first card when exact attribution exists.
- Keep the existing lexical fallback only for genuinely ungrounded answers and clearly distinguish it in telemetry.

## Required telemetry

Record enough information to diagnose every miss without storing protected source content:

- Query variants and requested facets.
- Candidate counts by retrieval channel.
- Selected entity, claim, claim-version, card, and card-version IDs.
- Per-candidate score components and exclusion reasons.
- Coverage and limitations.
- Claims returned to the model and claims actually used.
- Exact-card yield and fallback-card yield.
- Latency by stage, cache status, and timeout/failure reason.
- Retrieval/prompt/schema policy versions.

Telemetry writes must be non-fatal to chat.

## Benchmark and evaluation

Do not optimize only the six audit prompts. Build a durable, versioned benchmark with at least 60 natural BroBot prompts, stratified across:

- OITE, clinic, consult, and OR-prep modes.
- Trauma, hand, sports, adult reconstruction, pediatrics, spine, foot/ankle, and oncology when data exists.
- Classification, threshold, indication, anatomy, exposure, complication, diagnosis, imaging, and treatment questions.
- Short queries, conversational queries, abbreviations, misspellings, follow-ups, and deliberately unsupported questions.
- Hard negatives sharing broad anatomy but asking a different proposition.

Include the original six prompts and these mandatory regressions:

- Natural ankle-fracture consult versus exact `ankle fracture`.
- Distal-radius ORIF must reject generic forearm-indication and FPL-insertion claims unless directly requested.
- Carpal-tunnel radial TCL cut must retrieve recurrent motor branch/loss of thumb opposition when that claim is eligible.
- ACL reconstruction indications must not return diagnosis-only claims as indications.
- Garden classification must preserve displacement grades and age/treatment qualifiers.

For each prompt, maintain expected relevant claim IDs when possible, acceptable facet labels, explicit hard-negative claim IDs, and whether no-answer/no-claim is correct.

Measure:

- Eligibility violations: must be 0.
- Version/deck integrity violations: must be 0.
- Precision@5 and nDCG@8 against judged relevance.
- Recall of expected claims/facets.
- Unsupported or contradictory claim rate.
- Natural-query versus short-query coverage gap.
- Claim-use rate.
- Exact-card yield conditional on a used claim.
- End-to-end grounded versus baseline win/tie/loss rate.
- P50/P95 retrieval latency.

Use blind paired evaluation. The evaluator must not know which answer is grounded. A retrieval result is not automatically correct because it came from the KG.

## Acceptance gates

Do not enable or declare success until all are true on the held-out benchmark:

- 0 ineligible/review-queue/stale-version claims served.
- Precision@5 ≥ 0.85.
- Expected-facet recall ≥ 0.80 where eligible data exists.
- Hard-negative leakage ≤ 0.02.
- Natural-query coverage is within 10 percentage points of equivalent short-query coverage.
- At least 70% of answers receiving relevant claims cite one or more valid claim IDs.
- At least 90% of answers with used claims return one or more exact cards when a published linked card exists.
- Grounded answers win more often than baseline and lose in no more than 10% of judged pairs.
- No regression in unsupported-question abstention.
- P95 retrieval stays within the configured deadline, or the system degrades safely without affecting chat availability.

For the original six-chat smoke suite, require at minimum:

- Relevant claim coverage on at least 5/6 prompts when eligible data exists.
- Zero irrelevant claim packets.
- Nonzero valid claim attribution.
- Nonzero exact-card yield.
- Grounded wins > baseline wins.

## Implementation constraints

- Use migrations for durable database changes and follow the repository's Supabase workflow.
- Do not mutate claim review states merely to make retrieval metrics pass.
- Do not approve the 19 review-queue links.
- Do not rewrite or delete historical claims, versions, links, or production evidence.
- Preserve service-role isolation and RLS posture.
- Keep cache keys versioned by retrieval policy/schema so deployments cannot reuse stale rankings.
- Bound every query, candidate pool, model call, token budget, and timeout.
- Add deterministic tests for all eligibility and ranking invariants.
- Avoid benchmark-specific hard-coded claim IDs in production logic.

## Deliverables

Complete all of the following:

1. Production-ready retrieval implementation and migration(s).
2. Updated TypeScript contracts/provider/parser/quality gate as required.
3. Versioned benchmark fixtures and hard negatives.
4. Unit tests for query normalization, eligibility, ranking, diversity, conflicts, attribution, and exact-card linking.
5. Integration tests against production-shaped fixtures.
6. A read-only production canary before any write/deployment.
7. Shadow-mode evaluation report with all metrics above.
8. Paired real BroBot chat audit and exact-card screenshots/results after explicit authorization for external model evaluation.
9. Rollout and rollback instructions.
10. Updated `reports/brobot-claims-live-audit/AUDIT.md` with before/after evidence.

## Execution order

1. Inventory live schema, indexes, extensions, status distributions, deck release, and search facilities.
2. Freeze the benchmark and record the current baseline.
3. Implement candidate generation and eligibility filtering.
4. Implement claim/card relevance features and thresholds.
5. Add diversity, qualifier/conflict handling, and attribution enforcement.
6. Run deterministic and integration tests.
7. Run a read-only production canary and inspect misses manually.
8. Tune only on the training portion; evaluate once on the held-out portion.
9. Deploy in shadow mode and collect telemetry.
10. Run the paired BroBot audit.
11. Enable grounding/card display only after every acceptance gate passes.

## Stop rules

Stop rollout and report the evidence if any of these occur:

- Any `needs_review`, rejected, superseded, inactive, or stale-version row is served.
- A generic anatomy entity causes clinically unrelated claims to outrank a specific procedure/injury match.
- Relevant natural-language queries still depend on exact canonical wording.
- The model is forced to cite irrelevant claims.
- Exact cards do not correspond to claims actually used in the answer.
- The benchmark improves only because unsupported claims were admitted.
- Migration history would require applying unrelated migrations.

Do not describe the system as “much better” until the held-out metrics and real BroBot chats demonstrate it.
