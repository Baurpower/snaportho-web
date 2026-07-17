# Reviewer Burden Estimate

Generated: 2026-07-16T02:41:49.409Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 9% |
| Auto-approved rate | 91% |
| Attending review items | 7 |
| Curator review items | 7 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 4 |
| Estimated burden band | **medium** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 81 |
| SAFE_REVIEW | 1 |
| EXPERT_REVIEW | 7 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 9 gap(s), reviewer=attending
- **Claim Builder** (claim-builder): 6 gap(s), reviewer=clinical_expert
- **Clinical Entity Builder** (clinical-entity-builder): 2 gap(s), reviewer=clinical_expert
- **Asset Linker** (asset-linker): 2 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

