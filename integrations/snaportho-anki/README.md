# SnapOrtho Anki add-on

The public add-on is learner-first: a minimal BroBot panel follows the current
card, preserves card-scoped follow-up conversations, and exposes only two
teaching prompts ("What would an attending ask related to this?" and "What is a
common OITE board trap or question?"). The footer shows Master Deck version
status and opens the install/update hub. Reviewer tools remain role-gated.

This is a source MVP and fake-tested Anki integration boundary. The workspace contained no recoverable add-on, so live Anki/Qt behavior is not claimed. The reviewer package waits for Anki lifecycle hooks, uses the existing device token over scoped HTTPS APIs, resolves GUID plus ordinal without trusting the native ID hint, and never silently changes a local note. Tokens belong in an OS credential-store implementation; the SQLite draft store rejects credential fields.

The separate `learner/` package imports no reviewer code. Package and live disposable-profile smoke testing remain release gates.

Phase 2 adds one shared card workspace across study mode, Browse, and the reviewer dashboard; profile-scoped restart-safe drafts; active KG search; missing-card/KG-expansion proposals; and immutable adjudication. Approval remains `approved_for_incorporation` only and never mutates the master deck or KG.

The reviewer flow is **card-first, not assignment-based**: reviewers curate cards directly (tag, edit, connect to KG, propose expansions) from study mode, Browse, or the dashboard. The dashboard shows a **priority review queue** — meant to be fed by a backend flagging pipeline (duplicates, low-yield, etc.) via `GET /api/anki/reviewer/queue`; when that route is absent the queue degrades to an empty state rather than an error. Trainee **level** and **yield** are structured, controlled-vocabulary tags (`SnapOrtho::Level::*`, `SnapOrtho::Yield::*`) rather than free text, so the published deck stays consistently tagged. All background failures render honest status copy (auth vs. conflict vs. offline) — never a blanket "manual comparison required." Version is single-sourced in `snaportho_reviewer/version.py`.

## Master deck bootstrap + updates

Architecture: **`.apkg` bootstrap (first install) + in-place deltas**. Design: [`DECK_UPDATE_DESIGN.md`](./DECK_UPDATE_DESIGN.md). Implementation detail for note type + builder: [`BOOTSTRAP_IMPLEMENTATION.md`](./BOOTSTRAP_IMPLEMENTATION.md).

### In-Anki first-run (add-on 0.7+)

**Tools → SnapOrtho → Get Started / Master Deck…**

1. **Sign in to SnapOrtho** (browser one-time approval; Keychain token)
2. **Download SnapOrtho Master Deck** (`.apkg`, sha256-verified) → **File → Import** in Anki
3. **Stay up to date** — human update plan; Apply never touches scheduling or `Personal_*` fields

When no release is published, the hub shows an honest empty state (not a generic API error).

```bash
# Pure + package tests
npm run education:anki:bootstrap:test
npm run education:anki:phase3:test
npm run education:anki-reviewer-addon:test
npm run anki:reviewer:package

# Build bootstrap package from a published release (service-role env)
npm run education:anki:bootstrap:build -- --release-id=<uuid> --out=/tmp/SnapOrtho-Master.apkg
# Optionally upload + register anki_deck_release_artifacts row:
npm run education:anki:bootstrap:build -- --release-id=<uuid> --out=/tmp/SnapOrtho-Master.apkg --register=true
```

Device endpoint for the starter package: `GET /api/anki/deck/releases/{id}/artifact/bootstrap_apkg`.
