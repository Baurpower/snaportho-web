# Reviewer Burden Estimate

Generated: 2026-07-16T02:41:08.227Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 15.6% |
| Auto-approved rate | 84.4% |
| Attending review items | 6 |
| Curator review items | 13 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 6 |
| Estimated burden band | **medium** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 76 |
| SAFE_REVIEW | 8 |
| EXPERT_REVIEW | 6 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 14 gap(s), reviewer=attending
- **Claim Builder** (claim-builder): 13 gap(s), reviewer=clinical_expert
- **Clinical Entity Builder** (clinical-entity-builder): 3 gap(s), reviewer=clinical_expert
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

