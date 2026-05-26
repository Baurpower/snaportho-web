# Resident Request Calendar Overlay Plan

## Goal

Make resident swap and coverage requests visually obvious on the resident call calendar without changing admin mode or backend behavior.

The resident should be able to look at the calendar and understand, within a couple of seconds:

- which calls are theirs
- which calls are being requested
- whether they are being asked to cover someone else
- whether they sent a request to someone else
- whether a request is waiting on recipient response, admin approval, or is final
- what the schedule would look like if the selected request is approved

This plan is resident-only.

## Files Audited

- `src/components/workspace/call-swaps/SwapRequestCalendarContext.tsx`
- `src/components/workspace/call/callmonthcalendar.tsx`
- `src/app/work/call/swaps/swapsdashboardclient.tsx`
- `src/components/workspace/call-swaps/SwapRequestCard.tsx`
- `src/components/workspace/call-swaps/SwapRequestDetailDrawer.tsx`
- `src/hooks/useSwapRequests.ts`
- `src/app/api/program/calls/month/route.ts`
- `src/app/api/program/calls/swaps/route.ts`
- `src/lib/workspace/call-swaps/types.ts`
- `src/lib/workspace/call-swaps/queries.ts`

## Current Data Flow

### Resident swap dashboard

`swapsdashboardclient.tsx`:

- loads swap requests through `useSwapRequests(rosterId)`
- keeps a `selectedSwapRequestId`
- renders:
  - `IncomingSwapRequestsPanel`
  - `OutgoingSwapRequestsPanel`
  - `SwapRequestCalendarContext`
  - `SwapRequestDetailDrawer`

For non-admin users, `SwapRequestCalendarContext` already renders next to incoming, outgoing, and completed request lists.

### Swap request data

`/api/program/calls/swaps?view=all` returns `SwapRequestListItem[]`.

Each `SwapRequestListItem` already includes:

- request identity and status
- `request_type`
- `requester`
- `recipient`
- `requesterCall`
- `recipientCall`

From `src/lib/workspace/call-swaps/types.ts`:

- `request_type` can be `coverage_only` or `trade`
- `requesterCall` and `recipientCall` include:
  - `id`
  - `rosterId`
  - `programMembershipId`
  - `callType`
  - `callDate`
  - `startDatetime`
  - `endDatetime`
  - `site`
  - `isHomeCall`
  - `notes`

This is enough to distinguish:

- one-way coverage requests
- true two-call trades when `request_type === "trade"` and `recipientCall` exists

### Month calendar data

`/api/program/calls/month` returns:

- `myRosterId`
- `residents`
- `calls`

Each call includes enough resident-visible data for overlays:

- `id`
- `rosterId`
- `programMembershipId`
- `residentName`
- `trainingLevel`
- `callType`
- `callDate`
- `site`
- `isHomeCall`
- `isMine`

This is sufficient for resident overlay rendering. No new endpoint is required for the first implementation.

## What the Calendar Currently Receives

### `callmonthcalendar.tsx`

The main resident/admin call hub month calendar currently receives:

- `calls`
- optional `pendingSwapRequestsByCallId`

That pending map is keyed by `request.requesterCall?.id`.

Current behavior:

- adds a subtle amber ring to the call card
- shows `Pending swap`
- shows `-> RecipientName`

Limitations:

- only really handles one admin-oriented state
- only matches by requester call id
- does not distinguish incoming vs outgoing for residents
- does not show approved, declined, cancelled, or trade-specific context
- is optimized for admin pending approval visibility, not resident schedule comprehension

### `SwapRequestCalendarContext.tsx`

The resident dashboard month context currently:

- fetches calls for the visible month from `/api/program/calls/month`
- derives `callsByDate`
- highlights related calls only when a single request is selected
- dims unrelated days when a request is selected
- shows one overlay pill per matched call
- renders a separate schedule preview box above the month grid

Limitations:

- overlay matching is too coarse and date-first
- overlay labels are helpful but visually secondary
- related dates do not feel like the schedule is actually changing
- statuses are compressed into a small set of pills
- selected request highlighting is not strong enough to dominate the month view
- there is no month-level aggregation of all resident-visible request states when no request is selected

