# Adult Reconstruction Cluster — Manufacturing Summary

Generated: 2026-07-05T23:31:58.124Z

Twenty neighborhoods manufactured via Knowledge Factory operator pipeline:
Evidence → Compiler → Gap Analysis → Work Planner → Agent Execution → Merge → Auto Review → Human Queue → Publication Validation → Staging Apply → DB-backed compile.

## Cluster groups

- **Hip Reconstruction** (8): Hip Osteoarthritis, Femoral Neck Fracture (Adult Recon Perspective), Periprosthetic Femur Fracture, Hip Prosthetic Joint Infection, Aseptic Loosening of THA, Hip Instability After THA, Polyethylene Wear and Osteolysis, Adverse Local Tissue Reaction (Metal Reaction)
- **Knee Reconstruction** (8): Knee Osteoarthritis, Periprosthetic Knee Fracture, Knee Prosthetic Joint Infection, Aseptic Loosening of TKA, Knee Instability After TKA, Extensor Mechanism Failure, Patellofemoral Arthroplasty, Unicompartmental Knee Arthritis
- **Reconstruction Principles** (4): Periprosthetic Joint Infection, Bone Loss in Revision Arthroplasty, Implant Fixation Principles, Bearing Surface Selection

## Cluster topics

| Neighborhood | Topic key | Group | Curriculum node | Anki | OB | Factory maturity | Publication |
|--------------|-----------|-------|-----------------|-----:|---:|-----------------:|:-----------:|
| Hip Osteoarthritis | `hip-osteoarthritis` | hip | `adult-recon-hip-osteoarthritis` | 18 | 72 | 7 | blocked |
| Femoral Neck Fracture (Adult Recon Perspective) | `femoral-neck-fracture-adult-recon` | hip | `adult-recon-femoral-neck-fracture` | 9 | 64 | 7 | blocked |
| Periprosthetic Femur Fracture | `periprosthetic-femur-fracture` | hip | `adult-recon-periprosthetic-femur-fracture` | 6 | 28 | 6 | blocked |
| Hip Prosthetic Joint Infection | `hip-prosthetic-joint-infection` | hip | `adult-recon-hip-pji` | 8 | 42 | 6 | blocked |
| Aseptic Loosening of THA | `aseptic-loosening-tha` | hip | `adult-recon-aseptic-loosening-tha` | 5 | 22 | 6 | blocked |
| Hip Instability After THA | `hip-instability-after-tha` | hip | `adult-recon-hip-instability` | 7 | 36 | 6 | blocked |
| Polyethylene Wear and Osteolysis | `polyethylene-wear-osteolysis` | hip | `adult-recon-polyethylene-wear` | 4 | 18 | 6 | blocked |
| Adverse Local Tissue Reaction (Metal Reaction) | `adverse-local-tissue-reaction` | hip | `adult-recon-altr` | 3 | 14 | 6 | blocked |
| Knee Osteoarthritis | `knee-osteoarthritis` | knee | `adult-recon-knee-osteoarthritis` | 16 | 68 | 6 | blocked |
| Periprosthetic Knee Fracture | `periprosthetic-knee-fracture` | knee | `adult-recon-periprosthetic-knee-fracture` | 5 | 16 | 6 | blocked |
| Knee Prosthetic Joint Infection | `knee-prosthetic-joint-infection` | knee | `adult-recon-knee-pji` | 8 | 42 | 6 | blocked |
| Aseptic Loosening of TKA | `aseptic-loosening-tka` | knee | `adult-recon-aseptic-loosening-tka` | 5 | 20 | 6 | blocked |
| Knee Instability After TKA | `knee-instability-after-tka` | knee | `adult-recon-knee-instability` | 6 | 30 | 6 | blocked |
| Extensor Mechanism Failure | `extensor-mechanism-failure` | knee | `adult-recon-extensor-mechanism-failure` | 4 | 18 | 6 | blocked |
| Patellofemoral Arthroplasty | `patellofemoral-arthroplasty` | knee | `adult-recon-patellofemoral-arthroplasty` | 3 | 12 | 6 | blocked |
| Unicompartmental Knee Arthritis | `unicompartmental-knee-arthritis` | knee | `adult-recon-unicompartmental-knee` | 6 | 24 | 6 | blocked |
| Periprosthetic Joint Infection | `periprosthetic-joint-infection` | principles | `adult-recon-periprosthetic-joint-infection` | 12 | 56 | 6 | blocked |
| Bone Loss in Revision Arthroplasty | `bone-loss-revision-arthroplasty` | principles | `adult-recon-bone-loss-revision` | 7 | 32 | 6 | blocked |
| Implant Fixation Principles | `implant-fixation-principles` | principles | `adult-recon-implant-fixation` | 10 | 38 | 6 | blocked |
| Bearing Surface Selection | `bearing-surface-selection` | principles | `adult-recon-bearing-surfaces` | 6 | 26 | 6 | blocked |

