# Agent Output Summary

Generated: 2026-07-16T02:54:52.455Z
Topic: **periprosthetic-knee-fracture**
Framework: **1.0.0**

## Execution

| Metric | Value |
|--------|------:|
| Agents executed | 10 |
| Completed | 10 |
| Partial | 0 |
| Failed | 0 |
| Skipped | 0 |
| Unique proposals | 86 |
| Total proposals emitted | 128 |

## Parallel layers

- Layer 1: work-clinical-entity-builder
- Layer 2: work-asset-linker, work-relationship-builder
- Layer 3: work-claim-builder, work-decision-point-builder
- Layer 4: work-duplicate-detector
- Layer 5: work-quality-scorer
- Layer 6: work-conflict-resolver
- Layer 7: work-review-assistant
- Layer 8: work-publication-validator

## Per-agent results

- **clinical-entity-builder** (work-clinical-entity-builder): completed, 32 proposal(s), 1ms
- **asset-linker** (work-asset-linker): completed, 0 proposal(s), 0ms
- **relationship-builder** (work-relationship-builder): completed, 0 proposal(s), 0ms
- **claim-builder** (work-claim-builder): completed, 9 proposal(s), 3ms
- **decision-point-builder** (work-decision-point-builder): completed, 1 proposal(s), 1ms
- **duplicate-detector** (work-duplicate-detector): completed, 0 proposal(s), 0ms
- **quality-scorer** (work-quality-scorer): completed, 0 proposal(s), 0ms
- **conflict-resolver** (work-conflict-resolver): completed, 0 proposal(s), 0ms
- **review-assistant** (work-review-assistant): completed, 86 proposal(s), 2ms
- **publication-validator** (work-publication-validator): completed, 0 proposal(s), 1ms

## Constraints

- Database modified: **no**
- Auto-published: **no**

