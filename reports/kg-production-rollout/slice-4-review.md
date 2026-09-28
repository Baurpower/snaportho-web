# Slice-4 Tail Sweep (Phase 3C Step 5)

Scope: 82 flagged rows from 556 unreviewed PROMOTE_CANONICAL (flag classes:
symptom-like 24, quoted 19, punct-heavy 6, long 1, numeric 40, fragment 1;
505 pure one-offs stay deferred by default, unreviewed). Full verdicts in
`slice-4-review.csv`.

## Tally

APPROVE 42 · REVISE 16 · REJECT 19 · DEFER 3 · MERGE 1 · ALIAS 1.

## Notable rulings

- Possessive eponyms promote cleanly (de Quervain's, Panner's, Klumpke's,
  Lister's, Barton's); possessive-strip added to normalization + tests.
- Eponym test names revised to full form (McMurray/Lachman/Speed/Yergason
  Test), matching the slice-3 Hawkins/Speed precedent.
- Symptom home applied: 6 promotes retyped to `symptom` (Periscapular
  weakness, Pain on extension, 1st MTP pain, Pain out of proportion,
  Pain with adduction, Groove pain).
- Threshold/criterion labels rejected as a class (Mason <2mm, Risser timing,
  UKA >5°/>10°, ROM values, positioning parameters, FRAX definition —
  FRAX itself revised to a diagnostic_test promote).
- Mechanism sentences + composite neuro mappings rejected (not entities).
- Vague descriptors rejected (Single localized deformity, deformity of
  forefoot); vague-but-real classification filler stays out.
- Chauffer's→Chauffeur's intra-queue merge (misspelling); Ewing's DEFERRED
  on unreviewed live twin (3852542b); Morton's orthotic DEFERRED (no device
  type); III-D rupture DEFERRED (needs classification expertise).
- ORIF ± bone graft → alias of ORIF survivor (adjunct stays claim-level);
  Revision ankle arthrodesis ± graft → promote base procedure.
- Boutonniere's approved as the specific entity (noted overlap with
  unreviewed combined row ee3188ad for future governance).

## Live-collision checks

All APPROVE/REVISE labels verified absent live except Ewing's (deferred)
and Boutonniere's (specific-vs-combined, approved with note). No reviewed
row will duplicate a trusted canonical.
