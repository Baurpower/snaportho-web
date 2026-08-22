# Google Calendar as the Program Schedule Source of Truth

Status: implemented in code; migration and deployment configuration pending rollout  
Owner: SnapOrtho Workspace  
Last updated: 2026-08-21  
Related audit: `docs/google-calendar-integration-audit.md`

## 1. Objective

Allow an authorized SnapOrtho program administrator to select one Google Calendar as the authoritative source for the program call schedule. SnapOrtho will import that calendar into program `call_assignments`, keep it synchronized, expose validation and operational status to administrators, and continue supporting resident-facing SnapOrtho views and personal outbound calendar exports.

The first production source is expected to be the `Call Schedule` calendar currently available to the Valley Hospital Orthopedics Google account. The importer must use the selected calendar's immutable Google calendar ID, not its display name and not the user's combined Google Calendar view.

## 2. Success criteria

The project is complete when:

1. A program administrator can connect a Google account and select exactly one readable calendar as the program source.
2. A dry run reports creates, updates, removals, unmatched people, overlaps, malformed events, and unchanged assignments without changing production schedule data.
3. An administrator can explicitly activate the source after resolving blocking validation errors.
4. Google event creation, modification, cancellation, and deletion converge into SnapOrtho within five minutes under normal operation and within one hour if push delivery is missed.
5. Processing the same Google revision more than once produces no duplicate assignments or audit entries.
6. A failed partial run does not advance the sync token or expose a partially applied schedule.
7. SnapOrtho never reads events from unselected calendars.
8. Imported assignments cannot be silently edited in SnapOrtho; authorized overrides are explicit, audited, and have a defined lifetime.
9. Disconnecting an administrator does not silently destroy the program's imported schedule.
10. Operators can see source health, last successful sync, pending review count, channel expiration, and recent errors.

## 3. Scope

### Included

- Program-owned Google Calendar connection and source configuration.
- One authoritative source calendar per program for the initial release.
- Call-schedule events represented by all-day or timed Google events.
- Initial full import and incremental synchronization.
- Google push notifications plus periodic reconciliation.
- Resident/person alias mapping and an administrator review queue.
- Create, update, cancellation, and deletion propagation into SnapOrtho.
- Import ledger, audit trail, retries, monitoring, and safe rollback.
- Continued outbound personal calendar sync from SnapOrtho.

### Not included in the first release

- Importing PTO, didactics, surgery calendars, or the combined Google Calendar view.
- Two-way editing of the authoritative calendar.
- Multiple authoritative calendars for one program.
- Automatic fuzzy matching that writes ambiguous names to production.
- Historical backfill before the configured academic-year boundary.
- Google Workspace domain-wide delegation unless user-owned OAuth proves operationally unsuitable.

## 4. Source-of-truth contract

### Direction

The authoritative flow is one-way:

```text
Selected Google Calendar
  -> inbound event staging and validation
  -> SnapOrtho call_assignments
  -> SnapOrtho workspace views
  -> optional personal outbound calendars
```

SnapOrtho must not write imported schedule changes back to the authoritative Google calendar. Personal outbound calendars remain derived destinations and must never be used as inbound sources.

### Authority rules

- Google owns the assignee, start, end, all-day status, title-derived call metadata, and cancellation state for imported assignments.
- SnapOrtho owns internal IDs, program/roster links, import status, audit data, and application-only metadata.
- Manual SnapOrtho edits to source-owned fields are blocked by default.
- An emergency override requires the program-calendar management permission, a reason, an optional expiration, and an audit record. A later Google change either supersedes the override or enters review according to the override policy selected before launch.
- Source removal does not immediately hard-delete schedule rows. Rows first become source-deleted/tombstoned, then are hidden or removed through an atomic apply step.

### Calendar-specific parsing rules

Observed source events use names such as `Baur`, `Mo`, `Dunn`, `Parry`, `Fang`, and `McNair`; some append a label such as `McNair - Labor Day`. The initial parser should:

1. Trim and normalize Unicode and whitespace.
2. Remove only configured suffix patterns; do not remove arbitrary text after a hyphen.
3. Match the remaining token through program-scoped aliases.
4. Reject zero or multiple active matches.
5. Preserve the original title and normalized parsing result in the import ledger.

Google all-day event `end.date` is exclusive. For example, an event displayed Friday through Sunday has an API end date of Monday. SnapOrtho must store a clearly defined interval and must not subtract a day more than once.

## 5. Required preliminary fix

Before any inbound work, fix the current outbound manual-sync range bug in `src/app/api/program/calls/google-sync/route.ts`.

The endpoint currently loads calls inside the requested range but compares them with every existing sync row for the user/program/connection, causing out-of-range Google events to appear stale. Restrict stale detection to assignments in the same requested range, or reconcile by explicit affected assignment IDs. Add a regression test with events before, within, and after the requested range.

Release this correction independently so inbound implementation is not built on unsafe outbound behavior.

## 6. Data model

Use program-owned tables instead of extending `user_calendar_connections` into a role it was not designed to fill. OAuth credentials may initially still originate from a user grant, but the source configuration and operational lifecycle belong to the program.

### `program_calendar_connections`

One record for a reusable program-level provider connection.

| Column | Purpose |
| --- | --- |
| `id uuid pk` | Internal connection identity |
| `program_id uuid not null` | Owning program |
| `provider text` | Initially `google` |
| `granted_by_user_id uuid` | Administrator who completed OAuth |
| `provider_account_email text` | Display and operational diagnostics |
| `encrypted_access_token text` | Application-encrypted token |
| `encrypted_refresh_token text` | Application-encrypted refresh token |
| `token_expiry timestamptz` | Refresh diagnostics |
| `status text` | `active`, `reauth_required`, `revoked`, `disabled` |
| `last_token_error*` | Sanitized operational state |
| timestamps | Lifecycle audit |

Constraints:

- Unique active connection identity appropriate to the chosen ownership model.
- Foreign keys to program, granting user, and auth user where applicable.
- Never expose token columns through browser-facing selects, views, logs, or API responses.
- Encrypt tokens before database persistence with an application-managed key and versioned ciphertext envelope. Document key rotation and recovery.

### `program_calendar_sources`

The authoritative source configuration.

| Column | Purpose |
| --- | --- |
| `id uuid pk` | Source identity |
| `program_id uuid not null unique` | One source per program in v1 |
| `connection_id uuid not null` | Program connection |
| `provider_calendar_id text not null` | Exact Google calendar ID |
| `provider_calendar_summary text` | Display-only cached name |
| `mode text` | `preview`, `active`, `paused`, `error`, `disconnected` |
| `effective_start/end date` | Authoritative import boundary |
| `timezone text` | Program/source interpretation |
| `sync_token text` | Last atomically committed Google token |
| `initial_sync_completed_at` | Bootstrap state |
| `last_sync_started_at` | Health |
| `last_success_at` | Health |
| `last_error_class/message/at` | Sanitized health |
| `consecutive_failure_count` | Alerting/backoff |
| `configuration_version bigint` | Prevent stale jobs applying old config |
| timestamps | Lifecycle audit |

Do not put OAuth secrets in this table.

### `program_calendar_channels`

Tracks Google watch channels separately because replacement channels can overlap.

| Column | Purpose |
| --- | --- |
| `id uuid pk` | Internal row |
| `source_id uuid` | Watched source |
| `channel_id text unique` | Random ID sent to Google |
| `resource_id text` | Required to stop channel |
| `channel_token_hash text` | Validate callback routing without storing raw token |
| `resource_uri text` | Diagnostics |
| `expires_at timestamptz` | Renewal scheduling |
| `status text` | `creating`, `active`, `superseded`, `stopped`, `expired` |
| `last_message_number bigint` | Diagnostic/deduplication signal only |
| timestamps | Lifecycle audit |

Push notifications contain no changed event body; the webhook only authenticates/routs the notification and enqueues an incremental sync.

### `program_calendar_person_aliases`