## Shared adult reconstruction anatomy + implant concepts

Owned by hip-osteoarthritis pilot (`adult-reconstruction-cluster-shared`). Siblings reference these slugs; staging apply skips duplicate entity creation.

- `adult-reconstruction-anatomy-hub`
- `pelvis`
- `acetabulum`
- `proximal-femur`
- `hip-capsule`
- `labrum`
- `gluteus-medius`
- `gluteus-minimus`
- `short-external-rotators`
- `femoral-nerve`
- `femur`
- `tibia`
- `femoral-condyles`
- `collateral-ligaments`
- `cruciate-ligaments`
- `quadriceps-tendon`
- `patellar-tendon`
- `implant-concepts-hub`
- `femoral-component`
- `acetabular-component`
- `polyethylene-liner`
- `femoral-stem`
- `tibial-baseplate`
- `tibial-insert`
- `patellar-component`
- `cement-mantle`
- `press-fit-fixation`
- `cemented-fixation`

## Gating policy applied

- Implant selection, fixation strategy, revision strategy → attending review
- Infection management, instability management, operative indications → attending review
- Educational claims, board traps, cognitive traps, implant pearls → clinical review
- Anatomy, implant metadata, classifications, low-risk educational relationships → auto-staged
- Publication remains blocked pending clinical verification

## Per-topic report paths

### Hip Osteoarthritis

- Evidence: `reports/kg-evidence/hip-osteoarthritis/`
- Compiler: `reports/kg-compiler/hip-osteoarthritis/`
- Factory: `reports/kg-pilots/hip-osteoarthritis-*`

### Femoral Neck Fracture (Adult Recon Perspective)

- Evidence: `reports/kg-evidence/femoral-neck-fracture-adult-recon/`
- Compiler: `reports/kg-compiler/femoral-neck-fracture-adult-recon/`
- Factory: `reports/kg-pilots/femoral-neck-fracture-adult-recon-*`

### Periprosthetic Femur Fracture

- Evidence: `reports/kg-evidence/periprosthetic-femur-fracture/`
- Compiler: `reports/kg-compiler/periprosthetic-femur-fracture/`
- Factory: `reports/kg-pilots/periprosthetic-femur-fracture-*`

### Hip Prosthetic Joint Infection

- Evidence: `reports/kg-evidence/hip-prosthetic-joint-infection/`
- Compiler: `reports/kg-compiler/hip-prosthetic-joint-infection/`
- Factory: `reports/kg-pilots/hip-prosthetic-joint-infection-*`

### Aseptic Loosening of THA

- Evidence: `reports/kg-evidence/aseptic-loosening-tha/`
- Compiler: `reports/kg-compiler/aseptic-loosening-tha/`
- Factory: `reports/kg-pilots/aseptic-loosening-tha-*`

### Hip Instability After THA

- Evidence: `reports/kg-evidence/hip-instability-after-tha/`
- Compiler: `reports/kg-compiler/hip-instability-after-tha/`
- Factory: `reports/kg-pilots/hip-instability-after-tha-*`

