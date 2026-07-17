# CTS Final Report-Only Dry-Run Summary

Mode: report-only final-readiness pass  
No staging: confirmed  
No persistence: confirmed  
No database writes: confirmed  
Original review artifacts preserved: confirmed

## Pipeline status

The normalized post-review input was generated at:

`reports/kg-verticals/carpal-tunnel-syndrome/final-readiness/normalized-post-review-input.json`

Read-only validation completed:

| Check | Result |
|---|---|
| 42 final review fingerprints accounted once | pass |
| Rejected items excluded from normalized relationship set | pass |
| Revised items represented in normalized overlay | pass |
| Invalid differentials removed | pass |
| Direct `needle-electromyography` CTS test edge removed | pass |
| Instrument set implant edges removed | pass |
| Persistent/recurrent revision relationships no longer unconditional direct `treated_by` edges | pass |
| Original queue unchanged | pass |
| JSON artifacts parse | pass |
| Scoped whitespace check | pass |

## Complete compiler run

Blocked: the existing `kg:compile` CLI does not expose an input option that consumes `normalized-post-review-input.json` or the post-review overlay. Running the stock compiler would regenerate from the topic seed and reintroduce the pre-review draft relationships from code, so it would not be a valid final dry run against the approved overlay.

This is an engineering blocker, not a clinical-review blocker.

## Final dry-run counts

| Count | Value |
|---|---:|
| Review proposals consumed | 42 |
| Approved | 19 |
| Approved with revision | 15 |
| Rejected/excluded | 8 |
| Remaining human exceptions | 0 |
| Entities in prior dry-run draft | 93 |
| Entity additions in normalized input | 1 |
| Entities omitted from staging | 3 |
| Relationships before review | 123 |
| Relationship removals | 9 |
| Relationship additions | 3 |
| Relationships after normalized review | 117 |
| Claims | 8 |
| Decision points | 8 |

## Validation failures / blockers

1. **Compiler overlay ingestion missing.** No existing report-only compiler path consumes the normalized post-review input.
2. **Source mapping reconciliation blocked.** Local artifacts do not contain record-level source IDs for the 4 Anki and 44 Orthobullets declarations.
3. **Gap-disposition override not wired into compiler.** `critical-gap-disposition.json` resolves/rejects/defers the 14 critical/high gaps for this vertical, but the stock publication validator cannot consume that disposition artifact.
4. **Classification addition is report-only.** `cts-6-clinical-diagnostic-tool` is a normalized input proposal, not a staged entity.

## Updated maturity estimate

Estimated maturity: **Level 5/7**, improved within Level 5.

Rationale: clinical review is complete and normalized overlay is available, but staged-manufacturing readiness requires compiler support for overlay ingestion, source-record reconciliation, and gap-disposition consumption.

## Publication readiness

Publication ready: **no**

Reasons:

- No final compiler run has consumed the normalized post-review overlay.
- Source-record mapping remains aggregate-only.
- Gap dispositions are not wired into publication validation.
- Content remains draft/needs_review until staged manufacturing applies and validates approved proposals.
