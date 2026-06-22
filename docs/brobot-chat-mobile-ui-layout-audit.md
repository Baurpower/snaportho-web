# BroBot Chat Mobile UI Layout Audit

Date: 2026-06-20

Scope: `/brobot/chat` mobile layout only. This audit does not propose new features, navigation systems, workflows, modes, onboarding, or architecture changes. All recommendations preserve the current BroBot Chat component structure and functionality.

Tested/inspected surfaces:

- `/brobot/chat` empty state on 390x844 and 320x568 viewports.
- Header, quota banner, starter prompt card, composer, selector row, send button, message cards, branch chips, Read Next panel, loading/error states, and markdown renderer.
- Relevant files: `src/components/brobot/BroBotChatPage.tsx`, `src/components/brobot/BroBotMarkdown.tsx`, `src/components/brobot/ReadingRecommendationsPanel.tsx`.

## Severity-Ranked Issues

### P0: Composer Uses Too Much Vertical Space On Small Phones

Current:

- Composer shell: sticky bottom, `pt-2`, safe-area bottom, outer card `p-2` or `p-2.5`.
- Selector row: `grid grid-cols-3 gap-1.5 border-b pb-1.5`.
- Textarea: `minHeight` 48px inactive, 64px active; max 132px mobile.
- Send button: 36x36px on mobile.
- Measured small phone state: composer is about 119px tall on 320x568, covering the lower portion of the starter prompts.

Problems:

- The selector row, divider, textarea, card padding, and safe-area padding stack into a tall control.
- On iPhone SE, the user sees only one full starter chip above the composer without scrolling.
- Select values truncate aggressively at 320px (`Auto`, `Standard`, `PGY-2` become cramped).
- Send button is slightly below Apple's recommended 44px touch target.

Recommended changes:

- Outer form top padding: `pt-2` -> `pt-1.5` on mobile.
- Outer form horizontal padding: keep `px-3`; do not increase.
- Composer card padding: inactive `p-2` -> `p-1.5`; active `p-2.5` -> `p-2`.
- Selector row gap: `gap-1.5` -> `gap-1`.
- Selector row bottom padding: `pb-1.5` -> `pb-1`.
- Selector label padding: `px-2 py-1` -> `px-1.5 py-1`.
- Select text: keep `text-[11px]`, but reduce label text to `text-[9px]` and set select `leading-4`.
- Textarea inactive min height: 48px -> 44px.
- Textarea active min height: 64px -> 56px.
- Mobile max textarea height: 132px -> 112px.
- Send button: 36x36px -> 40x40px minimum; use 44x44px if it does not force textarea height.
- Textarea right padding: `pr-14` -> `pr-12` if send is 40px; use `pr-14` only for 44px.
- Bottom safe area: keep `pb-[max(0.5rem,env(safe-area-inset-bottom))]`.

Tailwind target:

```tsx
className="sticky bottom-0 z-20 -mx-3 border-t border-slate-200 bg-[#fefcf7]/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur sm:-mx-5 sm:px-5"
```

```tsx
isComposerActive
  ? 'border-teal-200 p-2 shadow-md ring-2 ring-teal-50'
  : 'border-slate-200 p-1.5'
```

```tsx
<div className="grid grid-cols-3 gap-1 border-b border-slate-100 pb-1">
```

```tsx
const COMPOSER_MIN_HEIGHT_INACTIVE = 44;
const COMPOSER_MIN_HEIGHT_ACTIVE = 56;
const COMPOSER_MAX_HEIGHT_MOBILE = 112;
```

### P0: Header Is Taller Than It Looks Because It Competes With Global Nav

Current:

- Main shell starts at `pt-16`.
- Header has `pb-2.5 sm:pb-3` and a border.
- Header content is `flex flex-col gap-2`.
- On mobile, h1, tabs, and quota can wrap into two vertical rows.

Problems:

