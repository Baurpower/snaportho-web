# Reviewer Burden Estimate

Generated: 2026-07-05T22:46:59.364Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 19.2% |
| Auto-approved rate | 80.8% |
| Attending review items | 13 |
| Curator review items | 11 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 5 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 63 |
| SAFE_REVIEW | 2 |
| EXPERT_REVIEW | 13 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 20 gap(s), reviewer=attending
- **Claim Builder** (claim-builder): 9 gap(s), reviewer=clinical_expert
- **Clinical Entity Builder** (clinical-entity-builder): 4 gap(s), reviewer=clinical_expert
- **Decision Point Builder** (decision-point-builder): 3 gap(s), reviewer=attending
- **Asset Linker** (asset-linker): 2 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

