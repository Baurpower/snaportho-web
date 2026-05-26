# Change My Call Modal UI Plan

## Scope

This plan covers the resident-only `Change My Call` modal.

It does not change:

- admin mode
- backend behavior
- trade or coverage approval logic
- the main Call Hub calendar
- the `/work/call/swaps` dashboard itself

## Goal

Bring the resident `Change My Call` modal up to the same quality and clarity as the newer `/work/call/swaps` experience.

The modal should clearly support two distinct request paths:

1. `coverage_only`
2. `trade`

It should feel like a compact request builder with:

- a readable schedule-aware calendar on the left
- a sticky source-of-truth builder panel on the right

## Files Audited

- `src/components/workspace/call-swaps/ChangeMyCallModal.tsx`
- `src/components/workspace/call-swaps/SwapRequestCalendarContext.tsx`
- `src/app/work/call/swaps/swapsdashboardclient.tsx`
- `src/components/workspace/call-swaps/SwapRequestCard.tsx`
- `src/components/workspace/call-swaps/SwapRequestDetailDrawer.tsx`
- `src/hooks/useCreateSwapRequest.ts`
- `docs/resident-swap-dashboard-ui-plan.md`
- `docs/shift-swap-trade-debug.md`

## Biggest Current Modal Issue

The biggest issue is not request creation logic anymore. It is page hierarchy inside the modal.

The current modal still behaves like:

- a cramped mini-calendar on the left
- a generic summary form on the right

instead of:

- a resident decision workspace with a strong current -> proposed preview

The swap dashboard now has a much clearer mental model, but the modal still uses an older “select things and read text” structure.

## Current Modal Audit

## 1. Layout structure

Current structure in `ChangeMyCallModal.tsx`:

- fixed modal shell
- left panel:
  - month header
  - helper text
  - full-month grid
- right panel:
  - request summary
  - progress pills
  - coverage/trade explanation
  - recipient picker
  - note
  - send button

What works:

- clear two-column direction
- sticky-ish right panel on desktop
- fixed-height modal with internal scroll

Current problems:

- the calendar still feels like a dense utility grid, not a polished decision surface
- the right panel does not visually match the stronger request workspace on `/work/call/swaps`
- summary content is still too form-like and not visual enough

## 2. Calendar rendering

Current modal calendar:

- is built locally inside `ChangeMyCallModal.tsx`
- uses `residentName` full names
- shows training level, call type, and meta
- uses very small cells with nested badges
- scrolls inside each day cell

What works:

- one calendar supports both own-call selection and trade target selection
- own calls and recipient calls already have different visual states
- active request badges already block my pending source calls

Current problems:

- full names consume too much space
- the cell content is denser than the available footprint
- per-cell scroll areas feel cramped
- visual language is not aligned with the cleaner swap dashboard calendar
- selected trade target state is present, but not strong enough to feel like a true schedule decision

## 3. My-call selection logic

Current behavior:

- clicking one of my eligible calls sets `selectedMyCallId`
- if that call already has an active outgoing request, it is blocked
- clicking the same selected call again clears everything

What works:

- source-call ownership rules are correct
- active request handling is already present
- clearing selection is predictable

Current limitation:

- the right panel does not turn this into a visually strong “Current” source state

## 4. Recipient selection logic

Current behavior:

- clicking another resident's calendar shift sets:
  - `selectedRecipientRosterId`
  - `selectedRecipientCallId`
- choosing from `RecipientPicker` sets:
  - `selectedRecipientRosterId`
  - clears `selectedRecipientCallId`

What works:

- the two interaction modes already map cleanly to:
  - coverage-only
  - trade

Current limitation:

- the modal UI does not make those two modes feel like distinct request types early enough

## 5. Request type detection

Current behavior:

- `selectedRecipientCallId` present -> `trade`
- no `selectedRecipientCallId` but resident selected -> `coverage_only`

What works:

- the request-type decision rule is now clean and consistent with backend semantics

Current limitation:

- this distinction is mostly implicit until the explanatory block
- the send CTA is still generic

## 6. Summary panel wording

Current behavior:

- request summary lists `My call` and `Asking`
- explanatory box branches between:
  - swap request
  - coverage request

What works:

- the semantics are now correct

