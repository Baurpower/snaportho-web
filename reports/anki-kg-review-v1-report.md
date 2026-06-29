# Anki KG Review Workflow v1

## What This Adds

- A review-action ledger: `anki_kg_review_actions`
- Read-only review views for:
  - applied mappings
  - needs-review candidates
  - unmapped cards
  - coverage by deck branch
  - coverage by tag
  - alias suggestions
- Admin APIs for:
  - dashboard reads: `/api/admin/anki-kg-review`
  - review actions: `/api/admin/anki-kg-review/actions`
- A new admin review surface:
  - `/admin/anki-kg-review`

## Files Added Or Changed

- `supabase/migrations/20260628_090000_anki_kg_review_workflow_v1.sql`
- `src/lib/education/anki-kg-review.ts`
- `src/app/api/admin/anki-kg-review/route.ts`
- `src/app/api/admin/anki-kg-review/actions/route.ts`
- `src/app/admin/anki-kg-review/layout.tsx`
- `src/app/admin/anki-kg-review/page.tsx`
- `src/components/anki-kg-review/AnkiKgReviewDashboard.tsx`

## Review Actions Supported

- Approve candidate
- Reject candidate
- Mark needs alias
- Mark wrong node
- Bulk approve high-confidence branch
- Bulk reject source-only mappings

All actions are non-destructive:

- no deletes
- candidate/link rows move by status
- all reviewer decisions are recorded in `anki_kg_review_actions`
- bulk actions require preview counts before confirmation
- no Anki write-back

## Current Coverage Summary

Source batch: `4bc171ba-2264-4805-918c-762b5b5d19c6`

Successful deterministic run: `e54c3fbb-e027-4ffb-8b32-84d255b45c6d`

- Total cards: 5,095
- Mapped cards: 1,111
- Coverage: 21.8%
- Needs-review candidate rows: 4,619
- Applied deterministic links: 1,111
- Approved links: 0
- Rejected candidates: 0
- Aliases created from deterministic apply: 195

## Recommended First Review Branch

Start with:

- `Marty McFlyin's Ortho Deck::3) OrthoBullets::Shoulder & Elbow::Shoulder`

Why:

- 159 cards in branch
- 85 already mapped
- 249 needs-review candidate rows
- high-signal Orthobullets branch with partial coverage, which makes it a strong first branch for improving both acceptance rate and alias quality

Other high-value next branches:

- `Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Upper Extremity`
- `Marty McFlyin's Ortho Deck::2) Pocket Pimped::14 Pediatrics::14.05 Lower Extremity`
- `Marty McFlyin's Ortho Deck::3) OrthoBullets::Pediatrics::Pediatric Trauma`
- `Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::General Trauma`

## How To Open The Review UI

After applying the new migration, open:

- `/admin/anki-kg-review`

Optional query parameters:

- `batchId=4bc171ba-2264-4805-918c-762b5b5d19c6`
- `runId=e54c3fbb-e027-4ffb-8b32-84d255b45c6d`

Example:

- `/admin/anki-kg-review?batchId=4bc171ba-2264-4805-918c-762b5b5d19c6&runId=e54c3fbb-e027-4ffb-8b32-84d255b45c6d`

## Notes

- This pass does not use embeddings or LLMs.
- This pass does not rewrite cards.
- This pass does not assign training levels.
- This pass does not write back to Anki.
- The new UI expects the review-workflow migration to be applied before the route is used against a database.
