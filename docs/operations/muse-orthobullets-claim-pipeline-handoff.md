# Muse handoff: Orthobullets reviewed-question claim pipeline

## Objective

Turn completed Orthobullets review questions into sanitized, automatically validated clinical claims, link them to the correct external-question records and canonical entities, and verify which published Anki cards teach each claim. Results-page runs process every row sequentially and resume from durable checkpoints.

## Non-negotiable safety rules

- Work in staging only: Supabase project `geznczcokbgybsseipjg`; use `scripts/lib/education/kg-staging-guard.ts` before any write script.
- Never submit an answer, alter a test, create a test, or change Orthobullets progress. Navigate only user-owned completed review pages.
- Treat stems, choices, explanations, images, and HTML as transient input. Do not store or log them. Persist only sanitized claims, hashes, source IDs, and safe provenance.
- Never infer a clinical entity merely from an Orthobullets title or topic. The generator and independent critic must agree on the entity and claim before automatic resolution.
- Fail closed. Missing or ambiguous identity/mapping produces an `educational_claim_gaps` record, never a forced link.

## Current implementation

- Extension extractor emits both the native QID and visible OBQ/SBQ alias.
- `POST /api/brobot/extension/question-claims` resolves case-normalized identity candidates against `external_questions`.
- Missing question metadata is created from safe review-page identifiers. Missing canonical entities are resolved or created only after generator/critic consensus.
- `orthobullets_claim_runs` and `orthobullets_claim_run_items` checkpoint safe IDs, hashes, graph references, and outcomes. No protected question content is persisted.
- Accepted claims and question/card links use `machine_consensus` plus `auto_approved`; rejected or exhausted cases remain `unresolved_automatic` with reason codes.

## Where to work

- Extractor: `extensions/orthobullets-brobot/src/content/extractor.ts`
- Extension relay/UI: `extensions/orthobullets-brobot/src/background.ts`, `extensions/orthobullets-brobot/src/sidepanel/App.ts`
- Claim endpoint: `src/app/api/brobot/extension/question-claims/route.ts`
- Identity helper/test: `src/lib/brobot/orthobullets/question-identity.ts`
- Existing durable queue: `educational_claim_gaps`

## Operating loop

1. Reload the unpacked extension and refresh the completed review page.
2. On a results page, press **Process all questions**. The extension opens one review page at a time, checkpoints the accepted claim/card links, closes it, and advances.
3. Resume the same run to retry transient failures. Unchanged accepted questions are reused without a model call.
4. Inspect run coverage by accepted, accepted-without-card, retryable, and unresolved outcomes before expanding.

## Required verification before handoff or batch work

```bash
npm run extension:orthobullets:test
npm run extension:orthobullets:build
npm run extension:orthobullets:verify-build
node --experimental-strip-types -e "import('./src/lib/brobot/orthobullets/question-identity.ts').then(({ resolveOrthobulletsIdentityCandidates }) => { const ids = resolveOrthobulletsIdentityCandidates({ nativeQuestionId: '4482', aliases: ['OBQ12.122'] }); if (!ids.includes('OBQ12.122')) process.exit(1); })"
```

For any Supabase read/write, first read the Supabase skill, scan the current changelog, target staging explicitly, and perform a read-back verification. Do not use production as a test environment.

## Remaining operational validation

Apply the migration in staging, deploy the backend, rebuild the extension, and run a small real results-page cohort. Verify database read-back, source-text exclusion, claim acceptance, exact Anki card/version links, resume behavior, and failure counts before starting the long-running bank pass.
