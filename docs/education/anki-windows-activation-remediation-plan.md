# Anki cross-platform activation remediation plan

**Status:** implemented in `1.0.6`; production migration deployed; native Windows release smoke test remains a release gate
**Primary defect:** Windows users can complete browser approval but cannot persist the returned device token.
**Target release:** next patch release after `1.0.5`
**Owners:** Anki client, device-link API, release engineering

## 1. Executive summary

The current add-on constructs `MacOSKeychainStore` on every operating system. That store intentionally rejects every operation unless `platform.system() == "Darwin"`. On Windows, browser approval and token exchange succeed, but `credentials.set(device_token)` raises `CredentialUnavailable`. The UI therefore reports that secure storage is unavailable and activation never becomes durable.

This is not a browser, account, network, or Windows permissions bug. Windows credential storage was never implemented, selected, or tested. The released `1.0.5` package contains the same macOS-only code.

The repair has four parts:

1. Introduce a small credential-store interface and select a native implementation per operating system.
2. Implement Windows Credential Manager storage without a plaintext fallback or runtime package installation.
3. Make device linking recoverable when token persistence fails after the server has consumed a link code.
4. Add platform-contract tests, Windows CI/package checks, safe telemetry, documentation, and staged release gates.

The immediate patch should support macOS and Windows. Linux should fail before browser approval with accurate copy until a reviewed native secret-service implementation is available.

## 2. Confirmed failure and scope

### Current sequence

1. `ProfileRuntime` always instantiates `MacOSKeychainStore`.
2. `start-link` creates a one-time link code without authentication.
3. The user approves the code in the browser.
4. `poll-link` creates a device token, marks the link exchanged, and returns the raw token once.
5. The add-on calls `self.runtime.credentials.set(token)`.
6. On Windows, the macOS store raises before invoking any native credential API.
7. The dialog catches that exception and renders the reported error.

### User impact

- All Windows installations using this activation path are affected.
- Reinstalling the add-on, restarting Anki, reopening the browser, or using a different browser cannot fix it.
- Each failed post-approval storage attempt creates an issued token that the client cannot subsequently use.
- Re-polling the same link code returns `consumed`; the current “Open browser again” action cannot recover it.
- macOS activation remains functional, subject to normal Keychain availability and permissions.
- Linux is intentionally unsupported today but is not rejected early enough.

### Out of scope for the patch

- Replacing the device-link authentication model.
- Storing tokens in Anki config, SQLite, environment variables, logs, or a home-directory plaintext file.
- Bundling a general-purpose Python dependency manager into the add-on.
- Claiming Linux support without integration against an OS-backed secret service.

## 3. Required security invariants

The implementation must preserve these invariants:

- A raw device token is stored only in an OS-backed credential store.
- No plaintext fallback exists, including “temporary” fallback in add-on config or the reviewer SQLite database.
- Credential names are scoped by SnapOrtho environment and hashed Anki profile identifier.
- Production and local/staging credentials cannot overwrite one another.
- Separate Anki profiles cannot read or delete one another’s credential through the add-on namespace.
- Tokens and credential blobs never appear in logs, diagnostics, exception strings, analytics, screenshots, or test snapshots.
- Native API failures are translated into typed, redacted exceptions.
- Reads distinguish “credential does not exist” from “credential backend failed.”
- Writes are verified before activation is declared successful.
- Sign-out removes local credentials even if server revocation fails, while clearly reporting partial completion.
- An uninstall must not silently imply that the server token was revoked.

## 4. Target client architecture

### 4.1 Credential-store contract

Replace direct construction of `MacOSKeychainStore` with a narrow contract:

```python
class CredentialStore(Protocol):
    def backend_name(self) -> str: ...
    def is_available(self) -> bool: ...
    def get(self) -> str | None: ...
    def set(self, value: str) -> None: ...
    def delete(self) -> None: ...
    def probe(self) -> None: ...
```

Use typed failures rather than interpreting text:

```python
class CredentialStoreError(RuntimeError): ...
class CredentialBackendUnavailable(CredentialStoreError): ...
class CredentialReadError(CredentialStoreError): ...
class CredentialWriteError(CredentialStoreError): ...
class CredentialDeleteError(CredentialStoreError): ...
class UnsupportedCredentialPlatform(CredentialStoreError): ...
```

