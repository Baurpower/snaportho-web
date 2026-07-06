# Reviewer Burden Estimate

Generated: 2026-07-05T23:34:38.859Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 6.2% |
| Auto-approved rate | 93.8% |
| Attending review items | 4 |
| Curator review items | 10 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 3 |
| Estimated burden band | **medium** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 166 |
| SAFE_REVIEW | 7 |
| EXPERT_REVIEW | 4 |
| REJECT | 0 |

## Agent work plan

- **Clinical Entity Builder** (clinical-entity-builder): 1 gap(s), reviewer=none
- **Relationship Builder** (relationship-builder): 1 gap(s), reviewer=none
- **Asset Linker** (asset-linker): 2 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

