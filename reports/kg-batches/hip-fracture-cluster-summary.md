# Hip Fracture Cluster — Manufacturing Summary

Generated: 2026-07-05T21:42:39.208Z

Cluster neighborhoods manufactured end-to-end via Knowledge Factory operator pipeline:
Evidence → Compiler → Gap Analysis → Work Planner → Agent Execution → Merge → Auto Review → Human Queue → Publication Validation → Staging Apply.

## Cluster topics

| Neighborhood | Topic key | Curriculum node | Anki | OB | Factory maturity | Publication |
|--------------|-----------|-----------------|-----:|---:|-----------------:|:-----------:|
| Femoral Neck Fracture | `femoral-neck-fracture` | `trauma-femoral-neck-fractures` | 9 | 64 | 6 | blocked |
| Intertrochanteric Fracture | `intertrochanteric-fracture` | `trauma-intertrochanteric-fractures` | 10 | 40 | 6 | blocked |
| Subtrochanteric Fracture | `subtrochanteric-fracture` | `trauma-subtrochanteric-fractures` | 11 | 20 | 6 | blocked |

## Shared proximal femur anatomy (single canonical set)

Owned by femoral-neck-fracture pilot (`hip-fracture-cluster-shared`). Sibling neighborhoods reference these slugs — staging apply skips duplicate entity creation when slugs already exist.

- `proximal-femur-anatomy-hub`
- `femoral-head`
- `femoral-neck`
- `intertrochanteric-region`
- `lesser-trochanter`
- `greater-trochanter`
- `calcar`
- `medial-femoral-circumflex-artery`
- `sciatic-nerve`
- `hip-joint`

Shared implant slug reused across IT + ST: `cephalomedullary-nail`, `cephalomedullary-nailing` (procedure).

## Pipeline execution

1. Registered all three topics in `topic-registry.ts`
2. Built evidence packets (`npm run kg:evidence -- --topic <key>`)
3. Compiled with evidence (`npm run kg:compile -- --topic <key> --use-evidence`)
4. Ran factory agents: generate → curate → review → persist
5. Applied safe low-risk approvals to staging only (`KG_TARGET_ENV=staging`)
6. Re-ran DB-backed evidence + compile + quality
7. Gated operative indications, fixation/arthroplasty edges, AVN/vascular anatomy, and all decision points for attending review

## Known framework limitations (documented, not blocking)

- No Iteration Controller — compiler is single-pass; DB-backed gaps may exceed spec-pass gaps until review queue clears
- DB snapshot loader filters by pilot metadata — shared anatomy may appear under sibling pilot tags while slugs remain canonical
- Neighborhood QA Agent not implemented — gap analysis + publication validator substitute

## Per-topic report paths

### Femoral Neck Fracture

- Evidence: `reports/kg-evidence/femoral-neck-fracture/`
- Compiler: `reports/kg-compiler/femoral-neck-fracture/`
- Factory: `reports/kg-pilots/femoral-neck-fracture-*`

### Intertrochanteric Fracture

- Evidence: `reports/kg-evidence/intertrochanteric-fracture/`
- Compiler: `reports/kg-compiler/intertrochanteric-fracture/`
- Factory: `reports/kg-pilots/intertrochanteric-fracture-*`

### Subtrochanteric Fracture

- Evidence: `reports/kg-evidence/subtrochanteric-fracture/`
- Compiler: `reports/kg-compiler/subtrochanteric-fracture/`
- Factory: `reports/kg-pilots/subtrochanteric-fracture-*`