| Column | Purpose |
| --- | --- |
| `program_id uuid` | Alias namespace |
| `normalized_alias text` | Deterministic normalized key |
| `program_membership_id` or `roster_id` | Resolved SnapOrtho person |
| `active_from/to date` | Name reuse and roster turnover |
| `created_by_user_id` | Accountability |
| timestamps | Audit |

Enforce uniqueness so one normalized alias cannot resolve to two active people over the same effective period.

### `program_calendar_import_events`

Durable provider-event mirror and staging ledger.

| Column | Purpose |
| --- | --- |
| `source_id` | Source |
| `provider_event_id text` | Stable Google event ID |
| `provider_recurring_event_id text` | Future recurring-event support |
| `etag text` | Provider revision |
| `status text` | Google event status |
| `raw_payload jsonb` | Minimum necessary provider payload, retention-limited |
| normalized title/time fields | Deterministic parser input |
| `matched_roster_id/membership_id` | Resolution result |
| `validation_status text` | `valid`, `warning`, `blocked`, `ignored` |
| `validation_issues jsonb` | Machine-readable issue codes |
| `call_assignment_id uuid` | Applied SnapOrtho record |
| `first_seen_at/last_seen_at` | Lineage |
| `applied_at` | Convergence state |
| `source_deleted_at` | Tombstone |

Unique key: `(source_id, provider_event_id)`. Index unapplied/blocked rows, source plus dates, and assignment linkage.

Store only fields needed for scheduling and diagnostics. Do not ingest attendee lists, conference data, descriptions, or unrelated metadata unless a documented requirement is approved.

### `program_calendar_sync_runs`

One row per full, incremental, preview, reconciliation, or manual retry run.

Include run type, trigger, source/configuration version, starting/ending sync-token hashes, pages/events processed, proposed/applied counts, warning/block/error counts, duration, worker attempt, and sanitized failure information.

### `program_calendar_change_audit`

Append-only business audit containing actor (`google`, user, or system), source event/revision, affected assignment, before/after normalized values, action, override reason, sync run, and timestamp.

Do not rely only on application logs for schedule history.

### Changes to `call_assignments`

Add explicit lineage rather than inferring it from a side table:

- `source_kind text not null default 'snaportho'`
- `source_calendar_id uuid null`
- `source_event_id text null`
- `source_event_etag text null`
- `source_synced_at timestamptz null`
- `source_deleted_at timestamptz null`
- `source_override_state text null`

Add a partial unique index covering imported assignments so one provider event cannot create duplicate call assignments for the same source. Validate existing creation, bulk-import, swap, export, and notification flows against the new fields.

## 7. Security and authorization

### Permissions

Add or clearly separate these capabilities:

- `canManageProgramCalendarSource`: connect, select, preview, activate, pause, reauthorize, and disconnect.
- `canReviewProgramCalendarImports`: resolve mappings and warnings.
- `canOverrideSourceOwnedSchedule`: emergency override with reason.
- Existing `canSyncProgramCalendar` continues to mean outbound export and must not implicitly grant source management.

Every server route must authenticate the Supabase user and verify active membership plus the exact program permission. Never authorize from user-editable metadata.

### RLS and grants

- Enable RLS on every new table in `public`.
- Revoke `anon` access.
- Prefer server-only access for connection secrets, channels, queue internals, raw payloads, and sync runs.
- If authenticated users need direct read access, grant only required operations and use program-membership predicates in policies; `TO authenticated` alone is insufficient.
- Update policies require both `USING` and `WITH CHECK`.
- Avoid public `SECURITY DEFINER` helpers. If one is unavoidable, place it in an unexposed schema, revoke default `PUBLIC` execution, set a safe `search_path`, and perform explicit authorization.
- Any browser-facing view must use `security_invoker = true` or remain unexposed.
- Confirm whether new tables are exposed by the project's current Data API configuration; exposure and RLS are separate controls.

### Google OAuth

- Use least-privilege read scopes for the inbound connection.
- Verify the selected calendar exists and has at least reader access before saving it.
- Separate inbound program connection consent from personal outbound write consent, even if both use the same Google account.
- Use OAuth state bound to user, program, intended action, nonce, and expiry, with single consumption.
- Never include program IDs, OAuth tokens, or sensitive data directly in the Google channel token.

