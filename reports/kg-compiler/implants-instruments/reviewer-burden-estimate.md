# Reviewer Burden Estimate

Generated: 2026-07-09T04:25:10.954Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 15.8% |
| Auto-approved rate | 84.2% |
| Attending review items | 35 |
| Curator review items | 50 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 2 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 346 |
| SAFE_REVIEW | 30 |
| EXPERT_REVIEW | 35 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 28 gap(s), reviewer=none
- **Claim Builder** (claim-builder): 89 gap(s), reviewer=clinical_expert
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

