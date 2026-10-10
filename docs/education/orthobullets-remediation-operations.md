# Orthobullets remediation operations

The implementation uses immutable claim versions and append-only review attestations. Extraction acceptance, source fidelity, clinical validity, publication, entity resolution, and exact card entailment remain separate decisions.

## Reproduce verification

Use the repository's configured Node 22 runtime and install the locked dependencies. The database checks run in an isolated PGlite instance; they do not use `.env.local` or contact Supabase.

```sh
npm ci --ignore-scripts
npm run education:ob:remediation:test
NODE_OPTIONS=--max-old-space-size=6144 npm run typecheck
```

The test command exercises contracts, repair children and metadata, final coverage, categorical persistence gates, scoped comparison, identity, leases, bounded enrichment planning, publication/revocation, direct no-card retrieval, v2/v3 dispatch, cancellation, privacy diagnostics, invocation reservations, unknown usage, and pricing settlement. Its simplified legacy-table fixture is not a complete copy of all production constraints; live bounded read-back remains required.

## Release and target checks

Durable extraction requires a committed release whose pipeline files match HEAD. Do not disable this check or record a clean HEAD while running different source. An isolated release checkout allows unrelated workspace edits to remain in place. The runner also checks the model-profile budget and refuses mixed-model durable runs until their event-level per-model attribution is implemented.

Confirm `NEXT_PUBLIC_SUPABASE_URL` against the intended project. The connected project is `geznczcokbgybsseipjg`; historical documentation's staging label does not establish isolation. Apply only the new migrations absent from that target. Historical migrations restored for source parity were already deployed and must not be blindly replayed.

Use `supabase/verification/ob_claim_remediation_readback.sql` with the original run UUID as parameter `$1`. It returns sanitized cohort metrics. The original production-algorithm scope is 2,039 claim versions; the wider union of all algorithms currently reaches 2,047. Compare matching scopes.

## Transient source replay

The production runner accepts a JSON array from standard input through `--input=-`. A packet contains a verified numeric QID, an explicitly observed OBQ/SBQ alias when present, and the source fields expected by `ObRunnerPacket`. The correct answer is the choice text, not its numeric key. Compute and compare `sourceContentHashV5` before replay; a changed source requires a fresh source identity.

Obtain source data through authenticated browser review pages. Do not export cookies, decrypt Chrome credentials, submit answers, or alter study progress. Keep packets in memory. If a bounded replay requires a temporary file, create it with mode 0600 outside the repository, arrange cleanup on success and failure, and verify deletion. Never put packets, original question content, copied HTML, image data, or authentication material into reports or application logs. Provider processing is not a promise of zero retention.

Run a zero-write preview first. A durable bounded replay uses this form, with the actual packet delivered through stdin:

```sh
node --experimental-strip-types --experimental-loader ./scripts/lib/ts-alias-loader.mjs scripts/run-ob-claims-production.ts --input=- --model-profile=gpt41-mini --max-questions=11 --max-cost=1 --max-errors=3 --max-item-cost=0.1 --apply --env-file=/absolute/path/to/.env.local
```

Use the returned run ID, the identical packet digest, the same release, and the same execution manifest for resume. The model invocation budget belongs to the run and survives worker restarts. Unknown usage retains its reservation; do not erase it or assume a failed call was free. The output ceiling and UTF-8 input bound provide a conservative reservation; the ledger preserves actual estimates if a provider exceeds that bound. Adoption of old events does not incur new model calls.

## Bounded entity/card enrichment

A dry run writes nothing and makes no model calls:

```sh
node --experimental-strip-types --experimental-loader ./scripts/lib/ts-alias-loader.mjs scripts/run-ob-claim-enrichment.ts --stage=entity --cohort-run=3bf06315-fc96-47b2-99a8-bb70e52a0a27 --max-jobs=25 --enqueue-limit=25 --max-cost-usd=1
```

After reviewing the planned scope, add `--enqueue --apply --confirm-project-ref=geznczcokbgybsseipjg`. Use `--claim-version-ids=<comma-separated-current-version-UUIDs>` to pin a pilot. `--env-file` permits a release checkout to use configuration without copying credentials.

Entity policy v1.2 resolves only trusted active canonicals and approved aliases. Ambiguity, generic labels, and ontology types unsupported by the live schema remain unresolved. New concepts become proposals rather than automatic canonicals. Provenance uses external-question record IDs, with a provider-qualified QID only when no record exists.

Card policy v1.1 uses the latest published release, current card content hashes and exact card ordinals. Two independent entailment passes must agree. A topic match, extra-only fact, wrong cloze sibling, or different applicability is insufficient. A no-match result completes the stage without creating a link.

The planner advances past completed/exhausted inputs, retains retryable work, deduplicates identical inputs, and never queues more than the explicit limit. Input hashes include immutable content, model/policy, the ontology snapshot, and the card release where relevant. Leases use SKIP LOCKED and owner/expiry checks. Completion and semantic edge writes share a transaction.

Enrichment budgets are cumulative per cohort and stage policy. The first configured ceiling is retained; a restart cannot silently raise it. Pilot calls made before the invocation-ledger migration are reported separately and are not fabricated as historical ledger rows.

## Review and publication

Call `append_claim_version_attestation` with current claim/version IDs, dimension, categorical verdict, policy/actor, sanitized reasons, evidence hashes/HTTPS locators, safe metadata, and an idempotency key. Positive source and clinical attestations require evidence references. Publication becomes eligible only after source fidelity is supported, quality is good, and clinical validity is validated. Revocation immediately excludes the version at the shared retrieval/Anki boundary.

Historical bulk-approval receipts use `historical_approval:recorded`. They preserve the original approval metadata and cannot grant publication. Do not convert missing final-review reasons into invented historical receipts. Re-review the repaired child against the original source and record the new review's actual lineage and policy.

The frozen evaluation manifest contains 500 QIDs and historical source hashes, with a 25-question random sample and separately labeled targeted strata. Evaluate those groups separately. Source explanations can support source fidelity while containing outdated, study-specific, or overgeneralized clinical statements. Record unresolved clinical evidence rather than treating model agreement as medical ground truth.

## Rollout and rollback

Keep grounding/Anki feature controls at their verified runtime state until the source, clinical, exact-card, latency, and live-answer gates pass. SQL deployment does not deploy application code. The v3 direct-claim path permits eligible claims without entity/card anchors; it does not make unvalidated drafts eligible.

For an incident, stop the worker, preserve leases and immutable history, revoke affected publication decisions, and return serving to shadow/off through existing controls. Retire scoped edges/proposals rather than deleting shared evidence. Keep cancelled pilot jobs as explicit terminal outcomes. Do not remove tables or disable immutable guards to undo data work.
