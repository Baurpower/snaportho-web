# SnapOrtho Anki add-on: full audit and implementation plan

Date: 2026-07-19 (America/Los_Angeles)

Scope: the accessible SnapOrtho repositories and git history, the current BroBot Anki web routes and database contract, the reconstructed Anki import/canonical-card model, and the production-baseline evidence already captured in this worktree. This audit did not mutate production, create launch routes, or claim a client capability that cannot be exercised.

## Final decision

The add-on itself does not exist in a recoverable, maintainable form in the supplied workspace. There is no true add-on root, `__init__.py`, add-on `manifest.json`, packaged `.ankiaddon`, client HTTP implementation, local token store, poller, resolver, Browser action, or acknowledgement implementation. The recoverable foundation is server-side only: short-code linking, hashed device tokens, six BroBot Anki operational tables, imported Anki note/card identity, canonical cards and versions, and four verified Patellar Instability source identities.

The production milestone is therefore **not launch-ready**. The correct next move is to build a small add-on client first, prove GUID-plus-ordinal resolution and exact Browser selection behind testable boundaries, then add the launch queue and API with that real client. The brief explicitly prohibits creating launch APIs before a real client can exercise them, so no launch infrastructure was added in this audit.

Verdict: `ANKI_ADDON_AUDITED`

## 1. Executive audit

### Current state

| Area | Finding | Classification |
|---|---|---|
| Add-on source/package | No add-on source or distributable was found | missing |
| Add-on entry point/lifecycle | No client code exists | missing |
| Device linking server | Four unversioned Anki routes exist and a parallel extension flow uses the same tables | partial/unsafe |
| Token handling server | Raw tokens are returned once and only SHA-256 hashes are stored | partial |
| Installation/profile identity | Existing device table has display-oriented fields but no enforced installation/profile/token binding | missing |
| Launch poll/claim/ACK | No launch table, API, state machine, or client exists | missing by design |
| Canonical identity | Canonical card → active version → imported card → note GUID + ordinal is present; four pilot identities are complete and unique | complete server-side |
| Local card resolution | No resolver exists | missing |
| Browser selection | No GUI action exists | missing |
| Study-session reporting | Prep, pending, study-session, and session-match routes exist; there is no evidence of a live add-on using them | partial |
| Production schema | Six tables exist, but the checked-in reconciliation migration is not deployed and the verifier reports expected drift | blocked on reviewed deployment |
| Cross-platform evidence | Zero real launches and no client compatibility tests | missing |

### Reusable work

Retain and harden:

- the authenticated browser approval concept and 15-minute short-code UX;
- random raw device credentials with server-side token hashing;
- explicit revocation and relinking semantics;
- canonical card UUIDs and non-destructive canonical card versions;
- imported note GUID, card ordinal, and native card ID hint;
- the four verified Patellar Instability pilot identities;
- the service-route-only database boundary in the pending schema reconciliation;
- the existing prep/study-session surfaces as a later feature, outside the launch critical path.

Replace or substantially refactor:

- duplicated Anki/extension linking and authentication helpers;
- non-transactional link exchange;
- implicit token-prefix/header client separation;
- device records that do not distinguish installation from profile;
- any future design that treats `/pending` prep requests as launch commands;
- any proposed monolithic Python file or custom unmanaged worker thread.

### Highest risks

1. **Absent client reality.** Supported Anki versions, threading, storage, Browser behavior, packaging, and update behavior are all currently unknowable.
2. **False success.** Without separate claim, resolution, Browser-selection, and ACK facts, the web product could report an opened card that was only queued.
3. **Token confusion.** Browser-extension and Anki tokens live in the same table; their prefixes and header names are not checked as scopes.
4. **Stranded link exchange.** Token insertion and link consumption are separate writes. A failure between them can create a valid token that the initiating client never receives and cannot recover.
5. **Lifecycle/threading failure.** `mw.col` is unavailable during early add-on import and changes on profile switch; synchronous network work freezes Anki, and Qt work off the main thread can crash it.
6. **Fragile GUI assumptions.** Exact Browser selection uses APIs that must be isolated behind a compatibility adapter and tested against named Anki releases.
7. **Premature backend commitment.** Creating a queue before the client contract is executable would repeat the reconstructed, unproven architecture problem.

### Production-readiness verdict

Audit and implementation planning are complete. Canonical launch implementation and real launch gates are not. The absence of a client is an implementation gap, not an external dependency that prevents producing this plan; consequently the correct required verdict is `ANKI_ADDON_AUDITED`, not `ANKI_ADDON_BLOCKED`.

## 2. Inventory and source-recovery result

### Search coverage

The audit searched:

- this repository and sibling projects under `/Users/alexbaur/snaportho_dev`;
- reachable and unreachable git history, including commits named for Anki fixes;
- configured remote branches and submodule configuration;
- common user artifact locations and Spotlight-indexed filenames in the earlier recovery pass;
- Python files, `__init__.py`, `manifest.json`, `.ankiaddon`, ZIP, BroBot/SnapOrtho token headers, polling, card lookup, and Browser/reviewer terms.

No add-on source or distribution was found. Python files in `snaportho-caseprep` are server/data tooling, not Anki add-on modules. `extensions/orthobullets-brobot` is a browser extension. Its `manifest.json` is not Anki metadata. Commits `caf63ac`, `142fc00`, and `dbbd9e7` contain web/API changes only. There are no configured submodules and the only remote branches found were `main` and `caseprep`.

### Requested inventory answers

| Question | Answer |
|---|---|
| True add-on root | none found |
| Supported Anki versions | none declared or evidenced |
| Python expectation | none declared; target must use Anki's embedded Python |
| External client dependencies | none recoverable |
| Package vs loose modules | not applicable; no client files |
| Abandoned implementations | no add-on implementation found; only duplicated server linking families |
| Packaged artifact differs from source | no packaged artifact found |
| Existing usable client bones | none |

The prior read-only production baseline found 53 device-link rows and 40 device-token rows, but zero add-on-device, prep-request, study-session, or session-match rows. That is evidence that server-side linking has been used by some device-linked client; it is not evidence that an Anki add-on has registered, resolved a card, or completed a study workflow.

The four server-side pilot identities are:

| Canonical card ID | Active source binding | Note GUID | Card ordinal | Native ID hint | Active identity matches |
|---|---:|---:|---:|---:|---:|
| `10eb1d14-4517-4a95-8563-f5d03a97a9c7` | yes | present | 0 | present | 1 |
| `1d2deaeb-534c-4260-9981-a885a0cf7ec9` | yes | present | 0 | present | 1 |
| `674a6a2c-a4b8-46d3-8c10-b66a6a37b1c9` | yes | present | 0 | present | 1 |
| `a9cf7f46-57b8-41b2-a575-0c790a2d6c6e` | yes | present | 0 | present | 1 |

This proves only server identity completeness/uniqueness. It does not prove those identities exist in any learner's local collection or that Anki can select them.

The detailed earlier recovery and production evidence is in [educational-content-patellar-instability-unblock-2026-07-19.md](./educational-content-patellar-instability-unblock-2026-07-19.md).

## 3. Current architecture map

### Actual end-to-end state

