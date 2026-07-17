# CTS Staging Readiness Decision

Decision: **not ready for staged manufacturing**

Clinical review status:

- 42/42 review proposals resolved.
- 19 approved.
- 15 approved with revision.
- 8 rejected.
- 0 remaining human exceptions.

## Vocabulary substitutions or extensions

| Requested | Final action |
|---|---|
| `evaluated_by` | Not applied; failed-release evaluation modeled as decision-point metadata. Future vocabulary extension only if workflow/pathway entities become canonical. |
| `may_lead_to` | Not applied; revision pathway modeled as decision-point metadata. Use `indicates_treatment` only in a future model with a verified indication pattern. |

## Identity decisions

| Group | Disposition |
|---|---|
| TCL versus flexor retinaculum | ALIAS_ONLY |
| Generic versus named approaches | PARENT_CHILD |
| Median neuropathy versus iatrogenic injury | KEEP_SEPARATE |
| EDX/NCS/needle EMG | CROSS_NEIGHBORHOOD_REFERENCE |
| Persistent versus recurrent CTS | KEEP_SEPARATE |

## Critical/high gap disposition

| Disposition | Count |
|---|---:|
| RESOLVED | 3 |
| VALID_DEFER | 7 |
| REJECTED_GAP | 4 |
| BLOCKED | 0 |

Note: these dispositions are report-only and are not yet consumed by the stock compiler/publication validator.

## Exact remaining blockers

1. Implement or expose a report-only compiler path that consumes `normalized-post-review-input.json`.
2. Produce a read-only record-level source mapping export for CTS Anki and Orthobullets records.
3. Wire `critical-gap-disposition.json` into gap analysis/publication validation, or otherwise provide an accepted override mechanism for rejected/deferred generic cardinality gaps.
4. Re-run the complete report-only manufacturing pipeline against the normalized post-review input and confirm duplicate detection, predicate validation, source traceability, gap analysis, smoke tests, and publication-readiness output.

CTS is not ready for staged manufacturing.
