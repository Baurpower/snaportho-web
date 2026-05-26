# Google Calendar Integration Audit

## Executive Summary

## Phase 1 Implementation Note

Phase 1 focused only on safety and correctness, without changing the visible feature set.

Implemented in code:

- OAuth state validation now uses a short-lived `httpOnly` cookie-backed nonce/state payload.
- Google callback now rejects missing, mismatched, expired, or wrong-user state.
- `reconcileGoogleCalendarForUser(...)` replaces the old post-change helper behavior.
- post-mutation Google sync is now best-effort and non-blocking for:
  - manual call update
  - manual call delete
  - direct call swap
  - coverage approval
- reconciliation now targets affected users and affected call assignment IDs, so reassignment is handled more safely.
- sync settings now persist `scope` when explicit sync runs.
- a local migration now ensures the Google sync tables and uniqueness constraints exist if they were missing from this branch.

Still deferred:

- Google -> app sync
- incremental sync tokens
- webhook / watch channels
- background job infrastructure
- broader retry/backoff orchestration

The current Google Calendar integration is functional, but it is not yet robust enough to be called highly reliable.

What it does well:

- supports Google OAuth connection
- supports selecting or creating a target Google calendar
- supports manual and automatic app -> Google call sync
- stores Google event mappings in a dedicated table
- uses backend permission checks for program-scope sync
- uses event `extendedProperties.private` to tag app-owned events

Biggest risks:

1. OAuth `state` is not actually validated against server-side state.
   The app base64-encodes `{ userId, next }`, but the callback does not verify that the state belongs to the current session. This is the highest security risk.
2. The "sync after call change" helper is not a true reconciliation sync.
   It only updates or deletes rows already present in `synced_call_events`. It does not add newly needed rows for recipient users after reassignment, and it does not remove rows when ownership changes unless the call itself disappears.
3. Google sync can still delay critical scheduling actions.
   Manual call edit, delete, direct call swap, and admin swap approval all `await` Google work after the DB mutation succeeds.
4. Token lifecycle handling is minimal.
   Refresh tokens are persisted, but there is no clear revocation/disconnect flow, no explicit expired-token recovery path, and status checks do not validate token usability.
5. Local schema visibility is incomplete in this branch.
   The runtime code references `user_calendar_connections`, `user_calendar_sync_settings`, and `synced_call_events`, but matching local migrations were not found in `supabase/migrations/`.

Current sync model:

- primary direction: app -> Google
- no Google -> app sync
- no incremental sync token support
- no webhook/push channel support
- no cron/background sync found

## 1. Current Integration Inventory

### Core files

- `src/lib/google/calendar.ts`
  OAuth client setup and auth URL generation
- `src/lib/google/syncCallCalendarAfterChange.ts`
  targeted post-mutation sync helper

### User OAuth + calendar routes

- `src/app/api/integrations/google/connect/route.ts`
- `src/app/api/integrations/google/callback/route.ts`
- `src/app/api/integrations/google/status/route.ts`
- `src/app/api/integrations/google/calendars/route.ts`
- `src/app/api/integrations/google/calendars/create/route.ts`

### Call sync routes

- `src/app/api/program/calls/google-sync/route.ts`
- `src/app/api/program/calls/google-sync/stop/route.ts`
- `src/app/api/program/calls/export/route.ts`

### Call mutation routes that trigger Google sync

- `src/app/api/program/calls/[callId]/route.ts`
- `src/app/api/program/calls/swap/route.ts`
- `src/app/api/program/calls/swaps/[swapId]/admin-decision/route.ts`

### Frontend integration surface

- `src/app/work/call/callhubclient.tsx`
  connect, sync, status, stop-sync, export UI

### Tables inferred from runtime code

- `user_calendar_connections`
  Stores Google account connection and selected calendar
- `user_calendar_sync_settings`
  Stores enabled/disabled sync state
- `synced_call_events`
  Stores per-user mapping between call assignments and Google events

### Environment variables used

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

### OAuth scopes requested

- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/userinfo.email`

### Sync direction and scope

- app -> Google only
- no Google -> app pullback
- no bidirectional sync
- "mine" sync = current user's own call assignments
- "program" sync = whole program schedule into the connected user's chosen Google calendar

Important nuance:

- "program sync" is not a shared program-owned Google integration
- it is an admin syncing the whole schedule into a calendar inside that admin's connected Google account

### Current triggers

- explicit "Sync Now" / enable automatic sync from call UI
- manual call update
- manual call delete
- direct call swap route
- admin approval of coverage request

Not found:

- schedule-import-triggered automatic Google resync
- cron or queue worker
- Google push/webhook route
- sync token storage

## 2. OAuth and Token Safety Audit

### What exists

- OAuth URL generated with `access_type: "offline"` and `prompt: "consent"`
- callback exchanges code for tokens
- profile email is fetched and stored
- refresh token is retained from existing row if Google does not return a new one

### Security findings

#### High risk: `state` is not securely validated

Current behavior:

- connect route builds `state = base64url({ userId, next })`
- callback decodes it only to recover `next`
- callback does not compare `state.userId` to the authenticated callback user
- no server-side nonce/session binding exists

Impact:

- CSRF/session-mixup protections are weak
- OAuth callback trust is based mostly on "who is logged in right now"

Required fix:

- store a nonce/state server-side or signed/expiring cookie-bound state
- validate both nonce and expected user/session in callback

#### High risk: no true disconnect/revoke flow

Current behavior:

- stop-sync disables syncing and can remove app-owned events
- OAuth tokens remain in `user_calendar_connections`
- no route was found that revokes Google tokens
- no route was found that deletes connection rows explicitly

Impact:

- stale credentials remain stored after "stop sync"
- user expectation of disconnect is not fully met

Required fix:

- add explicit disconnect/revoke path
- revoke Google token when possible
- clear stored access/refresh token fields

#### Medium risk: token storage is opaque and likely plaintext

The code reads and writes:

- `access_token`
- `refresh_token`
- `token_expiry`

No encryption-at-rest application layer was found in the app code.

Unknown:

- database encryption posture
- RLS/policy protection for these tables

Because local migrations for these tables were not found, RLS/policy safety could not be verified from this branch.

#### Medium risk: status route reports connection presence, not token health

`/api/integrations/google/status` returns connected if a row exists.

It does not verify:

- token usability
- refresh token presence
- calendar access still valid

Impact:

- revoked or broken connections can still look healthy until a sync/list call fails

### Scope review

Current scope is broad:

- full `calendar`
- `userinfo.email`

This is acceptable for current features only because the app:

- lists calendars
- creates calendars
- inserts/updates/deletes events

Still, the scope is not least-privilege. If calendar creation is kept, this may remain necessary; otherwise it could eventually be narrowed.

## 3. Calendar and Event ID Model Audit

### Mapping model

Current event mapping is:

- internal key: `call_assignment_id`
- owner scope: `user_id`
- provider: `"google"`
- sync target: `"user"`
- Google calendar ID: `provider_calendar_id`
- Google event ID: `provider_event_id`

This is good in principle and supports idempotent per-user event ownership.

### Idempotency status

`/api/program/calls/google-sync` is mostly idempotent for a given user:

- loads current calls for selected scope
- deletes stale sync rows for missing calls
- updates existing Google event when mapping exists on same target calendar
- recreates event if update fails
- upserts local mapping row on conflict:
  `call_assignment_id,provider,sync_target,user_id`

This is the strongest part of the integration.

### Extended properties

Google events include:

- `snaportho_call_assignment_id`
- `snaportho_sync_scope`

This is good and should remain.

### Gaps

#### High risk: post-change helper is not idempotent reconciliation

`syncGoogleCalendarAfterCallChange(userId)`:

- queries existing `synced_call_events` rows for that user
- joins current `call_assignments`
- updates events when joined call still exists
- deletes events when joined call is gone

It does not:

- discover newly eligible assignments for that user
- remove assignments that changed ownership but still exist
- recreate manually deleted Google events

Practical failure cases:

- swap approval reassigns a call from requester to recipient
  - old requester's mapped event can remain and get updated with recipient data
  - recipient may never get a new event unless a full sync is run
- manual reassignment by admin can produce the same issue
- manually deleted Google event can cause local row deletion but no replacement

This is the most important reliability bug.

## 4. Sync Flow Audit

### 1. Connect Google

- Route: `/api/integrations/google/connect`
- Input: optional `next`
- Permission: authenticated user only
- Output: redirect to Google auth
- Risk: weak `state` model

### 2. OAuth callback

- Route: `/api/integrations/google/callback`
- Input: `code`, `state`
- Work:
  - exchange code
  - fetch email
  - upsert `user_calendar_connections`
- Risk:
  - weak state validation
  - no explicit error classification
  - no token-health validation after save

### 3. Check Google status

- Route: `/api/integrations/google/status`
- Input: none
- Work:
  - read connection row
  - read sync settings
  - count synced rows
- Good:
  - cheap and simple
- Risk:
  - reports configuration state, not actual API health

### 4. List calendars

- Route: `/api/integrations/google/calendars`
- Permission: authenticated connected user
- Work:
  - use current stored tokens
  - call `calendarList.list(minAccessRole: "writer")`
- Good:
  - checks writable calendars only
- Risk:
  - no specific handling for 401/403/refresh failures

### 5. Create dedicated Google calendar

- Route: `/api/integrations/google/calendars/create`
- Permission: authenticated connected user
- Work:
  - creates a Google calendar
  - stores returned `calendar_id`
- Good:
  - clear ownership model inside user's own account
- Risk:
  - hardcoded timezone `America/New_York`
  - no rollback if DB update fails after Google calendar creation

### 6. Full Google sync

- Route: `/api/program/calls/google-sync`
- Permission:
  - `canSyncOwnCalendar` for `scope=mine`
  - `canSyncProgramCalendar` for `scope=program`
- Work:
  - validate writable calendar
  - persist chosen calendar on connection row
  - query call assignments
  - reconcile against `synced_call_events`
  - insert/update/delete Google events
  - upsert sync settings
- Good:
  - primary idempotent sync path
  - backend permission checks are present
- Risks:
  - no retry/backoff strategy
  - per-event serial operations
  - catches update failure by inserting a new event, which can duplicate if failure reason was transient
  - no explicit 404/410 branch for update/delete beyond broad fallback

### 7. Stop sync

- Route: `/api/program/calls/google-sync/stop`
- Permission: authenticated user
- Work:
  - disables sync setting
  - optionally deletes app-owned events from Google
  - deletes local sync rows
- Good:
  - supports event cleanup
- Risks:
  - not true disconnect/revoke
  - logs event and calendar IDs on delete failure

### 8. Sync after manual call edit/delete

- Route trigger:
  - `src/app/api/program/calls/[callId]/route.ts`
- Work:
  - persist DB mutation first
  - then `await syncGoogleCalendarAfterCallChange(user.id)`
- Good:
  - persistence happens first
- Risk:
  - waits for Google before responding
  - syncs editor/admin user only, not necessarily affected resident users

### 9. Sync after direct call swap

- Route trigger:
  - `src/app/api/program/calls/swap/route.ts`
- Same risks as above

### 10. Sync after coverage approval

- Route trigger:
  - `src/app/api/program/calls/swaps/[swapId]/admin-decision/route.ts`
- Work:
  - after approval, sync requester and recipient user IDs
- Good:
  - better than edit/delete routes because it targets affected users
- Risk:
  - still awaits sync before response
  - helper is not a full reconciliation path
  - helper uses `createClient()` not admin client; cross-user access depends on unseen RLS/policies

## 5. Permissions and Role Safety Audit

### Good

- `scope=program` sync requires `canSyncProgramCalendar`
- `scope=mine` sync requires `canSyncOwnCalendar`
- program calendar export requires `canExportProgramCallCalendar`
- resident users should not be able to trigger program-wide sync via API if permissions are correctly enforced

### Acceptable user-scoped routes

- connect
- callback
- status
- list calendars
- create calendar
- stop sync

These operate only on the authenticated user's Google connection and are reasonable as self-service actions.

### Important nuance

"Program sync" is still stored under the connected user's personal Google connection row and `sync_target = "user"`.

That means:

- there is no true program-owned integration model
- there is no shared workspace calendar credential or program-level connection record

This is safe enough from a permissions perspective, but architecturally important.

## 6. Error Handling and Reliability Audit

### Covered partially

- deleted/missing event during stop-sync delete:
  404/410 treated as removable
- Google event update failure during full sync:
  falls back to insert
- stale local sync rows:
  removed during full sync and stop-sync

### Weak or missing

- no first-class 401/403 token-revoked handling
- no explicit refresh-token-missing handling
- no explicit invalid calendar ID recovery besides generic writable check
- no rate-limit/backoff handling for 429
- no timeout handling around Google API calls
- no partial-operation reconciliation if Google succeeds but DB upsert fails
- no rollback or compensating cleanup when Google calendar creation succeeds but DB update fails
- no token refresh persistence strategy if Google client refreshes internally

### Reliability recommendation

Short term:

- classify Google errors into:
  - auth/reconnect needed
  - calendar missing/not writable
  - transient retryable
  - permanent event missing
- add best-effort retry with bounded backoff for 429/5xx on explicit sync calls only

Longer term:

- move non-user-initiated sync to background jobs
- record sync result/status per operation

## 7. Side-Effect Boundary Audit

Current boundary quality is mixed.

### Good

- core DB mutation happens before Google sync in:
  - call edit
  - call delete
  - direct call swap
  - swap approval

### Still risky

Routes still `await` Google sync before responding:

- `calls/[callId]` PATCH
- `calls/[callId]` DELETE
- `calls/swap`
- `swaps/[swapId]/admin-decision`

That means Google work does not block persistence, but it does block response time.

Current recommendation:

- keep DB persistence first
- make post-persist Google sync best-effort and non-blocking for mutation routes
- reserve blocking behavior for explicit user-clicked "Sync now"

## 8. Data Model and Schema Audit

### Inferred tables

#### `user_calendar_connections`

Observed columns:

- `user_id`
- `provider`
- `provider_account_email`
- `access_token`
- `refresh_token`
- `token_expiry`
- `calendar_id`
- `updated_at`

Expected uniqueness:

- `(user_id, provider)`

#### `user_calendar_sync_settings`

Observed columns:

- `user_id`
- `provider`
- `enabled`
- `updated_at`

Expected uniqueness:

- `(user_id, provider)`

#### `synced_call_events`

Observed columns:

- `id`
- `call_assignment_id`
- `user_id`
- `provider`
- `provider_event_id`
- `provider_calendar_id`
- `sync_target`
- `synced_at`
- `program_id`
- `sync_enabled`

Expected uniqueness:

- `(call_assignment_id, provider, sync_target, user_id)`

### Schema concerns

- local migrations for these tables were not found in this branch
- could not verify indexes, RLS, or uniqueness directly from SQL
- could not verify whether refresh tokens are encrypted or access-restricted at DB layer

Recommended schema additions if not already present:

- explicit uniqueness on `(user_id, provider)` for connection/settings tables
- explicit uniqueness on `(call_assignment_id, provider, sync_target, user_id)`
- `last_error`, `last_error_at`, `last_success_at` on sync settings or operation log
- optional `scope` persistence if UI needs to remember "mine" vs "program"
- optional `provider_event_etag` if future differential logic is added

## 9. Event Content Audit

### Personal sync

Current title:

- `"{call_type} Call"`

This is reasonable for personal calendars.

### Program-scope sync

Current title:

- `"{residentName} — {call_type} Call"`

Reasonable operationally, but should be treated as more sensitive.

### Current description content

- `"Created by SnapOrtho Workspace."`
- site
- `"Home Call"`
- notes

### Privacy concerns

- `notes` are pushed into Google event descriptions
- resident names are pushed for program-scope sync
- if a connected Google calendar is shared outside the residency program, internal schedule details can leak

Recommendation:

- keep personal sync descriptive
- make program-scope sync more conservative by default
- review whether `notes` should be omitted or scrubbed for Google events

### Time and timezone

- timed events use raw `start_datetime` / `end_datetime`
- all-day events use `call_date` + UTC-based next-day helper
- created calendar uses hardcoded `America/New_York`

Risks:

- timezone mismatch across programs
- DST ambiguity if stored datetimes are not normalized consistently

## 10. Incremental Sync / Push Readiness

Current readiness is low.

Not present:

- `syncToken` / `nextSyncToken`
- Google watch/webhook route
- channel ID / resource ID storage
- channel expiration renewal
- Google -> app event ingestion path

Architecture fit:

- app already has event mapping and idempotent-ish full sync basis
- that is enough foundation for future app -> Google hardening
- it is not yet prepared for Google -> app incremental sync

Recommended future phases:

1. Phase A: strengthen app -> Google idempotent sync
2. Phase B: add sync status/error model and background execution
3. Phase C: add optional Google -> app incremental/push support if product truly needs it

## 11. Biggest Risks

### Highest

- OAuth `state` validation is insufficient
- post-change sync helper is not reconciliation-safe
- Google sync is still awaited inside critical scheduling routes

### High

- no real disconnect/revoke flow
- token-health status is not surfaced cleanly
- schema/RLS for token tables cannot be verified from local migrations

### Medium

- program sync is conceptually a user-owned full-program export, not a true shared program integration
- full-scope calendar permission is broader than ideal
- privacy exposure through notes in Google events

## 12. Recommended 3-Phase Fix Plan

### Phase 1: Safety and Correctness

Objective:

- make current integration secure and correct without changing user-facing features

Files likely affected:

- `src/app/api/integrations/google/connect/route.ts`
- `src/app/api/integrations/google/callback/route.ts`
- `src/lib/google/syncCallCalendarAfterChange.ts`
- `src/app/api/program/calls/[callId]/route.ts`
- `src/app/api/program/calls/swap/route.ts`
- `src/app/api/program/calls/swaps/[swapId]/admin-decision/route.ts`

Backend changes:

- implement real OAuth state/nonce validation
- replace post-change helper with true reconciliation for the target user
- ensure reassignment removes old-user events and creates new-user events

Database changes:

- add/verify uniqueness constraints and status columns if missing

Risks:

- must preserve existing Google event mappings

Verification:

- connect flow with valid and invalid state
- approved swap moves event correctly from requester to recipient
- manual reassignment updates affected calendars correctly

### Phase 2: Reliability and Error Visibility

Objective:

- make failures diagnosable and non-blocking

Files likely affected:

- `src/lib/google/**`
- sync routes
- `callhubclient.tsx`

Backend changes:

- classify Google auth/calendar errors
- persist last sync error and success state
- move post-persist Google sync off the critical request path

Frontend changes:

- better connection health and reconnect-needed messaging
- sync status separate from workspace mutation success

Verification:

- revoked token
- invalid calendar
- manually deleted event
- Google 429/5xx handling

### Phase 3: Architecture Hardening and Future Readiness

Objective:

- prepare for scalable background sync and optional Google pull features

Backend changes:

- background job or queue-driven sync
- optional audit table for sync operations
- optional incremental sync token/channel model if product needs it

Verification:

- idempotent repeated sync
- large program sync
- future-proof schema checks

## 13. Bottom Line

- Current sync is partially idempotent on the explicit `/api/program/calls/google-sync` route.
- Current sync is not reliably idempotent on the targeted `syncGoogleCalendarAfterCallChange()` path.
- Program/resident permissions are mostly safe at the backend for sync scope.
- Google sync can still block critical scheduling route responses because those routes await Google work after persistence.
- Top recommended first fix: secure OAuth state handling and replace the post-change sync helper with true user-level reconciliation for reassignment changes.
