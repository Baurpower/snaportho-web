# Local Orthobullets extractor readiness — October 8, 2026

This computer successfully ran the production extraction stages against one completed Orthobullets review question (QID 4463). Generator, factual/quality review, coverage, and independent validator returned `accepted`, with three accepted candidates. This was an explicitly authorized model test. No claims, links, run items, or other data were written to Supabase.

## Verified

- Supabase password authenticated successfully; all seven production pipeline tables are present.
- All six production pipeline database functions are present and executable by the configured connection.
- Contract, pipeline, identity, resolution, and runner test suites pass.
- Extension builds and build verification passes.
- Full TypeScript check passes with `NODE_OPTIONS=--max-old-space-size=6144`; the default Node heap ran out of memory.
- The page extractor captured the stem, five choices, correct answer, and explanation with zero extraction warnings.
- The packet fetcher now imports its declared `linkedom` dependency instead of a missing `/tmp/pilot-deps` installation. This import was verified. Its Chrome-cookie acquisition path was not executed.

## Registry lookup fixed

The numeric QID 4463 is registered under `OBQ12-103`, with that same source alias. The packet fetcher previously discarded the visible `OBQ12.103` alias, and the runner only queried the numeric QID. The fetcher now retains `raw.providerSpecific.questionAliases`; dry and durable runner modes search exact dot/hyphen OBQ/SBQ variants. Conflicting native and alias matches remain blocked, including a mixed matching/conflicting alias set.

A live read-only check using the captured page's alias returned `RESOLVED`, `registry_alias_exact`, registry ID `a1070304-e7e7-4d96-bfd3-6bd529b0254f`. Regression tests cover alias resolution in both dry and durable fake-database modes.

During verification, concurrent edits changed the CLI runner to import a missing `scripts/lib/ob-model-profile` module. A repeat end-to-end CLI test was blocked by that separate missing dependency. Those concurrent edits were left intact.

## Earlier full runner result

The one-question CLI dry run completed with `would_identity_unresolved` and `no_registry_match` for QID 4463. It made zero model calls and zero database writes. The separate direct extraction test used a null registry ID to verify model stages only; it did not bypass the registry gate for persistence.

Parallel workers are supported by database leases, but this check did not run multiple workers or exercise persistence. Before a durable batch, select a cohort whose native IDs resolve in the configured database, resolve missing registry mappings, and verify a bounded write run with explicit target authorization.

Transient source HTML and question packets were deleted after verification. Only sanitized readiness outcomes are retained.