Current problems:

- summary is still text-first instead of preview-first
- no strong current -> proposed visual pattern
- the panel does not yet feel like the selected-request workspace from `/work/call/swaps`

## 7. Disabled states and active request handling

Current behavior:

- my calls with `pending_recipient` or `accepted_pending_admin` are blocked
- those calls show pending badges

What works:

- source-call blocking is correct

Current limitation:

- there is no equivalent visible warning for other residents’ shifts already tied up in active requests
- current modal data likely does not include enough request overlay data for all non-mine cells without additional wiring

## 8. Mobile behavior

Current behavior:

- the modal stacks on smaller screens
- the left calendar remains above the right panel

What works:

- the modal is technically responsive

Current problems:

- the builder panel still competes with the calendar instead of anchoring the experience
- on narrow screens the amount of content still feels long and slightly scroll-heavy

## What Can Be Reused

## Reuse from `SwapRequestCalendarContext.tsx`

Recommended to reuse patterns, not the component wholesale.

Useful patterns to reuse:

- resident last-name helper
- compact call card language
- short label strategy
- stronger selected-state treatment
- clearer color system
- lighter dimming approach
- schedule preview wording structure

Why not reuse the whole component directly:

- `SwapRequestCalendarContext` is request-view driven
- it fetches month data itself
- it builds overlays from existing requests
- the modal needs selection-driven interactions, not request-history overlays

Recommendation:

- reuse visual patterns and small helpers
- do not directly embed `SwapRequestCalendarContext`

## Reuse from `swapsdashboardclient.tsx`

Strongly recommended:

- current -> if approved preview layout
- stronger section hierarchy
- builder/workspace feel
- button copy branching by request type

## Reuse from `SwapRequestCard.tsx` and `SwapRequestDetailDrawer.tsx`

Recommended to reuse copy patterns only:

- `You take`
- `X takes your call`
- `You take their shift on`
- `No return shift — only this call changes hands`

Not recommended to reuse their full UI structure inside the modal.

## Desired Layout

## Desktop

Recommended modal grid:

- `xl:grid-cols-[minmax(0,1fr)_400px]`

Left:

- large compact calendar
- month nav
- small instruction strip

Right:

- sticky builder panel
- request type
- my call
- ask method
- current -> proposed preview
- recipient picker when in coverage mode
- note
- send CTA

## Mobile / Tablet

Recommended stack:

1. header
2. builder panel
3. calendar

Reason:

- the builder panel is the source of truth
- residents should see the meaning of their selection before scrolling the full calendar

## Trade vs Coverage Behavior

## Coverage-only path

Triggered by:

- selecting my call
- then choosing a resident from the compact picker

UI should say:

- `Coverage request`
- `{ResidentName} takes your call on {date}.`
- `You give up this call.`
- `No return shift — only this call changes hands.`

Builder CTA:

- `Send coverage request`

## Trade path

Triggered by:

- selecting my call
- then clicking another resident's specific shift

UI should say:

- `Swap request`
- `{ResidentName} takes your call on {your date}.`
- `You take their call on {their date}.`
- `Both calls exchange owners if approved.`

Builder CTA:

- `Send swap request`

## Calendar Visual Design

## Goals

- readable in a constrained modal
- aligned with the newer resident swap calendar language
- short labels only
- no full names
- no overflowing text stacks

## Recommended cell content

Per call card:

- last name only
- call type
- `Home` if needed
- small chip for:
  - `Mine`
  - `Pending`
  - selected state

## Recommended visual states

- my selectable calls:
  - blue tint
- selected my call:
  - stronger blue border / background
- other resident calls:
  - neutral
- selected trade target:
  - violet or green tint
- my call with active request:
  - amber and disabled

Coverage-only resident choice should not force a fake calendar overlay. That selection belongs primarily in the builder panel.

## Recommended text changes

- use last names only in cells
- shorten meta lines
- remove as much repeated small-text detail as possible

## Right Builder Panel Behavior

The right panel should become the modal’s source of truth.

## Before selection

Show:

- `1. Pick one of your calls`
- `2. Choose coverage or swap`

## After selecting my call

Show:

- selected source call
- two clear paths:
  - `Ask someone to cover`
  - `Click another shift to swap`

