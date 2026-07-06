# Reviewer Burden Estimate

Generated: 2026-07-05T23:39:10.173Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 7.4% |
| Auto-approved rate | 92.6% |
| Attending review items | 7 |
| Curator review items | 9 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 3 |
| Estimated burden band | **medium** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 163 |
| SAFE_REVIEW | 6 |
| EXPERT_REVIEW | 7 |
| REJECT | 0 |

## Agent work plan

- **Clinical Entity Builder** (clinical-entity-builder): 1 gap(s), reviewer=clinical_expert
- **Relationship Builder** (relationship-builder): 3 gap(s), reviewer=attending
- **Asset Linker** (asset-linker): 1 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