### Privacy boundary

The connected Google account can see calendars containing patient information. The importer must call `events.list` only for `program_calendar_sources.provider_calendar_id`. Do not enumerate and import all calendars, follow event-linked calendars, or persist combined-view data. Log calendar IDs only in truncated or hashed form where full values are unnecessary.

## 8. Synchronization algorithm

### Initial preview/full sync

1. Lock the source logically using a database advisory lock or a single-flight job key.
2. Snapshot `configuration_version` and confirm source mode permits the run.
3. Call `events.list` for the exact selected calendar ID with the approved initial query parameters and bounded effective dates.
4. Paginate until the final page; the next sync token appears only on the final page.
5. Upsert provider events into the import ledger by `(source_id, provider_event_id)`.
6. Normalize times and titles; resolve aliases; run validation.
7. Produce a preview diff against current `call_assignments`.
8. In preview mode, stop without schedule writes but save the run and review results.
9. In active mode, apply all validated changes in a database transaction or an equivalent versioned atomic apply procedure.
10. Commit the new sync token only after all pages were fetched and the intended ledger/apply transaction succeeded.
11. Create a Google events watch channel and schedule renewal.

Do not mark previously known events as deleted merely because an initial query is date-bounded. Deletion comparison must use the configured authority window and a completed full snapshot generation.

### Incremental sync

1. Receive a push notification or periodic reconciliation trigger.
2. Validate channel ID, resource ID, hashed token, source state, and configuration version.
3. Enqueue a deduplicated source-sync job and immediately return a successful webhook response.
4. Acquire the source single-flight lock.
5. Call `events.list` with the stored `syncToken` and the exact compatible query shape.
6. Paginate using the same sync token plus each page token.
7. Upsert changed and cancelled/deleted events into the ledger.
8. Validate and apply the delta.
9. Atomically replace the stored sync token with `nextSyncToken` on success.

Incremental responses include deleted events. Treat `status=cancelled` as a provider tombstone, not as an immediately destructive command outside the configured authority window.

### Invalid sync token

Google returns HTTP 410 when a sync token is invalid. On 410:

1. Do not retry the same token.
2. Mark the source as requiring a full reconciliation.
3. Retain current assignments and ledger rows while fetching a new bounded full snapshot.
4. Diff the completed snapshot against source-owned rows inside the effective window.
5. Apply the diff atomically and save the new token.

This avoids an empty or partially fetched snapshot deleting the live schedule.

### Push reliability and reconciliation

Google states that push delivery is not fully reliable and notifications contain no event body. Therefore:

- Push means “changes may exist,” never “apply this event.”
- Run periodic incremental reconciliation even without notifications; target every 30–60 minutes.
- Run a daily health/full-boundary audit that does not unnecessarily discard a valid sync token.
- Renew channels before expiration using a new unique channel ID. Allow overlap, route both to the same deduplicated source job, then stop or expire the old channel.

### Concurrency and idempotency

- Only one sync may advance a source token at a time.
- Jobs carry `source_id` and `configuration_version`; stale jobs exit without applying.
- Event upserts are idempotent by source/event ID and revision.
- Assignment application is idempotent by source/event linkage.
- Webhook message numbers are diagnostic; do not assume they are consecutive.
- Multiple notifications collapse into one pending job where practical.

## 9. Event validation and mapping

### Blocking conditions

- No resident alias match.
- Multiple valid alias matches.
- Missing start/end.
- End not after start.
- Event outside the configured authority window.
- Duplicate active events resolving to an impossible or disallowed assignment.
- Source event would overwrite a SnapOrtho-native assignment without an approved takeover rule.
- Unsupported recurrence or event type in v1.

### Warnings

- Holiday or other configured suffix removed from title.
- Multi-day assignment.
- Timezone differs from program default.
- Google event changed while a SnapOrtho override is active.
- Assignment overlaps another event but the program allows overlap.

### Ignored events