## Why Overlays Are Not Obvious Now

The current issue is not primarily missing data. It is a rendering model problem.

### 1. Requests are treated as annotations, not schedule entities

The calendar still fundamentally renders only `call_assignments`, and request state is attached later as a small badge.

Result:

- the resident sees normal call cards first
- the request feels like metadata rather than a proposed schedule change

### 2. Matching logic is too weak for strong schedule previews

Current `isRequestRelevantToCall()` in `SwapRequestCalendarContext.tsx`:

- first requires `request.requesterCall.callDate === call.callDate`
- then matches exact `requesterCall.id`
- otherwise falls back to a roster/date relevance check

This makes the calendar good at saying “this date is involved,” but not good at saying:

- this specific assignment is the current source assignment
- this other assignment is the recipient’s own shift in a trade
- this resident is being asked to pick up a new assignment even if it does not replace an existing one

### 3. The view only becomes informative after selection

Today the strongest overlays appear only for `selectedRequest`.

That means:

- incoming/outgoing requests are not first-class visible on the month by default
- the calendar does not help the resident scan their month before clicking a request

### 4. Status-to-color language is incomplete

Current legend covers only:

- My call
- Asked to cover
- Request sent
- Pending admin

Missing or weak:

- approved
- declined/rejected/cancelled
- true swap bidirectional state
- role-specific meaning of the same request

### 5. Coverage-only and true trades are not rendered differently enough

The data model can distinguish them, but the calendar logic mostly treats them as “request affects this date.”

For residents, this is the critical UX distinction:

- coverage-only: one assignment changes hands
- trade: two assignments exchange hands

## Statuses That Need Calendar Treatment

These statuses should be first-class calendar visual states in resident mode:

- `pending_recipient`
- `accepted_pending_admin`
- `approved`
- `declined`
- `rejected`
- `cancelled`
- `expired`

Recommended resident treatment:

- `pending_recipient`
  - incoming: bright amber/orange `Asked to cover`
  - outgoing: amber `Request sent`
- `accepted_pending_admin`
  - blue `Pending admin`
- `approved`
  - green `Approved coverage` or `Approved swap`
- `declined`
  - muted red or rose `Declined`
- `rejected`
  - muted red `Rejected`
- `cancelled`
  - gray `Cancelled`
- `expired`
  - gray `Expired`

Completed statuses should likely appear only when:

- a completed request card is selected
- or a “show completed on calendar” mode is active

Otherwise the month risks becoming too noisy.

## Coverage-Only vs Trade Visual Distinction

The existing data is sufficient to distinguish them:

- coverage-only:
  - `request_type === "coverage_only"`
  - `recipientCall` may be null or irrelevant
- trade:
  - `request_type === "trade"`
  - `recipientCall` present

Resident calendar rendering should branch explicitly.

### Coverage-only

Calendar needs to show:

- requester’s call date as the assignment at risk of moving
- if incoming:
  - `Asked to cover`
  - `If approved: you cover this`
- if outgoing:
  - `Request sent`
  - `If approved: recipient covers this`

Only one assignment is proposed to change.

### True trade

Calendar needs to show both assignments:

- requester call
- recipient call

And it should visually communicate the bidirectional exchange:

- date A currently belongs to requester
- date B currently belongs to recipient
- if approved, they exchange owners

## Exact Matching Logic Recommended

Do not match requests to calendar only by date or resident name.

Use assignment ids first.

### Primary keys

- requester-side assignment:
  - `request.requesterCall?.id`
- recipient-side assignment for trade:
  - `request.requestType === "trade"`
  - `request.recipientCall?.id`

### Coverage-only matching

For a coverage-only request:

- highlight exact requester assignment by `requesterCall.id`
- derive recipient overlay from resident identity:
  - if current viewer is the recipient, show that they may cover the requester assignment
  - do not imply one of the recipient’s existing assignments is changing

### Trade matching

For a trade request:

- highlight requester assignment via `requesterCall.id`
- highlight recipient assignment via `recipientCall.id`
- visually connect the two dates in the side preview and with mirrored badges in the calendar

