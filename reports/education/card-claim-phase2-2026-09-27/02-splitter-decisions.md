# Phase 2 — Splitter decisions

Deterministic block/item splitter (`atomic-claim-extractor`,
`snaportho-atomic-extractor.v1`). Splits are conservative: an unsplit
conjunction is flagged, a false split fabricates claims.

## Block splitting

- Split Text-field HTML on block tags (`div/p/br/li/tr/h1-6`). Cloze markup
  rebalanced across divs first.
- Answer-only blocks merge into their predecessor, except numbered/lettered/
  dashed list items, which stay independent units.
- Pure question blocks (`?`, no cloze) attach as pending stems to the next
  answer block; section headers attach as context subjects.

## Section headers (multi-section cards)

The active header starts at the first cloze-free, `?`-free block and switches
at mid-field section headers: short (≤80 chars), no `?`, no trailing colon,
no trailing period, not a sibling item label (`grade/type/stage/zone/...`).
A header switch resets any pending question. Without this, two-topic cards
("Plantar interossei … Dorsal interossei") misattribute every unit to the
first subject — the highest-severity defect found in review (false
auto-approved claims, now fixed and tested).

## Item splitting (within a block)

- `;`-lists, numbered/lettered markers, and multi-word `&`/`and` coordinations
  split into sub-units sharing the stem.
- `Answer: description, description` blocks NEVER split: when the pre-colon
  head contains a block cloze answer, the items describe the answer instead of
  listing more answers (fixed; was producing "The compartments … is fourth
  webspaces").
- Comma-coordinated series never split on the final `and` (`Medial 3rd, 4th,
  and 5th MTs` shares one head noun).
- Inline `A and B` coordinations without list markers stay whole (recall gap,
  flagged — see quality report).

## Atomicity validation

`validateAtomicity` flags `compound_conjunction`, `list_like` (including bare
`A, B, and C` coordinations after subordinate-clause stripping),
`multi_threshold`, `question_shaped`, `context_dependent`, `image_deictic` /
`explicit_deictic`. Relative clauses (`X, which …, Y`) never read as
coordination. Flagged candidates are still emitted; the factory surfaces every
flag on the claim, including auto-approved ones.

## Declarative rewrite

~30 narrow question patterns invert QA pairs into assertions
(`qa_inversion_be/modal`, `qa_do_object`, `qa_how_managed`, …), with agreement
recomputed (`agreeBe/agreeVerb`, possessive-safe, prepositional-tail-safe).
Unknown shapes fall back to `interrogative_fallback` (question + answer,
flagged `question_shaped`, 3.7% of claims) — never hallucinated. Six rewrite
defects found in review were fixed with tests: P1 prepositional/participle
complements, P6b passive `be`, P15 object reading, P2/P18 agreement,
D1b intra-word hyphens (`x-ray` → `x: ray`).
