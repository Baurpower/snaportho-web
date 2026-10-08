# BroBot claims integration audit

## v3 shadow evaluation — 2026-09-29 (benchmark + read-only canary, no live chats)

Hybrid retrieval v3 (query understanding, multi-channel 48-pool, calibrated TS rerank with MMR/thresholds/conflicts) was built, wired behind `BROBOT_KNOWLEDGE_RETRIEVAL_VERSION` (default v2), and evaluated on the frozen 77-prompt benchmark (train 46 / holdout 31) plus a read-only production canary. Full report: `../brobot-claims-v3/SHADOW.md`, metrics: `../brobot-claims-v3/shadow-metrics.json`.

- Train served: recall 0.815, leak 0.000, unsup 0.000, empty 0.000. Holdout served (run once): recall 0.747, leak 0.161 (5 prompts), unsup 1.000 (4/4), empty 0.000. Pool recall 0.937 train / 0.978 holdout, zero empty pools.
- 0 ineligible claims served on either split; facet recall 0.89 both splits; served claims 99.5%+ exactly linkable to in-release cards (v2 audit: 0 cards).
- Miss roots: topic-miss maxCov excuse waives safety-critical qualifiers (flexion/extension nerve pair tied; infection/level/anatomy leaks); QU unsupported taxonomy covers billing only (stem-cell/implant/rare-disease prompts served 8); one likely benchmark mislabel (`regress-acl-indications-variant` flagged no-claim but answerable). All recall misses had expected claims in-pool (rerank crowding).
- Canary: serving boundary stable (3,290 servable links, 19 needs_review excluded, release `7764b632-…` unchanged); v2 RPC healthy at 809 ms with 0 claims for Garden; v3 unapplied; telemetry table empty (no live baseline).
- Gates: ineligible/facet-recall/coverage/card-yield pass; P@5, leak, recall fail on holdout; attribution/grounded-wins/latency pending paired audit + prod measurement.

Verdict: NO ENABLE. v3 is a large benchmark step over v2 (0.013 baseline recall, 1/6 chat coverage) but holdout fails the leak/recall/unsupported gates, and the inspected holdout is contaminated — re-validation needs a fresh held-out sample after the fix set is frozen. Rollout/rollback and preconditions are in SHADOW.md; migration-history reconciliation (below) still blocks any push.

Verification: `npm run brobot:test:claims-knowledge-v3` — passed; `npm run brobot:test:claims-knowledge` — passed; `npm run brobot:test:query-understanding` — passed; telemetry tests — passed; `tsc --noEmit` clean in touched areas.

## Post-fix BroBot chat audit — 2026-09-29 03:03 UTC

The production RPC and 3,290 auto-approved `card-claim-factory.v1` links are now live. Six paired chats were rerun through BroBot's prompt builder, parser, quality gate, production claims RPC, and exact Anki linker.

- Grounded wins: 0; baseline wins: 2; ties: 4.
- Natural-chat coverage: 1/6 prompts retrieved claims.
- Claim attribution: 0 retrieved claims were cited by the model.
- Exact Anki yield: 0 cards.
- SCFE, Garden classification, ACL reconstruction, carpal tunnel release, and the natural ankle-fracture consult retrieved no usable claims.
- Distal-radius ORIF retrieved six claims, but they were dominated by broadly linked `Radius` cards (forearm-fracture indications and FPL insertion), not the requested exposure/anatomy/decision facts. BroBot appropriately ignored them.
- An exact short query for `ankle fracture` returns eight claims and six cards, while the natural consult wording returns none. This exposes canonical-entity fragmentation and overly literal anchor selection.

Verdict: deployment and security are correct, but the feature does not yet improve general BroBot chats. The next fix must rank card/claim text relevance—not only entity linkage—and collapse or expand equivalent canonical entities before claims enter the prompt.

Audited 2026-09-29 against the live Supabase project with paired OpenAI chats.

## Verdict

The implementation is structurally sound and passes its contract, runtime, chat, and type checks. It is not ready to produce a substantial production improvement yet because the live serving corpus and card links are almost empty, and direct-entity lexical retrieval misses clinically natural questions.

## Live results

- Six broad real-chat prompts (SCFE, Garden classification, ACL reconstruction, carpal tunnel release, ankle fracture consult, distal radius ORIF): 0 eligible claims retrieved; grounded 0 wins, baseline 3 wins, 3 ties.
- Four prompts aimed at the only approved/verified live claims: 3 claim retrievals across 4 chats; grounded 1 win, baseline 1 win, 2 ties.
- Eligible live corpus: 6,435 active claims, but only 4 current versions are both `approved` and `verified` (0.062%).
- Anki graph: the four eligible claims have 0 `card_claim_links`, so exact claim-first cards cannot be displayed.
- Deployment: migration `20260929021738_brobot_claims_knowledge_v2.sql` is not applied to the linked project. A normal push is unsafe because remote migration history is missing a large local backlog.

## Important observed failure

The natural carpal-tunnel prompt asked which branch is endangered by a radial transverse carpal-ligament cut. The relevant verified claim says recurrent motor branch with loss of thumb opposition. Retrieval anchored on carpal-tunnel entities and did not traverse to the claim's primary recurrent-motor-branch entity, so the claim was omitted and the generated answer confidently named the palmar cutaneous branch instead.

This demonstrates that exact direct-entity anchoring is insufficient. The serving RPC needs alias/token/semantic matching or neighborhood expansion from procedure to anatomy/complication claims.

## Priority before rollout

1. Publish a meaningfully sized reviewed corpus; retain the strict approved + verified serving boundary.
2. Generate, review, and publish version-exact `card_claim_links` into the current deck release.
3. Expand claim retrieval beyond direct primary-entity anchors and add the carpal-tunnel case as a regression test.
4. Reconcile remote migration history, then deploy only the intended BroBot migration.
5. Repeat the paired audit with broad prompts and require nonzero coverage, card yield, and grounded win rate before enabling flags.

## Verification

- `npm run brobot:test:claims-knowledge` — passed
- `npm run brobot:test:chat` — passed
- `npm run typecheck` — passed

Raw paired results are in `summary.md`/`summary.json` in this directory and in `../brobot-claims-live-audit-eligible/`.