- The top area consumes too much vertical space before the first useful chat content.
- The quota badge below the title/tabs creates an additional row in the empty state.
- Header rhythm is closer to a responsive web page than a native chat surface.

Recommended changes:

- Main shell top padding: keep `pt-16` if global nav remains 54px. If global nav height is stable, reduce to `pt-[3.75rem]` (60px) instead of 64px.
- Header bottom padding: `pb-2.5` -> `pb-2`.
- Header vertical gap: `gap-2` -> `gap-1.5`.
- Title: `text-xl` -> `text-lg` on mobile; keep `sm:text-2xl`.
- Title line-height: add `leading-6`.
- Product tabs compact padding: `px-3 py-1.5` -> `px-2.5 py-1.5`.
- Product tab font: keep `text-xs`.
- Quota badge mobile padding: `px-3 py-2` -> `px-2.5 py-1.5`.
- Quota badge mobile font: `text-xs` -> `text-[11px] leading-4`.

Tailwind target:

```tsx
<main className="mx-auto flex h-[100dvh] w-full max-w-[1180px] flex-col box-border px-3 pt-[3.75rem] sm:px-5 sm:pt-[4.75rem] lg:px-6">
```

```tsx
<h1 className="text-lg font-extrabold leading-6 tracking-tight text-midnight sm:text-2xl">
```

### P1: Empty State Card Is Polished But Too Vertically Expensive

Current:

- Empty state wrapper: `py-4 sm:py-6`.
- Guest notice: `mb-3 px-3 py-2 text-sm`.
- Card: `p-3 sm:p-4`.
- Header row gap: `gap-2.5`.
- Description: `text-sm leading-5`.
- Prompt chips: `mt-3 flex flex-wrap gap-2`, each `px-3 py-2 text-xs leading-4`.

Problems:

- On small phones, prompt chips wrap into many rows and collide visually with the fixed composer.
- Guest notice and starter card both use full-width rounded panels, creating stacked card heaviness.
- Chip height is acceptable, but long chips become 50px tall and dominate the viewport.

Recommended changes:

- Empty wrapper vertical padding: `py-4` -> `py-3`.
- Guest notice: `mb-3` -> `mb-2`; `py-2` -> `py-1.5`; font `text-sm` -> `text-xs leading-5`.
- Card padding: `p-3` is good; keep it.
- Icon bubble: `p-1.5 h-?` is good; no change.
- Header gap: `gap-2.5` -> `gap-2`.
- Description top margin: `mt-0.5` is good.
- Description line-height: `leading-5` is good.
- Prompt chip gap: `gap-2` -> `gap-1.5`.
- Prompt chip padding: `px-3 py-2` -> `px-2.5 py-1.5`.
- Prompt chip line-height: `leading-4` -> `leading-[18px]`.
- Prompt chip min height: add `min-h-9`; current multi-line chips are touchable, but one-line chips can sit at ~34px.
- Prompt chip max width on mobile: add `max-w-full`.

Tailwind target:

```tsx
<div className="mx-auto max-w-3xl py-3 sm:py-6">
```

```tsx
<div className="mb-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs leading-5 text-teal-900">
```

```tsx
className="min-h-9 max-w-full rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs font-semibold leading-[18px] ..."
```

### P1: Assistant Response Cards Need Tighter Internal Rhythm

Current:

- Assistant card: `p-4 sm:p-5`, `rounded-2xl`.
- Metadata row: `gap-2`, `pb-3`.
- Content: `mt-4 space-y-6`.
- Section heading: `text-xs uppercase tracking-wide`.
- Section body margin: `mt-2`.
- Markdown: `space-y-4 text-[15px] leading-7`.

Problems:

- `space-y-6` creates large vertical jumps between educational sections.
- `leading-7` for 15px text is comfortable, but long answers feel tall.
- Metadata row chips plus confidence text can wrap awkwardly.
- Rounded 16px card radius is slightly large for dense mobile reading.

Recommended changes:

