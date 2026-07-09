# Reviewer Burden Estimate

Generated: 2026-07-08T21:22:54.599Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 5.6% |
| Auto-approved rate | 94.4% |
| Attending review items | 70 |
| Curator review items | 65 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 1 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 1178 |
| SAFE_REVIEW | 0 |
| EXPERT_REVIEW | 70 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 1 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

