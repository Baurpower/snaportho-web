# Reviewer Burden Estimate

Generated: 2026-07-06T00:01:43.970Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 5.4% |
| Auto-approved rate | 94.6% |
| Attending review items | 5 |
| Curator review items | 7 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 1 |
| Estimated burden band | **medium** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 157 |
| SAFE_REVIEW | 4 |
| EXPERT_REVIEW | 5 |
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

