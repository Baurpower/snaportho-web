# Grok Orthobullets enrichment

Fill `Orthobullets` and `Orthobullets_Link` on official SnapOrtho sync-v2 notes.
Agents browse public Orthobullets topic pages. They never call a SnapOrtho API
and never publish a release.

The field contract is `curated_bullets_plus_link`: original SnapOrtho teaching
bullets plus a bare topic URL. Do not copy Orthobullets sentences, lists, or
figures into the note.

Canonical card versions and tag mappings stay untouched. 0.0.5 is a successor
sync-v2 release built by overlaying those two fields onto the current official
notes.

## Operator loop

```bash
cd snaportho-web

# 1. Live coverage
npm run education:anki:orthobullets:audit

# 2. Export empty/missing notes (5 notes/packet, 20 packets)
npm run education:anki:orthobullets:export -- \
  --packet-size=5 \
  --agents=20 \
  --cohort=1 \
  --out=tmp/orthobullets-enrichment/current/cohort-000001

# 3. Review + verify in Grok
/enrich-orthobullets cohort=snaportho-web/tmp/orthobullets-enrichment/current/cohort-000001

# 4. Dry-run successor plan (no publish)
npm run education:anki:orthobullets:materialize -- \
  --input=tmp/orthobullets-enrichment/current/cohort-000001 \
  --successor-version=0.0.5
```

Write a draft 0.0.5 only after the full deck is verified:

```bash
npm run education:anki:orthobullets:materialize -- \
  --input=tmp/orthobullets-enrichment/current \
  --successor-version=0.0.5 \
  --apply
```

`--apply` inserts new `anki_sync_v2_note_versions` and a **draft** release. It
does not publish. Do not mark 0.0.5 published until coverage and a spot-check
pass.

## Workflow args

| Arg | Meaning |
|---|---|
| `mode` | `audit`, `review` (default), or `verify` |
| `cohort` | Directory of `*-pending.json` packets. Required for `review`. |
| `packets` | Optional explicit basename list. Skip directory discovery. |
| `verify` | `true` (default) or `false`. |

## Rules

- Source of truth is the published `anki_sync_v2` release.
- Packet contract is `snaportho-orthobullets-enrichment.v1`.
- Agents read `*-brief.json` and write a sidecar only. Merge is
  `npm run education:anki:orthobullets:apply-sidecar`.
- Default work unit is **5 notes per packet**, 20 packets per Grok run.
- Skip is valid. A wrong topic is worse than an empty resource expander.
- Topic URLs must be `https://www.orthobullets.com/{section}/{id}/{slug}`.
- Do not rebuild 0.0.5 from `canonical_card_versions`; that would drop the
  overlay and stale tag mappings.

## First calibration

Export 25 official notes (5 packets of 5) and run `/enrich-orthobullets` on that
cohort before scaling. Inspect filled bullets against the live Orthobullets page
and the card cloze. Then raise `--agents` toward a 100-note cohort.
