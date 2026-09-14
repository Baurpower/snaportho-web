# Grok Nailed It Ortho enrichment

Fill `Nailed_It` and `Nailed_It_Link` on official SnapOrtho sync-v2 notes from a
local catalog of Nailed It Ortho episodes (Libsyn RSS + WordPress show notes).
Agents never call a model API, never fetch `naileditortho.com` during review,
and never publish a release.

`Nailed_It` holds the episode title, optional timestamp, and 1–3 original
SnapOrtho takeaways. `Nailed_It_Link` is the primary episode’s
`https://naileditortho.com/{slug}/` URL. Extra, Text, and tags stay untouched.
A card maps to 1 episode (optional secondary); only the primary goes in
`Nailed_It_Link`.

Canonical card versions stay untouched. Fills ship as a composed
`anki_resource_field_overlays` row (same unique-published-overlay rule as
ROCK / Miller’s).

Do not put other podcasts in this field. Use `Podcasts` / `Podcasts_Link` later.

## Operator loop

```bash
cd snaportho-web

# 0. Index RSS + WordPress (network). --fixture=... skips the network.
npm run education:anki:nailed-it:index
# npm run education:anki:nailed-it:index -- --limit=25

# 1. Live coverage
npm run education:anki:nailed-it:audit

# 2. Stage A — map cards to 1–2 episodes
npm run education:anki:nailed-it:export-map -- \
  --packet-size=10 \
  --agents=400 \
  --cohort=1 \
  --out=tmp/nailed-it-enrichment/current/map-full

# 2b. Conservative auto-map of the full cohort (or /enrich-nailed-it for a Grok review slice)
npm run education:anki:nailed-it:auto-map -- \
  --cohort=tmp/nailed-it-enrichment/current/map-full
# --force=true to remap after changing decideNailedItMap

# 4. Stage B — write Nailed_It + Nailed_It_Link from mapped episodes
npm run education:anki:nailed-it:export-fill -- \
  --mapped=tmp/nailed-it-enrichment/current/map-cohort-000001 \
  --packet-size=5 \
  --agents=20 \
  --cohort=1 \
  --out=tmp/nailed-it-enrichment/current/fill-cohort-000001

# 5. Write fills (auto, or Grok /enrich-nailed-it mode=fill)
npm run education:anki:nailed-it:auto-fill -- \
  --cohort=tmp/nailed-it-enrichment/current/fill-full

# 6. Dry-run overlay compose (no publish)
npm run education:anki:nailed-it:publish -- \
  --input tmp/nailed-it-enrichment/current/fill-cohort-000001 \
  --overlay-key nailed-it-overlay-v1
```

`--apply` inserts a **draft** overlay. Publish only with
`--apply --confirm=PUBLISH_NAILED_IT_OVERLAY` after coverage and a 25-card
spot-check.

## Workflow args

| Arg | Meaning |
|---|---|
| `mode` | `audit`, `map` (default), `fill`, or `verify` |
| `cohort` | Directory of `nailed-it-*-pending.json` packets. Required for map/fill. |
| `packets` | Optional explicit basename list. Skip directory discovery. |
| `verify` | `true` (default) or `false`. |

## Rules

- Source of truth is the published `anki_sync_v2` release plus `tmp/nailed-it-enrichment/index/`.
- Packet contract is `snaportho-nailed-it-enrichment.v1`.
- Agents read `*-brief.json` and write a sidecar only. Merge is
  `npm run education:anki:nailed-it:apply-sidecar`.
- Map work unit is **10 notes/packet**. Fill work unit is **5 notes/packet**.
- Episode IDs must come from the card’s sealed candidate/mapped list.
- `Nailed_It_Link` must be exactly `https://naileditortho.com/{slug}/`.
- Original prose only. Do not copy show-note sentences, guest bios, or transcripts.
- Skip is valid. A wrong episode is worse than an empty expander.
- Do not edit Extra.
- Do not guess timestamps. Omit `startSec` until a transcript is in the brief.
- RSS-only episodes (no `naileditortho.com` URL) cannot be a primary. Skip with
  `rss_only_no_link`.
- Finance / OrthoBiz / pure career episodes are `clinical: false` and are not
  retrieved for mapping.

## Catalog facts

Libsyn RSS is the complete episode list (371 as of 2026-09-12). WordPress has
223 posts; title/episode-number join attaches a trusted `naileditortho.com`
URL to 186 of them. The rest stay `rss-only` and cannot be a fill primary.
`index/status.json` reports `joined`, `rssOnly`, `clinical`, and `linkable`.
Ambiguous clinical vs career rows go to `index/needs-review.jsonl`.

~370 episodes vs ~3,650 official notes: many cards will never have an honest
episode. Skip is success.

## Candidate recall (map stage)

Episode candidates come from two retrievals, unioned so tags can only add:

- **Baseline**: the plain query (`Text` + `Extra`) returns the top 8; always kept.
- **Tag-enriched**: governed-tag leaves fill remaining slots up to 12.

Clinical-only retrieval is the default, so Finance/OrthoBiz do not appear.

## First calibration

Index with `--limit=25` or the full catalog. Export 25 official notes
(5 fill packets of 5 after a map cohort) and run `/enrich-nailed-it` before
scaling. Inspect `Nailed_It` against the show-note bullets in the brief and
confirm `Nailed_It_Link` is the WP episode URL.
