# SnapOrtho Reviewer production closure

## Supported runtime

- Add-on: `0.5.0`
- API contract: `snaportho-anki-reviewer.v1`
- Schema compatibility: `20260720_180000`
- Minimum Anki: 26.05
- Inspected runtime: Anki 26.05, macOS 26.5.2, bundled Python and Qt 6
- Supported production OS for credentials: macOS only

Unsupported Anki versions fail visibly. Windows/Linux authenticated submission is disabled until a non-plaintext native credential implementation exists.

## Install and quick start

1. Build with `npm run anki:reviewer:package` and verify with `npm run anki:reviewer:verify-package`.
2. In a disposable Anki profile, choose Tools → Add-ons → Install from file and select `dist/snaportho-reviewer-0.5.0.ankiaddon`.
3. Restart Anki. Open Tools → SnapOrtho Reviewer → Settings.
4. Configure loopback local or approved HTTPS staging. Restart after changing backend origin.
5. Choose Link or Manage Device, approve the one-time code, then open Review Inbox.
6. Resolve a card, review native front/back and proposals, save a draft, and submit.

Never test against the primary profile. The installed machine currently has only `User 1`, so no live installation was performed in this implementation pass.

## UI and runtime design

The add-on registers one Tools submenu after profile open and removes it on close. Inbox and API calls run through Anki's task manager. The Qt workspace exposes native Anki web views for front/back, assignment metadata, machine proposals, blank human controls, local drafts, submission status, settings, device linking, diagnostics, and sign-out. Collection access occurs only after profile open.

Resolution uses a parameterized GUID lookup, card ordinal, and importer-compatible hash. Native ID is a hint. Missing, ambiguous, or mismatched cards block submission. Native HTML remains inside Anki's web view and never enters diagnostics/logging.

## Credentials and security

macOS credentials use the system Keychain through `/usr/bin/security`, namespaced by environment, hashed profile identifier, and device identity. There is no plaintext fallback. The token is never written to config or SQLite and is never logged. macOS `security` necessarily receives it as a short-lived process argument during Keychain insertion; migration to direct Security.framework calls is recommended before broad rollout.

SQLite schema v2 stores only assignment caches, drafts, idempotency/retry state, safe conflicts, and UI progress. It backs up before migration, checks corruption, supports explicit deletion, and expires submitted drafts after 90 days.

## Conflicts and support

Network failures retry twice with bounded backoff and the same idempotency key. Authorization and structured conflicts never retry. Profile close cancels further operations. Local edits require explicit action, are tagged `snaportho_reviewer_working_edit`, and cause a hash mismatch until manually reconciled.

Safe diagnostics contain only versions, OS, backend origin/environment, linked state, roles/status, profile hash, schema version, counts, and safe error codes. Never include tokens, bodies, fields, notes, or complete assignments.

## Packaging, upgrade, uninstall, rollback

Packaging uses deterministic timestamps/order, compiles Python in memory, validates manifest/config, excludes tests/bytecode/databases/logs/learner code, scans secrets, and emits SHA-256. Upgrade by installing the newer archive and restarting; local SQLite migrations create backups. Uninstall through Anki Add-ons. Local Keychain credentials must be removed with Sign Out before uninstall if desired; uninstall does not revoke the server token.

Repository rollback before migration application is removal of reviewer files and package scripts. After a future local/staging schema application, execute its generated rollback script or drop reviewer tables/functions in dependency order. Production migration/application remains prohibited here.

## Disposable-profile staging smoke test

Create a new explicitly named profile such as `SnapOrtho Reviewer Disposable`; import only the representative test deck; use loopback/local or approved staging. Record package checksum and safe screenshots with card regions excluded. Verify startup, one menu, settings, Keychain link, inbox, GUID/ordinal resolution, native rendering, restart recovery, idempotency, hash conflict, revocation, sign-out, and absence of mapping/version/release writes. Cleanup must be manually approved and should move the disposable profile backup to recoverable storage rather than deleting the primary profile.

## Rollout checklist

- [x] Installable deterministic package and checksum
- [x] Visible Qt source implementation
- [x] macOS Keychain implementation; no plaintext fallback
- [x] Scoped reviewer API client and safe diagnostics
- [x] Local drafts, migration, recovery, retries, and conflicts
- [ ] Clean startup in a disposable profile
- [ ] Successful real device link to local/staging
- [ ] Materialized real 18-card local/staging assignment
- [ ] Real native rendering and GUID/ordinal/hash verification
- [ ] Real restart recovery and idempotent submissions
- [ ] Real conflict and revocation verification
- [ ] Isolated server/RLS integration test after migration application
- [ ] Product/legal approval for edited-card body retention

Until every unchecked gate passes, the verdict is `NO_GO`.
