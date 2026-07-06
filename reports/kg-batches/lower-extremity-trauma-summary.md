# Lower Extremity Trauma Cluster — Manufacturing Summary

Generated: 2026-07-05T22:52:03.877Z

Ten neighborhoods manufactured via Knowledge Factory operator pipeline:
Evidence → Compiler → Gap Analysis → Work Planner → Agent Execution → Merge → Auto Review → Human Queue → Publication Validation → Staging Apply → DB-backed compile.

## Cluster topics

| Neighborhood | Topic key | Curriculum node | Anki | OB | Factory maturity | Publication |
|--------------|-----------|-----------------|-----:|---:|-----------------:|:-----------:|
| Pelvic Ring Injury | `pelvic-ring-injury` | `trauma-pelvic-ring-fractures` | 14 | 64 | 6 | blocked |
| Acetabular Fracture | `acetabular-fracture` | `trauma-acetabular-fractures` | 24 | 74 | 7 | blocked |
| Femoral Shaft Fracture | `femoral-shaft-fracture` | `trauma-femoral-shaft-fractures` | 28 | 60 | 6 | blocked |
| Distal Femur Fracture | `distal-femur-fracture` | `trauma-distal-femur-fractures` | 9 | 19 | 6 | blocked |
| Patella Fracture | `patella-fracture` | `trauma-patella-fracture` | 5 | 11 | 6 | blocked |
| Tibial Plateau Fracture | `tibial-plateau-fracture` | `trauma-tibial-plateau-fractures` | 15 | 68 | 6 | blocked |
| Pilon Fracture | `pilon-fracture` | `trauma-tibial-plafond-fractures` | 5 | 27 | 6 | blocked |
| Calcaneus Fracture | `calcaneus-fracture` | `trauma-calcaneus-fractures` | 11 | 48 | 6 | blocked |
| Talus Fracture | `talus-fracture` | `trauma-talar-neck-fractures` | 13 | 28 | 6 | blocked |
| Lisfranc Injury | `lisfranc-injury` | `foot-ankle-lisfranc-injury` | 0 | 34 | 6 | blocked |

## Shared lower-extremity trauma anatomy

Owned by pelvic-ring-injury pilot (`lower-extremity-trauma-cluster-shared`). Siblings reference these slugs; staging apply skips duplicate entity creation.

- `lower-extremity-trauma-anatomy-hub`
- `pelvis`
- `sacrum`
- `sacroiliac-joint`
- `pubic-symphysis`
- `iliac-wing`
- `acetabulum`
- `femoral-diaphysis`
- `distal-femur`
- `tibial-plateau`
- `patella`
- `extensor-mechanism`
- `acl`
- `pcl`
- `popliteal-artery`
- `common-peroneal-nerve`
- `talus`
- `calcaneus`
- `subtalar-joint`
- `lisfranc-joint`
- `midfoot`
- `plantar-soft-tissues`

## Gating policy applied

- Neurovascular-risk edges (`at_risk_structure`) → attending review
- Operative indications, fixation decisions → attending review
- Hemorrhage and instability decision points → attending review
- Board traps and cognitive traps → clinical review
- Decision points not applied to staging without explicit draft mode

## Per-topic report paths

### Pelvic Ring Injury

- Evidence: `reports/kg-evidence/pelvic-ring-injury/`
- Compiler: `reports/kg-compiler/pelvic-ring-injury/`
- Factory: `reports/kg-pilots/pelvic-ring-injury-*`

### Acetabular Fracture

- Evidence: `reports/kg-evidence/acetabular-fracture/`
- Compiler: `reports/kg-compiler/acetabular-fracture/`
- Factory: `reports/kg-pilots/acetabular-fracture-*`

### Femoral Shaft Fracture

- Evidence: `reports/kg-evidence/femoral-shaft-fracture/`
- Compiler: `reports/kg-compiler/femoral-shaft-fracture/`
- Factory: `reports/kg-pilots/femoral-shaft-fracture-*`

### Distal Femur Fracture

- Evidence: `reports/kg-evidence/distal-femur-fracture/`
- Compiler: `reports/kg-compiler/distal-femur-fracture/`
- Factory: `reports/kg-pilots/distal-femur-fracture-*`

### Patella Fracture

- Evidence: `reports/kg-evidence/patella-fracture/`
- Compiler: `reports/kg-compiler/patella-fracture/`
- Factory: `reports/kg-pilots/patella-fracture-*`

### Tibial Plateau Fracture

- Evidence: `reports/kg-evidence/tibial-plateau-fracture/`
- Compiler: `reports/kg-compiler/tibial-plateau-fracture/`
- Factory: `reports/kg-pilots/tibial-plateau-fracture-*`

### Pilon Fracture

- Evidence: `reports/kg-evidence/pilon-fracture/`
- Compiler: `reports/kg-compiler/pilon-fracture/`
- Factory: `reports/kg-pilots/pilon-fracture-*`

### Calcaneus Fracture

- Evidence: `reports/kg-evidence/calcaneus-fracture/`
- Compiler: `reports/kg-compiler/calcaneus-fracture/`
- Factory: `reports/kg-pilots/calcaneus-fracture-*`

### Talus Fracture

- Evidence: `reports/kg-evidence/talus-fracture/`
- Compiler: `reports/kg-compiler/talus-fracture/`
- Factory: `reports/kg-pilots/talus-fracture-*`

### Lisfranc Injury

- Evidence: `reports/kg-evidence/lisfranc-injury/`
- Compiler: `reports/kg-compiler/lisfranc-injury/`
- Factory: `reports/kg-pilots/lisfranc-injury-*`

