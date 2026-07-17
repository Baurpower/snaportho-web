# Reviewer Burden Estimate

Generated: 2026-07-09T14:21:18.862Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 18% |
| Auto-approved rate | 82% |
| Attending review items | 28 |
| Curator review items | 20 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 5 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 191 |
| SAFE_REVIEW | 14 |
| EXPERT_REVIEW | 28 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 15 gap(s), reviewer=clinical_expert
- **Clinical Entity Builder** (clinical-entity-builder): 3 gap(s), reviewer=none
- **Claim Builder** (claim-builder): 1 gap(s), reviewer=none
- **Metadata Builder** (metadata-builder): 4 gap(s), reviewer=none
- **Asset Linker** (asset-linker): 2 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