Define explicit, reviewable ignore rules such as `[IGNORE]` prefix or a configured event transparency/type. Do not silently ignore an event simply because it cannot be parsed.

### Review workflow

The admin UI shows the raw source title, dates, proposed person, issue codes, and intended action. An administrator can:

- Create or select an alias.
- Mark an event intentionally ignored with a reason.
- Correct a source configuration problem.
- Retry validation/apply.

Corrections that belong in the authoritative schedule should be made in Google whenever possible.

## 10. API and worker surface

Suggested routes:

- `GET /api/program/calendar-source/status`
- `POST /api/program/calendar-source/connect`
- `GET /api/program/calendar-source/callback`
- `GET /api/program/calendar-source/calendars`
- `POST /api/program/calendar-source/configure`
- `POST /api/program/calendar-source/preview`
- `POST /api/program/calendar-source/activate`
- `POST /api/program/calendar-source/pause`
- `POST /api/program/calendar-source/reconcile`
- `POST /api/program/calendar-source/disconnect`
- `GET/POST /api/program/calendar-source/aliases`
- `GET /api/program/calendar-source/review`
- `POST /api/program/calendar-source/review/:id/resolve`
- `POST /api/integrations/google/calendar-webhook` (public provider callback with strict header/token validation)

The webhook must not perform Google API calls or database-wide reconciliation inline. It validates, enqueues, and returns promptly.

### Durable work

Use a durable queue rather than `void promise` work tied to a serverless response. Supabase Queues/`pgmq` is a suitable option if enabled and supported by the project's Postgres version. Keep queue consumers server-side; do not expose queue schemas to browser clients. Define:

- Visibility timeout longer than normal sync duration.
- Bounded exponential retry with jitter.
- Maximum attempts and archived/dead-letter handling.
- Per-source deduplication/single-flight.
- Metrics for oldest message, attempts, failures, and processing latency.

If the team instead chooses an external queue, preserve the same job contract and database idempotency guarantees.

## 11. Administrator experience

### Setup wizard

1. Explain that Google will become authoritative for program calls.
2. Connect/authorize a Google account with read-only permission.
3. List readable calendars and select one; show account, calendar name, and stable ID fingerprint.
4. Select effective academic-year dates and program timezone.
5. Configure aliases and title suffix rules.
6. Run preview.
7. Resolve blockers and inspect diff totals plus sample events.
8. Require explicit activation confirmation describing deletion and override behavior.

### Status page

Show:

- Mode and source calendar.
- Connected account and reauthorization state.
- Effective date range/timezone.
- Last successful sync and last notification.
- Pending review and blocked-event counts.
- Watch-channel expiration/renewal health.
- Recent run summaries and sanitized errors.
- Actions: preview, reconcile now, pause, reauthorize, change calendar, disconnect.

Changing the selected calendar must increment `configuration_version`, pause active apply, invalidate the old sync token, create a new preview, and require reactivation. It must not silently treat every event from the old calendar as deleted.

## 12. Interaction with existing SnapOrtho behavior

### Personal outbound sync

Imported call assignments continue to feed existing resident personal-calendar exports. Prevent loops by maintaining separate concepts:

- Program inbound source connection/calendar.
- User outbound destination connection/calendar.
- Inbound source event identity.
- Outbound `synced_call_events` identity.

Reject configuration that selects a known SnapOrtho-generated outbound calendar as the authoritative inbound source unless a future explicit loop-safe design supports it.

### Schedule editing and swaps

Before activation, decide product behavior for swaps:

- Recommended v1: source-owned assignments are view-only in SnapOrtho; swaps remain disabled or requests are advisory until the authoritative Google event is changed.
- Alternative: approved swaps create explicit temporary overrides and an admin task to update Google. This has higher divergence risk and should not be implicit.

Bulk imports and AI draft generation must not overwrite active source-owned assignments. They should target drafts or non-authoritative date ranges.

## 13. Testing strategy

### Unit tests

