# Reviewer Burden Estimate

Generated: 2026-07-05T22:49:36.359Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 21.8% |
| Auto-approved rate | 78.2% |
| Attending review items | 13 |
| Curator review items | 13 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 6 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 61 |
| SAFE_REVIEW | 4 |
| EXPERT_REVIEW | 13 |
| REJECT | 0 |

## Agent work plan

- **Clinical Entity Builder** (clinical-entity-builder): 3 gap(s), reviewer=clinical_expert
- **Relationship Builder** (relationship-builder): 9 gap(s), reviewer=attending
- **Claim Builder** (claim-builder): 5 gap(s), reviewer=none
- **Decision Point Builder** (decision-point-builder): 3 gap(s), reviewer=attending
- **Metadata Builder** (metadata-builder): 1 gap(s), reviewer=none
- **Asset Linker** (asset-linker): 2 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