`get()` returns `None` only when the named credential is absent. Every backend or decoding failure raises a typed error.

### 4.2 Store factory

Add `create_credential_store(environment, profile_hash, device_id, platform_name=None)`:

| Platform  | Store                           | Support state           |
| --------- | ------------------------------- | ----------------------- |
| `Darwin`  | `MacOSKeychainStore`            | supported               |
| `Windows` | `WindowsCredentialManagerStore` | supported by this patch |
| Other     | `UnsupportedCredentialStore`    | visible, early failure  |

Allow `platform_name` and native-call adapters to be injected for deterministic tests. `ProfileRuntime` should know only the contract and factory, not platform-specific classes.

### 4.3 Stable credential identity

Keep the existing logical namespace so upgrades retain macOS credentials:

```text
service/target: com.snaportho.anki-reviewer.{environment}.{profile_hash}
account:        reviewer-device
```

For Windows, use the full service plus account as the Generic Credential target, for example:

```text
com.snaportho.anki-reviewer.production.0123456789abcdef/reviewer-device
```

Centralize target construction and validate each component. Do not include the raw Anki profile name.

## 5. Windows Credential Manager implementation

### 5.1 Native API choice

Use the Windows Credential Management API through Python’s bundled `ctypes`:

- `CredWriteW`
- `CredReadW`
- `CredDeleteW`
- `CredFree`
- credential type `CRED_TYPE_GENERIC`

This avoids shipping `keyring`, invoking PowerShell, depending on an external executable, or downloading packages into Anki’s Python runtime.

### 5.2 Data representation

- Encode the raw token as UTF-8 bytes in `CredentialBlob`.
- Reject an empty token before entering native code.
- Enforce the platform blob-size limit before calling `CredWriteW` and return a redacted typed error if exceeded.
- Store the logical account/device ID in `UserName` only; never put the token in `TargetName`, `Comment`, or attributes.
- Use an appropriate persistent Generic Credential mode so the token survives Anki and OS restarts for the same Windows user.
- Decode strictly as UTF-8 on read. Malformed data is a read failure, not an absent credential.
- Copy the credential blob into Python memory only long enough to decode it and always call `CredFree` in `finally`.
- Do not include native error messages if they can echo sensitive data. Expose only operation, backend, and numeric error code in safe diagnostics.

### 5.3 Native boundary design

Put all `ctypes` structures, constants, signatures, pointer ownership, and last-error conversion behind a private Windows adapter. The store should call semantic methods such as `read_generic`, `write_generic`, and `delete_generic`.

This separation is important because most tests should exercise store behavior with a fake adapter. A smaller Windows-only integration test can exercise the real API on CI or a disposable VM.

### 5.4 Delete semantics

Deleting a missing credential is success and keeps sign-out idempotent. Other Windows errors become `CredentialDeleteError`. Never delete by prefix or enumerate broad credential namespaces.

## 6. macOS backend hardening

Keep the current storage location for compatibility, but bring behavior under the same contract:

- Rename generic `CredentialUnavailable` failures to operation-specific typed errors.
- Treat Keychain “item not found” as `None`; do not treat every nonzero read exit as absence.
- Preserve the existing namespace exactly.
- Apply bounded timeouts to every subprocess operation.
- Ensure subprocess stdout/stderr are never copied into user-facing errors or diagnostics.
- Add a future engineering item to replace `/usr/bin/security` with direct Security.framework calls, removing short-lived token exposure in process arguments. This is not required to unblock Windows, but should remain a tracked security improvement.

## 7. Activation as a recoverable transaction

Native Windows storage fixes the primary defect, but the flow must also handle storage failures on any OS.

### 7.1 Preflight before browser approval

Before `start-link`, call `credentials.probe()` in the background. The probe should:

1. Generate a random, non-secret test value.
2. Write it under a dedicated target/account ending in `.probe`.
3. Read and compare it.
4. Delete it in `finally`.
5. Return no probe value or native output to diagnostics.

Never use or overwrite the real credential target during the probe. Cache a successful probe for the lifetime of the profile runtime so repeated clicks do not repeatedly touch the OS credential UI.

