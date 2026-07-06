# Reviewer Burden Estimate

Generated: 2026-07-05T22:44:52.320Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 13.8% |
| Auto-approved rate | 86.2% |
| Attending review items | 11 |
| Curator review items | 10 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 6 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 75 |
| SAFE_REVIEW | 1 |
| EXPERT_REVIEW | 11 |
| REJECT | 0 |

## Agent work plan

- **Clinical Entity Builder** (clinical-entity-builder): 10 gap(s), reviewer=clinical_expert
- **Relationship Builder** (relationship-builder): 29 gap(s), reviewer=attending
- **Claim Builder** (claim-builder): 13 gap(s), reviewer=clinical_expert
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