### Role-aware interpretation

For the same request, labels should change based on viewer role:

- viewer is requester
- viewer is recipient

Examples:

- requester on pending coverage:
  - original call badge: `Request sent`
- recipient on pending coverage:
  - requester call badge: `Asked to cover`
- trade recipient on own assignment:
  - own assignment badge: `Your call in swap`

## Current UI Limitations

### `SwapRequestCalendarContext.tsx`

- fetches only month calls, not a precomputed request overlay map
- supports only one active selected request view
- overlay labels come from `getOverlayLabel()` with limited branch depth
- overlays render as small amber pills and do not strongly reshape card hierarchy
- unrelated dates are dimmed, but affected dates are not transformed enough

### `SwapRequestCard.tsx`

- cards have clearer wording than before, but they are still visually separate from the month calendar
- the card and calendar are not driven by the same explicit “schedule change model”

### `swapsdashboardclient.tsx`

- selection wiring already exists and is good enough for phase 1
- but no persistent overlay summary or aggregated request-layer state is passed into the calendar

### `callmonthcalendar.tsx`

- current overlay support is admin-oriented and too narrow for resident request visibility
- likely should not be reused directly for the resident swap dashboard overlays without a dedicated resident request overlay model

## Proposed Visual States

### Base resident month

Default call rendering should still show:

- `My call`
- other visible program calls

### Request-aware overlays

Add role-aware overlay pills directly on affected assignment cards.

#### Incoming pending coverage

- requester assignment card:
  - bright amber ring
  - amber badge: `Asked to cover`
  - secondary line: `You may cover`

#### Outgoing pending coverage

- requester assignment card:
  - amber ring
  - badge: `Request sent`
  - secondary line: `{ResidentName} asked`

#### Accepted pending admin

- affected assignment card:
  - blue ring or header strip
  - badge: `Pending admin`
  - secondary line:
    - incoming: `You accepted`
    - outgoing: `Accepted by recipient`

#### Approved

- affected assignment card:
  - green ring or strip
  - badge:
    - `Approved coverage`
    - `Approved swap`

#### Declined / rejected / cancelled / expired

- show only on selected request or completed tab context by default
- muted rose or slate badge:
  - `Declined`
  - `Rejected`
  - `Cancelled`
  - `Expired`

### Selected request treatment

When a request card is selected:

- strongly outline the exact involved assignment cards
- slightly dim unrelated dates
- intensify status color on involved cards
- show a matching `Schedule Change Preview`

### Trade-specific treatment

For true swaps, both sides must be visible:

- requester date gets one role-aware badge
- recipient date gets mirrored badge
- side preview shows before and after ownership for both dates

## Recommended Component Changes

### 1. `SwapRequestCalendarContext.tsx`

This should become the main resident-only request-aware month view.

Recommended changes:

- extract a `buildRequestCalendarOverlayState()` helper
- derive exact overlay objects per request, per assignment id
- render both:
  - default aggregate overlays for visible resident requests
  - intensified overlays for `selectedRequest`
- replace `isRequestRelevantToCall()` with assignment-id-first matching
- replace `getOverlayLabel()` with role-aware overlay state generation
- make selected request highlighting stronger than a generic amber ring

### 2. `swapsdashboardclient.tsx`

Recommended changes:

- keep current selected-request wiring
- optionally pass visible request lists into `SwapRequestCalendarContext` so it can render aggregate overlays even before selection

Likely props:

- `incomingRequests`
- `outgoingRequests`
- `completedRequests`
- `selectedRequest`
- `currentRosterId`

### 3. `SwapRequestCard.tsx`

Recommended changes:

- keep current plain-English schedule wording
- align card labels and calendar overlay labels to the same vocabulary
- ensure card selection text matches calendar labels exactly

This avoids the card saying one thing while the calendar says another.

### 4. `SwapRequestDetailDrawer.tsx`

Recommended changes:

- optional only for phase 2
- align detail preview colors and labels to the same overlay system

### 5. `callmonthcalendar.tsx`

