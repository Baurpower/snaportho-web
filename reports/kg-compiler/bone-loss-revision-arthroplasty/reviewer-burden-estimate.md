# Reviewer Burden Estimate

Generated: 2026-07-05T23:26:40.653Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 13.8% |
| Auto-approved rate | 86.2% |
| Attending review items | 5 |
| Curator review items | 11 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 5 |
| Estimated burden band | **medium** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 75 |
| SAFE_REVIEW | 7 |
| EXPERT_REVIEW | 5 |
| REJECT | 0 |

## Agent work plan

- **Clinical Entity Builder** (clinical-entity-builder): 5 gap(s), reviewer=clinical_expert
- **Relationship Builder** (relationship-builder): 8 gap(s), reviewer=attending
- **Claim Builder** (claim-builder): 5 gap(s), reviewer=none
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

