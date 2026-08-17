# Grok official-deck tag review

Review every note in the published SnapOrtho sync-v2 release and write governed
four-facet assertions. Agents never invent taxonomy and never publish tags.

## Operator loop

```bash
cd snaportho-web

# 1. Live official-deck scorecard
npm run education:anki:tags:audit-official

# 2a. Local screen (no model API): auto-confirm vs LLM queue
npm run education:anki:metadata:pipeline -- \
  --command=screen-official-notes \
  --release-version=0.0.3 \
  --out=tmp/grok-tag-review/0.0.3/screen.json

# 2b. Export only the LLM queue (10 notes/packet, slim briefs)
npm run education:anki:review:sync-v2:prepare -- \
  --release-version=0.0.3 \
  --packet-size=10 \
  --agents=10 \
  --llm-only=tmp/grok-tag-review/0.0.3/screen.json \
  --out=tmp/grok-tag-review/0.0.3/cohort-llm-000001

# 3. Review + verify in Grok (reviewers see *-brief.json only)
/tag-master-deck cohort=snaportho-web/tmp/grok-tag-review/0.0.3/cohort-000002

# 4. Import verified packets as proposed assertions
npm run education:anki:review:import -- \
  --input=tmp/grok-tag-review/0.0.3/cohort-000002/cohort-000002-agent-01-verified.json

# 5. Progress
npm run education:anki:review:status -- \
  --run-key=snaportho-grok-full-review-v1
```

If a batch lease expires before import:

```bash
npm run education:anki:metadata:pipeline -- \
  --command=renew-lease \
  --input=tmp/grok-tag-review/0.0.3/cohort-000002/cohort-000002-agent-01-pending.json
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
- Agents read `*-brief.json` and write a small sidecar of assertions only.
  A separate merge step runs `scripts/apply-tag-review-sidecar.ts`. That script
  fail-closes if identities, card count, or checksums change.
- Default work unit is **5 notes per packet**. One dead reviewer loses 5 notes, not 20.
- Run key is `snaportho-grok-full-review-v1`. Do not mix it with Codex auto-accept runs.
- Import stays fail-closed. Diagnosis and treatment remain `proposed` unless a
  later operator policy accepts them.
- Publish only through a new sync-v2 successor. Do not mutate the current
  official release in place.

## Claude reviewer (run the pipeline in Claude too)

The review/verify judgment can be produced by Claude instead of Grok. The
deterministic flow around it is unchanged: sidecar → `apply-tag-review-sidecar.ts`
→ `*-reviewed.json` → verify → import. Claude-authored sidecars are labeled
`reviewer.provider="anthropic"` (never mislabeled as `xai`), so a run's provenance
stays honest.

Two ways to run it:

- **Automated (API):** one reviewer call per packet, analogous to the OpenAI path.
  Requires `@anthropic-ai/sdk` (`npm i @anthropic-ai/sdk`) and a credential the
  zero-arg client can resolve (`ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, or
  `ant auth login`). Defaults to `claude-opus-5`.

  ```bash
  # per packet: brief in, validated sidecar out (never rewrites pending)
  npm run education:anki:review:claude -- \
    --brief=tmp/grok-tag-review/0.0.3/cohort-XXXXXX/<batch>-brief.json \
    --pending=tmp/grok-tag-review/0.0.3/cohort-XXXXXX/<batch>-pending.json \
    --out=tmp/grok-tag-review/0.0.3/cohort-XXXXXX/<batch>-sidecar.json
  ```

- **In-session:** a Claude Code session acts as the reviewer/verifier directly
  (no API key needed), reading `*-brief.json` and writing sidecars by hand. Use
  this when no key/SDK is configured.

Either way, gate every sidecar (review or verify) before merge with the
fail-closed validator — it checks candidate membership and exact front/back
quotes, which the merge does not:

```bash
npm run education:anki:review:validate-sidecar -- \
  --packet=<pending-or-reviewed.json> --sidecar=<sidecar.json>
```

## First calibration

Export 100 official notes (5 packets of 20) and run `/tag-master-deck` on that
cohort before scaling. Compare Grok output with existing auto-accepted Codex
assertions; those priors are shown on each card and must not be trusted.
