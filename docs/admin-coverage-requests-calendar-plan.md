# Admin Coverage Requests Calendar Plan

## Status: Audit + Planning Only — No Implementation

This document covers the full audit of the current admin coverage request workflow and a
structured implementation plan for a stronger admin experience. No code has been changed.

---

## Table of Contents

1. [Current Admin Request Workflow Audit](#1-current-admin-request-workflow-audit)
2. [Resident Calendar Features Worth Reusing](#2-resident-calendar-features-worth-reusing)
3. [Proposed Admin Calendar Design](#3-proposed-admin-calendar-design)
4. [Preview Accepted Schedule Design](#4-preview-accepted-schedule-design)
5. [Validation Strategy](#5-validation-strategy)
6. [Data and API Needs](#6-data-and-api-needs)
7. [Recommended Component Strategy](#7-recommended-component-strategy)
8. [Three-Phase Implementation Plan](#8-three-phase-implementation-plan)
9. [QA Checklist](#9-qa-checklist)
10. [Summary](#10-summary)

---

## 1. Current Admin Request Workflow Audit

### 1.1 Where Admin Pending Requests Appear

Admins see requests via the **"Admin Approval"** tab in `swapsdashboardclient.tsx`
(lines 986–996). When `activeTab === "admin"`, the page renders
`<AdminSwapApprovalQueue>` directly, with no calendar beside it.

Data comes from `useSwapRequests` which fetches two parallel requests:
- `GET /api/program/calls/swaps?view=all` — the admin's own requests as a participant
- `GET /api/program/calls/swaps?view=admin` — all program-level `accepted_pending_admin` requests

The admin queue (`adminPending`) is the second response, filtered to only
`accepted_pending_admin` status. The `view=admin` endpoint calls
`getAdminPendingSwapRequests()` which queries `shift_swap_requests` where
`program_id = activeMembership.program_id` and `status = 'accepted_pending_admin'`.

### 1.2 How Admin Selects a Request

**There is no selection model in admin mode.** `AdminSwapApprovalQueue.tsx` renders
a flat vertical list of `<SwapRequestCard>` + action panel pairs. Every request in the
queue is expanded simultaneously. There is no click-to-select, no active request
highlighting, no concept of "selected request" in admin mode at all.

The resident side of the swaps page (`!approvalAccess` branch) has a proper
left-inbox / right-workspace selection model (`selectedSwapRequestId`,
`handleSelectRequest`). The admin side does not.

### 1.3 Where Approve/Reject Actions Live

Actions are in `AdminSwapApprovalQueue.tsx` (lines 134–155), rendered per-request:
- `"Approve and reassign call"` button → calls `adminDecision.decide({ decision: "approve" })`
- `"Reject"` button → calls `adminDecision.decide({ decision: "reject" })`
- Optional admin note textarea per request

`useAdminSwapDecision.decide()` calls `POST /api/program/calls/swaps/{id}/admin-decision`.
The backend calls `adminDecideSwapRequest()` in `service.ts` which calls either
`applyApprovedCoverageSwap()` or `applyApprovedTradeSwap()` in `schedule-mutation.ts`.

**No inline approval from Call Hub.** Approval only works on the `/work/call/swaps?tab=admin` page.

### 1.4 Whether Admin Sees a Calendar

**No. The admin mode renders no calendar at all.**

`SwapRequestCalendarContext` is only rendered in the non-admin (resident) branch:

```tsx
// swapsdashboardclient.tsx line 1129
<SwapRequestCalendarContext
  currentRosterId={rosterId}
  selectedRequest={selectedRequest}
  requests={swapRequests.items}
/>
```

This is inside the `else` branch (`!approvalAccess`). The `approvalAccess` branch
renders only the tab buttons and `<AdminSwapApprovalQueue>`.

### 1.5 Whether Admin Sees Resident-Mode Request Overlays

**No.** No calendar, no overlays, no same-color dots, no `→` / `↔` indicators.

### 1.6 Admin Context Before Approving

What the admin currently sees per request:
- `SwapRequestCard` (default variant, not resident variant) showing:
  - Request type label (Coverage request / Swap request)
  - Call type + date headline
  - Site info (no service/site listed if empty)
  - "Proposed coverage change" box with recipient covers requester text
  - Who is asking / who would cover info grid
  - "What happens next" = action needed label
  - "Schedule impact" = static text ("The schedule does not change until admin approval")
  - Note preview if present
- `SwapValidationSummary` rendered with `validation={null}` — **always shows green "No conflicts detected"**
- Optional admin note textarea
- Approve / Reject buttons

**What the admin does NOT see:**
- Month calendar showing the full schedule context
- Whether other pending requests conflict with this date
- Whether the recipient already has call proximity issues
- What the schedule would look like if all pending requests were approved
- Any actual validation result (validation is always `null` currently)
- The trade recipientCall details are missing from the default card variant — the
  `getCoverageLine()` function in `SwapRequestCard.tsx` (line 43) uses generic fallback
  "recipient covers requester's call" language for non-resident variant

### 1.7 Admin UX Pain Points

| Pain Point | Severity | Details |
|---|---|---|
| No calendar in admin mode | **Critical** | Admin cannot see the month schedule at all |
| Validation always null | **Critical** | `SwapValidationSummary` always shows "No conflicts detected" — no actual check runs |
| No selection model | **High** | All requests expanded simultaneously; hard to focus on one |
| No trade context | **High** | Default card doesn't clearly show the recipientCall/return shift |
| No linked request dots | **High** | Can't see if multiple requests touch the same date |
| No preview mode | **High** | Admin can't simulate what the schedule would look like after all approvals |
| Single-column queue | **Medium** | No two-panel layout; list + context don't coexist |
| No month navigation | **Medium** | Can't browse to see what's happening in other months |
| No Call Hub inline approval | **Low** | Admin must navigate to swaps page; fine for now |

---

## 2. Resident Calendar Features Worth Reusing

### 2.1 Functions in `SwapRequestCalendarContext.tsx` That Are Reusable

**Core overlay builders** — directly portable:
| Function | What it does |
|---|---|
| `buildCoverageOverlay()` | Builds `→ LastName` overlay for coverage requests |
| `buildTradeOverlays()` | Builds `↔ LastName` overlays for both sides of a trade |
| `buildRequestCalendarOverlayState()` | Combines all requests → overlay map keyed by callId |
| `sortOverlays()` | Priority ordering: selected > active > by color tone |
| `pushOverlay()` | Map accumulator helper |

**Status → display helpers** — directly reusable:
| Function | What it does |
|---|---|
| `getStatusColorTone()` | `status → "amber" | "blue" | "green" | "rose" | "slate" | "violet"` |
| `getStageLabel()` | `status → "Waiting" | "Pending admin" | "Approved" | ...` |
| `getToneClasses()` | Converts color tone → Tailwind class bundle |
| `getCallCardClasses()` | Base card classes for unselected calls |
| `getResidentLastName()` | Last-word extraction for compact calendar labels |
| `getViewerRole()` | `rosterId → "requester" | "recipient" | "other"` |

**Calendar grid helpers** — directly reusable:
| Function | What it does |
|---|---|
| `buildCalendarWeeksSunday()` | Builds week grid for a given year/month |
| `monthRange()` | Returns `{ monthStart, monthEnd }` ISO strings |
| `monthLabel()` | Formats "June 2026" |
| `toDateKey()` | `Date → "YYYY-MM-DD"` |
| `isSameMonth()` | Cell dim-check |
| `startOfWeekSunday()` / `addDays()` | Grid math |

**Request scope helpers:**
| Function | What it does |
|---|---|
| `shouldIncludeByDefault()` | Currently `active statuses only`. Admin needs all `accepted_pending_admin` |
| `getPreferredRequestMonth()` | Finds the earliest active request's month |
| `getRequestDate()` | Extracts `{year, monthIndex}` from a request |

### 2.2 Changes Needed for Admin Use

**`viewerRole`**: The resident calendar uses `"requester" | "recipient" | "other"`. For
admin mode, add `"admin"` as a fourth role. Admins see all requests from a neutral
third-party perspective. The relationship line should show both parties:

- Coverage: `Rosevear → Gupta` (instead of `→ Gupta` or `→ you`)
- Trade requester side: `Rosevear ↔ Walsh`
- Trade recipient side: `Walsh ↔ Rosevear`

**`shouldIncludeByDefault`**: Admin calendar should show ALL `accepted_pending_admin`
requests for the program, not filtered to current user's involvement.

**`overlayKind`**: For admin view, `"incoming_coverage"` and `"outgoing_coverage"` are
not meaningful. Replace with `"admin_pending_coverage"` and `"admin_pending_trade_side"`.

**`ScheduleChangePreview`**: The existing resident preview uses "you" language. Admin
needs a neutral version:
- Current: `"You take Jun 15 Primary"`
- Admin: `"If approved: Gupta takes Rosevear's Jun 15 Primary."`
- Trade: `"If approved: Walsh takes Rosevear's Jun 15 Primary; Rosevear takes Walsh's Jun 3 Primary."`

### 2.3 Whether to Generalize or Separate

**Recommended: Option B — Extract shared helpers; keep separate components.**

The resident `SwapRequestCalendarContext` is stable and tested. Modifying it to accept
an `mode="admin"` prop adds conditional branching throughout and risks regressions.

Instead:
1. Extract all pure helper functions into `src/lib/workspace/call-swaps/calendar-overlay-utils.ts`
2. Keep `SwapRequestCalendarContext.tsx` importing from that util (no functional change)
3. Create new `src/components/workspace/call-swaps/AdminRequestCalendar.tsx` importing the same utils

This approach:
- Zero risk to resident mode
- Full control over admin-specific labels and behavior
- Resident and admin can diverge independently over time

---

## 3. Proposed Admin Calendar Design

### 3.1 Calendar Behavior

The admin calendar lives in the right panel of the admin tab layout.

It:
- Fetches `GET /api/program/calls/month?monthStart=&monthEnd=` for the current month
- Fetches admin pending requests from `swapRequests.adminPending` (already loaded)
- Displays all calls with request overlays for `accepted_pending_admin` requests
- Supports month navigation (prev/next)
- Auto-navigates to the month of the earliest pending request on load

### 3.2 Calendar Cell Labels

**Coverage request overlay on requester's call:**
```
Rosevear → Gupta
[Pending admin]
```

**Trade request overlay on requester's call:**
```
Rosevear ↔ Walsh
[Pending admin]
```

**Trade request overlay on recipient's call:**
```
Walsh ↔ Rosevear
[Pending admin]
```

**Relationship label construction for admin:**
```
buildAdminCoverageOverlay(request):
  requesterLastName = getResidentLastName(request.requester.fullName)
  recipientLastName = getResidentLastName(request.recipient.fullName)
  relationshipLine = `${requesterLastName} → ${recipientLastName}`

buildAdminTradeOverlays(request):
  requesterLastName = getResidentLastName(request.requester.fullName)
  recipientLastName = getResidentLastName(request.recipient.fullName)
  requesterOverlay.relationshipLine = `${requesterLastName} ↔ ${recipientLastName}`
  recipientOverlay.relationshipLine = `${recipientLastName} ↔ ${requesterLastName}`
```

### 3.3 Calendar Interaction

- Clicking a call overlay opens the request in the left request queue (sets `selectedAdminRequestId`)
- Selected request overlays glow (existing `isSelectedRequest` ring style)
- Non-selected requests dim slightly when a request is selected (existing dimming logic)
- Admin note textarea appears below the selected request card in the right panel

### 3.4 Legend

```
● Amber   — Pending recipient response (informational)
● Blue    — Pending admin approval ← primary admin concern
● Green   — Approved
● Rose    — Rejected / Declined
● Slate   — Cancelled / Expired
```

---

## 4. Preview Accepted Schedule Design

### 4.1 What the Preview Does

The preview simulates the schedule if all currently `accepted_pending_admin` requests
were approved. This is a **pure in-memory projection** — no database writes.

### 4.2 Toggle UI

At the top of the admin section:

```
[Current schedule]  [Preview if all approved]
```

When "Preview if all approved" is active:
- A persistent banner renders above the calendar:
  ```
  Preview only — showing schedule if all pending requests were approved.
  Official schedule updates only after individual approvals.
  ```
- Affected calendar cells show projected owners (not current owners)
- Projected cells have a visual distinction: dotted border, or a "PREVIEW" micro-badge

### 4.3 Projected Calls Builder

```ts
function buildProjectedCalls(
  calls: ProgramCallItem[],
  pendingRequests: SwapRequestListItem[]
): ProgramCallItem[] {
  // Deep copy calls array
  const projected = calls.map(call => ({ ...call }));
  const callMap = new Map(projected.map(c => [c.id, c]));

  for (const request of pendingRequests) {
    if (request.status !== "accepted_pending_admin") continue;

    if (request.request_type === "coverage_only") {
      // requesterCall becomes owned by recipient
      const call = callMap.get(request.requesterCall?.id ?? "");
      if (call && request.recipient) {
        call.rosterId = request.recipient_roster_id;
        call.residentName = request.recipient.fullName;
        call.isMine = false; // admin view, not "mine"
        call._isProjected = true;
        call._projectedFromRequestId = request.id;
      }
    }

    if (request.request_type === "trade") {
      // Swap owners between requesterCall and recipientCall
      const reqCall = callMap.get(request.requesterCall?.id ?? "");
      const recCall = callMap.get(request.recipientCall?.id ?? "");
      if (reqCall && recCall && request.requester && request.recipient) {
        const tempRosterId = reqCall.rosterId;
        const tempName = reqCall.residentName;
        reqCall.rosterId = recCall.rosterId;
        reqCall.residentName = recCall.residentName;
        recCall.rosterId = tempRosterId;
        recCall.residentName = tempName;
        reqCall._isProjected = true;
        recCall._isProjected = true;
        reqCall._projectedFromRequestId = request.id;
        recCall._projectedFromRequestId = request.id;
      }
    }
  }

  return projected;
}
```

The `_isProjected` and `_projectedFromRequestId` properties (extend `ProgramCallItem`
with optional fields) are used by the calendar cell renderer to show the preview styling.

### 4.4 Preview Cell Rendering

When `previewMode === "preview"`:
- Use `projectedCalls` instead of `calls` in `callsByDate` map
- Projected calls render with:
  - A dashed/dotted border
  - A tiny "PREVIEW" badge or ↻ icon
  - Name shown in projected owner (not current owner)
  - Linked back to the originating request via `_projectedFromRequestId`

---

## 5. Validation Strategy

### 5.1 Existing Helpers Available

From `src/lib/workspace/call/rule-evaluator.ts`:

| Helper | Validates |
|---|---|
| `evaluatePgyEligibility` | PGY year restrictions per call type |
| `evaluateSpacingForResident` | Minimum days between assignments |
| `evaluateMonthlyLimitForResident` | Max calls per month |
| `evaluateWeekendLimitForResident` | Max weekend call buckets per month |
| `evaluateWeekendPairingForResident` | Same resident on Sat+Sun |
| `evaluateRotationEligibility` | Rotation-based call restrictions |

From `src/lib/workspace/call-swaps/rules.ts`:

| Helper | Validates |
|---|---|
| `validateNoScheduleConflict` | Recipient already has call on same date |
| `validateNoTradeConflict` | Either party already has call on swap date |
| `validateCanAdminApproveSwapRequest` | Status is `accepted_pending_admin` |

### 5.2 What Is Missing for Full Preview Validation

| Missing | Impact |
|---|---|
| Program rule definitions | Cannot evaluate PGY, spacing, monthly, weekend limits |
| Resident availability / time-off | Cannot check unavailability |
| Per-resident monthly call counts (projected) | Cannot check monthly limits against projected changes |
| Weekend bucket counts (projected) | Cannot check weekend limits against projected changes |

The month API (`GET /api/program/calls/month`) does NOT return program rules or
availability. The rules evaluator needs rule definitions to run.

### 5.3 Validation Approach Recommendation

**Phased:**

**Phase 3 (frontend-first):**
- Fetch program rules from an existing endpoint or add to the month response
- Build per-resident projected call lists from `buildProjectedCalls()`
- For each request in the projected schedule, evaluate:
  - Same-date conflict check (already possible from call data)
  - Monthly call count against projected calls
  - Spacing violations using projected date lists per resident
  - PGY eligibility if rules are available
- Show validation results in the existing `SwapValidationSummary` component
  (currently always passed `null` in `AdminSwapApprovalQueue`)

**Recommendation for Phase 3: frontend validation using rule-evaluator.ts.**

Reasons:
- Rule evaluator is already available client-side
- No backend change needed for Phase 1/2
- Results are informational only — admin can still approve
- Backend always re-validates at approval time (conflict check, grad year, ownership, status)

**Phase 4 option (backend source of truth, not in scope now):**
- New endpoint: `GET /api/program/calls/swaps/admin-preview?monthStart=&monthEnd=`
- Returns projected calls + per-request validation results server-side
- Useful if rule complexity outgrows client computation

**Frontend validation is NOT the final gate.** The approval RPC (`approve_shift_swap_request`,
`approve_shift_trade_request`) and `applyApprovedCoverageSwap` / `applyApprovedTradeSwap`
re-validate ownership, conflicts, grad year, and membership before any DB mutation.
This cannot be bypassed from the frontend.

### 5.4 Validation Result Display

Per-request validation summary in the approve panel:

```
✅ No conflicts detected
```

or:

```
⚠ 2 issues found before approval
  • Walsh already has a call on Jun 15 (spacing conflict)
  • Monthly limit would be exceeded (5/4 calls)
```

Aggregate validation banner at top of admin tab:
```
⚠ 1 of 3 pending requests has a detected conflict
```

---

## 6. Data and API Needs

### 6.1 Currently Available

| Data | Source | Admin Already Has? |
|---|---|---|
| Full month calls | `GET /api/program/calls/month` | No — not fetched in admin mode |
| All residents | `GET /api/program/calls/month` response `.residents` | No |
| Pending admin requests | `GET /api/program/calls/swaps?view=admin` | ✅ Yes |
| Request detail (requester/recipient/calls) | Included in swap list response | ✅ Yes |
| Admin approval status | `canApproveSwapRequest()` | ✅ Yes |

### 6.2 Not Currently Fetched in Admin Mode

| Missing Data | Needed For | Proposal |
|---|---|---|
| Month calls | Calendar, preview, validation | Fetch in new `AdminRequestCalendar` |
| Program rules | Rule validation | Add `?includeRules=true` to month API, or separate fetch |
| Resident availability / time-off | Availability validation | Optional for Phase 3; required for Phase 4 |
| Per-resident monthly stats | Monthly limit validation | Derive from projected calls locally |

### 6.3 Proposed New Endpoint (Phase 4 Only — Do Not Implement Yet)

```
GET /api/program/calls/swaps/admin-preview?monthStart=YYYY-MM-DD&monthEnd=YYYY-MM-DD
```

Response shape:
```ts
{
  currentCalls: ProgramCallItem[];
  pendingRequests: SwapRequestListItem[];
  projectedCalls: ProjectedCallItem[];
  validationResults: Array<{
    requestId: string;
    errors: string[];
    warnings: string[];
  }>;
  aggregateValid: boolean;
}
```

This endpoint would be admin-only (403 for non-admin), computed server-side, and used
as the source of truth before bulk or individual approvals.

**Do not implement in Phase 1, 2, or 3.**

---

## 7. Recommended Component Strategy

### 7.1 Extract Shared Helpers

Create:
```
src/lib/workspace/call-swaps/calendar-overlay-utils.ts
```

Move to this file from `SwapRequestCalendarContext.tsx`:
- All type definitions (`RequestCalendarOverlay`, `OverlayColorTone`, etc.)
- All pure functions: `buildCoverageOverlay`, `buildTradeOverlays`,
  `buildRequestCalendarOverlayState`, `sortOverlays`, `getToneClasses`,
  `getCallCardClasses`, `getResidentLastName`, `getStatusColorTone`, `getStageLabel`,
  `getViewerRole`, `shouldIncludeByDefault`, `getRequestDate`,
  `buildCalendarWeeksSunday`, `monthRange`, `monthLabel`, `toDateKey`,
  `isSameMonth`, `startOfWeekSunday`, `addDays`

Update `SwapRequestCalendarContext.tsx` to import from the util. Zero functional change.

### 7.2 New Files for Admin

```
src/components/workspace/call-swaps/AdminRequestCalendar.tsx
  — Admin calendar using shared helpers
  — Accepts: requests: SwapRequestListItem[], selectedRequestId, onRequestSelect,
             previewMode, projectedCalls
  — Fetches month data internally or receives as prop

src/components/workspace/call-swaps/AdminSchedulePreview.tsx
  — Neutral-language schedule change preview for a single selected request
  — Shows: "If approved: Gupta takes Rosevear's Jun 15 Primary."
  — Replaces/complements the existing resident-centric ScheduleChangePreview

src/components/workspace/call-swaps/AdminPreviewValidation.tsx
  — Wraps SwapValidationSummary with computed validation from projected calls
  — Shows per-request and aggregate errors/warnings

src/lib/workspace/call-swaps/projected-schedule.ts
  — buildProjectedCalls() pure function
  — ProjectedCallItem type
  — computeProjectedValidation() for Phase 3
```

### 7.3 Files Modified

```
src/app/work/call/swaps/swapsdashboardclient.tsx
  — Add selectedAdminRequestId state
  — Replace AdminSwapApprovalQueue with a two-panel admin layout
  — Wire AdminRequestCalendar + AdminSchedulePreview + approve/reject panel

src/components/workspace/call-swaps/AdminSwapApprovalQueue.tsx
  — Add selection model (selectedRequestId prop)
  — Wire to AdminRequestCalendar click events
  — Populate SwapValidationSummary with actual validation in Phase 3

src/components/workspace/call-swaps/SwapRequestCalendarContext.tsx
  — Import shared helpers from calendar-overlay-utils.ts (no behavior change)
```

### 7.4 Files NOT Modified (Resident Mode Protection)

```
src/components/workspace/call-swaps/SwapRequestCalendarContext.tsx
  — Only the import source changes; zero functional change
  — Resident calendar behavior stays identical

src/app/work/call/swaps/swapsdashboardclient.tsx (resident branch)
  — The !approvalAccess branch is untouched
  — SwapRequestCalendarContext still receives same props
```

---

## 8. Three-Phase Implementation Plan

### Phase 1: Admin Request-Aware Calendar

**Goal:** Admin sees the full month schedule with all pending requests overlaid.
Clicking a calendar overlay selects the request in the queue.

**What it enables:**
- Admin can answer "what requests are pending and when?"
- Admin can see linked overlays (two-sided trades on both dates)
- Admin can click calendar → open decision panel

**Files Affected:**

| File | Change |
|---|---|
| `src/lib/workspace/call-swaps/calendar-overlay-utils.ts` | **NEW** — extract shared helpers |
| `src/components/workspace/call-swaps/AdminRequestCalendar.tsx` | **NEW** — admin calendar |
| `src/components/workspace/call-swaps/AdminSchedulePreview.tsx` | **NEW** — neutral preview panel |
| `src/components/workspace/call-swaps/SwapRequestCalendarContext.tsx` | Import refactor only |
| `src/app/work/call/swaps/swapsdashboardclient.tsx` | Add `selectedAdminRequestId`, two-panel layout for admin tab |
| `src/components/workspace/call-swaps/AdminSwapApprovalQueue.tsx` | Add `selectedRequestId` prop + compact list mode |

**Implementation Notes:**
- `AdminRequestCalendar` fetches month calls internally using the same `GET /api/program/calls/month` endpoint already used by `SwapRequestCalendarContext`
- Admin overlay builder uses neutral `Requester → Recipient` labels
- No preview mode toggle in Phase 1
- Selection state lives in `swapsdashboardclient.tsx`

**Risks:**
- Helper extraction must not change resident behavior (straightforward refactor)
- Month API call adds one more network request; can be cached aggressively

**QA Checklist (Phase 1):**
- [ ] Resident mode (`!approvalAccess`) renders identically to before
- [ ] Admin tab shows calendar beside the request queue
- [ ] Coverage overlay shows `Rosevear → Gupta` format
- [ ] Trade overlay shows `↔` on both affected dates
- [ ] Clicking a calendar overlay highlights the correct request in the queue
- [ ] Selecting a request dims all non-selected overlays
- [ ] Month navigation works in admin calendar
- [ ] Calendar auto-navigates to earliest pending request month on load
- [ ] Empty state (no pending requests) shows appropriate message
- [ ] Approve/Reject buttons still work identically to before

---

### Phase 2: Preview Accepted Schedule Mode

**Goal:** Admin can toggle between current schedule and a simulated "if all approved"
projection. No DB mutations.

**What it enables:**
- Admin can simulate mass-approval impact before individual decisions
- Admin can spot scheduling density problems in the projection

**Files Affected:**

| File | Change |
|---|---|
| `src/lib/workspace/call-swaps/projected-schedule.ts` | **NEW** — `buildProjectedCalls()` |
| `src/components/workspace/call-swaps/AdminRequestCalendar.tsx` | Add `previewMode` prop + projected call rendering |
| `src/app/work/call/swaps/swapsdashboardclient.tsx` | Add `previewMode` state + toggle UI |

**Implementation Notes:**
- `buildProjectedCalls(calls, pendingRequests)` is a pure function — takes current calls
  and returns a modified copy with projected owners
- Projected call cells render with dashed border and "PREVIEW" micro-badge
- Banner: "Preview only — official schedule updates only after individual approvals."
- Current schedule mode is the default; preview is opt-in toggle
- Projection is re-computed on every render from current state (no caching needed at this scale)

**Risks:**
- If a pending request references a call not in the current month view, the projection
  silently skips it — must handle cross-month requests gracefully
- Must confirm `_isProjected` flag does not leak into any persistence path

**QA Checklist (Phase 2):**
- [ ] Toggle "Preview if all approved" replaces call owners in calendar
- [ ] Coverage-only: requester's call shows recipient as projected owner
- [ ] Trade: both calls show swapped projected owners
- [ ] Projected cells visually distinct from official cells
- [ ] Preview banner always visible when preview mode is active
- [ ] Toggle back to "Current schedule" restores original owners
- [ ] Approve/Reject buttons still work in both modes (unchanged backend call)
- [ ] Cross-month request (call in different month than calendar view) handled without error
- [ ] No DB writes occur in preview mode under any circumstance

---

### Phase 3: Validation Summary

**Goal:** Admin sees actual rule conflicts before approving. `SwapValidationSummary`
shows real errors/warnings, not always "No conflicts detected."

**What it enables:**
- Admin knows of spacing violations, monthly limit issues, conflict dates
- Admin can make informed approval decisions
- Individual request validation populates the approve panel

**Files Affected:**

| File | Change |
|---|---|
| `src/lib/workspace/call-swaps/projected-schedule.ts` | Add `computeProjectedValidation()` |
| `src/components/workspace/call-swaps/AdminPreviewValidation.tsx` | **NEW** — wraps SwapValidationSummary with computed data |
| `src/components/workspace/call-swaps/AdminSwapApprovalQueue.tsx` | Pass real validation to `SwapValidationSummary` |
| `src/app/api/program/calls/month/route.ts` | Add optional `?includeRules=true` param (or separate rules fetch) |

**Validation Implementation:**

```ts
// projected-schedule.ts
function computeProjectedValidation(params: {
  request: SwapRequestListItem;
  projectedCalls: ProjectedCallItem[];
  programRules: ProgramRule[];
}): { errors: string[]; warnings: string[] } {

  // 1. Same-date conflict check
  // For coverage: does recipient already have a call on that date (after projection)?
  // For trade: does requester have a call on recipient's date? Vice versa?

  // 2. Monthly limit check
  // Count how many calls the recipient (or either party) has in projection month
  // Compare against max_calls_per_month rule if present

  // 3. Spacing check
  // Get all projected dates for the recipient
  // Run evaluateSpacingForResident() from rule-evaluator.ts

  // 4. PGY eligibility
  // Run evaluatePgyEligibility() if call type and resident PGY are known

  return { errors, warnings };
}
```

**Rule Data Strategy:**
- Option A: Extend month API with `?includeRules=true` param that adds `programRules` to response
- Option B: Fetch rules from a separate endpoint (`GET /api/program/call-rules`)
- Option A preferred for simplicity — one request handles both calendar and validation setup

**Aggregate Banner:**
```
⚠ 2 of 4 pending requests have detected issues — review before approving
```

**Validation Caveat Banner in Approve Panel:**
```
Validation is informational. The official schedule only changes after approval.
Backend checks run again at approval time.
```

**Risks:**
- Rule schema may differ between programs; must handle missing/null rule config gracefully
- Validation false positives (rules not fully matching projected state) must show as warnings, not hard blocks
- Rule evaluation depends on program rules being loaded — handle loading state

**QA Checklist (Phase 3):**
- [ ] Admin sees "No conflicts detected" only when genuinely no issues
- [ ] Spacing violation shows correct resident name and date
- [ ] Monthly limit violation shows correct count
- [ ] PGY ineligibility shows correct PGY year
- [ ] Warnings (soft rules) show amber, errors (hard rules) show rose
- [ ] Aggregate validation banner updates as requests are approved/rejected
- [ ] Validation clears/updates when preview toggle changes
- [ ] Empty program rules gracefully shows "Rules not available"
- [ ] Backend approval still works even if frontend validation shows no issues
- [ ] Approving a request with frontend warnings still sends approval (admin override)

---

## 9. QA Checklist

### Resident Mode Regression Checklist (Run After Every Phase)

- [ ] Resident swap dashboard loads without errors
- [ ] Incoming/Outgoing/Completed tabs work
- [ ] `SwapRequestCalendarContext` renders correctly with same color overlays
- [ ] `→` coverage indicator appears correctly on resident calendar
- [ ] `↔` trade indicator appears on both affected dates
- [ ] Selected request highlighting dims non-selected overlays
- [ ] Schedule change preview shows correct "You take" / "recipient takes" language
- [ ] Accept/Decline/Cancel actions work for residents
- [ ] `SwapRequestDetailDrawer` opens with correct content

### Admin Mode New Feature Checklist

#### Phase 1
- [ ] Admin calendar appears in Admin Approval tab
- [ ] Neutral request labels (`Rosevear → Gupta`, `Rosevear ↔ Walsh`)
- [ ] Request selection model works (click queue or calendar)
- [ ] Approve/Reject buttons still call the same backend and work correctly

#### Phase 2
- [ ] Preview mode toggle is visible and functional
- [ ] Preview shows projected owners
- [ ] Preview banner is always visible in preview mode
- [ ] Current mode restores official owners
- [ ] No DB mutations occur in preview mode

#### Phase 3
- [ ] Validation runs for each pending request
- [ ] `SwapValidationSummary` shows real data, not always green
- [ ] Aggregate banner shows issue count
- [ ] Admin can still approve despite validation warnings
- [ ] Backend validation still runs and may block approval if state changed

---

## 10. Summary

### Biggest Admin UX Gap

**There is no calendar in admin mode at all.** Admins approve schedule changes that
affect residents' full months without seeing any month-level context. The
`SwapValidationSummary` component that exists in the admin queue has always been
passed `validation={null}` — it has never shown a real validation result.

The admin currently needs to mentally reconstruct schedule impact from two name fields
and a date string. This is the core problem.

### Resident Calendar: Reuse via Extraction

**Do not generalize `SwapRequestCalendarContext.tsx` with an `mode` prop.**

Extract all pure helper functions to `src/lib/workspace/call-swaps/calendar-overlay-utils.ts`.
Update the existing resident context to import from there (no functional change).
Build a new `AdminRequestCalendar.tsx` that imports the same utilities but uses
neutral-language overlay builders and shows all program-level `accepted_pending_admin`
requests.

This keeps resident mode fully isolated and safe.

### Preview Mode

Build `buildProjectedCalls()` as a pure in-memory function that clones the calls array
and applies all `accepted_pending_admin` requests as owner changes. Projected cells render
with a visual distinction. No DB writes. The toggle is additive — current mode remains
the default.

### Validation

Frontend validation is the right first step. The existing `rule-evaluator.ts` functions
can evaluate spacing, monthly limits, and PGY eligibility against the projected schedule.
Frontend validation is **informational only** — admins can override. Backend approval
always re-validates before any DB mutation.

For Phase 3, add `?includeRules=true` to the month API to get program rules into the
admin calendar context. Do not build a backend preview endpoint until Phase 4, which
is out of scope for this document.

### Recommended First Phase

**Phase 1: Admin Request-Aware Calendar.**

Give admins the month calendar with request overlays first. This alone solves the most
critical UX gap (no schedule context) without requiring any new data fetching beyond
what the resident calendar already does. The rest — preview mode, validation — builds
on top of having the calendar in place.
