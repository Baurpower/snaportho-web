# Orthobullets BroBot Extension

A Chrome MV3 side-panel extension that lets a linked SnapOrtho user get a
BroBot explanation of an Orthobullets review-page question on demand. This
is a tutoring aid layered on top of Orthobullets — it never auto-scrapes,
never sends data before the user clicks, and never persists raw question
content server-side (see [Privacy / IP constraints](#privacy--ip-constraints)).

Current scope is intentionally narrow: **explain this question**. Follow-up
chat, conversation persistence, and Anki generation are explicitly out of
scope until this extraction pipeline is validated and stable.

## Local setup

```bash
npm install
```

No extension-specific dependencies beyond the repo root `node_modules`
(the extractor tests use `linkedom` for real-DOM parsing, already a root
devDependency).

## Build

```bash
npm run extension:orthobullets:build
```

This compiles `src/` with `tsc`, copies `sidepanel.html` plus the packaged
BroBot icon assets, and writes a `manifest.json` into
`extensions/orthobullets-brobot/dist/`, injecting the backend origin into
`host_permissions`. The origin defaults to `http://localhost:3000` and can
be overridden:

```bash
BROBOT_EXTENSION_APP_ORIGIN=https://app.snaportho.com npm run extension:orthobullets:build
```

Other scripts:

```bash
npm run extension:orthobullets:watch         # tsc --watch for iterative dev
npm run extension:orthobullets:test          # extractor fixtures + auth URL regression test
npm run extension:orthobullets:health-report # extraction health report (JSON + Markdown)
```

## Load unpacked in Chrome

1. Run the build (above) — output goes to `extensions/orthobullets-brobot/dist/`.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select `extensions/orthobullets-brobot/dist/`.
5. Pin the extension, then click its icon (or use the side panel toggle) on
   any `orthobullets.com` page.
6. After editing source, re-run the build and click the refresh icon on the
   extension card in `chrome://extensions`.

## Authentication / device-link flow

The extension never has its own login form. Instead:

1. On an unlinked extension, the side panel shows **Link to SnapOrtho**.
2. Clicking it calls `/api/brobot/extension/auth/start-link`, opens a new
   tab to the returned `approvalUrl` (a page in the main SnapOrtho web app
   where the *already-authenticated* user approves the link), and starts
   polling `/api/brobot/extension/auth/poll-link` every 3s.
3. Once approved, the poll response includes a `deviceToken`, which is
   stored in `chrome.storage.local` (key `snaportho_extension_device_token`)
   and sent as the `x-snaportho-extension-token` header on all subsequent
   API calls (see `src/lib/brobot/device-link.ts` server-side).
4. **Unlink** calls `/api/brobot/extension/auth/revoke-device` and clears
   the stored token.

No password, API key, or session cookie is ever entered into the extension
UI directly.

## Testing workflow

```bash
npm run extension:orthobullets:test
```

Runs `src/content/extractor.test.ts` against:
- **Real Orthobullets fixtures** (`fixtures/ob-review-*.html`) — the source
  of truth for extraction correctness when present. Each is parsed with a
  real DOM (`linkedom`) and asserted against: question ID, breadcrumbs,
  stem, answer choices, selected/correct answer, explanation, percent
  distribution (when present), images (when present), and that
  `extractionWarnings` is always an array (missing optional fields produce
  warnings, never thrown errors). **These files are gitignored and never
  committed** — they're copyrighted Orthobullets content, captured manually,
  kept only on a developer's machine for as long as needed, then deleted
  (see [Privacy / IP constraints](#privacy--ip-constraints)). If a fixture
  file referenced in `REAL_FIXTURES` isn't present locally, its case is
  **skipped with a console note**, not failed — `npm test` always exits 0
  whether or not you have real fixtures captured.
- A **Current Test real-fixture slot** (`fixtures/ob-currenttest-unanswered.html`) —
  also gitignored/manual-only, used to validate the unanswered
  `/currenttest?...` layout once captured locally. When absent it is
  skipped, just like the review fixtures.
- A **synthetic fixture** (`fixtures/synthetic-review-page.html`, committed
  — hand-written, not real Orthobullets content) — kept only as a minimal
  hand-mocked-DOM sanity check and a missing-field regression test
  (everything absent ⇒ multiple warnings, no crash). It is not primary
  coverage; do not add new assertions there instead of a real fixture.
- A **synthetic Current Test fixture** (`fixtures/synthetic-current-test-page.html`,
  committed) — used to lock in progressive extraction for unanswered
  Current Test pages: stem/choices/topic/images should extract, while
  missing preferred-response/correct-answer fields become warnings instead
  of a hard failure.
- A small **auth URL regression test** (`src/lib/brobot-anki/url.test.ts`)
  that verifies the device-link approval URL honors the extension-supplied
  base URL during local QA instead of falling back to the production site.

To get full real-fixture coverage and a non-trivial health report, capture
fixtures locally (see below) before running these commands — they'll just
report fewer cases covered if you don't.

### Fixture-based regression testing

If Orthobullets changes their markup, extraction will silently degrade
unless you add a fixture that reproduces it. To capture a new fixture:

1. **Manual capture only — do not bulk-scrape.** Open the real Orthobullets
   review page you want to capture in Chrome while logged in.
2. Open DevTools → Console, run:
   ```js
   copy(document.documentElement.outerHTML)
   ```
3. Paste the result into a new file at
   `extensions/orthobullets-brobot/fixtures/ob-review-q<id>.html`.
4. Add a case to `REAL_FIXTURES` in `src/content/extractor.test.ts` describing
   what's expected (image-heavy / text-only / OITE-style / missing fields,
   etc.) and run the tests.
5. Run the health report (below) to confirm the new fixture's extraction
   rate and check for any selector regressions across all fixtures.

### Selector health report

```bash
npm run extension:orthobullets:health-report
```

Runs the extractor against every `ob-review-*.html` fixture and writes:
- `reports/orthobullets-extraction-health.json`
- `reports/orthobullets-extraction-health.md`

Each fixture's entry lists fields found/missing, extraction warnings,
matched selectors (so you can see exactly which fallback selector fired),
and a per-fixture success percentage. Run this after any change to
`src/content/selectors.ts` or `src/content/extractor.ts`, and whenever you
add a new fixture, to catch regressions immediately rather than discovering
them in production. Selector and extractor versions are tracked separately
(`SELECTOR_SET_VERSION` in `selectors.ts`, `EXTRACTOR_VERSION` in
`extractor.ts`) so a report can be correlated with the code revision that
produced it.

### Manual extension QA (do this before shipping any extraction/UI change)

With the unpacked extension loaded (see above) and pointed at a local or
staging backend:

1. Open a real Orthobullets review page → open the side panel → confirm it
   renders without sending any network request yet (check the Network tab —
   nothing to `/api/brobot/...` should fire until you click).
2. Click **Explain with BroBot** → confirm the debug summary (click "Show
   debug info") matches what's visibly on the page (question ID,
   breadcrumbs, choice count, selected/correct keys).
3. Confirm the structured explanation renders (Tested Concept, Why Correct,
   Why Wrong, Key Trap, OITE Takeaway, Study Next, optional Anki card).
4. Test the unlink/link flow end-to-end.
5. Exhaust the daily quota (or stub the response) and confirm the
   quota-exceeded state renders without a retry button (it's not
   retryable until the next day).
6. Trigger a network failure (e.g. stop the backend) and confirm the
   network-failure state renders with a working **Retry** button.

## Debug mode

Every linked, supported-page state shows a **Show debug info** toggle in
the side panel (no env flag needed — useful for diagnosing a live layout
change without a dev build). It exposes:

- `extractorVersion`
- matched question ID / topic ID / breadcrumbs
- a stem preview, choice count, selected/correct answer keys
- percent-distribution row count and image count
- `extractionWarnings`
- `matchedSelectors` — which selector in each fallback list actually fired

When running against `localhost`/`127.0.0.1` (`isDevelopmentMode()` in
`src/shared/runtime.ts`), this debug panel is shown automatically.

## Privacy / IP constraints

- **Nothing is sent until the user clicks "Explain with BroBot."** Page
  extraction happens in the content script and stays in memory in the side
  panel until that explicit action.
- **Images are metadata-only.** The extractor never does OCR and never
  reads pixel data — only `src` (resolved from Orthobullets' CSS
  `background-image` div pattern), `alt`, `width`, `height`. See
  `extractImages()` in `src/content/extractor.ts`.
- **The backend never persists raw question content.** The
  `/api/brobot/orthobullets/explain` route logs only SHA-256 hashes
  (truncated to 16 hex chars) of the stem/explanation text, plus IDs and
  counts — never the raw stem, choices, or explanation. Usage tracking
  (`brobot_usage_events`, the daily counter RPC) stores only user/guest id,
  feature, outcome, latency, and hashed IP/UA. See
  `docs/orthobullets-brobot-privacy-audit-2026-06-29.md` at the repo root
  for the full trace of every write path.
- **Linked cards content is never scraped.** Orthobullets loads the actual
  "Review Cards" list via AJAX; the extractor only reads the static count
  label and visible topic/OITE links, never the lazy-loaded card content.
- Do not bulk-scrape Orthobullets for fixtures or any other purpose — all
  fixture capture is manual, one page at a time, by a logged-in human.

## Known limitations

- Topic ID extraction falls back to parsing the first breadcrumb link's
  href (`/<specialty>/<topicId>/<slug>`) since the question's own URL
  (`/question/<id>`) doesn't carry a topic segment. If Orthobullets removes
  breadcrumb hrefs, topic ID will be unavailable (a warning is recorded,
  extraction does not fail).
- Current Test pages are now handled progressively: stem/choices/topic data
  can still extract before the preferred response is visible, but the side
  panel intentionally blocks the full BroBot explanation until the user has
  answered or entered review mode. Capture a real
  `ob-currenttest-unanswered.html` fixture locally to validate against the
  live DOM before shipping further extractor changes.
- The extractor is still not validated against topic pages, search results,
  or unrelated Orthobullets layouts outside question/review/current-test
  flows.
- No follow-up chat, conversation history, or Anki card generation is
  implemented yet — `ankiCard` in `OrthobulletsExplainResponse` is
  model-generated per request and not persisted or exported.
