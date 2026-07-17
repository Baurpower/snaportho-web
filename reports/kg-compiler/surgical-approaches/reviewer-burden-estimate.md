# Reviewer Burden Estimate

Generated: 2026-07-09T04:26:52.477Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 3.8% |
| Auto-approved rate | 96.2% |
| Attending review items | 44 |
| Curator review items | 28 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 1 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 1111 |
| SAFE_REVIEW | 0 |
| EXPERT_REVIEW | 44 |
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