```text
Anki startup                 missing
  → client authentication    missing
  → launch polling           missing
  → command processing       missing
  → collection resolution    missing
  → Browser action           missing
  → launch acknowledgement   missing

Website/add-on linking server  partial
Prep-request polling server    present, but it is not a launch queue
Study-session reporting server present, unproven by a live client
Canonical/source identity      present server-side
```

### Existing file map and disposition

| Existing file | Current responsibility | Decision |
|---|---|---|
| `src/app/api/brobot-anki/_lib.ts` | Anki request parsing, browser/bearer/device authentication, token/hash/code helpers | **replace after migration** with the shared device-link library plus enforced client scopes; do not maintain a second auth implementation |
| `src/lib/brobot/device-link.ts` | Similar generic device-link implementation used by the browser extension | **refactor/retain** as the one shared implementation; add client kind, scopes, compatibility headers, and transactional exchange helpers |
| `src/app/api/brobot-anki/auth/start-link/route.ts` | Creates a 40-bit display code, 15-minute link row, and approval URL | **refactor** to versioned contract, rate limiting, installation/profile request identity, and exchange-secret hash |
| `src/app/api/brobot-anki/auth/approve-link/route.ts` | Authenticated website approval and account binding | **retain/refactor**; preserve device-token prohibition and add client-kind checks |
| `src/app/api/brobot-anki/auth/poll-link/route.ts` | Exchanges an approved code for a one-time raw Anki token | **replace internals** with one transactional server operation requiring the client-held exchange verifier |
| `src/app/api/brobot-anki/auth/revoke-device/route.ts` | Revokes current token or a website-supplied raw token | **refactor** website revocation to use a user-owned device/token ID; a website should not need the raw secret |
| `src/app/api/brobot/extension/auth/*` | Parallel browser-extension link flow over the same tables | **retain behavior, remove duplication** through shared versioned primitives; preserve its public compatibility surface during migration |
| `src/app/api/brobot-anki/pending/route.ts` | Returns up to ten pending **prep requests** | **retain/rename later** to make its domain explicit; never reuse it for launch commands |
| `src/app/api/brobot-anki/prep/route.ts` | Creates a CasePrep request | **retain** outside the launch critical path |
| `src/app/api/brobot-anki/study-session/route.ts` | Records local study-session summary | **retain** for later client support; do not block V1 launch on it |
| `src/app/api/brobot-anki/session-matches/route.ts` | Records local match details, including optional preview text | **refactor before client use** to remove `cardPreview` from the network/storage boundary unless separately justified |
| `supabase/migrations/20260719_120000_brobot_anki_schema_reconciliation.sql` | Reproducible six-table operational baseline, constraints, indexes, triggers, forced RLS, service-only grants | **retain/deploy through review**; it is not yet production state |
| `scripts/verify-brobot-anki-schema.ts` | Read-only production catalog verifier | **retain** and run as a deployment gate |
| `supabase/migrations/20260627_100000_anki_import_tables.sql` | Imported sources, notes, cards, canonical cards and versions | **retain**; this is the server identity foundation |
| `scripts/import-anki.ts`, `scripts/validate-anki-import.ts` | Import and validate server-side Anki data | **retain**; not part of local launch execution |
| `scripts/prepare-patellar-instability-review-packets.ts` | Verifies the four pilot source identities while preparing review artifacts | **retain** as pilot input evidence |

### Existing hidden coupling and defects

- The Anki and browser-extension linking flows share `brobot_anki_device_links` and `brobot_anki_device_tokens` but the rows have no `client_kind` or scope. A caller can present a valid token through the other product's header because authentication checks only the hash.
- `src/app/api/brobot-anki/_lib.ts` and `src/lib/brobot/device-link.ts` duplicate security-sensitive code and have already diverged in defaults and allowed auth behavior.
- `poll-link` inserts a token, then separately marks the link exchanged. The sequence is not atomic or safely retryable.
- `last_used_at` is written on every authenticated request, increasing write load and making authentication fail if the telemetry-style touch fails.
- The add-on device table is not linked to a token and does not enforce one installation/profile identity. `anki_profile_name` is unnecessary personal metadata for launch routing.
- `/pending` sounds generic while returning CasePrep data. Reusing that name for launch would couple unrelated payloads and retry semantics.
- `session-matches` accepts and persists `cardPreview`, which conflicts with the launch/content-minimization boundary.
- There is no rate limiting, explicit API/contract version header, minimum add-on version, capability negotiation, launch expiry, idempotency key, or atomic state-transition function.

There is no client code from which to identify dead functions, unsafe direct SQL writes, duplicate client state, timer leaks, GUI-thread calls, or unload/reload behavior. Those properties are **unknown**, not implicitly safe.

## 4. Anki API safety audit and V1 behavior

The design below is grounded in Anki's official add-on documentation and current official source:

