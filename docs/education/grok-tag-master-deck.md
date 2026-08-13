# Grok official-deck tag review

Review every note in the published SnapOrtho sync-v2 release and write governed
four-facet assertions. Agents never invent taxonomy and never publish tags.

## Operator loop

```bash
cd snaportho-web

# 1. Live official-deck scorecard
npm run education:anki:tags:audit-official

# 2. Export the next unprocessed official-note cohort
npm run education:anki:review:sync-v2:prepare -- \
  --release-version=0.0.3 \
  --cohort-size=200 \
  --agents=10 \
  --taxonomy-limit=20 \
  --out=tmp/grok-tag-review/0.0.3/cohort-000001

# 3. Review + verify in Grok
/tag-master-deck cohort=tmp/grok-tag-review/0.0.3/cohort-000001

# 4. Import verified packets as proposed assertions
npm run education:anki:review:import -- \
  --input=tmp/grok-tag-review/0.0.3/cohort-000001/cohort-000001-agent-01-verified.json

# 5. Progress
npm run education:anki:review:status -- \
  --run-key=snaportho-grok-full-review-v1
```

Workflow args:

| Arg | Meaning |
|---|---|
| `mode` | `audit`, `review` (default), or `status` |
| `cohort` | Directory of `*-pending.json` packets. Required for `review`. |
| `packets` | Optional explicit basename list. Skip directory discovery. |
| `verify` | `true` (default) or `false`. |

## Rules

- Source of truth is the published `anki_sync_v2` release, joined to
  `canonical_card_versions` by note GUID.
- Packet contract is `snaportho-portable-tag-review-packet.2`.
- Run key is `snaportho-grok-full-review-v1`. Do not mix it with Codex auto-accept runs.
- Import stays fail-closed. Diagnosis and treatment remain `proposed` unless a
  later operator policy accepts them.
- Publish only through a new sync-v2 successor. Do not mutate the current
  official release in place.

## First calibration

Export 100 official notes (5 packets of 20) and run `/tag-master-deck` on that
cohort before scaling. Compare Grok output with existing auto-accepted Codex
assertions; those priors are shown on each card and must not be trusted.
