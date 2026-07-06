# Hip Fracture Cluster — Review Queue

Generated: 2026-07-05T21:42:39.209Z

Items requiring clinical or attending judgment before publication. Safe curator approvals were applied to staging as draft/unreviewed content only.

## Gating policy

- **Attending**: `treated_by`, `uses_fixation`, `indicates_treatment`, `at_risk_structure`, `explains_instability`, all decision points
- **Clinical**: board traps, cognitive traps, clinical scripts, general `HUMAN_REVIEW` claims
- **Not applied**: decision points (unless explicit staging draft mode)

## Femoral Neck Fracture

| Bucket | Count | Staging applied |
|--------|------:|:---------------:|
| Safe curator approval | 43 | partial (low-risk only) |
| Needs clinical judgment | 4 | no |
| Needs attending judgment | 7 | no |
| Reject/revise | 0 | no |
| Schema/ontology | 0 | no |
| Human review queue items | 11 | — |

### Queue highlights

- **ATTENDING_REVIEW** — femoral-neck-fracture -[at_risk_structure]-> medial-femoral-circumflex-artery (add_canonical_relationship)
- **ATTENDING_REVIEW** — displaced-femoral-neck-fracture -[indicates_treatment]-> hip-hemiarthroplasty (add_canonical_relationship)
- **ATTENDING_REVIEW** — femoral-neck-fracture -[uses_fixation]-> cannulated-screw-fixation (add_canonical_relationship)
- **ATTENDING_REVIEW** — femoral-neck-fracture -[treated_by]-> femoral-neck-orif (add_canonical_relationship)
- **ATTENDING_REVIEW** — femoral-neck-fracture -[treated_by]-> hip-hemiarthroplasty (add_canonical_relationship)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **ATTENDING_REVIEW** — undefined -[null]-> undefined (propose_decision_point)
- …and 1 more

## Intertrochanteric Fracture

| Bucket | Count | Staging applied |
|--------|------:|:---------------:|
| Safe curator approval | 40 | partial (low-risk only) |
| Needs clinical judgment | 4 | no |
| Needs attending judgment | 7 | no |
| Reject/revise | 0 | no |
| Schema/ontology | 0 | no |
| Human review queue items | 11 | — |

### Queue highlights

- **ATTENDING_REVIEW** — unstable-intertrochanteric-pattern -[indicates_treatment]-> cephalomedullary-nailing (add_canonical_relationship)
- **ATTENDING_REVIEW** — reverse-obliquity-it-fracture -[indicates_treatment]-> cephalomedullary-nailing (add_canonical_relationship)
- **ATTENDING_REVIEW** — intertrochanteric-fracture -[treated_by]-> cephalomedullary-nail (add_canonical_relationship)
- **ATTENDING_REVIEW** — intertrochanteric-fracture -[treated_by]-> sliding-hip-screw (add_canonical_relationship)
- **ATTENDING_REVIEW** — unstable-intertrochanteric-pattern -[explains_instability]-> intertrochanteric-fracture (add_canonical_relationship)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **ATTENDING_REVIEW** — undefined -[null]-> undefined (propose_decision_point)
- …and 1 more

## Subtrochanteric Fracture

| Bucket | Count | Staging applied |
|--------|------:|:---------------:|
| Safe curator approval | 39 | partial (low-risk only) |
| Needs clinical judgment | 4 | no |
| Needs attending judgment | 6 | no |
| Reject/revise | 0 | no |
| Schema/ontology | 0 | no |
| Human review queue items | 10 | — |

### Queue highlights

- **ATTENDING_REVIEW** — subtrochanteric-fracture -[treated_by]-> cephalomedullary-nail (add_canonical_relationship)
- **ATTENDING_REVIEW** — subtrochanteric-fracture -[treated_by]-> subtrochanteric-plate-osteosynthesis (add_canonical_relationship)
- **ATTENDING_REVIEW** — subtrochanteric-plate-osteosynthesis -[at_risk_structure]-> sciatic-nerve (add_canonical_relationship)
- **ATTENDING_REVIEW** — atypical-subtrochanteric-fracture -[explains_instability]-> subtrochanteric-fracture (add_canonical_relationship)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **ATTENDING_REVIEW** — undefined -[null]-> undefined (propose_decision_point)
- **ATTENDING_REVIEW** — undefined -[null]-> undefined (propose_decision_point)