- Add-ons load before a profile/collection is available; collection work must wait for lifecycle hooks. The open collection is exposed as `mw.col`, and direct collection work can freeze the UI if it is not moved to a background operation: [The `anki` module](https://addon-docs.ankiweb.net/the-anki-module.html).
- Anki recommends `QueryOp` for read-only/long-running work and network access, `.without_collection()` for network-only work, and main-thread callbacks for Qt/UI access: [Background operations](https://addon-docs.ankiweb.net/background-ops.html).
- New-style hooks are the supported integration seam. Current official hook definitions include `profile_did_open`, `profile_will_close`, temporary collection close/reopen hooks, `sync_will_start`, and `sync_did_finish`: [Hooks and filters](https://addon-docs.ankiweb.net/hooks-and-filters.html) and [current GUI hook definitions](https://github.com/ankitects/anki/blob/main/qt/tools/genhooks_gui.py).
- Current Browser source accepts a `card` and `search`, selects the card during setup/reopen, and exposes an exact single-card selection path. This is the best current V1 seam, but it is an `aqt` GUI surface that must be isolated and tested per supported release: [current Browser source](https://github.com/ankitects/anki/blob/main/qt/aqt/browser/browser.py).
- Anki advises high-level collection methods over direct database access and forbids add-ons from changing existing table schemas. It documents reads through `col.db`, but direct writes can bypass sync bookkeeping: [collection/database guidance](https://addon-docs.ankiweb.net/the-anki-module.html#the-database).

### Safety decisions

| Concern | V1 decision |
|---|---|
| Early `mw.col` access | prohibited; initialize UI registrations at import, runtime only on `profile_did_open` |
| Profile switching | stop and invalidate the old `ProfileRuntime` on `profile_will_close`; construct a new runtime for every open |
| One-way sync/import temporary close | pause claiming and collection work on `collection_will_temporarily_close`; resume after `collection_did_temporarily_close` |
| Sync | do not claim while sync is active; resume after `sync_did_finish` |
| Network | `QueryOp(...).without_collection().run_in_background()` with connect/read timeouts |
| Collection resolution | serialized `QueryOp` with the active collection; no Qt calls inside it |
| GUID lookup | one parameterized, read-only query in a compatibility adapter because Anki has no documented GUID search operator; all subsequent card loads use collection APIs |
| Direct SQL writes/schema changes | prohibited |
| GUI work | main thread only, in the success callback after resolution |
| Browser action | open/focus Browser with exact `cid:` search and card object, then verify the selected card ID |
| Reviewer action | unsupported in V1; no scheduler/reviewer manipulation |
| Filtered/suspended/buried cards | still selectable in Browser; status is diagnostic only and never changes resolution identity |
| Deck rename/move | irrelevant to identity; deck name is not in the resolver predicate |
| Add-on reload/unload | hooks registered once; runtime has idempotent `start()`/`stop()` and a generation token that makes stale callbacks no-ops |

### Deterministic resolver

Input is a validated `anki_launch_v1` command.

1. Reject if the profile/collection is unavailable, syncing, temporarily closed, the command is expired, the schema is unknown, the action is unsupported, or the command/device binding is wrong.
2. Run `SELECT id FROM notes WHERE guid = ?` as a parameterized **read-only** query inside the collection-serialized operation.
3. Zero note IDs → continue to the native-hint verification path. More than one → `ambiguous`.
4. For one note ID, use collection search/load APIs to enumerate all cards for that note.
5. Keep only cards whose `card.ord == cardOrdinal`. Zero → `not_found`; more than one → `ambiguous`; one → candidate.
6. If a native card ID hint is present, compare it. A mismatch is diagnostic because native IDs can change; it is not a reason to choose a sibling or reject a uniquely resolved GUID/ordinal candidate.
7. If GUID resolution found no note and a native hint exists, load that exact native card, then verify **both** `card.note().guid == noteGuid` and `card.ord == cardOrdinal`. Accept only when both match.
8. A content hash mismatch records a warning/telemetry event and still resolves. The client never transmits the card body to compare it.
9. Return a typed result: `resolved`, `not_found`, `ambiguous`, `invalid_identity`, `collection_unavailable`, `unsupported`, or `failed`.

The local results `invalid_identity` and `collection_unavailable` map to backend terminal status `failed` with a sanitized error code if a command was already claimed. Normally the poller prevents a claim while the collection is unavailable.

### Exact Browser action and proof of success

On the main thread:

1. Load the resolved card again by local ID to guard against deletion between resolution and action.
2. Open or reuse Anki's managed Browser dialog with the card object and exact `cid:<local-card-id>` search.
3. Focus/raise the Browser.
4. Ask the Browser table for its single selected card and compare that card ID to the resolved ID.
5. Only this exact equality produces local GUI result `opened`.
6. Empty/multiple/wrong selection, a closed dialog, a compatibility exception, or an unconfirmable selection produces `failed` or `unsupported`.

Opening an arbitrary card in Reviewer is deliberately excluded. It can alter scheduler context, imply a review opportunity that is not actually due, and has no equally reliable cross-version exact-card contract. Reviewer support is a later, separately gated feature.

## 5. Target add-on architecture

### Repository and package root

Create `integrations/snaportho-anki/` in this monorepo for V1. Keeping the JSON contract, server routes, migrations, and Python client in one reviewable changeset is more valuable now than creating another repository. The `.ankiaddon` contents remain a normal top-level Anki package; the monorepo wrapper is not included in the archive.

```text
integrations/snaportho-anki/
  addon/
    __init__.py
    manifest.json
    config.json
    config.md
    snaportho_anki/
      bootstrap.py
      lifecycle.py
      config.py
      contracts.py
      auth.py
      credential_store.py
      api_client.py
      device_manager.py
      poller.py
      command_processor.py
      launch_resolver.py
      collection_gateway.py
      gui_actions.py
      compatibility.py
      state_store.py
      telemetry.py
      diagnostics.py
      errors.py
      ui/
        settings_dialog.py
        link_device_dialog.py
        status_widget.py
    user_files/
      README.txt
  tests/
    unit/
    integration/
    fixtures/
  scripts/
    package_addon.py
    verify_archive.py
  pyproject.toml
  README.md
```

Official packaging requires archive contents at the package root and a `manifest.json` for distribution outside AnkiWeb: [sharing add-ons](https://addon-docs.ankiweb.net/sharing.html). `user_files` is preserved during upgrades and is the correct home for replay/diagnostic state: [add-on config and user files](https://addon-docs.ankiweb.net/addon-config.html).

### Module responsibilities

| Module | Single responsibility |
|---|---|
| `__init__.py` | Import `bootstrap.register()` only; no network or collection access |
| `bootstrap.py` | Register hooks, menu action, config action, and one process-wide runtime manager |
| `lifecycle.py` | Construct/stop one `ProfileRuntime`; pause around sync/temporary collection close; invalidate stale callbacks |
| `config.py` | Typed, migrated non-secret settings and poll/backoff bounds |
| `contracts.py` | Strict `anki_launch_v1` parsing/serialization; reject extra/unknown schema semantics |
| `auth.py` | Link state machine, relink, revoke, and auth error classification |
| `credential_store.py` | Profile-scoped secret interface; OS keychain first, explicit restricted-file fallback |
| `api_client.py` | HTTPS, timeouts, headers, safe error parsing, link/device/claim/event calls |
| `device_manager.py` | Installation UUID, profile UUID, capability/heartbeat registration, online state |
| `poller.py` | Non-overlapping QTimer scheduling, off-main-thread poll, jittered backoff, shutdown |
| `command_processor.py` | Claim → validate → replay check → resolve → GUI → event/ACK orchestration |
| `launch_resolver.py` | Pure resolution policy and structured outcomes |
| `collection_gateway.py` | The only Anki collection adapter, including the confined GUID read query |
| `gui_actions.py` | The only Browser/Qt adapter; exact selection verification |
| `compatibility.py` | Version probes and small per-version Browser adapters; no scattered `hasattr` logic |
| `state_store.py` | SQLite replay ledger and sanitized recent status, no content bodies |
| `telemetry.py` | Whitelisted privacy-safe events and correlation IDs |
| `diagnostics.py` | Sanitized export; versions, state, recent error/status codes |
| `errors.py` | Stable local error codes and retryability classification |
| `ui/*` | Link/settings/status UI only; calls services rather than doing network/collection work |

### Lifecycle and threading model

```text
package import (main thread)
  → register hooks/menu/config action only

profile_did_open (main thread)
  → derive local profile UUID
  → load credential + replay state
  → register/heartbeat device off-thread
  → start single-shot QTimer

timer fires (main thread, returns immediately)
  → QueryOp.without_collection: claim/poll HTTPS
  → success callback (main thread): validate runtime generation
  → QueryOp with collection: resolve identity
  → success callback (main thread): open/select/verify Browser
  → QueryOp.without_collection: send resolved/opened or terminal event
  → schedule next single-shot timer

profile_will_close / sync starts / temporary close
  → stop timer
  → increment runtime generation
  → ignore late callbacks
  → flush replay ledger
```

There is never more than one in-flight claim request per profile runtime. A QTimer schedules work but performs none of it. Network and SQLite work do not touch Qt. Collection work does not touch Qt. GUI work does not touch the network.

### Poll/retry policy

- Linked and healthy: single-shot poll every 5 seconds with ±20% jitter.
- No command: continue at 5 seconds; server may return `Retry-After` to slow down.
- Network/5xx: exponential backoff 2, 4, 8, 16, 30, 60 seconds with full jitter.
- 429: honor `Retry-After`, minimum 5 seconds, maximum 5 minutes.
- 401/403: stop polling, mark relink/revocation required, never retry the secret in a tight loop.
- 409 command conflict: fetch authoritative command state, update replay ledger, do not repeat GUI work.
- Connect timeout 5 seconds; overall request timeout 15 seconds; response-size cap 256 KiB.
- Wake/sleep: an expired command is acknowledged `expired` without collection or GUI work; no catch-up burst.
- Shutdown/profile switch: no new work; late callbacks are discarded by runtime generation.

### Local state and secrets

| Data | Storage | Notes |
|---|---|---|
| Non-secret preferences | Anki `config.json`/`meta.json` | base URL allowlist, device display name, poll enabled, diagnostic level |
| Installation UUID | `user_files/state.sqlite3` | random UUID, local installation scope, not a hardware ID |
| Profile UUID | `user_files/state.sqlite3`, keyed by local profile | random UUID; profile name/path is not sent to server |
| Device token | OS credential store through a pinned/vendored `keyring` adapter | service key is installation+profile UUID; never shown/logged |
| Credential fallback | `user_files/secrets.json` with owner-only permissions | explicit user opt-in and warning; never included in diagnostics/backups generated by add-on |
| Replay ledger | `user_files/state.sqlite3` | command ID, request ID, last state, timestamps, local card ID optional; 30-day TTL |
| Diagnostics | rotating JSON Lines files in `user_files/diagnostics/` | sanitized codes/IDs only, size and age capped |

One token is bound to one user, `client_kind=anki_addon`, installation UUID, and profile UUID. Switching profiles selects a different credential and device record. Relinking revokes the old token before replacing it when the server is reachable. Reinstallation creates a new installation UUID; it never silently inherits a copied token. A user can revoke a device from the website by device ID without exposing its raw token.

## 6. Canonical launch contract

The client parser should accept exactly this V1 semantic contract. The transport response may wrap multiple commands, but each command is independently versioned.

```json
{
  "schemaVersion": "anki_launch_v1",
  "requestId": "uuid",
  "commandId": "uuid",
  "deviceBinding": {
    "installationId": "uuid",
    "profileId": "uuid"
  },
  "resource": {
    "resourceType": "anki_card",
    "resourceId": "canonical-card-uuid",
    "canonicalCardId": "canonical-card-uuid",
    "canonicalCardVersionId": "canonical-card-version-uuid"
  },
  "sourceIdentity": {
    "sourceSlug": "snaportho-anki",
    "noteGuid": "source-note-guid",
    "cardOrdinal": 0,
    "sourceCardIdHint": "native-card-id",
    "contentHashHint": "optional-version-hash"
  },
  "action": "show_in_browser",
  "expiresAt": "RFC-3339 timestamp",
  "correlation": {
    "recommendationId": "optional-uuid",
    "attemptEventId": "optional-uuid"
  }
}
```

V1 uses `show_in_browser` rather than pretending `open_card` means Reviewer navigation. If the public web contract needs the product-level action `open_card`, the server must deterministically translate it to the device capability `show_in_browser`; the client contract remains unambiguous and has no fallback guessing.

Validation rules:

- reject unknown `schemaVersion`, resource type, action, or unadvertised required capability;
- require UUID request/command/resource/device values and non-empty GUID;
- require integer `cardOrdinal >= 0`;
- require an expiry in the future and no more than five minutes after creation;
- require exact installation/profile binding to the active credential;
- reject a command ID already terminal in the replay ledger;
- ignore unknown optional correlation values, but never echo arbitrary data;
- do not include deck name, card body, fields, question content, or Orthobullets content.

## 7. Backend coordination and contract plan

### Current backend verdict

| Required backend capability | Current state |
|---|---|
| Short-code start/approve/poll | partial; functional shape exists |
| Raw token hashing | complete |
| Transactional exchange | missing/unsafe |
| Token client scope | missing/unsafe |
| Installation/profile binding | missing |
| Device capability registration | missing |
| Rate limiting | missing |
| API/add-on compatibility headers | missing |
| Launch creation | missing by design |
| Atomic claim | missing by design |
| Resolution/open event ACK | missing by design |
| Browser status read | missing by design |
| Expiration/idempotency | missing by design |
| RLS/service boundary | pending local migration; production drift remains |

### Phase A: harden linking before launch APIs

Add `supabase/migrations/<timestamp>_brobot_anki_device_scope_hardening.sql`:

- `client_kind` on link/token rows, constrained to known clients;
- `scopes text[]` on token rows, with Anki V1 limited to `device:heartbeat`, `launch:claim`, and `launch:ack`;
- `installation_id uuid` and `profile_id uuid` on Anki token/device rows;
- `exchange_secret_hash` on link rows;
- token-to-device relationship and unique active `(client_kind, installation_id, profile_id)` binding;
- capability/version columns on `brobot_anki_addon_devices` using bounded JSON/string arrays;
- no raw token, exchange secret, profile name, hardware serial, or card content;
- forced RLS and service-only grants consistent with the reconciliation baseline.

Refactor link APIs to `/api/brobot-anki/v1/auth/*` while retaining temporary adapters for existing URLs:

- `POST start-link`: accepts device display name, installation/profile UUID, add-on version; returns display `linkCode`, 256-bit `exchangeSecret`, approval URL, expiry. Store only the exchange-secret hash.
- `POST approve-link`: authenticated website session, display code, expected client kind; binds the approving user.
- `POST poll-link`: display code + exchange secret; one database function atomically verifies, issues the token row, creates/updates the device row, and consumes the link. A retry returns a deterministic consumed response and never issues a second token.
- `POST revoke-device`: current device token revokes itself; website session revokes a user-owned device ID. Never accept a raw token in a browser UI flow.

Apply per-IP and per-code rate limits to start, approve, and poll. Return stable `{error: {code, message, retryable}}` envelopes. Authentication must validate token hash, `client_kind`, required scope, revocation, and installation/profile headers. Updating `last_used_at` should be sampled/asynchronous and must not turn a valid request into a 500.

### Phase B: client skeleton and local proof before queue creation

Build and test the add-on with a fake transport and fixture commands. It must demonstrate:

- profile-safe start/stop;
- off-main-thread HTTP;
- strict contract validation and replay ledger;
- GUID/ordinal and verified-native-hint resolution against a disposable collection;
- exact Browser selection against the supported Anki compatibility matrix.

Only when these tests run in a real Anki process should Phase C be implemented.

### Phase C: launch persistence and routes

Add `supabase/migrations/<timestamp>_brobot_anki_launch_v1.sql` with:

- `brobot_anki_launch_commands`: user/device ownership, canonical card/version, resolved source identity snapshot, action, schema version, idempotency key hash, status, expiry, claim/open timestamps, safe error code;
- `brobot_anki_launch_events`: append-only transition facts and safe timing/compatibility metadata;
- unique `(user_id, idempotency_key_hash)` and command/device ownership indexes;
- database functions for atomic claim and monotonic transition, both checking user/device/token scope and expiry;
- service-only access; no direct client table access.

Routes:

| Route | Authentication | Contract |
|---|---|---|
| `POST /api/brobot-anki/v1/launch-commands` | browser session/bearer user | Accept `canonicalCardId`, `addonDeviceId`, product action, idempotency key, optional correlation IDs. Server resolves current canonical version and source identity; returns command ID/status/expiry. |
| `POST /api/brobot-anki/v1/launch-commands/claim` | scoped Anki device token + installation/profile headers | Atomically returns at most one device-bound pending command plus a previously claimed unexpired command for same-device recovery. |
| `POST /api/brobot-anki/v1/launch-commands/{id}/events` | same scoped device | Accepts only the next allowed state, client event ID, safe error code, timings, add-on/Anki versions. Idempotent by client event ID. |
| `GET /api/brobot-anki/v1/launch-commands/{id}` | owning browser user | Returns status and sanitized stage/timing/error; never source/card content. |
| `POST /api/brobot-anki/v1/devices/heartbeat` | scoped Anki device | Updates online/capability/version state with write coalescing. |

Server command creation, not the browser, resolves:

```text
canonical_cards.id/current_version_id
  → canonical_card_versions.source_card_id
  → anki_cards.note_id/card_ord/anki_card_id
  → anki_notes.anki_note_guid
  → external_sources.slug
```

Creation fails closed if the active version/source binding/GUID/ordinal is absent or ambiguous. The browser cannot submit a GUID, ordinal, or native ID to override canonical metadata.

### State machine

```text
pending  → claimed → resolved → opened
   └──────────────→ expired
claimed → not_found | ambiguous | unsupported | failed | expired
resolved → failed | expired
```

Rules:

- `pending → claimed` is an atomic database operation for exactly the bound active device.
- A command claimed by a device can be redelivered only to that same device for recovery; it cannot be reassigned.
- `resolved` requires the local card ID and resolver outcome but is not success in the web UI.
- `opened` requires a later Browser-selection verification event.
- Terminal states are immutable; duplicate identical events are idempotent; conflicting events return 409.
- Expiry is checked at claim, before resolve, before GUI action, and at transition.
- `invalid_identity`/`collection_unavailable` are client outcome codes under backend `failed`; `not_found`, `ambiguous`, and `unsupported` remain first-class terminal statuses.
- Default command TTL is two minutes; maximum is five minutes. A fresh user click creates a new idempotency key/command.

### Compatibility headers

Every Anki request sends:

```text
X-SnapOrtho-Client: anki-addon
X-SnapOrtho-Addon-Version: <semver>
X-SnapOrtho-Anki-Version: <version>
X-SnapOrtho-Contract-Versions: anki_launch_v1
X-SnapOrtho-Installation-Id: <uuid>
X-SnapOrtho-Profile-Id: <uuid>
X-SnapOrtho-Anki-Token: <secret>
```

The server returns its API version, minimum supported add-on version, accepted schema versions, request ID, and `Retry-After` where applicable. Unsupported clients receive 426 with a safe upgrade message and no command claim.

## 8. Security and privacy review

### Threat/control table

| Threat | Required control |
|---|---|
| Link-code guessing/interception | 15-minute display code, 256-bit client-held exchange verifier, rate limits, one transactional exchange |
| Raw token disclosure | hash at server, OS credential store, redact headers/payloads/exceptions, no token UI/export |
| Cross-product token reuse | enforced `client_kind` and scopes in database-backed authentication, not prefix convention |
| Cross-user command access | every create/read/claim/event query checks authenticated owner and bound device; negative tests required |
| Cross-profile command opening | token and command bind both random installation and profile UUID |
| Replay/duplicate GUI action | server event idempotency plus local SQLite terminal ledger before/after GUI action |
| False opened result | exact selected local card ID verification before `opened` event |
| Native ID collision/change | never accept native ID without GUID and ordinal verification |
| Sibling card selection | exact ordinal and uniqueness checks; ambiguity fails closed |
| Sensitive content leakage | launch/event/diagnostic allowlists; no card fields, bodies, previews, or question content |
| TLS downgrade | HTTPS-only production base URL; default certificate validation; no user-configurable “ignore TLS” |
| Malicious/oversized response | content-type check, 256 KiB cap, strict schema/length parsing, unknown version rejection |
| Log injection | structured encoder, bounded strings, safe error-code allowlist |
| Stolen laptop | OS credential store, website revocation, short command TTL; document local-machine trust boundary |

### Data minimization

Allowed server telemetry: request/command/recommendation/attempt correlation UUIDs, opaque device ID, add-on/Anki/Python/OS family versions, stage, safe error code, and durations. Do not send profile name, filesystem path, account email, hostname, hardware ID, deck name, note/card body, tags, Orthobullets text, or full exception strings.

The existing `cardPreview` field in `session-matches` should be deprecated before a real client is built. It is not required for launch and creates an avoidable content boundary.

### Token rotation and revocation

V1 does not need OAuth. A long random device token with hash-at-rest, scoped device binding, revocation, and relink is sufficient. Add an explicit “rotate credential” operation after launch stability: issue a new token only after current-token authentication, return it once, atomically revoke the prior token after client confirmation, and retain a short recovery window. Until that flow is implemented, relinking is the rotation mechanism.

## 9. Gap analysis

| Production capability | Status now | Exit condition |
|---|---|---|
| Maintainable add-on package | missing | modular source, deterministic archive, ownership docs |
| Startup/profile lifecycle | missing | hook tests + switch/close manual tests |
| Settings/link UI | missing | safe status/relink/unlink/test UX |
| Short-code linking | partial/unsafe | exchange verifier, transaction, scope, rate limit |
| Secret storage | missing | credential adapter + fallback policy + redaction tests |
| Installation/profile identity | missing | random IDs and enforced server binding |
| Device registration/online state | partial schema only | heartbeat/capability contract and coalesced updates |
| Nonblocking networking | missing | QueryOp/network tests and UI responsiveness observation |
| Retry/offline handling | missing | deterministic backoff tests and reconnect manual test |
| Version/capability negotiation | missing | 426/min-version/schema tests |
| Launch payload validation | missing | strict `anki_launch_v1` unit tests |
| Atomic claim | missing by design | DB concurrency tests with real client |
| Replay protection | missing | local ledger + server idempotency crash/retry tests |
| GUID+ordinal resolution | server identity complete; client missing | disposable collection integration matrix |
| Native hint verification | missing | changed-ID/collision unit and integration tests |
| Browser exact selection | missing | real Anki assertion and visible manual proof |
| Reviewer exact navigation | intentionally unsupported | separate future safety design |
| Separate resolved/opened ACK | missing | monotonic event tests and no-false-opened gate |
| Privacy-safe diagnostics | missing | snapshot/redaction tests and manual export review |
| Launch telemetry | missing | allowlisted event contract and content scans |
| Backend schema reconciliation | partial/blocked | reviewed migration deployed; verifier green |
| Four pilot server identities | complete | keep regression evidence green |
| Four pilot local identities | blocked on client | resolve in every pilot environment |
| 30 real launches/3 environments | missing | execution log and >=95% opened metric |
| Master-deck updater | intentionally deferred | launch stable before separate updater milestone |

## 10. Compatibility matrix

There is **no currently supported or tested matrix** because there is no client. The table below is a candidate qualification matrix, not a support claim. Exact embedded Python/Qt versions must be captured from each installed Anki build; the add-on uses Anki's runtime and must not invoke a system Python.

| Environment | Intended qualification | Tested now | Release stance |
|---|---|---:|---|
| macOS, latest stable Anki 25.09.x | primary | no | must pass automated + 15 manual launches |
| macOS, prior packaging line Anki 25.07.x, second profile/installation | compatibility | no | must pass automated + 10 manual launches |
| Windows 11, latest stable Anki 25.09.x | primary cross-platform | no | must pass automated + 5 manual launches |
| Anki 24.11.x | provisional minimum candidate | no | support only if all adapters/tests pass |
| Anki 26.05 beta/current beta line | exploratory | no | unsupported until explicitly qualified |
| Linux | architecture intended, V1 support optional | no | do not advertise at first release |
| Anki initially at profile picker/no collection | required state | no | poller stopped, clear status |
| Profile open | required state | no | normal operation |
| Profile switching | required state | no | no cross-profile command/action |
| Collection syncing/temporarily closed | required state | no | pause claim/resolution, resume safely |
| Browser already open | required state | no | reuse/focus and exact select |
| Anki closed/asleep | required state | no | command expires; no false opened |

The official release list currently identifies 25.09.4 as the latest stable and 26.05b1 as a prerelease, but release availability is not compatibility evidence: [Anki releases](https://github.com/ankitects/anki/releases). Before freezing `min_point_version`/`max_point_version` in `manifest.json`, run the adapter suite against the actual intended release builds.

Version policy:

- add-on uses semantic versioning;
- HTTP API is `/v1`; command schema is independently `anki_launch_v1`;
- config/state migrations are forward-only, versioned, idempotent, and backed up before change;
- a server minimum add-on version can stop claiming with 426, but settings/unlink/diagnostics remain usable;
- unknown future command schemas are rejected, never guessed;
- support claims list exact Anki point-version families and OSes actually tested.

## 11. File-by-file implementation plan

### Client files to add

| File | Exact change and acceptance evidence |
|---|---|
| `integrations/snaportho-anki/addon/__init__.py` | One call to `register()`; import test proves no `mw.col`/network access |
| `addon/manifest.json` | Name, package version, provisional Anki point bounds only after matrix pass |
| `addon/config.json`, `config.md` | Non-secret defaults/docs; no token field |
| `snaportho_anki/bootstrap.py` | Idempotent hooks/menu/config registration; reload test |
| `lifecycle.py` | `RuntimeManager`/`ProfileRuntime`, generation invalidation, sync pause; unit state tests |
| `config.py` | Typed config + migrations + bounds; malformed/old config tests |
| `contracts.py` | Strict dataclasses/parser for link/device/launch/event envelopes; exhaustive validation tests |
| `auth.py` | Link/relink/revoke state machine; server/error transition tests |
| `credential_store.py` | keychain and restricted-file adapters; no-secret diagnostics tests |
| `api_client.py` | standard/pinned HTTP layer, TLS, timeouts, size cap, headers, stable errors; fake-server tests |
| `device_manager.py` | installation/profile IDs and heartbeat capabilities; switch/reinstall tests |
| `poller.py` | single-shot scheduling, one in flight, jitter/backoff, stop; fake clock tests |
| `command_processor.py` | orchestration and crash/retry checkpoints; table-driven transition tests |
| `launch_resolver.py` | pure policy over collection gateway; all identity edge cases |
| `collection_gateway.py` | confined read-only GUID query and high-level card loads; disposable collection tests |
| `gui_actions.py` | exact Browser open/select/verify; adapter contract and real Anki tests |
| `compatibility.py` | release probes/adapters; explicit unsupported result instead of guessing |
| `state_store.py` | SQLite schema/migration/TTL/atomic replay writes; crash and migration tests |
| `telemetry.py` | event allowlist and payload sanitizer; golden payload tests |
| `diagnostics.py` | rotating logs/export/redaction; secret/content canary tests |
| `errors.py` | stable error enum, retryability, safe user copy |
| `ui/settings_dialog.py` | status, device/add-on version, last contact/command, actions |
| `ui/link_device_dialog.py` | start flow, open approval URL, bounded poll, actionable errors |
| `ui/status_widget.py` | reusable safe status presentation, no raw identifiers/secrets |
| `user_files/README.txt` | ensures upgrade-preserved directory exists; documents local state |
| `tests/unit/*` | pure mocks/fakes for all logic boundaries |
| `tests/integration/*` | disposable collection/fake HTTPS and version-adapter tests |
| `tests/fixtures/*` | basic, multi-template, multi-cloze, duplicate GUID, modified, suspended/moved fixtures |
| `scripts/package_addon.py` | deterministic `.ankiaddon`, excludes caches/secrets/tests, emits SHA-256 |
| `scripts/verify_archive.py` | rejects wrong root, missing manifest, pycache, secrets, unexpected files |
| `pyproject.toml` | Ruff/mypy/pytest/dev config and pinned test tooling; runtime deps vendored/isolated |
| `README.md` | dev setup, architecture, supported matrix, packaging, release/rollback runbook |

### Existing server files to change later

| File | Exact planned change |
|---|---|
| `src/lib/brobot/device-link.ts` | Become the only device auth/link library; add client/scopes/binding/error envelopes |
| `src/app/api/brobot-anki/_lib.ts` | Reduce to domain schemas or remove after imports migrate to shared library |
| `src/app/api/brobot-anki/auth/*` | Compatibility adapters to hardened `/v1/auth` behavior |
| `src/app/api/brobot/extension/auth/*` | Same shared primitives while preserving extension-specific header/scope |
| `src/app/api/brobot-anki/pending/route.ts` | Move/alias to a CasePrep-specific name; no launch payloads |
| `src/app/api/brobot-anki/session-matches/route.ts` | Deprecate/reject `cardPreview`; document metadata-only boundary |
| `src/app/api/brobot-anki/v1/devices/heartbeat/route.ts` | Add after link hardening; scoped registration/online state |
| `src/app/api/brobot-anki/v1/launch-commands/route.ts` | Add only after real client proof; browser create and status GET split as needed |
| `src/app/api/brobot-anki/v1/launch-commands/claim/route.ts` | Add atomic claim wrapper only after client proof |
| `src/app/api/brobot-anki/v1/launch-commands/[commandId]/events/route.ts` | Add monotonic idempotent ACK/event wrapper only after client proof |
| `src/lib/brobot-anki/contracts/anki-launch-v1.ts` | Shared Zod payload/event schemas and safe serialization |
| `src/lib/brobot-anki/launch-identity.ts` | Server-only canonical-to-source resolution and ambiguity checks |
| `src/lib/brobot-anki/compatibility.ts` | Minimum version/schema negotiation |
| `src/lib/brobot-anki/rate-limit.ts` | Link/claim/heartbeat limits using the project's approved rate-limit store |
| `supabase/migrations/<timestamp>_brobot_anki_device_scope_hardening.sql` | Transactional exchange, scopes, bindings, device capabilities |
| `supabase/migrations/<timestamp>_brobot_anki_launch_v1.sql` | Queue/events/functions/RLS; create only with exercisable client |
| `scripts/verify-brobot-anki-schema.ts` | Extend expected contract after each deployed migration |
| `scripts/verify-anki-launch-pilot.ts` | Read-only gate report for state counts, false ACKs, latency, environment coverage |
| `package.json` | Add client unit/package checks and server contract/pilot verifier scripts |

No existing client file should be moved or deleted because none exists. No current prep/study route should be deleted during V1 launch work; isolate and deprecate deliberately after usage is known.

## 12. Test strategy

### Unit tests

- strict schema, unknown version/action, expiry boundaries, device mismatch, oversized strings;
- all allowed/forbidden state transitions and event idempotency;
- replay ledger checkpoints before and after GUI action;
- 401/403/409/426/429/5xx and malformed/non-JSON/oversized responses;
- deterministic exponential backoff with injected clock/random source;
- GUID zero/one/many, ordinal zero/one/many, changed native hint, verified fallback;
- basic, multi-template, cloze siblings, deleted/missing card, duplicate GUID;
- filtered/suspended/buried/moved card behavior;
- content-hash mismatch warns but resolves;
- Browser wrong/empty/multiple selection never returns `opened`;
- diagnostics/telemetry canaries containing fake tokens, card bodies, and question text are removed/rejected.

### Server contract/database tests

- parallel link exchanges issue at most one token and cannot strand a consumed link;
- Anki token rejected by extension route and extension token rejected by Anki route;
- cross-user create/read/claim/event all denied;
- wrong installation/profile/device denied;
- parallel claims yield one claimant/state transition;
- expired and terminal commands cannot be claimed or reopened;
- duplicate event ID is idempotent; conflicting terminal event is 409;
- canonical card creation resolves only active current version/source binding;
- missing/ambiguous GUID/ordinal prevents command creation;
- payload snapshots contain no content body/preview/question fields;
- RLS/grants/schema verifier remains green after migrations.

### Disposable collection integration tests

Build a tiny local collection containing:

- one basic note/one card;
- one note with multiple templates;
- one cloze note with multiple card ordinals;
- duplicate GUID fixture created only in a disposable test collection;
- modified content/hash mismatch;
- suspended and buried cards;
- a card moved/renamed across decks;
- deleted note/card and changed native ID cases.

Run the resolver through the same `collection_gateway.py` used in production. Do not mock the GUID query or card `.ord` in these tests. The Browser integration test opens the real dialog, verifies the selected local ID, and closes it without scheduler/review writes.

### Manual 30-attempt matrix

Record every attempt with environment ID, profile ID, pilot canonical card, initial Anki/Browser/network state, each stage result, durations, and final visible selection. A suggested allocation is:

- 15 attempts: macOS latest stable, primary profile;
- 10 attempts: second macOS version/profile or installation;
- 5 attempts: Windows 11 latest stable;
- all four pilot cards represented in every environment;
- cases include Anki initially closed (expected expiration, then a fresh successful command), already open, Browser already open, profile switching, offline/reconnect, expired/replayed command, renamed/moved deck, changed native hint, missing card, modified content.

An expired command while Anki is closed is an expected safe terminal outcome and is not counted as a delivery/open success. The user must issue a fresh launch after Anki is running; the test report keeps expected-expiry scenarios separate from eligible success attempts so the metric cannot be gamed.

Measure independently:

```text
delivery
claim
identity resolution
Browser open/focus
exact selected-card verification
ACK receipt
end-to-end latency
```

## 13. Pilot acceptance gates

Release is blocked until every gate is true:

- [ ] All four Patellar Instability canonical cards resolve by exact GUID + ordinal in every supported environment.
- [ ] Native ID fallback succeeds only with matching GUID and ordinal.
- [ ] No arbitrary sibling selection in basic, multi-template, or cloze fixtures.
- [ ] Cross-user, cross-client-kind, cross-device, and cross-profile command access is denied.
- [ ] Expired and replayed commands are rejected without GUI action.
- [ ] No card/question bodies or protected content appear in launch payloads, events, logs, diagnostics, or telemetry.
- [ ] Network work does not freeze Anki and no GUI call occurs from a worker.
- [ ] At least 30 eligible real launch attempts are run across at least three representative environments/profiles.
- [ ] Resolved **and visibly exact-card opened** success is at least 95% (therefore at least 29/30).
- [ ] There are zero false `opened` acknowledgements.
- [ ] Claim, resolution, GUI selection, and ACK metrics are reported separately.
- [ ] Link exchange concurrency, token scope, command claim concurrency, and RLS tests pass.
- [ ] Production schema verifier is green after reviewed migrations.
- [ ] Deterministic `.ankiaddon` archive passes manifest/root/cache/secret verification and its SHA-256 is recorded.
- [ ] Supported Anki/OS matrix in the release notes matches actual tested environments.

Current gate status: server identity is 4/4; all local/client/real-launch gates are unrun, with 0 launch attempts.

## 14. Linking/settings and diagnostics UX

The Tools → SnapOrtho settings dialog should show:

- Connected / relink required / offline / unsupported version;
- safe account label supplied by server (masked display name, never raw user UUID/token);
- user-editable device display name;
- add-on, Anki, embedded Python, and OS family versions;
- last successful contact and last command ID/status;
- Link/Reconnect, Unlink, Test connection, Export diagnostics;
- development-build-only “Open test card” action, absent from production builds.

Link flow:

```text
settings requests link
  → background start-link returns display code + approval URL + private exchange verifier
  → UI opens HTTPS approval page and shows expiry
  → bounded background poll includes the verifier
  → approved transactional exchange stores token in credential store
  → device heartbeat confirms binding/capabilities
  → UI shows connected
```

Errors are stable and actionable: invalid/expired/consumed code, approval by another account, network/server failure, revoked device, storage failure, and unsupported version. The raw token and exchange verifier never appear in widgets, logs, tracebacks, clipboard, or diagnostics.

Diagnostics include version/capability data, coarse connection state, last contact, recent command IDs/statuses, safe error codes, retry/backoff state, and compatibility adapter chosen. Export runs a final redaction/content scan and fails closed if a token-shaped value or content canary is found.

## 15. Telemetry contract

Allowed event names:

```text
addon_started
addon_linked
addon_unlinked
addon_poll_succeeded
addon_poll_failed
anki_launch_claimed
anki_card_resolved_local
anki_card_opened
anki_launch_failed
anki_launch_expired
addon_version_unsupported
```

Each event uses an allowlisted schema: event ID/time, command/request/recommendation/attempt IDs when present, opaque device ID, versions, OS family, stage/result code, and durations. Never serialize the command object wholesale. Poll-success sampling should avoid high-volume noise; launch state events are one per idempotent transition.

## 16. Master-deck evolution plan

The launch architecture does not create a dead end because canonical identity is separate from local native ID and launch does not mutate content. A future updater should be a separate feature/module and command schema after launch reliability is proven.

1. Publish immutable, signed release manifests keyed by deck release ID and canonical note/card IDs.
2. Each item declares canonical version, prior/base content hash, field hashes, tags/metadata, retirement/supersession state, and minimum updater schema.
3. Stamp master-deck notes with a namespaced stable SnapOrtho note identity and maintain the canonical card-to-template mapping. Continue preserving note GUID + ordinal for launch interoperability.
4. Update notes/cards in place to preserve local card IDs, scheduling, and review history; never delete/recreate merely to update text.
5. Perform three-way field comparison: release base vs current release vs local. Auto-update only unchanged or explicitly protected publisher-owned fields; preview conflicts for user-edited fields.
6. Treat added cards as additions; retired cards as tagged/hidden retirement candidates, not immediate deletion; superseded cards link forward.
7. Synchronize namespaced specialty/topic/training-level/learning-objective/canonical-entity tags while preserving unrelated user tags.
8. Show an update preview with adds/edits/retirements/conflicts and require confirmation.
9. Store a local update journal sufficient to restore prior content/tags. Rollback never rewrites review history.
10. Report only manifest IDs, hashes, decisions, and safe error codes—never card bodies.

Do not add updater logic to `command_processor.py` or reuse `anki_launch_v1`. Use a later schema such as `anki_deck_update_v1`, its own permissions, dry-run/preview, and independent acceptance gates.

## 17. Ordered implementation milestones

### Priority 0 — reality and ownership (complete for audit)

- Record that no add-on root/artifact exists.
- Assign a maintained package owner and release-signing owner.
- Approve the monorepo package root and candidate Anki versions.

### Priority 1 — maintainable client skeleton

- Add package/module boundaries, lifecycle, typed contracts, state store, diagnostics, test harness, and deterministic packaging.
- Prove import without a profile and start/stop through profile switches.

### Priority 2 — secure linking/device identity

- Deploy schema reconciliation through review.
- Consolidate auth helper duplication.
- Add client scopes, exchange verifier/transaction, random installation/profile binding, credential store, rate limits, and UX.

### Priority 3 — local canonical resolution

- Implement collection gateway and deterministic resolver.
- Pass unit and disposable collection cases, including all four pilot identities imported into fixtures.

### Priority 4 — exact Browser selection

- Implement compatibility adapter and prove visible exact-card selection in named Anki builds.
- Keep Reviewer unsupported.

### Priority 5 — versioned launch polling

- With the real client now capable, add queue/events/claim APIs and server identity resolver.
- Add poll/backoff/replay/expiry/ACK behavior and concurrency/security tests.

### Priority 6 — real pilot

- Run the 30-attempt/three-environment matrix, publish stage metrics, and reach >=95% exact opened with zero false ACKs.

### Priority 7 — future deck synchronization

- Design/sign manifests and updater conflict model only after V1 launch gates are green.

## 18. Exact commands and results

### Source and architecture inspection run for this audit

```bash
sed -n '1,260p' /Users/alexbaur/.codex/attachments/d21a2883-7332-4931-94a1-88e1818ba420/pasted-text.txt
sed -n '261,620p' /Users/alexbaur/.codex/attachments/d21a2883-7332-4931-94a1-88e1818ba420/pasted-text.txt
sed -n '621,980p' /Users/alexbaur/.codex/attachments/d21a2883-7332-4931-94a1-88e1818ba420/pasted-text.txt
sed -n '981,1100p' /Users/alexbaur/.codex/attachments/d21a2883-7332-4931-94a1-88e1818ba420/pasted-text.txt
```

Result: complete brief read.

```bash
git status --short
pwd
rg --files | rg '(^|/)(AGENTS\.md|docs/audits/.*anki|src/app/api/brobot-anki|supabase/migrations/20260719_12|scripts/verify-brobot|scripts/prepare-patellar|package.json$)'
find .. -name AGENTS.md -print
```

Result: worktree changes were inventoried and preserved; no `AGENTS.md` was present.

```bash
find . .. -type f \( -name '*.ankiaddon' -o -name 'manifest.json' -o -name '*.py' -o -name '*.zip' \) \
  -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/.git/*' \
  -not -path '*/.venv/*' -not -path '*/venv/*' -print | sort
git log --all --name-only --pretty=format: | rg '(^|/)(__init__\.py|manifest\.json|.*\.ankiaddon|.*\.py)$' | sort -u
git submodule status
git branch -a --no-color
```

Result: no Anki add-on source/package; only unrelated Python and web/browser manifests; no submodules; remote branches `main` and `caseprep`.

```bash
sed -n '1,560p' src/app/api/brobot-anki/_lib.ts
sed -n '1,260p' src/app/api/brobot-anki/auth/start-link/route.ts
sed -n '1,260p' src/app/api/brobot-anki/auth/poll-link/route.ts
sed -n '1,260p' src/app/api/brobot-anki/auth/approve-link/route.ts
sed -n '1,260p' src/app/api/brobot-anki/auth/revoke-device/route.ts
sed -n '1,260p' src/app/api/brobot-anki/pending/route.ts
sed -n '1,260p' src/app/api/brobot-anki/prep/route.ts
sed -n '1,260p' src/app/api/brobot-anki/study-session/route.ts
sed -n '1,260p' src/app/api/brobot-anki/session-matches/route.ts
sed -n '1,420p' src/lib/brobot/device-link.ts
```

Result: existing link/auth/study behavior and duplicated security implementation mapped as documented.

```bash
sed -n '1,340p' supabase/migrations/20260719_120000_brobot_anki_schema_reconciliation.sql
sed -n '90,170p' supabase/migrations/20260627_100000_anki_import_tables.sql
sed -n '320,365p' supabase/migrations/20260627_100000_anki_import_tables.sql
sed -n '1,280p' docs/audits/educational-content-patellar-instability-unblock-2026-07-19.md
node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts,null,2))"
rg -n "brobot_anki|anki_launch|source_card_id|note_guid|card_ordinal|raw_anki|canonical_card_version" supabase/migrations src/app/api scripts
```

Result: current schema/API/import/canonical identity and prior production evidence confirmed; no launch persistence/API found.

### Existing executable gates rerun or previously run in this worktree

```bash
npm run education:patellar:test
```

Result: pass for CSV, BroBot Anki foundation, direct-review, and reviewer-metric tests.

```bash
npm run lint
```

Result: pass with no lint warnings/errors.

```bash
npm run build
```

Result: pass; 228 pages generated in the prior implementation validation.

```bash
npm run typecheck
```

Result: fails on eight unrelated pre-existing test errors (six `.ts` import-extension errors and two union-property errors in `persisted-rule-migration.test.ts`); no audit file or changed BroBot Anki application file is implicated.

```bash
node --experimental-strip-types scripts/verify-brobot-anki-schema.ts --snapshot-only
```

Result: pass; production read-only catalog snapshot and rollback.

```bash
node --experimental-strip-types scripts/verify-brobot-anki-schema.ts
```

Result: expected fail with 129 pre-migration production drift findings. The migration has not been deployed.

```bash
node --experimental-strip-types scripts/prepare-patellar-instability-review-packets.ts
```

Result: pass; exactly 30 questions, four cards, 90 recommendation rows, and 4/4 complete unique pilot source identities.

```bash
node --experimental-strip-types scripts/validate-patellar-instability-direct-review.ts
node --experimental-strip-types scripts/calculate-patellar-instability-review-metrics.ts
```

Result: both intentionally fail on blank human-review packets; no review or launch quality claim is made.

### Commands to implement and validate the future client

These are planned commands, not results from this audit:

```bash
cd integrations/snaportho-anki
python -m pytest tests/unit
python -m pytest tests/integration
python -m ruff check addon tests scripts
python -m mypy addon/snaportho_anki
python scripts/package_addon.py --version <semver>
python scripts/verify_archive.py dist/snaportho-anki-<semver>.ankiaddon
shasum -a 256 dist/snaportho-anki-<semver>.ankiaddon

npm run brobot:anki:contract:test
npm run brobot:anki:schema:verify
node --experimental-strip-types scripts/verify-anki-launch-pilot.ts
npm run lint
npm run typecheck
npm run build
```

The release runbook must also record the exact Anki application build, embedded Python/Qt versions, OS version, profile/environment ID, and each of the 30 manual launch results.

## 19. Final verdict

The audit, architecture, security review, contract design, file plan, test strategy, acceptance gates, and master-deck evolution path are complete. The add-on and launch workflow are not implemented, the production schema reconciliation is not deployed, and no real launch has been attempted.

`ANKI_ADDON_AUDITED`
