# Knowledge Graph System Audit — 2026-09-27

Read-only audit of the SnapOrtho knowledge architecture. No database writes were
performed (live DB was unreachable from the audit sandbox; see Phase 0).

## Phase 0 — Safety posture (verified)

- Workspace root `/Users/alexbaur/snaportho_dev` is NOT a git repo. Two repos:
  `snaportho-web` (main, ~16 modified files + untracked OB/BroBot work) and
  `snaportho-caseprep` (main, 1 modified file).
- Database is hosted-only Supabase (`geznczcokbgybsseipjg.supabase.co`, pooler
  `aws-0-us-east-2`). `POSTGRES_*`/RDS env is dead; `guard.ts` confirms app code
  never reads it. Any DB touch would be production → read-only rule held.
- Migration infra: 152 migrations (`supabase/migrations`), 20 read-only
  verification gates (`supabase/verification`, `begin + set local transaction
  read only`, RLS-forced), 2 seeds, no local CLI config.
- Mutation surface: 183 scripts including 16 `apply-*` (pg + DATABASE_URL) and
  ~40 approve/backfill/import/fix/sync/publish/cleanup operators wired through
  `package.json` (`kg:*`, rollout tasks). 13 `audit-*` scripts exist, including
  one explicitly read-only tags audit. None were executed.
- Live DB was unreachable from this sandbox (DNS ENOTFOUND on pooler host,
  proxy down). All counts in this audit are report-derived point-in-time
  figures from committed artifacts (2026-09-24/25), NOT live `SELECT` counts.
  Live parity is the first unresolved item (see next-phase plan).

## What exists (verified in code/DDL, not assumed)

**Cards (full lifecycle, versioned).** `anki_notes` (source_note_key, guid,
content hashes) → `anki_cards` (card_ord, scheduling read-only) →
`canonical_cards` (1:1 with imported card, current_version pointer, status
imported/draft/reviewed/approved/archived) → `canonical_card_versions`
(version_number + content_hash unique per card, field/raw-HTML/tag snapshots).
Releases pin exact versions: `anki_deck_releases` →
`anki_deck_release_cards` (unique per release on card, on (note_guid, ord),
and on ordering_key). Old versions are reconstructable from snapshots.
Caveat: card versions are updatable rows (have `updated_at` trigger), not
immutable; only the release pin + content_hash give historical stability.

**Claims (structured, versioned, fingerprinted).** `educational_claims` =
(claim_text, claim_type, predicate, object_text, qualifiers[7 keys],
primary_entity_id NOT NULL, fingerprint_hash NOT NULL, current_version_id,
approval/review/content-source/status flags). `educational_claim_versions` is
trigger-immutable. Identity is deterministic: factory
`deterministicUuid('clinical-claim|' + fingerprint)`; DB trigger recomputes the
fingerprint on write. **Verdict on the A/B/C/D question: hybrid leaning C.**
A v1-factory claim row is effectively one source-specific statement: exactly
one claim per card (single cloze target per ordinal), object_text = raw cloze
answer, predicate degenerate (`teaches_fact` in 2902/3429). It is not pure
semantic identity (rephrasings do not converge) and not a raw extraction log
(dedup by fingerprint exists and `mergedClaimCount` was 135).

**Identity split (unresolved).** v1 structural fingerprint excludes claim_text;
v3/v4 assertion fingerprint appends it. The v3 migration header states it
"does not backfill or rewrite fingerprint_hash on existing rows", so old and
new rows live under different identity functions with no documented
backfill-or-dual-read rule. The audit's own analysis justifies the v3 change:
under v1 inputs, clinically distinct claims collide (e.g. Lachman grading vs
TKA stem fracture incidence sharing object "3-5"), kept apart only by
incidental qualifier differences. 23 structural near-duplicate groups are
shipped in `claim-duplicate-candidates.json`, all `needs_expert_review`.

**Links (role-locked, version-pinned).** `card_claim_links` (role forced
`teaches`, unique per active card+claim, pins card version + claim version).
`question_claim_links` (roles `tests_primary`/`tests_secondary` only, unique
per provider+native+claim, pins claim version + source fingerprint hash).
There is deliberately NO `mentions`/`explains` role and no citation table.

**Entities (curated table, flag-separated proposals).** `canonical_entities`
has 11 types and an 8-state lifecycle. Card-factory proposals stay out of the
table (payloads + `kg_automation_proposals`, promotion boundary
`review_only_no_canonical_or_proposal_database_writes`, 0 promotions executed).
But OB v4 `resolve_or_create` inserts `status=proposed` rows directly into
`canonical_entities` — proposed and canonical share one table, separated only
by status flags every consumer must filter. One claim links to exactly ONE
entity (`primary_entity_id NOT NULL`); multi-entity propositions cannot be
represented.

**Curriculum (navigation taxonomy, not concepts).** `curriculum_nodes` is a
self-referential tree (specialty/region/topic/subtopic/module/exam_domain/
pathway) with `learning_objectives`, `concepts`, bridges
(`curriculum_node_entities`, `concept_canonical_entities`). It is a
presentation/navigation overlay, not atomic knowledge; it should not become
claims. OB questions map to it conservatively with `needs_review`.

**Questions (metadata registry + in-memory content).** `external_questions`
stores source/id/specialty/topic/slug only; its own comment forbids stems,
choices, explanations. Native identity is durable (OBQ/SBQ codes, Himalaya
definitionId with attempt-id exclusion; sha256 over provider+native+stem+
sorted choices; drift-not-new). But there is NO question version/history
table: change detection is one nullable `source_fingerprint_hash` overwritten
per commit. Corpus scale: 7,557 OB questions, 752 specialty/topic pairs
(import summary). One v4 pipeline claim per question (generator+critic, conf
≥ 0.90); tested-vs-explanatory claims are not separated.

**Retrieval (claims not yet in BroBot answers).** BroBot KG retrieval
(`retrieve_brobot_kg_shadow`, kg provider) traverses entities/relationships/
neighborhoods from pinned production releases — claims are absent from those
paths. Claims serve two live surfaces: the OB extension `question-claims`
route (extraction + card evaluation) and the `claim-overlap` matcher
(fingerprint match with tau 0.9 / delta 0.05, top-3 cards, excludes
needs_review links). CasePrep has no SQL DB (Pinecone + local JSONL).

## Direct answers

- `educational_claims` today: **C-leaning hybrid** (source-specific statement
  with semantic-identity machinery attached but not yet converging).
- Card v1→v2 threshold change: representable as CARD V1→CLAIM A,
  CARD V2→CLAIM B via version-pinned links; conflict detection exists only as
  polarity-clash abstention in factory/overlap, not as a durable
  claim↔claim relationship (no such table; `canonical_relationships` has no
  claim endpoint).
- "Same claim" today = same fingerprint under whichever identity function
  wrote the row — the split-brain risk documented above.
- Multi-entity claims, claim↔claim edges (supports/contradicts/supersedes/
  prerequisite), `mentions`/`explains` roles, question versions, and citation
  storage: **all missing**.

## Verdict

SUITABLE WITH CHANGES. The skeleton (versioned sources, immutable claim
versions, deterministic identity, role-locked version-pinned links,
review-before-promotion) is the right architecture and matches the target
model closely. The gaps are additive, not structural: unify claim identity,
add question versioning, decide mentions/citations explicitly, allow
multi-entity claims, and prove live parity. Details in the sibling reports.
