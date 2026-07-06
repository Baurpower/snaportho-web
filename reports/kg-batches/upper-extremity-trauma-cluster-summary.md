# Upper Extremity Trauma Cluster — Manufacturing Summary

Generated: 2026-07-05T21:59:22.719Z

Five neighborhoods manufactured via Knowledge Factory operator pipeline:
Evidence → Compiler → Gap Analysis → Work Planner → Agent Execution → Merge → Auto Review → Human Queue → Publication Validation → Staging Apply → DB-backed compile.

## Cluster topics

| Neighborhood | Topic key | Curriculum node | Anki | OB | Factory maturity | Publication |
|--------------|-----------|-----------------|-----:|---:|-----------------:|:-----------:|
| Clavicle Fracture | `clavicle-fracture` | `trauma-clavicle-fractures-midshaft` | 0 | 22 | 6 | blocked |
| Proximal Humerus Fracture | `proximal-humerus-fracture` | `trauma-proximal-humerus-fractures` | 0 | 57 | 6 | blocked |
| Humeral Shaft Fracture | `humeral-shaft-fracture` | `trauma-humeral-shaft-fractures` | 10 | 47 | 6 | blocked |
| Distal Humerus Fracture | `distal-humerus-fracture` | `trauma-distal-humerus-fractures` | 7 | 26 | 6 | blocked |
| Supracondylar Humerus Fracture | `supracondylar-humerus-fracture` | `pediatrics-supracondylar-fracture-pediatric` | 0 | 58 | 6 | blocked |

## Shared upper-extremity trauma anatomy

Owned by clavicle-fracture pilot (`upper-extremity-trauma-cluster-shared`). Siblings reference these slugs; staging apply skips duplicate entity creation.

- `upper-extremity-trauma-anatomy-hub`
- `clavicle`
- `ac-joint`
- `sternoclavicular-joint`
- `proximal-humerus`
- `humeral-head`
- `surgical-neck`
- `axillary-nerve`
- `humeral-shaft`
- `radial-nerve`
- `brachial-artery`
- `distal-humerus`
- `medial-column`
- `lateral-column`
- `olecranon-fossa`
- `capitellum`
- `trochlea`
- `anterior-interosseous-nerve`
- `median-nerve`
- `ulnar-nerve`
- `elbow-joint`

## Gating policy applied

- Neurovascular-risk edges (`at_risk_structure`) → attending review
- Operative indications, fixation/arthroplasty decisions → attending review
- Pediatric supracondylar vascular/nerve DPs → attending review
- Board traps and cognitive traps → clinical review
- Decision points not applied to staging without explicit draft mode

## Per-topic report paths

### Clavicle Fracture

- Evidence: `reports/kg-evidence/clavicle-fracture/`
- Compiler: `reports/kg-compiler/clavicle-fracture/`
- Factory: `reports/kg-pilots/clavicle-fracture-*`

### Proximal Humerus Fracture

- Evidence: `reports/kg-evidence/proximal-humerus-fracture/`
- Compiler: `reports/kg-compiler/proximal-humerus-fracture/`
- Factory: `reports/kg-pilots/proximal-humerus-fracture-*`

### Humeral Shaft Fracture

- Evidence: `reports/kg-evidence/humeral-shaft-fracture/`
- Compiler: `reports/kg-compiler/humeral-shaft-fracture/`
- Factory: `reports/kg-pilots/humeral-shaft-fracture-*`

### Distal Humerus Fracture

- Evidence: `reports/kg-evidence/distal-humerus-fracture/`
- Compiler: `reports/kg-compiler/distal-humerus-fracture/`
- Factory: `reports/kg-pilots/distal-humerus-fracture-*`

### Supracondylar Humerus Fracture

- Evidence: `reports/kg-evidence/supracondylar-humerus-fracture/`
- Compiler: `reports/kg-compiler/supracondylar-humerus-fracture/`
- Factory: `reports/kg-pilots/supracondylar-humerus-fracture-*`

