# Reviewer Burden Estimate

Generated: 2026-07-09T04:17:27.151Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 19.6% |
| Auto-approved rate | 80.4% |
| Attending review items | 53 |
| Curator review items | 38 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 1 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 291 |
| SAFE_REVIEW | 18 |
| EXPERT_REVIEW | 53 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 10 gap(s), reviewer=clinical_expert
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

