# Reviewer Burden Estimate

Generated: 2026-07-05T22:43:07.746Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 19.6% |
| Auto-approved rate | 80.4% |
| Attending review items | 20 |
| Curator review items | 19 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 6 |
| Estimated burden band | **high** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 115 |
| SAFE_REVIEW | 8 |
| EXPERT_REVIEW | 20 |
| REJECT | 0 |

## Agent work plan

- **Clinical Entity Builder** (clinical-entity-builder): 1 gap(s), reviewer=none
- **Relationship Builder** (relationship-builder): 7 gap(s), reviewer=attending
- **Claim Builder** (claim-builder): 5 gap(s), reviewer=none
- **Decision Point Builder** (decision-point-builder): 3 gap(s), reviewer=attending
- **Metadata Builder** (metadata-builder): 2 gap(s), reviewer=none
- **Asset Linker** (asset-linker): 1 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