## If coverage-only path is active

Show:

- compact resident picker
- coverage request label
- current -> proposed preview

Preview should say:

- `{ResidentName} takes your call on {date}`
- `You give up this call.`
- `No return shift — only this call changes hands.`

## If trade path is active

Show:

- selected target shift
- swap request label
- current -> proposed preview

Preview should say:

- `{ResidentName} takes your call on {your date}`
- `You take their call on {their date}`

## Active Request Handling Plan

## For my calls

Keep current behavior:

- block `pending_recipient`
- block `accepted_pending_admin`
- badge as `Request pending`

Do not block completed statuses.

## For other resident calls

Current modal does not appear to receive enough request-overlay context to safely mark all active-trade target conflicts.

Recommendation for phase 1:

- do not add heavy non-mine request overlays yet
- keep backend validation as final source of truth
- optionally add future lightweight overlay support once modal data includes active request touchpoints for other calls

## Component Plan

## Recommendation

Use limited extraction, not a full rewrite into many tiny pieces.

### Keep in `ChangeMyCallModal.tsx`

- open/close state
- selection state
- submit logic
- request-type detection

### Extract if implementing overhaul

1. `ChangeMyCallCalendar.tsx`

Purpose:

- compact resident-only selection calendar
- visual states only

Why:

- highest visual complexity
- easiest area to align with swap dashboard patterns

2. `ChangeMyCallBuilderPanel.tsx`

Purpose:

- request type
- selected call(s)
- current -> proposed preview
- picker slot
- send CTA

Why:

- separates decision UI from calendar rendering

3. Optional shared helper:
`CallSwapSchedulePreview.tsx`

Only if duplication becomes substantial between:

- `swapsdashboardclient.tsx`
- `ChangeMyCallModal.tsx`
- `SwapRequestDetailDrawer.tsx`

For now, extraction is optional.

## Recommended Strategy

Minimal-risk recommendation:

1. keep modal state orchestration where it is
2. extract a calendar subcomponent first
3. extract a builder panel second
4. reuse copy and visual conventions from the swap dashboard

Do not try to make the modal share the request-aware calendar logic directly.

## Implementation Phases

## Phase 1: Builder Panel Overhaul

Objective:

- make the right side visually match the swap dashboard workspace

Work:

- replace text-heavy summary block with:
  - request type
  - selected call(s)
  - current -> proposed preview
  - dynamic CTA copy

## Phase 2: Calendar Polish

Objective:

- make the modal calendar readable and visually aligned with the swap dashboard

Work:

- last-name-only cells
- shorten content
- stronger selected states
- reduce cramped text

## Phase 3: Coverage vs Trade Mode Clarity

Objective:

- make the two request paths impossible to confuse

Work:

- show explicit coverage/trade mode in builder
- improve instruction copy
- tune send-button labels

## Phase 4: Responsive Cleanup

Objective:

- make the modal feel intentional on smaller screens

Work:

- move builder above calendar on narrow layouts
- reduce scroll traps
- keep CTA visible

## QA Checklist

### Coverage-only

- select my call
- choose resident from compact picker
- right panel says `Coverage request`
- preview says only one call changes hands
- send button says `Send coverage request`

### Trade

- select my call
- click another resident’s specific shift
- right panel says `Swap request`
- preview shows both dates
- send button says `Send swap request`

### Calendar

- cells use last names only
- selected my call is obvious
- selected trade target is obvious
- pending my-call state is visible
- normal schedule remains readable

### Mobile

- builder appears before the calendar
- summary stays understandable without excessive scrolling

## Recommended Layout

Recommended layout:

- left: compact readable calendar
- right: sticky builder workspace

This should mirror the better hierarchy of `/work/call/swaps`, but stay modal-specific.

## Should It Reuse `SwapRequestCalendarContext`?

No, not directly.

It should reuse:

- visual language
- helper patterns
- preview wording

But it should not reuse the whole component because the modal is selection-driven and the dashboard calendar is request-history driven.

## First Implementation Step

Start with the right builder panel overhaul inside `ChangeMyCallModal.tsx`.

Reason:

- that is the biggest clarity gap
- it makes coverage vs trade meaning obvious immediately
- it gives the calendar a clearer role before any deeper visual extraction
