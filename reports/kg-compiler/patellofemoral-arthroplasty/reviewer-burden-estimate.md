# Reviewer Burden Estimate

Generated: 2026-07-16T02:53:50.268Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 9.6% |
| Auto-approved rate | 90.4% |
| Attending review items | 3 |
| Curator review items | 7 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 4 |
| Estimated burden band | **medium** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 75 |
| SAFE_REVIEW | 5 |
| EXPERT_REVIEW | 3 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 6 gap(s), reviewer=attending
- **Claim Builder** (claim-builder): 8 gap(s), reviewer=clinical_expert
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

