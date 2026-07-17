# Reviewer Burden Estimate

Generated: 2026-07-09T04:14:30.110Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 19.5% |
| Auto-approved rate | 80.5% |
| Attending review items | 49 |
| Curator review items | 42 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 2 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 277 |
| SAFE_REVIEW | 18 |
| EXPERT_REVIEW | 49 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 47 gap(s), reviewer=none
- **Claim Builder** (claim-builder): 137 gap(s), reviewer=clinical_expert
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

