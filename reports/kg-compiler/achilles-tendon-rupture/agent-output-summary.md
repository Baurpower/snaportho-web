# Agent Output Summary

Generated: 2026-07-05T23:13:25.098Z
Topic: **achilles-tendon-rupture**
Framework: **1.0.0**

## Execution

| Metric | Value |
|--------|------:|
| Agents executed | 11 |
| Completed | 11 |
| Partial | 0 |
| Failed | 0 |
| Skipped | 0 |
| Unique proposals | 104 |
| Total proposals emitted | 150 |

## Parallel layers

- Layer 1: work-clinical-entity-builder
- Layer 2: work-asset-linker, work-relationship-builder
- Layer 3: work-claim-builder, work-decision-point-builder, work-metadata-builder
- Layer 4: work-duplicate-detector
- Layer 5: work-quality-scorer
- Layer 6: work-conflict-resolver
- Layer 7: work-review-assistant
- Layer 8: work-publication-validator

## Per-agent results

- **clinical-entity-builder** (work-clinical-entity-builder): completed, 30 proposal(s), 4ms
- **asset-linker** (work-asset-linker): completed, 0 proposal(s), 0ms
- **relationship-builder** (work-relationship-builder): completed, 6 proposal(s), 0ms
- **claim-builder** (work-claim-builder): completed, 8 proposal(s), 8ms
- **decision-point-builder** (work-decision-point-builder): completed, 2 proposal(s), 0ms
- **metadata-builder** (work-metadata-builder): completed, 0 proposal(s), 0ms
- **duplicate-detector** (work-duplicate-detector): completed, 0 proposal(s), 0ms
- **quality-scorer** (work-quality-scorer): completed, 0 proposal(s), 0ms
- **conflict-resolver** (work-conflict-resolver): completed, 0 proposal(s), 1ms
- **review-assistant** (work-review-assistant): completed, 104 proposal(s), 3ms
- **publication-validator** (work-publication-validator): completed, 0 proposal(s), 1ms

## Constraints

- Database modified: **no**
- Auto-published: **no**

