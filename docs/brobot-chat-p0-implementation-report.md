# BroBot Chat P0 Implementation Report

Date: 2026-06-26

## Files Changed

- `src/app/api/brobot/chat/route.ts`
- `src/app/api/brobot/intent/route.ts`
- `src/lib/brobot/model-config.ts`
- `src/lib/brobot/chat/prompt-builder.ts`
- `src/lib/brobot/chat/response-parser.ts`
- `src/lib/brobot/chat/types.ts`
- `src/lib/brobot/chat/prompt-builder.test.ts`
- `src/lib/brobot/model-config.test.ts`
- `.env.local`
- `tmp/alias-loader.mjs`

## Architecture Before

- intent expansion on `BROBOT_INTENT_MODEL`
- one main answer completion
- same main completion generated:
  - answer
  - tags
  - suggested questions
  - next branches
  - UI metadata
- heuristic quality gate only logged warnings
- streaming depended on the same single JSON completion

## Architecture After

- intent expansion still uses the cheap intent model
- answer model now routes through `getAnswerModelForRoute(...)`
- answer generation can run on a stronger tier for:
  - OR Prep
  - consult
  - OITE
  - research
  - ambiguity-heavy or deep turns
- optional separate metadata pass now generates:
  - `suggestedQuestions`
  - `nextLearningBranches`
  - `tags`
- heuristic quality-gate warnings can trigger one revision pass
- evaluator jobs still enqueue only after the final persisted answer
- streaming now preserves the same SSE contract while using the finalized pipeline output

## New Env Vars

- `BROBOT_FAST_MODEL`
- `BROBOT_STRONG_MODEL`
- `BROBOT_REVISION_MODEL`
- `BROBOT_ENABLE_REVISION_PASS`
- `BROBOT_SEPARATE_METADATA_PASS`

Existing model vars kept:

- `BROBOT_INTENT_MODEL`
- `BROBOT_CHAT_MODEL`
- `BROBOT_RESEARCH_MODEL`
- `BROBOT_EVAL_MODEL`

## Feature Flags

- `BROBOT_ENABLE_REVISION_PASS=true`
  - runs at most one revision pass
  - skips revision for `urgent_red_flags`
- `BROBOT_SEPARATE_METADATA_PASS=true`
  - keeps the answer prompt focused on the educational answer
  - runs a cheaper metadata pass afterward

## Risks

- streaming is now pipeline-finalized before deltas are emitted, so perceived first-token latency may increase on revised turns
- answer quality depends more heavily on the stronger model routing and the revision prompt behaving well
- the route diff is large because the main generation path and streaming path were consolidated around the new pipeline helper

## Validation

Completed:

- `npm run lint`
- `node --experimental-loader ./tmp/alias-loader.mjs --experimental-strip-types src/lib/brobot/chat/prompt-builder.test.ts`
- `node --experimental-loader ./tmp/alias-loader.mjs --experimental-strip-types src/lib/brobot/model-config.test.ts`

Repo-wide typecheck:

- `npx tsc --noEmit`
- not clean because of unrelated pre-existing errors in the Orthobullets import work, plus an existing `.ts` extension import there
- the BroBot files changed in this task were no longer the source of parse/type failures once the route refactor was corrected

Manual prompt runs:

- live model-backed manual prompt execution was not completed in this turn
- prompt-level validation covered the new OR Prep, consult, and OITE exemplar wiring plus metadata/revision prompt builders

## Recommended Next Step

Run live BroBot prompt checks in the app or API for at least these cases:

1. OR Prep: `Distal radius ORIF tomorrow. What do I need to know?`
2. Consult: `Ankle fracture consult. How should I think about it?`
3. OITE: `SCFE OITE points`
4. Research: `Critique this methods section`
5. General: `Shoulder pain workup`

Then compare:

- answer model chosen
- whether revision triggered
- quality-gate warnings before/after revision
- latency impact from the separate metadata pass
