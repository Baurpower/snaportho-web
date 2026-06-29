# Orthobullets BroBot — Privacy Audit (2026-06-29)

Scope: `src/app/api/brobot/orthobullets/explain/route.ts` and everything it
calls (`src/lib/brobot/orthobullets/*`, `src/lib/brobot/usage.ts`,
`src/lib/brobot/device-link.ts`), plus the extension's content script and
side panel.

## Finding: raw Orthobullets content is not persisted

Traced every write path reachable from the `/api/brobot/orthobullets/explain`
route:

- **`brobot_messages`** — not written by this route at all. Only the
  separate BroBot chat route (`src/app/api/brobot/chat/route.ts`) writes to
  this table, and the Orthobullets explain flow doesn't touch it.
- **Evaluator snapshots** (`src/app/api/cron/brobot-evaluate/route.ts` /
  `brobot_quality_evaluator` migration) — only consume `brobot_messages`;
  unreachable from the Orthobullets explain flow.
- **`brobot_usage_events`** (`src/lib/brobot/usage.ts:recordUsageEvent`) —
  columns are `user_id`/`guest_id`, `feature`, `outcome`, `latency_ms`,
  `ip_hash`, `user_agent_hash`. No question content, no free text.
- **Daily usage counter** (`increment_brobot_usage` RPC) — increments an
  integer counter keyed by user/guest/date/feature. No content.
- **KG lookup** (`src/lib/brobot/orthobullets/kg-lookup.ts`) — read-only;
  looks up existing `external_questions` / curriculum mapping rows by
  `questionId`. Writes nothing.
- **Logs** (`console.log`/`console.error` in `explain/route.ts` and
  `kg-lookup.ts`) — only log `requestId`, a truncated `userIdPrefix`,
  `questionId`, SHA-256 hashes of `stem`/`explanationText` (16 hex chars,
  via `hashText()`), `answerChoiceCount`, `warningCount`, `latencyMs`, and
  boolean/error-message metadata. Raw stem/choice/explanation text is never
  logged.
- **OpenAI call** — raw page context (stem, choices, explanation) is sent to
  the model as the prompt (`buildOrthobulletsExplainMessages`), which is
  expected and necessary to generate the explanation, but this is a
  pass-through API call, not persistence on our side.

## Extension side

- `src/content/extractor.ts` extracts page context **in the browser** and
  holds it in memory; nothing is sent until the user clicks "Explain with
  BroBot" (enforced by `App.tsx`'s explicit trigger, not page-load).
- Image extraction is metadata-only (`src`, `alt`, `width`, `height`) — no
  pixel data, no OCR. Verified in `extractor.test.ts` (every image's `src`
  must be an absolute URL and must never be a `data:` URI).

## Conclusion

No exception found. Raw Orthobullets question/answer/explanation content is
never written to `brobot_messages`, evaluator snapshots, analytics, or logs
in this flow — only hashes, IDs, counts, and KG metadata are persisted. This
matches the intended privacy model. If this changes (e.g. a future feature
persists conversation history for Orthobullets explanations), this document
should be updated and the new write path should hash or omit raw content
the same way `explain/route.ts` already does.
