# Three-Pilot Review Summary

Generated: 2026-07-05T21:10:29.553Z

Review grouping across ankle-fracture, compartment-syndrome, and distal-radius-fracture.

## Safety policy applied

- **Safe curator approval** (`AUTO_APPROVED_LOW_RISK`, `AUTO_REVISED`): eligible for staging apply
- **Needs attending**: high-risk predicates, operative indications, emergency DPs
- **Needs clinical**: board traps, cognitive traps, clinical scripts, general HUMAN_REVIEW claims
- **Decision points**: gated — not applied without explicit staging draft mode
- **Claims**: even auto-approved anatomy pearls insert as `generated_draft` / `unreviewed`

## Ankle Fracture

| Bucket | Count | Applied to staging |
|--------|------:|-------------------|
| Safe curator approval | 43 | yes (auto) |
| Needs clinical judgment | 5 | no — queued |
| Needs attending judgment | 10 | no — queued |
| Reject/revise | 0 | no |
| Schema/ontology issue | 0 | no |
| Human review queue items | 15 | — |

### Attending / human queue highlights

- **ATTENDING_REVIEW** — ankle-fracture -[at_risk_structure]-> superficial-peroneal-nerve (add_canonical_relationship)
- **ATTENDING_REVIEW** — deltoid-ligament -[explains_instability]-> ankle-fracture (add_canonical_relationship)
- **ATTENDING_REVIEW** — syndesmosis -[explains_instability]-> ankle-fracture (add_canonical_relationship)
- **ATTENDING_REVIEW** — medial-clear-space-widening -[explains_instability]-> ankle-fracture (add_canonical_relationship)
- **ATTENDING_REVIEW** — ankle-fracture -[uses_fixation]-> ankle-orif-fixation (add_canonical_relationship)
- **ATTENDING_REVIEW** — ankle-fracture -[treated_by]-> ankle-orif (add_canonical_relationship)
- **ATTENDING_REVIEW** — medial-clear-space-widening -[indicates_treatment]-> ankle-orif (add_canonical_relationship)
- **ATTENDING_REVIEW** — ankle-orif -[at_risk_structure]-> superficial-peroneal-nerve (add_canonical_relationship)
- …and 7 more

## Compartment Syndrome

| Bucket | Count | Applied to staging |
|--------|------:|-------------------|
| Safe curator approval | 36 | yes (auto) |
| Needs clinical judgment | 7 | no — queued |
| Needs attending judgment | 3 | no — queued |
| Reject/revise | 0 | no |
| Schema/ontology issue | 0 | no |
| Human review queue items | 10 | — |

### Attending / human queue highlights

- **HUMAN_REVIEW** — compartment-syndrome -[tested_by]-> pain-with-passive-stretch (add_canonical_relationship)
- **ATTENDING_REVIEW** — compartment-syndrome -[treated_by]-> leg-fasciotomy (add_canonical_relationship)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- **HUMAN_REVIEW** — undefined -[null]-> undefined (propose_educational_claim)
- …and 2 more

## Distal Radius Fracture

| Bucket | Count | Applied to staging |
|--------|------:|-------------------|
| Safe curator approval | 32 | yes (auto) |
| Needs clinical judgment | 6 | no — queued |
| Needs attending judgment | 9 | no — queued |
| Reject/revise | 0 | no |
| Schema/ontology issue | 0 | no |
| Human review queue items | 15 | — |

### Attending / human queue highlights

- **ATTENDING_REVIEW** — distal-radius-fracture -[at_risk_structure]-> median-nerve (add_canonical_relationship)
- **ATTENDING_REVIEW** — dorsal-comminution -[indicates_treatment]-> distal-radius-orif (add_canonical_relationship)
- **ATTENDING_REVIEW** — radial-height-loss -[indicates_treatment]-> distal-radius-orif (add_canonical_relationship)
- **ATTENDING_REVIEW** — distal-radius-fracture -[uses_fixation]-> distal-radius-orif-fixation (add_canonical_relationship)
- **ATTENDING_REVIEW** — distal-radius-fracture -[treated_by]-> distal-radius-orif (add_canonical_relationship)
- **HUMAN_REVIEW** — distal-radius-orif -[uses_approach]-> volar-approach (add_canonical_relationship)
- **ATTENDING_REVIEW** — distal-radius-orif -[at_risk_structure]-> median-nerve (add_canonical_relationship)
- **ATTENDING_REVIEW** — druj -[explains_instability]-> distal-radius-fracture (add_canonical_relationship)
- …and 7 more