- Title normalization and configured suffix parsing.
- Alias matching across effective dates and Unicode/case variants.
- All-day exclusive end dates and timed timezone conversion.
- Validation issue classification.
- Google error classification including 401/403/404/410/429/5xx.
- Idempotent event and assignment mapping.
- Configuration-version stale-job rejection.

### Database tests

- Unique source/event identity.
- Overlapping alias constraint behavior.
- Foreign keys and delete behavior.
- RLS isolation between programs and roles.
- Token/raw-payload tables inaccessible to authenticated and anonymous clients.
- Atomic apply rollback leaves sync token unchanged.
- Concurrent consumers cannot both advance a source token.

### API tests

- Authentication and permission matrix for every route.
- OAuth state cannot be replayed or moved across users/programs.
- Exact calendar ID selection and read-access verification.
- Webhook rejects unknown channel/resource/token combinations.
- Webhook accepts duplicate valid notifications without duplicate jobs/work.
- Disconnect/pause/calendar-change lifecycle.
- No secrets or raw provider payloads in responses or logs.

### Sync integration fixtures

Cover:

- Single-day all-day call.
- Friday-through-Sunday call.
- Holiday suffix.
- Timed call across DST boundaries.
- Updated title/assignee/date.
- Cancelled and deleted events.
- Pagination and change during pagination.
- Duplicate notification and out-of-order notification.
- Invalid/expired sync token requiring full reconciliation.
- Missed push recovered by periodic sync.
- Ambiguous and unknown names.
- Google throttling and transient failures.
- Source calendar access revoked.

### Regression tests

- Existing personal outbound sync.
- Manual outbound range isolation.
- Call swaps and individual call changes.
- Bulk call changes/imports.
- Academic-year views, stats, notifications, and ICS export.
- Multi-program account isolation.

## 14. Observability and operations

### Structured events

Log source/run IDs, configuration version, trigger, run type, counts, duration, outcome, Google status class, queue attempt, and token/channel fingerprints. Never log OAuth tokens, raw channel tokens, full patient-adjacent payloads, or event descriptions.

### Metrics and alerts

Alert on:

- No successful sync within the expected interval.
- Channel expires within 24 hours without an active replacement.
- Consecutive failures over threshold.
- Reauthorization required.
- Queue age/depth or dead-letter growth.
- Blocking review count above threshold.
- Unexpected large deletion/update diff.
- Sync-token reset frequency.

Require human confirmation for an unusually large destructive diff during preview, calendar change, or 410 full reconciliation. Choose concrete thresholds from program size; suggested starting point is more than 10 assignments or 20% of the active window, whichever is smaller.

### Runbooks

Document:

- Reauthorize Google without losing source state.
- Renew/recreate a failed watch channel.
- Recover from 410 full resync.
- Replay a dead-letter job safely.
- Pause apply while retaining inbound staging.
- Change source calendar.
- Roll back a bad import using the audit ledger.
- Rotate token-encryption keys.
- Disconnect and revoke credentials.

## 15. Delivery phases

### Phase 0 — safety and decisions

- Fix outbound range deletion and add regression coverage.
- Decide swap/override semantics.
- Decide program OAuth ownership and backup administrator procedure.
- Define authoritative dates, timezone, event title grammar, deletion threshold, and SLOs.
- Inventory existing call assignments and roster aliases for the pilot program.

Exit: current sync is safe and unresolved product decisions are recorded.

### Phase 1 — schema and secure connection

- Add program connection/source, aliases, ledger, run, channel, and audit tables.
- Add assignment lineage columns and indexes.
- Implement grants/RLS and security verification SQL.
- Add encrypted token storage.
- Add inbound read-only OAuth flow and exact calendar selector.

Exit: an authorized admin can securely save a disabled program source; no event import yet.

### Phase 2 — preview importer

- Implement paginated bounded full sync into staging.
- Implement parsing, alias resolution, validation, and diff generation.
- Build alias/review UI and preview summary.
- Verify the importer requests only the selected `Call Schedule` calendar ID.

Exit: pilot academic-year preview has zero unexplained blockers and matches a manually sampled calendar set.

### Phase 3 — controlled apply

