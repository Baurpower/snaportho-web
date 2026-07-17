# Reviewer Burden Estimate

Generated: 2026-07-16T02:33:43.885Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 12.9% |
| Auto-approved rate | 87.1% |
| Attending review items | 6 |
| Curator review items | 11 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 5 |
| Estimated burden band | **medium** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 81 |
| SAFE_REVIEW | 6 |
| EXPERT_REVIEW | 6 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 38 gap(s), reviewer=attending
- **Clinical Entity Builder** (clinical-entity-builder): 4 gap(s), reviewer=clinical_expert
- **Claim Builder** (claim-builder): 14 gap(s), reviewer=clinical_expert
- **Metadata Builder** (metadata-builder): 2 gap(s), reviewer=none
- **Asset Linker** (asset-linker): 2 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

