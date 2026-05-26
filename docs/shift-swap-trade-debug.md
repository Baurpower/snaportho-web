# Shift Swap Trade Debug

## Goal

Determine why a resident-selected return shift is not saving or displaying, and identify the exact layer where trade data is lost.

This is an audit only.

No backend behavior was changed.
No admin mode behavior was changed.

## Executive Summary

The return-shift data is currently lost at request creation time in the resident frontend.

The resident `ChangeMyCallModal` tracks a selected recipient shift in local state, but the submit payload intentionally sends:

- `requestType: "coverage_only"`
- no `recipientCallId`

Because of that:

1. the API never receives return-shift data
2. the DB row is created with `recipient_call_id = null`
3. the swap query correctly returns `recipientCall: null`
4. the resident dashboard correctly renders `Return shift: none`

So the current live behavior is effectively coverage-only, even though parts of the schema, types, and query layer already support `trade` and `recipient_call_id`.

There is a second important finding:

- true trade approval is not enabled yet

The admin approval service contains a trade branch, but `applyApprovedTradeSwap()` currently returns:

- `Trade swap approval is not enabled yet.`

That means even if the UI started saving `recipient_call_id` and `request_type = "trade"`, approvals would still fail until the trade mutation path is implemented.

## 1. Frontend Creation Payload Findings

### File audited

- `src/components/workspace/call-swaps/ChangeMyCallModal.tsx`
- `src/hooks/useCreateSwapRequest.ts`

### What the modal stores

The resident modal keeps all of the right local state for a possible trade-style selection:

- `selectedMyCallId`
- `selectedRecipientRosterId`
- `selectedRecipientCallId`

When the resident clicks another resident's shift, the modal does set:

- `selectedRecipientRosterId`
- `selectedRecipientCallId`

So the UI does know which return shift the resident clicked.

### Where the data is lost

In `handleSubmit()`, the modal calls `createRequest(...)` with:

- `programId`
- `requesterRosterId`
- `recipientRosterId`
- `requesterCallId`
- `requestType: "coverage_only"`
- `requesterNote`

It does **not** include:

- `recipientCallId`

It also does **not** switch `requestType` to `trade`.

### Conclusion

The resident UI is intentionally creating a coverage-only request, even when the user clicks another resident's specific shift.

The selected recipient shift is currently used as frontend selection context only, not as persisted trade data.

## 2. API Validation Findings

### File audited

- `src/app/api/program/calls/swaps/route.ts`
- `src/lib/workspace/call-swaps/validation.ts`

### What validation accepts

`createSwapRequestSchema` accepts all of the fields needed for trade creation:

- `recipientCallId: uuid | null | optional`
- `requestType: z.enum(["coverage_only", "trade"])`

The route parses the body with that schema and passes the parsed data directly into `createDirectSwapRequest(...)`.

### Conclusion

The API validation layer is **not** the problem.

It already accepts:

- `recipientCallId`
- `requestType = "trade"`

## 3. Service Layer Findings

### File audited

- `src/lib/workspace/call-swaps/service.ts`

### Creation path

`createDirectSwapRequest(...)` preserves the incoming request fields when inserting:

- `recipient_call_id: input.recipientCallId ?? null`
- `request_type: input.requestType ?? "coverage_only"`

It does not overwrite a trade request back to coverage-only.

### Important validation behavior

The creation service validates:

- requester owns the selected requester call
- recipient is eligible
- no active duplicate request exists
- no conflicting call exists on the requester's call date

Those rules do not remove trade data.

### Conclusion

The service layer is **not** where trade data is lost.

If `recipientCallId` and `requestType = "trade"` were submitted, the creation service would attempt to store them.

## 4. Database Schema Findings

### File audited

- `supabase/migrations/20260524_shift_swap_requests_foundation.sql`

### Confirmed schema support

`shift_swap_requests` includes:

- `request_type text not null default 'coverage_only'`
- `requester_call_id uuid not null`
- `recipient_call_id uuid null`
- `requester_roster_id uuid not null`
- `recipient_roster_id uuid not null`

The constraints allow:

- `request_type in ('coverage_only', 'trade')`
- nullable `recipient_call_id`

There is no constraint forcing:

- `recipient_call_id IS NULL`
- `request_type = 'coverage_only'`

### Conclusion

The DB schema already supports storing recipient shift metadata and marking a request as `trade`.

## 5. Query and Serialization Findings

### File audited

- `src/lib/workspace/call-swaps/queries.ts`
- `src/lib/workspace/call-swaps/types.ts`
- `src/app/api/program/calls/swaps/route.ts`

### Confirmed query support

The list/detail query joins both:

- `requester_call`
- `recipient_call`

And the mapper returns:

- `requesterCall`
- `recipientCall`

The types also explicitly support:

- `request_type: "coverage_only" | "trade"`
- `recipientCall: SwapCallSummary | null`

### Conclusion

The query/serialization layer is **not** dropping the field.

If the DB row had `recipient_call_id`, the API would attempt to return `recipientCall`.

## 6. UI Rendering Findings

### Files audited

- `src/components/workspace/call-swaps/SwapRequestCard.tsx`
- `src/components/workspace/call-swaps/SwapRequestDetailDrawer.tsx`
- `src/components/workspace/call-swaps/SwapRequestCalendarContext.tsx`
- `src/app/work/call/swaps/swapsdashboardclient.tsx`

### Rendering branch logic

The resident UI consistently branches trade display like this:

- `request.request_type === "trade" && request.recipientCall`

If both are present, it renders two-shift wording.