- Implement atomic idempotent apply and audit ledger.
- Activate a narrow future window, initially one month.
- Keep automated deletions guarded and monitor daily.
- Verify resident views and personal exports.

Exit: one-month pilot converges correctly through create/update/delete scenarios.

### Phase 4 — continuous sync

- Add sync-token incremental processing.
- Add durable queue worker and retries.
- Add Google watch webhook and renewal.
- Add periodic reconciliation and 410 recovery.
- Add status UI, metrics, alerts, and runbooks.

Exit: fault-injection tests pass and normal changes meet the convergence SLO.

### Phase 5 — full academic-year rollout

- Expand the effective window after pilot sign-off.
- Reconcile the complete academic year.
- Enable operational alerts and weekly review for the first month.
- Remove any temporary dual-maintenance process only after a documented soak period.

Exit: Google is formally designated as the program call-schedule source of truth.

## 16. Rollback plan

- `pause` stops assignment application but continues or optionally pauses staging; current SnapOrtho data remains available.
- Every apply run records before/after values sufficient for a compensating rollback.
- Keep source-owned rows and tombstones during the rollback retention window; avoid immediate hard deletion.
- A bad run is reversed by run ID, not by attempting to reconstruct state from current Google data.
- Rollback never rewinds the stored sync token blindly. After data restoration, run a controlled preview/full reconciliation to establish a consistent provider position.
- Disconnect revokes/stops channels and credentials but requires an explicit separate decision about retaining, converting, or removing imported assignments.

## 17. Verification checklist before production

- [ ] Outbound range-deletion regression fixed.
- [ ] Source calendar ID verified as `Call Schedule`, not a display-name-only selection.
- [ ] Read-only OAuth scope approved and consent-screen configuration verified.
- [ ] Token encryption and rotation tested.
- [ ] New public tables have RLS and explicit grants reviewed.
- [ ] Cross-program authorization tests pass.
- [ ] Full preview manually compared with representative weekday, weekend, holiday, and multi-day events.
- [ ] All roster names have unambiguous aliases for the effective window.
- [ ] Large destructive diffs require confirmation.
- [ ] Incremental pagination, duplicate delivery, missed delivery, and HTTP 410 tests pass.
- [ ] Watch renewal and overlap tested.
- [ ] Durable queue retry/dead-letter behavior tested.
- [ ] No unrelated calendar or patient data is fetched, stored, or logged.
- [ ] Personal outbound sync loop prevention tested.
- [ ] Pause, reauthorization, source change, rollback, and disconnect runbooks rehearsed.
- [ ] Production dashboards and alerts assigned to an owner.

## 18. Open decisions

These decisions should be resolved in Phase 0:

1. Are multi-day source events one call assignment with a duration, or one assignment per calendar date?
2. Are holiday labels stored in `notes`, a structured tag, or ignored after audit preservation?
3. What is the authoritative academic-year boundary?
4. Does a Google deletion immediately remove an assignment after validation, or require review for a short grace period?
5. Are SnapOrtho swaps disabled for source-owned rows, or represented as audited overrides?
6. Which administrator role owns reauthorization if the original granting user leaves?
7. What deletion/update threshold requires manual approval?
8. How long are raw provider payloads, tombstones, sync runs, and audit records retained?
9. Is the existing connected Google account acceptable for production ownership, or should the program use a dedicated Workspace-managed integration identity?

## 19. Reference behavior relied upon

- Google incremental sync requires an initial full sync, persistence of the final page's `nextSyncToken`, identical compatible query parameters for subsequent pages, inclusion of deleted resources in incremental results, and full resynchronization after HTTP 410.
- Google push notifications identify that a resource collection changed but do not include the changed event body. Channels expire, are not automatically renewed, may overlap during replacement, and delivery is not guaranteed; periodic reconciliation remains required.
- Supabase tables in exposed schemas require explicit RLS and grants. Data API exposure is distinct from RLS, and current platform behavior may not automatically expose newly created tables.
- A durable Postgres-backed queue such as Supabase Queues/`pgmq` is preferable to serverless fire-and-forget reconciliation; queue internals should remain server-only.
