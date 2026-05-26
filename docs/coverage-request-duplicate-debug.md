# Coverage Request & Duplicate Blocking — Debug Audit

**Date:** 2026-05-25  
**Scope:** `call-swaps` feature — coverage-only request creation failures and false duplicate-blocking bugs  
**Status:** ✅ All root causes identified and fixed

---

## Background

Two interrelated but distinct bugs were causing resident swap/coverage requests to fail or be incorrectly blocked:

1. **Every coverage-only request failed** with "Selected call could not be found" — a backend validation error that had nothing to do with the actual call data.
2. **Calls with any prior request history were permanently blocked on the frontend** — cancelled, approved, and rejected requests incorrectly prevented new requests from being sent.

---

## Root Cause 1 — Backend: `validateCallNotInPast` called with `null` for coverage-only

**File:** `src/lib/workspace/call-swaps/rules.ts`  
**Function:** `validateCanCreateSwapRequest`

### What was wrong

`validateCanCreateSwapRequest` calls `validateCallNotInPast` twice — once for the requester's call, and once intended only for the *recipient's return call* on trade requests. The original code was:

```ts
validateCallNotInPast({
  requesterCall:
    params.requestType === "trade" ? params.recipientCall : null,
  now: params.now,
}),
```

When `requestType === "coverage_only"`, this passes `requesterCall: null`.

Inside `validateCallNotInPast`:

```ts
export function validateCallNotInPast(params: {
  requesterCall: SwapCallOwnershipSnapshot | null;
  now?: Date;
}) {
  const errors: string[] = [];

  if (!params.requesterCall) {
    errors.push("Selected call could not be found.");  // ← always fires when null
    return buildResult(errors);
  }
  ...
}
```

`null` is treated as "call not found" and immediately produces an error. This error is returned to the frontend as-is.

**Result:** 100% of coverage-only requests failed at backend validation regardless of whether the call was valid.

### The fix

```ts
// BEFORE
validateCallNotInPast({
  requesterCall:
    params.requestType === "trade" ? params.recipientCall : null,
  now: params.now,
}),

// AFTER — no-op for coverage_only; the null guard in validateCallNotInPast
// would incorrectly fire "Selected call could not be found."
params.requestType === "trade"
  ? validateCallNotInPast({
      requesterCall: params.recipientCall,
      now: params.now,
    })
  : buildResult([]),
```

`buildResult([])` returns `{ ok: true, errors: [], warnings: [] }` — a safe no-op.

**Why this is correct:** For coverage-only requests, there is no recipient call. The only call that must be validated for being in the past is the requester's call, which is already validated in the first `validateCallNotInPast` call above it.

---

## Root Cause 2 — Frontend: `selectedMyCallRequest` returned any-status request

**File:** `src/components/workspace/call-swaps/ChangeMyCallModal.tsx`

### What was wrong

`outgoingRequestsByCallId` is a `Map<callId, SwapRequestListItem>` keyed by `requester_call_id`. It stores the **latest** outgoing request for each call, regardless of status — including `cancelled`, `rejected`, `approved`, and `expired`.

The original derivation simply looked up the map:

```tsx
const selectedMyCallRequest = selectedMyCallId
  ? (outgoingRequestsByCallId.get(selectedMyCallId) ?? null)
  : null;
```

If a call previously had a completed (closed) request — a very common scenario after any activity — `selectedMyCallRequest` would be non-null even though the request was finished.

Downstream effects:
- The submit button was disabled (`canSubmit = false`)
- An amber warning box was shown: "Active request already exists"
- Clicking Submit would hit the `if (selectedMyCallRequest) { setError(...); return; }` guard and abort

**Result:** Any call with historical swap/coverage activity could never receive a new request from the frontend.

### The fix

```tsx
const selectedMyCallLatestRequest = selectedMyCallId
  ? (outgoingRequestsByCallId.get(selectedMyCallId) ?? null)
  : null;

// Only block when the latest request is actively in-flight
const selectedMyCallRequest =
  selectedMyCallLatestRequest !== null &&
  ACTIVE_REQUEST_STATUSES.has(selectedMyCallLatestRequest.status)
    ? selectedMyCallLatestRequest
    : null;
```

`ACTIVE_REQUEST_STATUSES` is defined as:
```tsx
const ACTIVE_REQUEST_STATUSES = new Set(["pending_recipient", "accepted_pending_admin"]);
```

`selectedMyCallLatestRequest` is retained as a separate variable for dev-only debug logging (it is not narrowed by TypeScript control-flow).

---

## Was a DB constraint involved?

**No.** The Supabase migration `20260524_shift_swap_requests_foundation.sql` was audited:

- No `UNIQUE` constraint on `shift_swap_requests`
- The index `shift_swap_requests_active_duplicate_lookup_idx` is a **plain B-tree index** on `(requester_call_id, recipient_roster_id, status)` — not unique
- INSERT of a new request for a call that already has historical rows succeeds at the DB level

The DB plays no role in the false-blocking behavior.

---