### Polyethylene Wear and Osteolysis

- Evidence: `reports/kg-evidence/polyethylene-wear-osteolysis/`
- Compiler: `reports/kg-compiler/polyethylene-wear-osteolysis/`
- Factory: `reports/kg-pilots/polyethylene-wear-osteolysis-*`

### Adverse Local Tissue Reaction (Metal Reaction)

- Evidence: `reports/kg-evidence/adverse-local-tissue-reaction/`
- Compiler: `reports/kg-compiler/adverse-local-tissue-reaction/`
- Factory: `reports/kg-pilots/adverse-local-tissue-reaction-*`

### Knee Osteoarthritis

- Evidence: `reports/kg-evidence/knee-osteoarthritis/`
- Compiler: `reports/kg-compiler/knee-osteoarthritis/`
- Factory: `reports/kg-pilots/knee-osteoarthritis-*`

### Periprosthetic Knee Fracture

- Evidence: `reports/kg-evidence/periprosthetic-knee-fracture/`
- Compiler: `reports/kg-compiler/periprosthetic-knee-fracture/`
- Factory: `reports/kg-pilots/periprosthetic-knee-fracture-*`

### Knee Prosthetic Joint Infection

- Evidence: `reports/kg-evidence/knee-prosthetic-joint-infection/`
- Compiler: `reports/kg-compiler/knee-prosthetic-joint-infection/`
- Factory: `reports/kg-pilots/knee-prosthetic-joint-infection-*`

### Aseptic Loosening of TKA

- Evidence: `reports/kg-evidence/aseptic-loosening-tka/`
- Compiler: `reports/kg-compiler/aseptic-loosening-tka/`
- Factory: `reports/kg-pilots/aseptic-loosening-tka-*`

### Knee Instability After TKA

- Evidence: `reports/kg-evidence/knee-instability-after-tka/`
- Compiler: `reports/kg-compiler/knee-instability-after-tka/`
- Factory: `reports/kg-pilots/knee-instability-after-tka-*`

### Extensor Mechanism Failure

- Evidence: `reports/kg-evidence/extensor-mechanism-failure/`
- Compiler: `reports/kg-compiler/extensor-mechanism-failure/`
- Factory: `reports/kg-pilots/extensor-mechanism-failure-*`

### Patellofemoral Arthroplasty

- Evidence: `reports/kg-evidence/patellofemoral-arthroplasty/`
- Compiler: `reports/kg-compiler/patellofemoral-arthroplasty/`
- Factory: `reports/kg-pilots/patellofemoral-arthroplasty-*`

### Unicompartmental Knee Arthritis

- Evidence: `reports/kg-evidence/unicompartmental-knee-arthritis/`
- Compiler: `reports/kg-compiler/unicompartmental-knee-arthritis/`
- Factory: `reports/kg-pilots/unicompartmental-knee-arthritis-*`

### Periprosthetic Joint Infection

- Evidence: `reports/kg-evidence/periprosthetic-joint-infection/`
- Compiler: `reports/kg-compiler/periprosthetic-joint-infection/`
- Factory: `reports/kg-pilots/periprosthetic-joint-infection-*`

### Bone Loss in Revision Arthroplasty

- Evidence: `reports/kg-evidence/bone-loss-revision-arthroplasty/`
- Compiler: `reports/kg-compiler/bone-loss-revision-arthroplasty/`
- Factory: `reports/kg-pilots/bone-loss-revision-arthroplasty-*`

### Implant Fixation Principles

- Evidence: `reports/kg-evidence/implant-fixation-principles/`
- Compiler: `reports/kg-compiler/implant-fixation-principles/`
- Factory: `reports/kg-pilots/implant-fixation-principles-*`

### Bearing Surface Selection

- Evidence: `reports/kg-evidence/bearing-surface-selection/`
- Compiler: `reports/kg-compiler/bearing-surface-selection/`
- Factory: `reports/kg-pilots/bearing-surface-selection-*`

