# Reviewer Burden Estimate

Generated: 2026-07-05T23:44:39.913Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 5.7% |
| Auto-approved rate | 94.3% |
| Attending review items | 4 |
| Curator review items | 9 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 1 |
| Estimated burden band | **medium** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 164 |
| SAFE_REVIEW | 6 |
| EXPERT_REVIEW | 4 |
| REJECT | 0 |

## Agent work plan

- **Asset Linker** (asset-linker): 1 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