No resident implementation change is required for phase 1 if the resident overlay work stays inside `SwapRequestCalendarContext.tsx`.

Longer term:

- if the product wants the main resident call hub calendar to also show resident swap overlays, this file will need a resident-only overlay prop model separate from the current admin pending map

## Proposed Implementation Phases

### Phase 1: Calendar Overlay Model

Objective:

- make the resident swap dashboard calendar clearly request-aware

Work:

- introduce a request overlay derivation helper in `SwapRequestCalendarContext.tsx`
- render aggregate overlays for incoming, outgoing, and pending-admin requests
- use assignment-id-first matching
- make selected request emphasis much stronger

Expected result:

- resident can scan the month and immediately see where requests live

### Phase 2: Schedule Change Preview Integration

Objective:

- make “current vs if approved” visually obvious

Work:

- refine preview panel to share the same overlay semantics as the month grid
- for trade requests, display both dates symmetrically
- for coverage-only, display the single assignment transfer more boldly

Expected result:

- resident understands schedule impact without reading long text

### Phase 3: Main Resident Call Hub Visibility

Objective:

- surface the same resident request states outside the swap dashboard

Work:

- extend resident mode of the main call hub calendar with request overlays
- do not alter admin overlay behavior

Expected result:

- residents see request state directly on their normal call calendar, not only inside the swaps dashboard

## Risks

### Visual noise

If every request status is always shown, the calendar may become too busy.

Mitigation:

- show aggregate overlays only for active requests by default
- reserve completed-state overlays for selected request context or completed tab

### Conflicting overlays on the same date

A resident may have multiple requests touching one date.

Mitigation:

- overlay model should support multiple overlay pills per assignment
- limit visible pills and collapse extras into `+N`

### Incorrect date-only matching

Current logic partly depends on date equality and could mislead if multiple calls exist on the same date.

Mitigation:

- always match exact assignment ids first
- use date only as layout grouping, never as identity

### Coverage-only ambiguity

If the UI implies a recipient assignment is changing during coverage-only flow, it becomes misleading.

Mitigation:

- for coverage-only, only treat `requesterCall` as the mutating assignment
- recipient-side calendar language should say they may cover, not that their own call is replaced

### Admin leakage

Resident overlay work must not interfere with admin calendar behavior.

Mitigation:

- keep phase 1 changes inside `SwapRequestCalendarContext.tsx` and resident swap dashboard wiring

## Manual QA Checklist

### Incoming coverage request

- card selection highlights the requester assignment strongly
- selected date shows `Asked to cover`
- preview says the requester currently owns the call
- preview says the resident would own it if approved

### Outgoing coverage request

- selected date shows `Request sent`
- preview says recipient would own the call if approved

### Accepted pending admin

- affected assignment shows blue `Pending admin`
- preview still reflects current schedule vs if approved

### Approved coverage

- selected completed request shows green approved state
- preview clearly shows that schedule changed

### Incoming trade

- both dates are highlighted
- one badge appears on requester assignment
- mirrored badge appears on recipient assignment
- preview shows current vs swapped ownership for both dates

### Declined / rejected / cancelled / expired

- completed request selection shows correct muted final state
- no misleading “future change” language remains

### No selection

- active incoming/outgoing/pending-admin requests are still visible in the month
- calendar is informative without opening the drawer

## Recommended First Implementation Step

Implement a dedicated resident overlay derivation layer inside `SwapRequestCalendarContext.tsx`.

That layer should:

- ingest visible resident requests plus `selectedRequest`
- output exact overlay objects keyed by assignment id
- separate coverage-only from trade
- separate incoming from outgoing
- separate active from completed states

This is the safest first step because:

- the necessary data already exists
- it does not require backend changes
- it does not touch admin mode
- it upgrades the core mental model from “calendar plus badges” to “calendar with proposed schedule states”

## Bottom Line

The biggest current issue is not missing request data. It is that the resident calendar renders requests as small annotations instead of as first-class proposed schedule states.

Existing data is sufficient for a strong resident-only implementation.

The best first implementation step is to redesign `SwapRequestCalendarContext.tsx` around an explicit overlay state model keyed by assignment id and request role/status.