- Card radius: `rounded-2xl` -> `rounded-xl` on mobile, keep `sm:rounded-2xl` if desired.
- Card padding: keep `p-4`; do not reduce below 16px for dense medical text.
- Metadata row gap: `gap-2` -> `gap-1.5`.
- Metadata bottom padding: `pb-3` -> `pb-2.5`.
- Metadata chip padding: `px-2.5 py-1` -> `px-2 py-0.5`.
- Metadata chip font: `text-xs` -> `text-[11px] leading-4`.
- Content top margin: `mt-4` -> `mt-3`.
- Content section gap: `space-y-6` -> `space-y-4`.
- Section body margin: `mt-2` -> `mt-1.5`.
- Section heading tracking: keep `tracking-wide`; avoid wider tracking on mobile.
- Structured list gap: `space-y-1.5` is good.
- Structured list item leading: `leading-5` is good.

Tailwind target:

```tsx
<article className="w-full rounded-xl rounded-bl-md border border-slate-200/80 bg-white/95 p-4 shadow-sm sm:rounded-2xl sm:p-5">
```

```tsx
<div className="mt-3 space-y-4">
```

### P1: Markdown Renderer Is Comfortable But Slightly Loose

Current:

- Markdown container: `space-y-4 text-[15px] leading-7`.
- Headings: `pt-1 text-sm leading-6`.
- Lists: `space-y-2 pl-5`.
- Tables: `text-sm`, cell `px-3 py-2`.
- Code blocks: `p-4 text-xs leading-6`.
- Blockquotes: `px-4 py-3 text-sm leading-6`.

Problems:

- `leading-7` makes long answers easier to read but increases scrolling.
- List spacing is a touch loose for repeated medical bullets.
- Code/table blocks can create horizontal overflow correctly, but padding is heavy on 320px devices.

Recommended changes:

- Markdown container: `leading-7` -> `leading-6` on mobile, `sm:leading-7` on larger screens.
- Markdown gap: `space-y-4` -> `space-y-3`.
- Heading top padding: `pt-1` -> `pt-0.5`.
- List spacing: `space-y-2` -> `space-y-1.5`.
- Nested list spacing: current `space-y-1.5` is good.
- Code block padding: `p-4` -> `p-3`; keep `text-xs leading-6`.
- Blockquote padding: `px-4 py-3` -> `px-3 py-2.5`.
- Table cell padding: `px-3 py-2` -> `px-2.5 py-2`.
- Table font: keep `text-sm`; do not drop to `text-xs` because clinical tables become hard to read.

Tailwind target:

```tsx
<div className="space-y-3 text-[15px] leading-6 text-slate-700 sm:space-y-4 sm:leading-7">
```

### P1: Branch / Follow-Up Chips Are Too Pill-Heavy

Current:

- Branch container: `mt-5 rounded-2xl p-3`.
- Heading: `mb-2 text-xs uppercase`.
- Chips: `min-h-9 rounded-full px-3 py-2 text-xs leading-5`.
- Category label: inline `text-[10px]` before chip label.

Problems:

- `mt-5` after assistant message creates extra scroll.
- `rounded-full` plus long labels create large pill blobs.
- One-line chips are ~36px high, below ideal 44px target.
- Category labels inside chips reduce scannability and can create odd wrapping.

Recommended changes:

- Container margin top: `mt-5` -> `mt-3`.
- Container radius: `rounded-2xl` -> `rounded-xl`.
- Container padding: keep `p-3`.
- Chip gap: `gap-2` -> `gap-1.5`.
- Chip min height: `min-h-9` -> `min-h-10` (40px), or `min-h-11` (44px) if wrapping remains clean.
- Chip radius: `rounded-full` -> `rounded-xl` for long mobile text. This preserves the chip affordance but handles two-line labels more professionally.
- Chip padding: `px-3 py-2` -> `px-3 py-2.5` if using 44px target; otherwise `px-2.5 py-2`.
- Chip leading: `leading-5` -> `leading-[18px]`.
- Category label margin: `mr-1.5` -> `mr-1`; category text should not exceed 28-36px.

