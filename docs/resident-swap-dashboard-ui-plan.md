# Resident Swap Dashboard UI Plan

## Scope

This plan covers the resident experience on `/work/call/swaps` only.

It does not change:

- admin mode
- backend behavior
- main Call Hub calendar
- swap approval logic

## Goal

Turn the resident swap requests page into a decision workspace centered on:

1. the proposed schedule change
2. the selected request
3. quick accept/decline/cancel actions

The page should feel like:

- a compact request inbox on the left
- a large schedule-aware decision workspace on the right

The resident should be able to answer immediately:

1. What date is changing?
2. Who covers what?
3. What happens if approved?
4. Do I need to act?
5. Is admin approval still pending?

## Files Reviewed

- `src/app/work/call/swaps/swapsdashboardclient.tsx`
- `src/components/workspace/call-swaps/SwapRequestCalendarContext.tsx`
- `src/components/workspace/call-swaps/IncomingSwapRequestsPanel.tsx`
- `src/components/workspace/call-swaps/OutgoingSwapRequestsPanel.tsx`
- `src/components/workspace/call-swaps/SwapRequestCard.tsx`
- `src/components/workspace/call-swaps/SwapRequestDetailDrawer.tsx`

## Current Usability Problems

### 1. The layout gives too much space to stacked request cards

The current resident page still behaves like a dashboard of large content blocks:

- large request card
- large in-card schedule summary
- large in-card note/status sections
- calendar beside or below it

This makes the resident browse too much request chrome before reaching the actual decision context.

### 2. The calendar is present, but not dominant

The page technically includes a request-aware calendar, but it is visually secondary because:

- the left request stack is too heavy
- the right side is split between preview and calendar
- the calendar cell overlays are compressed
- the resident’s eye is pulled first to verbose request cards

### 3. The request card and calendar compete instead of coordinating

Right now both the request card and the calendar try to explain the change:

- the card has a large requested-change block
- the calendar has overlays
- the preview panel repeats some of the same information

The result is duplication without a clear hierarchy.

### 4. “Needs my response” is not visually prioritized enough

Incoming requests that need a response should feel like the primary inbox.

Currently:

- Incoming, Outgoing, and Completed are treated as peer sections
- the resident has to scan too much before finding actionable items

### 5. The overlay text is too cramped for the current calendar footprint

The calendar now carries more request state than before, but:

- cell real estate is still limited
- multi-line overlay meaning gets cramped
- text readability drops quickly when a date has multiple calls

### 6. The selected request preview is not yet the obvious center of the page

The selected request summary exists, but the page still feels like:

- list first
- decision workspace second

It should feel reversed:

- schedule decision workspace first
- inbox second

## Current Layout Issues by Component

### `swapsdashboardclient.tsx`

Current resident layout uses roughly equal two-column sections:

- left: request panel
- right: calendar context

This is directionally correct, but the left side still behaves like a full content area instead of a compact inbox.

### `IncomingSwapRequestsPanel.tsx`

Problems:

- request cards are too large
- response UI expands inline and consumes a lot of vertical space
- card body repeats explanatory content that belongs in the main decision workspace

### `OutgoingSwapRequestsPanel.tsx`

Problems:

- sectioned card stacks are visually heavy
- too much per-card content for an inbox-style list
- not enough distinction between browsing requests and acting on one selected request

### `SwapRequestCard.tsx`

Problems:

- useful content, but too much of it for a left-column inbox
- large preview blocks make each card a mini detail page
- cards are better suited for detail view than list view

### `SwapRequestCalendarContext.tsx`

Problems:

- the calendar is conceptually correct, but still constrained by the surrounding layout
- preview and calendar need to read as a single workspace
- overlays should be short and highly color-driven, not paragraph-driven

### `SwapRequestDetailDrawer.tsx`

The drawer remains useful for deep detail/history, but it should not carry the primary burden of helping residents decide.

## Layout Options Considered

### Option A: Keep equal split, refine cards

Structure:

- left: improved cards
- right: current preview + calendar

Pros:

- smallest change

Cons:

- still wastes too much space on stacked cards
- still splits attention

Recommendation:

- not preferred

### Option B: Compact inbox + dominant workspace

Structure:

- left: fixed-width compact inbox
- right: selected request summary + large calendar + action bar

Pros:

- strongest decision-making layout
- aligns with message/inbox mental model
- gives schedule impact the most space

Cons:

- requires breaking apart current request-card usage

Recommendation:

- preferred

### Option C: Top inbox row + full-width workspace

Structure:

- top horizontal request list
- bottom full-width workspace

Pros:

- good for tablet/mobile

Cons:

- weaker on desktop when many requests exist
- horizontal inboxes get awkward fast

Recommendation:

- use as responsive/mobile adaptation, not the main desktop pattern

## Recommended Layout

### Desktop

Use a two-column layout with clear priority:

- left: `320px` to `380px` fixed-width compact inbox
- right: flexible full-width decision workspace

Suggested grid:

- `xl:grid-cols-[360px_minmax(0,1fr)]`

Page hierarchy:

1. compact tabs/inbox on the left
2. large selected-request summary on the right
3. large readable request-aware calendar below that summary
4. action buttons attached to the selected request summary, not buried in the list

### Right column content order

1. Selected request summary
2. Current -> proposed schedule preview
3. Action buttons
4. Large month calendar
5. Optional secondary notes/timeline

This makes the page feel like a decision tool, not a list of documents.

## Compact Inbox Strategy

The left column should behave more like:

- mail inbox
- Slack thread list
- notifications list

It should not behave like a stack of large dashboard panels.

### Inbox items should include

- requester name
- requested date
- call type
- small status badge
- one-line impact summary

Examples:

- `Daniel Arias -> Tue, May 26`
- `Asked you to cover Primary`

- `Pending admin`
- `Landon accepted Wed, May 27`

### Inbox item design

- condensed vertical padding
- smaller titles
- smaller chips
- one- or two-line max body
- obvious selected state
- hover/focus states

### Inbox grouping

Resident tabs should be compact and action-oriented:

- `Needs response`
- `Sent`
- `Pending admin`
- `Completed`

This is better than treating incoming/outgoing/completed as equally large content sections.

### Response actions

Do not expand full accept/decline forms inside the inbox list by default.

Preferred pattern:

- selecting an inbox item loads the decision workspace on the right
- right-side action bar holds:
  - `Accept request`
  - `Decline`
  - `Cancel request` when applicable

Optional:

- inline quick action buttons on hover for power users

## Selected Request Preview Strategy

The right column needs a large, readable selected-request card.

### Core structure

Top summary block:

- `Coverage Request` or `Swap Request`
- status chip
- high-signal summary line

Then a visual preview:

- `Current`
- arrow / exchange marker
- `If approved`

### Coverage-only example

Current:

- `Tue, May 26 - Daniel`

If approved:

- `Tue, May 26 - You`

Supporting lines:

- `You cover: Tue, May 26 - Primary`
- `Return shift: none`

### Trade example

Current:

- `Tue, May 26 - Daniel`
- `Fri, May 29 - You`

If approved:

- `Tue, May 26 - You`
- `Fri, May 29 - Daniel`

This preview should be visually dominant and impossible to misread.

## Calendar Overlay Strategy

The resident request-aware calendar should remain in the right workspace and become larger and easier to scan.

### Calendar role

The calendar should answer:

- where in the month this request lands
- what other nearby calls the resident has
- whether this is active, pending admin, or approved

### Overlay design direction

Short labels only:

- `ASKED`
- `SENT`
- `PENDING ADMIN`
- `APPROVED`

Use color to carry meaning more than text length:

- amber/orange = action needed / waiting
- blue = pending admin
- green = approved
- rose/slate = closed/final negative states

### Calendar size direction

The calendar should not live in a cramped side panel.

The right column should give it enough width so:

- day cells can breathe
- overlay pills are readable
- selected request highlights feel intentional

### Selection behavior

When an inbox item is selected:

- affected dates get a strong highlight
- unrelated dates dim slightly
- both dates highlight for trades
- only the mutating assignment highlights for coverage-only

## Mobile and Tablet Behavior

### Tablet

Use stacked sections:

1. compact request inbox at top
2. selected request preview
3. action bar
4. calendar

The inbox can remain vertically scrollable but should stay compact.

### Mobile

Recommended pattern:

- top segmented tabs
- horizontally scrollable or condensed inbox cards
- selected request summary immediately below
- sticky action bar if possible
- calendar below summary

Important:

- selected request summary must appear before the calendar
- the resident should not scroll through a giant request list before seeing the selected request context

## Risks

### Risk 1: Over-compressing inbox items

If list items become too small, they may lose too much meaning.

Mitigation:

- keep one clear title line and one impact line
- preserve date and status as first-class signals

### Risk 2: Too much duplicated information

If the inbox, preview, and calendar all say the same thing, the page will still feel busy.

Mitigation:

- inbox = selection
- preview = meaning
- calendar = context

### Risk 3: Inline actions may confuse state ownership

If actions remain split between list and detail areas, the page may feel inconsistent.

Mitigation:

- move primary decision actions to the right-side workspace
- keep left-side actions minimal

### Risk 4: Completed requests can clutter the experience

Completed requests should not dominate the default resident experience.

Mitigation:

- default the resident to `Needs response`
- keep completed compact and secondary

## Implementation Phases

### Phase 1: Layout shell overhaul

Objective:

- change page structure without changing backend logic

Work:

- rework `swapsdashboardclient.tsx` into compact inbox + dominant workspace
- reduce left column width
- expand right column
- move selected request emphasis to right side

### Phase 2: Compact inbox components

Objective:

- convert current large request cards into inbox-style list items for resident mode

Work:

- add a compact resident list-item variant to `SwapRequestCard.tsx` or a new dedicated inbox item component
- simplify `IncomingSwapRequestsPanel.tsx`
- simplify `OutgoingSwapRequestsPanel.tsx`

### Phase 3: Preview + action consolidation

Objective:

- centralize decision-making on the right

Work:

- build a dedicated selected-request summary card
- move accept/decline/cancel controls into the right workspace
- keep detail drawer as secondary deep-detail view

### Phase 4: Calendar readability polish

Objective:

- make overlays readable at the new larger size

Work:

- shorten labels
- tighten overlay density
- strengthen selected-date treatment

## QA Checklist

### Inbox behavior

- resident can scan requests quickly
- selected inbox item is visually obvious
- actionable requests are easy to find first

### Selected request summary

- selected request explains current -> proposed clearly
- coverage-only does not imply a return shift
- trade shows both dates clearly

### Action flow

- resident can accept/decline from the main workspace
- pending admin state is obvious
- sent/cancel states are easy to understand

### Calendar

- calendar is larger and easier to read
- overlays are short and legible
- selected request highlights affected dates clearly
- unrelated dates dim appropriately

### Responsive behavior

- mobile shows selected request summary before the full calendar
- inbox remains usable without consuming the whole page

## Recommended First Implementation Step

Start with the layout shell in `swapsdashboardclient.tsx`.

Reason:

- this is the biggest usability bottleneck
- the current left column wastes space because it behaves like a full detail page instead of a compact inbox
- the calendar and request preview cannot become the true decision center until the page hierarchy changes

## Bottom Line

The biggest usability issue is not the underlying data or even the existence of the calendar. It is that the page still treats the request list as a main content area and the schedule context as secondary.

The old left column wastes space because each request card tries to be its own mini detail page, repeating schedule summaries and explanatory text that should live in the selected-request workspace.

The recommended layout is:

- compact inbox on the left
- dominant schedule-change workspace on the right

The first implementation step should be restructuring `swapsdashboardclient.tsx` around that hierarchy.
