# Reviewer Burden Estimate

Generated: 2026-07-05T22:39:31.342Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 20% |
| Auto-approved rate | 80% |
| Attending review items | 11 |
| Curator review items | 13 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 3 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 76 |
| SAFE_REVIEW | 8 |
| EXPERT_REVIEW | 11 |
| REJECT | 0 |

## Agent work plan

- **Clinical Entity Builder** (clinical-entity-builder): 2 gap(s), reviewer=clinical_expert
- **Relationship Builder** (relationship-builder): 5 gap(s), reviewer=attending
- **Asset Linker** (asset-linker): 2 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

