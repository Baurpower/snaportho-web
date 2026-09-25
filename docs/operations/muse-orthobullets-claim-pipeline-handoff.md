# Muse handoff: Orthobullets reviewed-question claim pipeline

## Objective

Turn a user-opened, completed Orthobullets review question into one sanitized draft clinical claim, linked to the correct external-question record and canonical entity. The pipeline must improve its metadata coverage over time without requiring a human to approve ordinary cases.

## Non-negotiable safety rules

- Work in staging only: Supabase project `geznczcokbgybsseipjg`; use `scripts/lib/education/kg-staging-guard.ts` before any write script.
- Never submit an answer, alter a test, create a test, or change Orthobullets progress. Navigate only user-owned completed review pages.
- Treat stems, choices, explanations, images, and HTML as transient input. Do not store or log them. Persist only sanitized claims, hashes, source IDs, and safe provenance.
- Never infer a clinical entity merely from an Orthobullets title or topic. A claim is created only after exactly one independently verified `question_canonical_entity_links` row is active.
- Fail closed. Missing or ambiguous identity/mapping produces an `educational_claim_gaps` record, never a forced link.

## Current implementation

- Extension extractor emits both the native QID and visible OBQ/SBQ alias.
- `POST /api/brobot/extension/question-claims` resolves case-normalized identity candidates against `external_questions`.
- Missing/ambiguous metadata records a `source_extraction_gap`; missing/ambiguous entity mapping records a `mapping_gap`.
- The gap payload is safe metadata only: IDs, counts, page kind, and topic ID. No protected question content is persisted.
- A resolved question with exactly one active canonical entity generates one original claim, a version, and a `question_claim_links` row in `needs_review`.

## Where to work

- Extractor: `extensions/orthobullets-brobot/src/content/extractor.ts`
- Extension relay/UI: `extensions/orthobullets-brobot/src/background.ts`, `extensions/orthobullets-brobot/src/sidepanel/App.ts`
- Claim endpoint: `src/app/api/brobot/extension/question-claims/route.ts`
- Identity helper/test: `src/lib/brobot/orthobullets/question-identity.ts`
- Existing durable queue: `educational_claim_gaps`

## Operating loop

1. Reload the unpacked extension and refresh the completed review page.
2. Press **Generate graph claim** once. Interpret results:
   - `created`: leave it for automated adjudication; do not promote directly.
   - `Queued metadata gap`: add only a verified source-ID metadata record to the import corpus, then rerun.
   - `Queued metadata gap — missing/ambiguous canonical entity`: resolve through the canonical ontology proposal/adjudication process, then rerun.
3. Deduplicate gaps by `(provider, native_question_id, gap_class)`; update the existing gap instead of creating noise.
4. Process a small reviewed-only cohort first. Measure created, metadata-gap, mapping-gap, ambiguous, and model-invalid rates before expanding.

## Required verification before handoff or batch work

```bash
npm run extension:orthobullets:test
npm run extension:orthobullets:build
npm run extension:orthobullets:verify-build
node --experimental-strip-types -e "import('./src/lib/brobot/orthobullets/question-identity.ts').then(({ resolveOrthobulletsIdentityCandidates }) => { const ids = resolveOrthobulletsIdentityCandidates({ nativeQuestionId: '4482', aliases: ['OBQ12.122'] }); if (!ids.includes('OBQ12.122')) process.exit(1); })"
```

For any Supabase read/write, first read the Supabase skill, scan the current changelog, target staging explicitly, and perform a read-back verification. Do not use production as a test environment.

## Next implementation stage

Build a resumable, review-only queue from the user's completed-results pages. It may visit explicit review URLs and invoke this same endpoint, but it must never manufacture question IDs, scrape an unauthenticated catalog, submit answers, or persist protected source material. The queue should prioritize unresolved `educational_claim_gaps`, then rerun automated evidence/adjudication after metadata and ontology coverage improve.
