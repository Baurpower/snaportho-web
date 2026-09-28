# Phase 2 — Zero-claim policy

A card legitimately produces zero claims when no textual proposition can be
extracted. Zero-claim cards get terminal accounting (`zero_claims` queue with
the extractor reason), never a fabricated claim and never a silent drop.

## Statuses mapping to zero claims

| Extractor status | Meaning | Cards (full run) |
|---|---|---|
| `image_dependent` | every usable candidate explicitly deictic + short | 16 |
| `insufficient_context` | answers not clozed / question without answer | 5 |
| `no_claim` | no teaching field / empty / no clozes | 2 |

Plus 8 ceiling cards (`multi_claim_review`, `claim_ceiling_exceeded`) that
emit nothing pending review. Total cards with 0 claims: 31 of 3,670 (0.8%).

## Explicit vs soft deixis

Suppression requires **explicit** deixis (`below/above/this/these/those/
shown/pictured/demonstrated/provided/attached`, evidential `shown to`
excluded). Generic visibility (`x-ray will show X`, `may be seen following
X`) is emitted with an `image_deictic` review flag instead of suppressed.
Short image terms are word-bounded (`ct` no longer matches inside
`fracture`/`abducted`). Three false-zero classes found in review were fixed:
substring false positives, generic-visibility suppression, evidential
`shown to`. All 23 remaining zero-claim cards were individually inspected and
are true image-dependents (explicit `below/shown/this-x-ray`) or image-only
answers.

## What zero-claim is NOT

- Not an error: `zero_claims` is a terminal, reportable outcome.
- Not a merge: nothing is promoted, repointed, or auto-approved.
- Not silent: reason codes (`image_deictic_claims_only`,
  `answers_not_clozed`, `no_teaching_field`, …) are preserved on the
  assignment and would flow to backfill items with `claimCount: 0`.
