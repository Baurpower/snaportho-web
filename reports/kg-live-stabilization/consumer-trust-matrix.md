# Consumer Trust Matrix (Phase C)

Trusted definition (single source): `is_active AND review_status='approved'
AND status IN ('reviewed','canonical')` — `trusted-entity.ts` (app) and
`is_trusted_canonical_entity()` + `trusted_canonical_entities` view (SQL,
migration `20260927270000`, pending apply).

Live counts for scale: 1,087 trusted of 1,295 entities (1,084 reviewed+
approved, 3 canonical+approved, 208 unreviewed+reviewed, 0 proposed/draft/
inactive). The old `status='canonical'` test exposed only 3 rows.

| Consumer | Code path | Old filter | New filter | Proposed visible? | Reviewed visible? | Canonical visible? | Deprecated visible? | Safe? |
|---|---|---|---|---|---|---|---|---|
| Reviewer entity search | `reviewer/kg/entities/route.ts` | active+canonical | shared trusted | NO | YES | YES | NO | YES |
| Reviewer KG draft (2 queries) | `reviewer/kg/draft/route.ts` | active+canonical | shared trusted | NO | YES | YES | NO | YES |
| Resource search entity fetch | `reviewer/resource-search/route.ts` | active+canonical | shared trusted | NO | YES | YES | NO | YES |
| Improvements search+backfill (4 queries) | `reviewer/kg/improvements/_lib.ts` | active+canonical | shared trusted | NO | YES | YES | NO | YES |
| Incorporation entity check | `anki/incorporation/_lib.ts` | active+canonical | shared trusted | NO | YES | YES | NO | YES |
| Workspace proposal entity check | `workspace/proposals/route.ts` | active+canonical | shared trusted | NO | YES | YES | NO | YES |
| Workspace proposal validation | `workspace/proposals/[id]/route.ts` | in-memory active+canonical | `isTrustedCanonicalEntity` | NO | YES | YES | NO | YES |
| Workspace review gate | `workspace/proposals/[id]/review/route.ts` | active+canonical | shared trusted | NO | YES | YES | NO | YES |
| Reviewer assignment entity flag | `reviewer/_lib.ts` | in-memory active+canonical | `isTrustedCanonicalEntity` | NO | YES | YES | NO | YES |
| Resolve-card mappings | `workspace/resolve-card/route.ts` | in-memory active+canonical | `isTrustedCanonicalEntity` | NO | YES | YES | NO | YES |
| BroBot KG lookup | `brobot/orthobullets/kg-lookup.ts` | `is_active` on links only | links + `!inner` trusted-entity join | NO | YES | YES | NO | YES |
| Claim factory resolution | `card-claim-factory.ts` | excluded retired only | also excludes proposed/draft | NO | YES* | YES | NO | YES |
| Backfill entity index | `card-claim-deck-loader.ts` ENTITY_INDEX_SQL | `is_active` only | trusted WHERE clause | NO | YES | YES | NO | YES |
| Incorporation SQL guard | `incorporate_anki_workspace_proposal` (via 20260927270000) | status=canonical | `is_trusted_canonical_entity()` | NO | YES | YES | NO | YES (pending migration) |
| OrthoBullets v4 resolver/pipelines | `20260926203601`, `20260926220000`, `20260927160050` | already reviewed\|canonical+approved | unchanged (reference) | NO | YES | YES | NO | YES |
| Release/publication scripts | `kg-beta-production-release.ts`, `validate-anki-deck-publication-readiness.ts`, fixture scripts | denylist (exclude retired/rejected) | UNCHANGED (see note) | POSSIBLE | YES | YES | NO | CONDITIONAL |
| Overlap matcher | `claim-overlap-matcher.ts` | pure fn; rejects rejected/superseded/needs_review links | unchanged | via inventory | via inventory | via inventory | NO | CONDITIONAL on inventory |

\* Factory rows lack `review_status`; unreviewed+reviewed rows still resolve
there. The backfill index (now trusted-only) is the enforcement point for
pipeline reads; live review surfaces query trusted-only.

## BroBot trust boundary answers (Phase C)

- Proposed entities in a production release: NO — no release path links
  proposed rows (0 proposed rows exist live); BroBot now additionally joins
  the trusted test, so even a bad link cannot surface one.
- Reviewed-but-approved entities eligible: YES (1,084 rows) — this was the
  population the old test hid.
- Deprecated excluded: YES everywhere (retired set + trusted allowlist).
- Rejected excluded: YES (review_status gate; 0 rejected entities live).
- Alias to unapproved target: new `canonical_entity_aliases` resolves only
  via approved aliases to trusted targets (verification A4 gates it);
  legacy `source_aliases` carries zero canonical_entity rows, so no legacy
  alias path can surface anything.

## Notes

- Release scripts keep denylist semantics intentionally: they validate
  operator-chosen cohorts, not open-ended reads. Any future open-ended
  release-membership query must use the shared trusted definition.
- `draft/route.ts:40` keeps a `?? "canonical"` display default on a NOT NULL
  column (dead branch); left untouched, recorded here.