If the probe fails, do not create a link code or open a browser. Show backend-specific, actionable copy and a Retry button.

### 7.2 Persist before declaring success

After `poll-link` returns a token:

1. Keep the raw token in the smallest possible local scope.
2. Write it to the credential store.
3. Read it back and compare using constant-time comparison.
4. Call authenticated `/me` using the stored credential.
5. Only then render “linked” and continue to deck setup.
6. Clear in-memory references in `finally` where practical; do not claim Python guarantees secure memory erasure.

If verification fails, delete the local credential and transition to a recoverable failure state.

### 7.3 Compensate for failed persistence

The current server consumes the link before the client persists its token. For the patch release:

- Add an API-client method that can revoke using an explicit just-issued token rather than reading from the store.
- If local persistence or verification fails, best-effort revoke that token immediately.
- The revocation call must put the token only in the authentication header, never in logs or error text.
- Regardless of revocation outcome, clear `link_code`, approval URL, and polling state.
- Replace “Open browser again” with “Start sign-in again” after a consumed or failed exchange.
- Record only a safe outcome code such as `credential_write_failed` or `credential_verify_failed`.

The existing revoke endpoint authenticates device tokens, so the client can revoke the just-issued token directly without first saving it. If revocation is unreachable, the orphan remains a server concern and must be observable without exposing it.

### 7.4 Server-side lifecycle hardening

Follow the patch with a two-phase device-token lifecycle:

1. `poll-link` creates a **provisional** token with a short expiry.
2. The add-on saves and verifies it locally.
3. The add-on calls an authenticated activation/ack endpoint.
4. The server promotes the token to active and records `activated_at`.
5. Unacknowledged provisional tokens expire and are revoked automatically.

During the provisional state, authorize only token acknowledgement, self-revocation, and optionally `/me`; reject product/deck APIs. Store only the token hash server-side as today. Do not attempt to make the raw token re-readable from the server for link-code retries.

Required schema concepts:

- `activated_at nullable`
- `provisional_expires_at nullable`
- indexed cleanup query for unactivated expired tokens
- explicit safe state in administrative diagnostics

This design closes the orphan-token window without retaining plaintext device tokens.

## 8. UI and error behavior

### Initial copy

Replace macOS-specific text with:

> Continue in your browser to sign in. Your device credential will be stored securely by your operating system.

Optionally show the detected backend in Settings or diagnostics: `macOS Keychain`, `Windows Credential Manager`, or `Unsupported`.

### Required states

| State                       | Primary action      | User-facing behavior                                   |
| --------------------------- | ------------------- | ------------------------------------------------------ |
| Store preflight running     | disabled            | “Checking secure credential storage…”                  |
| Store unavailable           | Retry               | OS-specific remediation; browser remains closed        |
| Waiting for approval        | Open approval page  | Existing link code remains visible                     |
| Token saving                | disabled            | “Securing this device…”                                |
| Linked and verified         | Continue            | Deck setup becomes available                           |
| Link consumed after failure | Start sign-in again | New code is required; never imply old code is reusable |
| Unsupported OS              | Close               | State support policy plainly                           |

Do not show “Keychain locked” for Windows failures. Error mapping should be based on typed error plus backend, not string matching.

Suggested Windows guidance:

> Windows Credential Manager could not save the SnapOrtho sign-in. Retry after unlocking/signing back into Windows. If it continues, copy Safe Diagnostics and contact support.

Do not instruct users to disable antivirus, run Anki as administrator, or manually save a token.

## 9. Sign-out, revocation, and environment changes

### Sign-out order

1. Read the token from the credential store.
2. Best-effort revoke it on the server.
3. Delete the local credential even if network revocation fails.
4. Verify local absence.
5. Report either full sign-out or “signed out locally; server revocation will require account device management.”

Add a web account device-management path if one does not already let users revoke orphaned/offline devices.

### Environment changes

Because credentials are environment-namespaced, changing backend environment should rebuild both API client and credential store. The current settings flow rebuilds only the API client. Fix this atomically:

- validate settings;
- construct/probe the new store;
- construct the new API client using it;
- update runtime references only after both succeed;
- refresh linked state against the selected environment.

