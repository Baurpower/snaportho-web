# Reviewer Burden Estimate

Generated: 2026-07-16T02:53:18.225Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 11.1% |
| Auto-approved rate | 88.9% |
| Attending review items | 9 |
| Curator review items | 9 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 5 |
| Estimated burden band | **medium** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 80 |
| SAFE_REVIEW | 1 |
| EXPERT_REVIEW | 9 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 15 gap(s), reviewer=attending
- **Claim Builder** (claim-builder): 13 gap(s), reviewer=clinical_expert
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

