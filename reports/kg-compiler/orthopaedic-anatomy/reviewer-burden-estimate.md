# Reviewer Burden Estimate

Generated: 2026-07-08T21:20:25.732Z

## Summary

| Metric | Value |
|--------|------:|
| Human review rate | 0.7% |
| Auto-approved rate | 99.3% |
| Attending review items | 3 |
| Curator review items | 0 |
| Rejected / conflict signals | 0 |
| Gap-resolution work items | 2 |
| Estimated burden band | **low** |

## Route distribution

| Route | Count |
|-------|------:|
| AUTO_APPROVE | 417 |
| SAFE_REVIEW | 0 |
| EXPERT_REVIEW | 3 |
| REJECT | 0 |

## Agent work plan

- **Relationship Builder** (relationship-builder): 46 gap(s), reviewer=none
- **Provenance Builder** (provenance-builder): 1 gap(s), reviewer=none
- **Conflict Resolver** (duplicate-detector): 0 gap(s), reviewer=none
- **Quality Scorer** (quality-scorer): 0 gap(s), reviewer=none
- **Conflict Resolver** (conflict-resolver): 0 gap(s), reviewer=none
- **Review Assistant** (review-assistant): 0 gap(s), reviewer=none
- **Publication Validator** (publication-validator): 0 gap(s), reviewer=none

## Constraints

- Attending-gated items are never auto-approved by the contract framework.
- All routing is deterministic and explainable (no opaque AI scores).

