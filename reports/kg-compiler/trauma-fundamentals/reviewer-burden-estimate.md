# Reviewer Burden Estimate

Generated: 2026-07-08T21:19:54.027Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 37.3% |
| Auto-approved rate | 62.7% |
| Attending review items | 30 |
| Curator review items | 29 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 3 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 74 |
| SAFE_REVIEW | 14 |
| EXPERT_REVIEW | 30 |
| REJECT | 0 |

## Agent work plan

- **Clinical Entity Builder** (clinical-entity-builder): 3 gap(s), reviewer=clinical_expert
- **Relationship Builder** (relationship-builder): 16 gap(s), reviewer=attending
- **Claim Builder** (claim-builder): 16 gap(s), reviewer=clinical_expert
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

