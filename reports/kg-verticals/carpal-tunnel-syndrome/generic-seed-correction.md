# CTS Generic Seed Correction Report

Prepared: 2026-07-09

## Changes made

The existing Hand/Wrist factory conventions were retained, with a narrow CTS
specialization:

- `carpal-tunnel-syndrome` no longer requests generic `procedure` and
  `complication` extras, suppressing
  `carpal-tunnel-syndrome-operative-treatment` and
  `carpal-tunnel-syndrome-key-complication`.
- Seven CTS-specific draft claims replace generic claims about mechanism,
  routine imaging, articular alignment/stability, fracture-style rehabilitation,
  and repeat imaging.
- Three CTS-specific decision drafts replace generic “stable pattern /
  acceptable alignment / repeat exam and imaging” language.
- Every replacement remains `generated_draft` and `needs_review`.
- No useful shared anatomy was deleted and no lifecycle state was changed.

## Quarantine matrix

| Unsafe seed implication | Disposition |
|---|---|
| Routine imaging is central | Replaced with selective-testing draft; routine imaging explicitly rejected |
| Articular alignment/stability is central | Removed from CTS claims |
| Repeat radiographs are standard follow-up | Removed and explicitly rejected |
| Fracture-style immobilization applies | Replaced with CTS-specific neutral night orthosis candidate and individualized postoperative guidance |
| Generic operative placeholder is sufficient | Placeholder generation suppressed; named open/endoscopic procedures required |
| Generic complication placeholder is sufficient | Placeholder generation suppressed; named complications required |

## Files

- `scripts/lib/education/kg-hand-wrist-cluster-definitions.ts`
- `scripts/lib/education/kg-hand-wrist-pilot-spec-factory.ts`

This correction prepares inputs only. It does not manufacture, persist, stage,
publish, or certify any object.