If either is missing, it falls back to coverage-only wording such as:

- `No return shift selected. This is a coverage request only.`

### Conclusion

The resident dashboard is behaving correctly with the data it receives.

It is not incorrectly hiding a saved return shift.

It is rendering coverage-only because the saved request is coverage-only with `recipientCall = null`.

## 7. Approval Support Findings

### Files audited

- `src/lib/workspace/call-swaps/service.ts`
- `src/lib/workspace/call-swaps/schedule-mutation.ts`
- `supabase/migrations/20260524_shift_swap_request_approval_rpc.sql`

### What is implemented

Admin decision logic does branch on request type:

- `coverage_only` -> `applyApprovedCoverageSwap(...)`
- `trade` -> `applyApprovedTradeSwap(...)`

However:

- `applyApprovedTradeSwap(...)` currently returns an error immediately:
  - `Trade swap approval is not enabled yet.`

The SQL RPC migration `approve_shift_swap_request(...)` also explicitly rejects non-coverage requests:

- `if v_request.request_type <> 'coverage_only' then raise exception 'Coverage approval only supports coverage_only requests.';`

### Conclusion

True trade approval is **not currently enabled**.

So the system is not just “displaying coverage-only by accident.”
It is currently only safe for coverage-only end-to-end behavior.

## 8. Exact Root Cause

The exact root cause is in the resident request creation UI:

- the modal captures a clicked recipient shift
- but does not submit `recipientCallId`
- and forces `requestType: "coverage_only"`

That means the request is created as a one-way coverage request by design.

The downstream layers then behave consistently:

- API accepts the coverage-only payload
- DB stores `recipient_call_id = null`
- query returns `recipientCall = null`
- UI renders `Return shift: none`

## 9. Current Capability Status

### Trade request creation supported?

Partially at the schema/service level, but **not used by the resident UI**.

### Trade request display supported?

Yes, **if** a request exists with:

- `request_type = "trade"`
- `recipientCall` present

The card, detail drawer, calendar context, and resident dashboard all contain trade branches.

### Trade approval supported?

No.

The approval path is currently coverage-only.

## 10. Recommended Fix Options

### Option A — Keep current backend as coverage-only

Best if the product is not ready for true swaps yet.

Changes later:

- stop implying a real two-way shift trade in the resident flow
- remove or downgrade recipient shift selection
- reword the UI as:
  - choose a resident to ask
  - optionally choose one of their shifts only as context

Pros:

- matches current backend truth
- least risky

Cons:

- loses “true swap” mental model

### Option B — Save recipient shift metadata, but still approve as coverage-only

Best if product wants the resident to see both dates, but is not ready for true atomic swap approval.

Changes later:

- submit `recipientCallId`
- possibly keep `requestType = "coverage_only"`
  or use `trade` only as display metadata if explicitly supported
- show both dates in UI
- clearly state this is still not an automatic trade

Pros:

- preserves user intent and visual context
- less backend work than true trade approval

Cons:

- can be misleading unless wording is very careful
- “trade-looking” request would still approve as one-way coverage unless backend semantics are clarified

### Option C — Implement true trade swaps end to end

Best if the product genuinely wants reciprocal shift exchange.

Changes later:

- submit `recipientCallId`
- submit `requestType = "trade"`
- validate both calls and both owners
- accept/approve a true reciprocal request
- atomically swap both assignments on admin approval
- update notifications, audit, resident previews, and calendar sync

Pros:

- matches user expectation for actual swap requests

Cons:

- highest implementation risk
- requires careful schedule mutation, approval, and follow-up sync handling

## Bottom Line

The return-shift data is not being lost in the API, DB, or query layer.

It is lost in the resident frontend submission payload because the modal currently creates:

- `requestType: "coverage_only"`
- no `recipientCallId`

The broader system is also still effectively coverage-only, because trade approval is not enabled yet.

## Implementation Notes

True trades are now implemented separately from coverage-only requests.

Current semantics:

- `coverage_only`
  - saves `request_type = coverage_only`
  - saves `recipient_call_id = null`
  - admin approval transfers one assignment from requester to recipient
- `trade`
  - saves `request_type = trade`
  - saves `recipient_call_id`
  - admin approval swaps both assignments atomically through RPC

Creation behavior:

- choosing a resident from the compact picker creates `coverage_only`
- choosing another resident's specific shift from the calendar creates `trade`

Approval behavior:

- coverage-only still uses `approve_shift_swap_request`
- trades now use `approve_shift_trade_request`

## Manual QA Checklist

### Coverage-only

1. Open `Change My Call`.
2. Select your call.
3. Select a resident from the compact resident picker only.
4. Submit.
5. Confirm DB row:
   - `request_type = coverage_only`
   - `recipient_call_id = null`
6. Confirm resident UI wording says:
   - recipient takes the call
   - requester gives up the call
   - no return shift
7. Recipient accepts.
8. Admin approves.
9. Confirm only the requester call assignment changes hands.

### Trade

1. Open `Change My Call`.
2. Select your call.
3. Click another resident's specific shift on the calendar.
4. Submit.
5. Confirm DB row:
   - `request_type = trade`
   - `recipient_call_id` is populated
6. Confirm resident UI shows both sides of the exchange.
7. Recipient accepts.
8. Admin approves.
9. Confirm both assignments swap owners.
10. Confirm no partial assignment update occurs if one side becomes stale.

### Notifications and Sync

1. Confirm coverage notifications say coverage, not swap.
2. Confirm trade notifications say swap, not coverage.
3. Confirm trade approval triggers best-effort Google reconciliation for both residents.