Never carry a production token into local/staging or vice versa.

## 10. Test strategy

### 10.1 Pure unit tests on every platform

Add tests for:

- platform factory selection for `Darwin`, `Windows`, and unsupported values;
- stable target construction and environment/profile isolation;
- empty and oversized token rejection;
- missing credential versus read failure;
- successful write/read/delete;
- idempotent delete of a missing credential;
- UTF-8 round trip;
- malformed blob handling;
- native memory freed after success and decoding/error paths;
- no token in exception strings, diagnostics, or captured logs;
- probe uses a separate target and always attempts cleanup;
- runtime settings changes rebuild store and API client together.

### 10.2 Device-link state-machine tests

Cover:

- preflight failure prevents `start-link`;
- successful approval persists and verifies before success UI;
- credential write failure triggers best-effort revocation and resets link state;
- read-back mismatch deletes the local credential;
- `/me` rejection after save deletes/revokes and does not show success;
- consumed link presents “Start sign-in again”;
- retry creates a new code rather than polling the consumed code;
- callback/dialog closure cannot continue polling or save late results;
- sign-out behavior for online, offline, missing, and locked-store cases.

### 10.3 Real Windows integration tests

On a Windows runner or disposable VM under a non-administrator user:

1. Write a random test token to a test-only namespace.
2. Read and compare it.
3. Start a fresh Python process and read it again.
4. Delete it.
5. Confirm a subsequent read is absent.
6. Run cleanup in `finally` and by a separate post-job cleanup step.

Never use production target names or real tokens in CI.

### 10.4 Package tests

Extend package verification to assert:

- Windows store and factory source files are present in both editions;
- no forbidden credential libraries, token fixtures, bytecode, or secret patterns are packaged;
- source compiles with Anki’s supported Python version;
- displayed version, manifest version, archive name, and checksum agree;
- neither package contains platform-specific imports executed eagerly on the wrong OS.

### 10.5 Manual acceptance matrix

Test clean and upgrade installs:

| OS                                         | Scenario                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Windows 11 supported baseline              | first activation, Anki restart, Windows restart, sign-out, reactivation |
| Windows standard user                      | same flow without elevation                                             |
| Windows with simulated native write denial | early actionable failure, no browser/token issuance                     |
| macOS supported baseline                   | existing credential retained across upgrade; new activation still works |
| macOS locked/denied Keychain               | early failure and successful retry after remediation                    |
| Linux                                      | honest unsupported state before browser opens                           |
| All supported OSes                         | production/staging separation and two Anki profiles                     |

Also verify Unicode Windows usernames and profile names, while confirming raw profile names never enter credential targets or diagnostics.

## 11. CI and engineering-quality improvements

Add these gates to the add-on pipeline:

- Run pure Python tests on macOS, Windows, and Linux.
- Run the real native credential smoke test only on its matching OS.
- Build the package once from a clean checkout and verify it independently.
- Extract the built archive and run source/manifest/security assertions against the artifact, not only the source tree.
- Fail if user-facing activation copy contains platform-specific “macOS Keychain” text outside the macOS error mapper.
- Fail if `ProfileRuntime` directly constructs a platform-specific store.
- Add a regression test tied to the reported sequence: Windows → approve → token returned → native save → authenticated `/me` → linked.
- Keep fake stores for business-flow tests, but require native-adapter contract tests so fakes cannot be the only credential coverage.

## 12. Safe observability and support

Add metadata-only events or counters:

- `anki_link_started`
- `anki_link_approved`
- `anki_credential_store_succeeded`
- `anki_credential_store_failed`
- `anki_link_verified`
- `anki_link_cleanup_revocation_failed`

Permitted properties:

- add-on version;
- OS family;
- credential backend name;
- safe stage;
- safe normalized error code;
- whether retry succeeded;
- anonymous installation/device-token row identifier already available server-side.

Forbidden properties include link code, raw token, credential target, profile name, native error text, card data, and user content.

Safe Diagnostics should include:

- `credentialBackend`;
- `credentialBackendAvailable`;
- last safe credential operation/error code;
- activation state (`unlinked`, `pending`, `linked`, `local_cleanup_needed`);
- add-on/Anki/Python/Qt/OS versions.