## Was the coverage-only payload incorrect?

**No.** The Zod schema in `src/lib/workspace/call-swaps/validation.ts` accepts:

```ts
recipientCallId: z.string().uuid().nullable().optional()
```

The frontend correctly sends `recipientCallId: null` for coverage-only. The API route correctly accepts and passes this through. The payload itself was never malformed.

---

## Did the backend require `recipientCallId` for coverage-only?

**No.** `src/lib/workspace/call-swaps/service.ts` was audited. The coverage-only code path:
- Does not attempt to load `recipientCall` when `recipientCallId` is null
- `validateTradeHasRecipientCall` explicitly allows `recipientCall = null` when `requestType === "coverage_only"`
- `validateNoCoverageDuplicateActiveRequests` queries by `requester_call_id` only (no recipient call needed)

The only backend requirement issue was the `validateCallNotInPast(null)` bug (Root Cause 1).

---

## Active-status filtering — backend correctness

**`src/lib/workspace/call-swaps/queries.ts` — `getActiveRequestsTouchingCallIds`:**

```ts
.in("status", ["pending_recipient", "accepted_pending_admin"])
```

Correct. Only active statuses are returned. Historical requests are not included in duplicate checks.

**`validateNoCoverageDuplicateActiveRequests`:**

```ts
const duplicate = params.activeRequestsTouchingCalls.find((request) => {
  if (!ACTIVE_DUPLICATE_STATUSES.includes(request.status)) return false;
  return (
    request.requester_call_id === params.requesterCallId ||
    request.recipient_call_id === params.requesterCallId
  );
});
```

Double-guards on active status. Correct.

**Conclusion:** Backend duplicate detection was correct before any changes. It never blocked on historical requests.

---

## Changes Made

| File | Change |
|------|--------|
| `src/lib/workspace/call-swaps/rules.ts` | Fixed `validateCanCreateSwapRequest` — second `validateCallNotInPast` call is now a no-op (`buildResult([])`) for `coverage_only` |
| `src/components/workspace/call-swaps/ChangeMyCallModal.tsx` | Split into `selectedMyCallLatestRequest` (raw, any status) and `selectedMyCallRequest` (filtered to active statuses only); restructured `handleSubmit` to log before guard returns; improved amber warning and submit hint copy |
| `src/lib/workspace/call-swaps/service.ts` | Added `logCreate` helper and `[swap-create-service]` dev-only logs at key service checkpoints |
| `src/app/api/program/calls/swaps/route.ts` | Added `[swap-create-debug]` dev-only logs for raw body, Zod parse failure, and parsed payload |

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| `outgoingRequestsByCallId` Map contains only the **latest** request per call | Low | If two outgoing requests exist for the same call (only possible via admin tooling), only the most recent is checked. Acceptable — the backend blocks true duplicates. |
| `validateCallNotInPast` treat null as "not found" pattern | Low | Safe for the requester call (it will never be null at that point in the flow). The fix ensures it is never called with null for recipient call. |
| Frontend stale state after cancellation | Low | If a user cancels a request and the list hasn't refreshed, `selectedMyCallLatestRequest` may still show `pending_recipient`. The `canSubmit` guard will incorrectly block. This resolves on next data refresh. |
| Trade request `validateCallNotInPast` for recipient call | None | Still correctly called for trade requests. No regression risk. |

---

## Manual QA Checklist

### Coverage-only request
- [ ] Select a call you own
- [ ] Select a recipient (do NOT select a recipient call)
- [ ] Confirm `requestType` shows as `coverage_only` in `[change-my-call-submit]` console log
- [ ] Submit — should succeed (201 from API)
- [ ] Confirm request appears in outgoing swap list

### Trade request
- [ ] Select a call you own
- [ ] Click a call on the recipient's schedule
- [ ] Confirm `requestType` shows as `trade` in `[change-my-call-submit]` console log
- [ ] Submit — should succeed
- [ ] Confirm request appears in outgoing swap list

### Historical request does not block new request
- [ ] Use a call that previously had a cancelled or approved request
- [ ] Open ChangeMyCallModal with that call selected
- [ ] Confirm NO amber warning box appears
- [ ] Confirm submit button is enabled (assuming recipient is selected)
- [ ] Submit — should succeed

### Active request correctly blocks new request
- [ ] Use a call that currently has a `pending_recipient` or `accepted_pending_admin` request
- [ ] Open ChangeMyCallModal with that call selected
- [ ] Confirm amber warning box appears with correct phase label
- [ ] Confirm submit button is disabled
- [ ] Confirm submit-disabled hint says "Cancel the existing active request first..."

### Coverage-only with call on date that had prior history
- [ ] Pick a call date where a previous request exists with status `rejected`, `cancelled`, or `approved`
- [ ] Send a new coverage-only request for that same call
- [ ] Should succeed — historical request must not block

### Trade request backward-compatibility
- [ ] Verify trade flow still works end-to-end (no regression from `rules.ts` change)
- [ ] Verify past-date validation still fires for trade recipient calls
