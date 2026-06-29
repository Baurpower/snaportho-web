# KG Automation — Scale Hardening TODO

Tracked output of architecture-audit pass 1 (workstream 5). These are known
correctness/performance risks in the KG automation scripts that are harmless at
today's volume (tens of proposals, low-thousands of source rows) but must be
addressed before the next order-of-magnitude content import. None were changed
in this pass to keep proposal/entity counts stable; a reusable
`fetchAllRows()` pagination helper was added to `scripts/kg-automation-common.ts`
for adoption.

## 1. Unpaginated Supabase reads (silent truncation risk)

Supabase caps a select at 1000 rows by default. Any of these tables crossing
1000 rows will silently truncate the dataset the generator reasons over —
producing *incorrect* (not failing) output.

- `scripts/generate-kg-automation-proposals.ts:501` — the 12-table `Promise.all`
  (curriculum_node_aliases, concept_aliases, **source_aliases**, external_sources,
  learning_objectives, **canonical_cards**, **anki_cards**, anki_decks,
  **anki_notes**, **anki_note_tags**, anki_tags, canonical_relationships). The
  bolded tables are already large or will be first to exceed 1000 rows.
- `src/lib/education/kg-canonical-coverage.ts` — `loadCanonicalCoverageSnapshot`
  loads ~10 tables (cards, questions, mappings, links) the same unpaginated way.

**Fix:** wrap each at-risk read in `fetchAllRows((from, to) => query.range(from, to))`.

## 2. N+1 update loops (performance)

- `scripts/generate-kg-automation-proposals.ts:1427` — one `update().eq("id", …)`
  per existing proposal when reconciling fingerprints.
- `scripts/generate-kg-automation-proposals.ts:~1354` — one update per approved
  `create_canonical_entity` row in the stale-approval reconciliation pass.
- `scripts/apply-approved-kg-automation-proposals.ts` main loop — each proposal
  issues several sequential round-trips (duplicate-check select + insert + status
  update), fully sequential.

**Fix:** batch the status updates, or move each proposal's writes behind a single
Postgres RPC.

## 3. Non-transactional apply (atomicity)

`scripts/apply-approved-kg-automation-proposals.ts` is not wrapped in a
transaction. If proposal N of M throws, proposals 1..N-1 are already durably
committed and marked `applied`, with no rollback. Relationship proposals that
fail registry validation are now skipped and left in `approved` status rather
than marked applied, but a mid-batch DB error still has no rollback.

**Fix:** apply each proposal inside a single Postgres function/RPC so a failure
rolls that proposal back atomically.

## 4. Hardcoded scan limit

`scripts/generate-kg-automation-proposals.ts` processes `curriculumGaps.slice(0,
args.limit)` with `--limit` defaulting to 50. Intentional throttle while review
is manual; revisit once review throughput increases.