Tailwind target:

```tsx
<div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/40 p-3">
```

```tsx
className="min-h-10 rounded-xl border border-teal-200 bg-white px-2.5 py-2 text-left text-xs font-semibold leading-[18px] ..."
```

### P1: Intent Branch Card Has Desktop Padding On Mobile

Current:

- Intent card: `mt-5 max-w-3xl rounded-2xl p-5`.
- Branch buttons: `rounded-xl px-4 py-3`.
- Internal block margins: `mt-4`.

Problems:

- `p-5` is too large for mobile branch selection.
- Multiple `mt-4` blocks stack into a tall card.
- Branch buttons are good touch targets but padding is slightly wide on 320px.

Recommended changes:

- Card margin top: `mt-5` -> `mt-3`.
- Card padding: `p-5` -> `p-4`.
- Card radius: `rounded-2xl` -> `rounded-xl`.
- Internal margins: `mt-4` -> `mt-3`.
- Branch grid gap: keep `gap-2`.
- Branch button padding: `px-4 py-3` -> `px-3 py-2.5`.
- Branch button minimum height: add `min-h-11`.
- Badge padding: `px-3 py-1` -> `px-2.5 py-0.5`.

### P2: User Message Bubble Is Slightly Wide And Tall

Current:

- User bubble: `max-w-[88%] px-4 py-3 text-sm leading-6`, `rounded-2xl`.

Problems:

- 88% width works but can make short user prompts feel like a large block.
- `py-3` and `leading-6` make one-line prompts tall.

Recommended changes:

- Max width: `max-w-[88%]` -> `max-w-[84%]` on mobile; keep `sm:max-w-[72%]`.
- Padding: `px-4 py-3` -> `px-3.5 py-2.5`.
- Leading: `leading-6` -> `leading-5`.
- Radius: keep `rounded-2xl rounded-br-md`; it feels chat-native.

### P2: Loading And Error Cards Use Too Much Card Weight

Current loading:

- `mt-5`, inner `rounded-2xl px-4 py-3 text-sm`.

Recommended loading changes:

- Margin top: `mt-5` -> `mt-3`.
- Radius: `rounded-2xl` -> `rounded-xl`.
- Padding: `px-4 py-3` -> `px-3 py-2.5`.
- Text: keep `text-sm`; loading copy is readable.

Current errors/quota:

- Error cards use `rounded-2xl p-5`, CTA links `px-4 py-2`.

Recommended error/quota changes:

- Card padding: `p-5` -> `p-4`.
- Radius: `rounded-2xl` -> `rounded-xl`.
- Icon gap: `gap-3` is good.
- Paragraph leading: `leading-6` -> `leading-5`.
- CTA height: increase from approx 36px to 44px by using `py-2.5`.
- CTA width on small phones: consider `w-full sm:w-auto` for stacked buttons to avoid cramped inline wrapping.

### P2: Read Next Panel Needs Denser Mobile Cards

Current:

- Panel: `mt-3 rounded-xl p-3`.
- Resource cards: `px-3 py-3`.
- Open button: `px-3 py-1.5 text-xs`.
- Close button: 32x32px.

Problems:

- Close button is below 44px touch target.
- Open button is below 44px touch target.
- Resource metadata lines can become visually busy.

Recommended changes:

- Close button: `h-8 w-8` -> `h-10 w-10`.
- Resource card padding: keep `px-3 py-3`.
- Resource card gap: current `grid gap-2` is good.
- Open button: `px-3 py-1.5` -> `min-h-10 px-3 py-2`.
- Resource title leading: `leading-5` is good.
- Badge padding: `px-2 py-0.5` is fine.

## Exact Typography Recommendations

Use these mobile defaults:

- Page/chat title: 18px, line-height 24px, `font-extrabold`.
- Empty state heading: 16px, line-height 22-24px, `font-bold`.
- Assistant body: 15px, line-height 24px mobile; 28px only on larger screens.
- Structured list items: 14px, line-height 20px.
- Chip labels: 12px, line-height 18px.
- Metadata badges: 11px, line-height 16px.
- Selector labels: 9px, line-height 14-16px.
- Selector values: 11px, line-height 16px.
- Helper text: 11px, line-height 16px.

Avoid:

- Negative letter spacing.
- Viewport-based font scaling.
- More than `tracking-wide` on uppercase labels.

## Exact Component Sizing Recommendations

| Component | Current | Recommended Mobile |
|---|---:|---:|
| Shell horizontal padding | 12px | keep 12px |
| Header bottom padding | 10-12px | 8px |
| Header title | 20px | 18px |
| Quota badge padding | 12x8px | 10x6px |
| Empty card padding | 12px | keep 12px |
| Prompt chip padding | 12x8px | 10x6px |
| Prompt chip min height | ~34-50px | 36px minimum |
| User bubble max width | 88% | 84% |
| User bubble padding | 16x12px | 14x10px |
| Assistant card padding | 16px | keep 16px |
| Assistant section gap | 24px | 16px |
| Markdown paragraph gap | 16px | 12px |
| Markdown line-height | 28px | 24px |
| Branch container top margin | 20px | 12px |
| Branch chip min height | 36px | 40-44px |
| Composer inactive textarea | 48px | 44px |
| Composer active textarea | 64px | 56px |
| Composer mobile max textarea | 132px | 112px |
| Send button | 36px | 40-44px |
| Read Next close button | 32px | 40px |

## Chat Layout Audit

### Max Widths

Current:

- Chat content max width: `max-w-4xl`.
- Assistant message max width: `max-w-3xl`.
- Empty state max width: `max-w-3xl`.

Assessment:

- Mobile width is governed by viewport padding, so max widths do not hurt phones.
- Tablet portrait has large empty vertical space but still looks balanced.
- Tablet landscape feels too wide in the composer because controls stretch across the full shell width.

Recommendation:

- Keep current max widths for architecture simplicity.
- On `sm` and up, composer inner card should optionally share `max-w-4xl mx-auto` to align with messages. This is layout alignment only, not a feature change.

### Message Spacing

Current:

- Message list uses `space-y-6`.

Problem:

- Good for long answer separation, but slightly loose on phones.

Recommendation:

- `space-y-6` -> `space-y-4` on mobile, `sm:space-y-6`.

### Lists

Current:

- Structured lists are compact and readable.
- Markdown lists are a little looser.

Recommendation:

- Structured lists: keep.
- Markdown lists: `space-y-2` -> `space-y-1.5`.

### Tables

Current:

- Horizontal overflow is handled with `overflow-x-auto`.

Recommendation:

- Keep `overflow-x-auto`.
- Reduce cell horizontal padding from 12px to 10px on mobile.
- Add `max-w-full` to the wrapper if any parent flex context causes overflow.

### Code Blocks

Current:

- Good contrast, but `p-4` is heavy on narrow phones.

Recommendation:

- `p-4` -> `p-3`.
- Keep `text-xs leading-6`.

### Follow-Up Buttons

Current:

- Follow-up chips use pill styling with min height 36px.

Recommendation:

- Move to 40px minimum touch target and slightly smaller horizontal gap.
- Prefer `rounded-xl` over `rounded-full` for two-line mobile chip labels.

## Mobile Input Audit

Current strengths:

- Sticky bottom placement is correct.
- Safe-area bottom padding exists.
- Send button is visually clear.
- Textarea autoresizes and caps height.

Current issues:

- Total composer height is too large for iPhone SE.
- Send target is 36px, below the ideal 44px.
- Selector labels and values are cramped at 320px.
- Active composer jumps from 48px to 64px, which noticeably reduces viewport space.

