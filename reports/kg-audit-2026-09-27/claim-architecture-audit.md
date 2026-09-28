# Claim Architecture Audit — 2026-09-27

## Lifecycle (verified)

Card-factory path (deterministic, dry-run capable): ephemeral card →
`teachingField` → `extractTargetCloze` (ONE target per ordinal) →
`toDeclarativeClaimText` (fill cloze into sentence) → `inferClaimType` →
`pickPrimaryEntity` → likeness gate → specificity gate → fingerprint →
run-level dedup by fingerprint → deterministic claim/version UUIDs →
auto-approve policy → proposed claim + optional teaches link + review queues.
Backfill runner persists durable per-card outcomes; canonical-target claims go
to `educational_claims`, proposed/unresolved stay as payloads.

OB path (generator+critic, live): extension ships page content in-memory →
draft + critique JSON (20–500 char assertion, controlled vocab) →
`machineConsensus` (conf ≥ 0.90) → `commit_orthobullets_machine_claim`
(advisory-lock dedup on structural+assertion, insert claim+version, supersede
prior tests_primary, upsert link) → card evaluation via overlap matcher.

## A. Atomicity — WEAK, card-shaped

One claim per card by construction; multi-fact cards queue as `non_atomic`
rather than splitting. Stratified sample of the 3,429-claim corpus shows three
recurring defects: (1) Q/A restatements ("Where does X insert: Y", "Name the
special test: Lift off"); (2) context-dependent claims ("The being measured in
the radiographs below is…"); (3) compound claims (Dial-test two-rule threshold;
SLAC multi-stage list; Plantaris origin+insertion+nerve+action in one row).
Claim typing is coarse and occasionally wrong (ex-fix timing labeled
`contraindication`). Counter-evidence: genuinely atomic rows exist (internervous
plane; Anti-CCP). Lengths: p50 108 chars, p95 218, max 473.

## B. Semantic identity — SPLIT, v1 UNSOUND

- v1 (factory): sha256 over normalized (type, entity, predicate, object,
  qualifiers). Predicate is degenerate (`teaches_fact` 85%), object is the raw
  cloze answer, so distinct propositions collide: 23 structural groups found,
  several clinically distinct (Lachman grades vs TKA fracture rate sharing
  "3-5"; shoulder portal vs medial epicondyle sharing "posterior"). They stay
  separate only via incidental qualifier splits (`setting=primary` from the
  word "primary"). Zero exact-normalized-text dupes: nothing converges.
- v3/v4 (OB): appends normalized assertion text — the correct fix — but the
  migration explicitly does not backfill old rows. Two identity functions now
  govern one table; `active_fingerprint_uidx` enforces uniqueness per row
  under whichever function wrote it. No documented rule for cross-era dedup.
- "Same claim" is therefore era-dependent. This is the highest-severity
  architectural finding.

## C. Provenance — STRONG on links, PARTIAL on content

Answerable today: which source (provider/source_id), which item (card+version
pins; provider+native question id), which claim version, which
extractor/algorithm version, confidence/approval/review state, reason codes,
evidence locator + sha256 hashes, run/item lineage for OB. NOT answerable:
exact source text (card snapshots exist per version, but OB stems/choices/
explanations are never persisted — only their hash); whether the source
changed since extraction for questions (single overwritten hash, no history);
human-review identity for auto-validated rows.

## D. Versioning — CAPABLE, conflict model thin

CARD V1→CLAIM A / CARD V2→CLAIM B is representable (version-pinned links,
immutable claim versions, active/superseded link states). Demonstrated
mechanically by the v4 commit path (supersede-then-upsert). Missing: durable
claim↔claim relations (supersedes/contradicts), so conflicts are detected only
transiently (factory polarity-clash abstention; overlap delta abstention) and
never recorded as graph edges. Card versions themselves are mutable rows.

## E. Claim↔entity — SINGLE-SLOT, lossy

`primary_entity_id NOT NULL` with FK. "Smoking increases nonunion after lumbar
fusion" can name only one of {smoking, nonunion, lumbar fusion}. Unresolved
claims use sentinel `00000000-0000-4000-8000-000000000001`, which has no
canonical row — so unresolved claims are un-insertable by FK design (good:
this enforces the payload-only rule, but 700/3,429 claims have no durable
claim row). Proposed-entity typing skews 88% `condition`.

## F. Claim relationships — ABSENT

No table, no vocabulary (supports/contradicts/supersedes/qualifies/
prerequisite/equivalent). `canonical_relationships` has no claim endpoint.
Gap ledger (`educational_claim_gaps`) tracks missing coverage, not semantics.
Recommendation: add `claim_relationships` (claim, claim, predicate, evidence,
review state) rather than overloading the entity graph.

## Bottom line

Extraction→identity→storage→review machinery is real and well-instrumented,
but v1 identity is unsound for a shared semantic layer and OB v3/v4 fixed it
only prospectively. Unify identity (single function + backfill-or-dual-read
rule) before any cross-source convergence work; until then, treat v1
fingerprints as grouping hints, never as equivalence.
