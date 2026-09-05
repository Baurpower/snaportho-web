# Grok ROCK enrichment

Fill `ROCK` and `ROCK_Link` on official SnapOrtho sync-v2 notes from the local
AAOS ROCK chapter PDF library. Agents never call a model API, never fetch
`rock.aaos.org`, and never publish a release.

`ROCK` holds original SnapOrtho teaching bullets grouped by chapter. `ROCK_Link`
is the primary chapter’s catalog URL copied from `rock-library/catalog.json`.
Extra, Text, and tags stay untouched. A card may map to 1–3 chapters; only the
primary goes in `ROCK_Link`. Secondary locators are inline links inside `ROCK`.

Canonical card versions stay untouched. Fills ship as a composed
`anki_resource_field_overlays` row (same unique-published-overlay rule as
Miller’s).

## Operator loop

```bash
cd snaportho-web

# 0. Index local PDFs (no network)
npm run education:anki:rock:index

# 1. Live coverage
npm run education:anki:rock:audit

# 2. Stage A — map cards to 1–3 chapters
npm run education:anki:rock:export-map -- \
  --packet-size=10 \
  --agents=20 \
  --cohort=1 \
  --out=tmp/rock-enrichment/current/map-cohort-000001

# 3. Confirm mappings in Grok
/enrich-rock mode=map cohort=snaportho-web/tmp/rock-enrichment/current/map-cohort-000001

# 4. Stage B — write ROCK + ROCK_Link from mapped chapters
npm run education:anki:rock:export-fill -- \
  --mapped=tmp/rock-enrichment/current/map-cohort-000001 \
  --packet-size=5 \
  --agents=20 \
  --cohort=1 \
  --out=tmp/rock-enrichment/current/fill-cohort-000001

# 5. Write fills in Grok
/enrich-rock mode=fill cohort=snaportho-web/tmp/rock-enrichment/current/fill-cohort-000001

# 6. Dry-run overlay compose (no publish)
npm run education:anki:rock:publish -- \
  --input tmp/rock-enrichment/current/fill-cohort-000001 \
  --overlay-key rock-overlay-v1
```

`--apply` inserts a **draft** overlay. Publish only with
`--apply --confirm=PUBLISH_ROCK_OVERLAY` after coverage and a 25-card spot-check.

## Workflow args

| Arg | Meaning |
|---|---|
| `mode` | `audit`, `map` (default), `fill`, or `verify` |
| `cohort` | Directory of `rock-*-pending.json` packets. Required for map/fill. |
| `packets` | Optional explicit basename list. Skip directory discovery. |
| `verify` | `true` (default) or `false`. |

## Rules

- Source of truth is the published `anki_sync_v2` release plus `tmp/rock-enrichment/index/`.
- Packet contract is `snaportho-rock-enrichment.v1`.
- Agents read `*-brief.json` and write a sidecar only. Merge is
  `npm run education:anki:rock:apply-sidecar`.
- Map work unit is **10 notes/packet**. Fill work unit is **5 notes/packet**.
- Chapter IDs must come from the card’s sealed candidate/mapped list.
- `ROCK_Link` must be exactly `https://rock.aaos.org/coursecontent.aspx?id={primaryId}`.
- Original prose only. Do not copy AAOS sentences, lists, tables, or figures.
- Skip is valid. A wrong chapter is worse than an empty expander.
- Do not edit Extra.

## Retrieval hygiene

Reference/bibliography pages ("Recommended Readings", numbered citation lists)
repeat the chapter's topic words inside citation titles, so BM25 ranks them
above the teaching pages. `rock_extract.py` flags each page with `reference:
true` (see `is_reference_page`), and `rock-retrieval.ts` excludes flagged pages
from page retrieval, chapter-body scoring, and candidate snippets — so a fill
brief never grounds on citations. The catalog reports `referencePages` /
`teachingPages` per chapter; a chapter with zero teaching pages should be
treated as figure/reference-only and skipped.

When reviewing a fill, confirm the brief's `passages` are teaching prose, not a
citation list. If they are all citations, the index needs re-running, not a
hand-written fill.

## First calibration

Index the library (or `--limit` a verified subset). Export 25 official notes
(5 fill packets of 5 after a map cohort) and run `/enrich-rock` before scaling.
Inspect `ROCK` against the PDF pages in the brief and confirm `ROCK_Link` is
the catalog URL of the primary chapter.