Recommended values:

- Inactive textarea: 44px.
- Active textarea: 56px.
- Send: 40px minimum; 44px preferred.
- Selector row height: target 26-28px.
- Composer total inactive height target: 96-104px including safe-area.
- Composer total active height target: 108-116px before keyboard.

Keyboard / safe area:

- Keep `100dvh` and safe-area padding.
- Verify on real iOS Safari that `100dvh` plus sticky composer does not leave the composer below the visual viewport after keyboard open.
- If keyboard overlap occurs, prefer CSS `height: 100svh` fallback testing or visual viewport handling, but only if reproducible.

## Header Audit

Current strengths:

- Clear title.
- Product tabs are compact.
- Quota is visible.

Current issues:

- Header creates two rows on mobile when quota is present.
- Title is slightly large relative to compact app-shell expectations.
- Header bottom border plus whitespace creates a web-page feeling.

Recommended values:

- Title: 18px/24px.
- Header vertical gap: 6px.
- Header bottom padding: 8px.
- Product tab height: 28-30px.
- Quota badge height: 28-32px.
- Header total target height below global nav: 76-84px with quota, 44-52px without quota.

## Screens / Components Requiring Attention

1. `BroBotChatComposer`
   - Highest priority. Reduce total height and improve touch target sizing.

2. `CompactSelect`
   - Improve mobile density and truncation.

3. `BroBotEmptyState`
   - Reduce vertical padding and chip spacing.

4. `BroBotAssistantResponse`
   - Reduce internal section gaps from 24px to 16px.

5. `BroBotMarkdown`
   - Tighten mobile paragraph/list rhythm.

6. `BroBotNextLearningBranches`
   - Reduce top margin and improve chip touch targets.

7. `BroBotUsageBanner`
   - Reduce mobile padding and line-height.

8. `BroBotChatError`
   - Reduce card padding; increase CTA touch height.

9. `ReadingRecommendationsPanel`
   - Increase close/open button touch targets.

10. `LoadingMessage`
   - Reduce margin and card radius.

## Quick Wins Under One Day

1. Change composer text area constants:
   - 48 -> 44.
   - 64 -> 56.
   - 132 -> 112.

2. Reduce assistant response section gap:
   - `space-y-6` -> `space-y-4`.
   - `mt-4` -> `mt-3`.

3. Tighten markdown:
   - `space-y-4 leading-7` -> `space-y-3 leading-6 sm:space-y-4 sm:leading-7`.

4. Improve branch chip sizing:
   - `mt-5` -> `mt-3`.
   - `rounded-2xl` -> `rounded-xl`.
   - `min-h-9` -> `min-h-10`.
   - `gap-2` -> `gap-1.5`.

5. Make send button larger:
   - `h-9 w-9` -> `h-10 w-10`.

6. Tighten header:
   - `text-xl` -> `text-lg leading-6`.
   - `pb-2.5` -> `pb-2`.
   - `gap-2` -> `gap-1.5`.

7. Tighten empty state chips:
   - `gap-2` -> `gap-1.5`.
   - `px-3 py-2` -> `px-2.5 py-1.5`.

8. Increase Read Next close target:
   - `h-8 w-8` -> `h-10 w-10`.

9. Reduce error card weight:
   - `p-5 rounded-2xl` -> `p-4 rounded-xl`.

10. Align composer width on tablet:
   - Add `mx-auto max-w-4xl` to the composer card wrapper inside the sticky form.

## Implementation Notes

Do these as visual polish changes only:

- No state changes.
- No route changes.
- No new controls.
- No new navigation.
- No changed entitlement behavior.
- No changed prompt examples.
- No changed branch logic.

The strongest first pass is to tune the composer, assistant card spacing, markdown spacing, and branch chips. Those changes should make BroBot Chat feel substantially more native on iPhone SE, iPhone Pro, and Android Chrome while preserving the current SnapOrtho identity.