Define rollout dashboards for approval-to-storage success by OS and version. Alert on a meaningful rise in `credential_store_failed` or approved links without activated tokens.

## 13. Delivery phases

### Phase A — patch release blocker

- Add contract, typed errors, and platform factory.
- Implement and test Windows Credential Manager.
- Update runtime construction and platform-neutral copy.
- Add storage preflight.
- Verify write/read before success.
- Reset consumed link state and provide “Start sign-in again.”
- Add best-effort explicit-token revocation on persistence failure.
- Add Windows unit/native integration coverage and artifact checks.
- Update support and supported-platform documentation.
- Publish a new signed/checksummed patch package only after the acceptance matrix passes.

### Phase B — server lifecycle hardening

- Add provisional token fields and migration.
- Add token activation/ack endpoint.
- Restrict provisional token authorization.
- Add automatic expiry/revocation cleanup.
- Add server integration tests and operational metrics.
- Retain compatibility for older add-ons during a defined migration window.

### Phase C — platform and security follow-up

- Replace macOS command-line Keychain calls with a direct framework adapter.
- Decide Linux support based on a reviewed Secret Service implementation and packaging constraints.
- Add web device inventory/revocation and last-used metadata.
- Establish periodic credential lifecycle and platform smoke tests before each add-on release.

## 14. Rollout and rollback

### Rollout

1. Implement behind the add-on patch version; no plaintext or legacy fallback flag.
2. Validate against local/staging with disposable users and profiles.
3. Run clean Windows and macOS manual acceptance.
4. Publish to a small canary group and compare approval, storage, and verified-link rates by OS.
5. Expand only when Windows verified-link success matches the macOS baseline and no security invariant regresses.
6. Publish user-facing release notes explicitly stating Windows activation support and requiring an add-on update.

### Rollback

- Keep the prior package and checksums available internally.
- If Windows storage is defective, pause distribution of the new package rather than falling back to plaintext.
- Server lifecycle changes must be backward compatible until the minimum supported add-on version is raised.
- Rolling back the client must not delete existing Windows credentials; target naming should remain stable so a corrected build can reuse them.
- Schema rollback must not resurrect revoked/provisional tokens as active.

## 15. Acceptance criteria

The defect is closed only when all of the following are true:

- A standard Windows user can activate from a clean Anki profile without elevation.
- The add-on remains linked after Anki and Windows restart.
- The raw token is present only in Windows Credential Manager and server-side only as a hash.
- Sign-out removes the Windows credential and revokes the server token when online.
- Failure to access secure storage is detected before browser approval whenever possible.
- A post-exchange storage failure does not leave the UI stuck on a consumed link code.
- macOS upgrades retain existing Keychain credentials and pass the same link regression suite.
- Linux fails early with accurate support messaging.
- Both distributed add-on editions contain and select the correct platform implementation.
- Tests run on Windows and macOS, and package verification inspects the final archive.
- Safe telemetry demonstrates successful approval-to-verified-link conversion on Windows.
- Security review confirms there is no plaintext fallback or secret leakage through errors, diagnostics, analytics, logs, or packaging.

## 16. Definition of done checklist

- [x] Credential-store protocol and typed errors implemented
- [x] Platform factory implemented and used by every runtime entry point
- [x] Windows Credential Manager backend implemented
- [x] macOS error semantics hardened without namespace migration
- [x] Preflight and transactional activation state machine implemented
- [x] Explicit-token cleanup/revocation implemented
- [x] Platform-neutral UI and recovery actions implemented
- [x] Environment-switch credential handling fixed
- [x] Unit, state-machine, opt-in native OS, and package tests added; local non-native suites green
- [ ] Disposable Windows and macOS release smoke-test evidence recorded
- [x] Safe diagnostics and aggregate rollout metrics implemented
- [x] Support documentation and release notes updated
- [x] New `.ankiaddon` archives and SHA-256 files generated and independently verified
- [ ] Canary release meets the agreed activation-success threshold
- [x] Phase B provisional-token lifecycle, acknowledgement endpoint, expiry cleanup, and compatibility path implemented
