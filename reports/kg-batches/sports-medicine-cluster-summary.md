# Sports Medicine Prepare Cluster — Manufacturing Summary

Generated: 2026-07-05T23:24:00.886Z

Seventeen diagnosis-first neighborhoods manufactured via Knowledge Factory operator pipeline:
Evidence → Compiler → Gap Analysis → Work Planner → Agent Execution → Merge → Auto Review → Human Queue → Publication Validation → Staging Apply → DB-backed compile → Auditor.

## Cluster topics

| Region | Neighborhood | Topic key | Curriculum node | Anki | OB | Factory maturity | Publication |
|--------|--------------|-----------|-----------------|-----:|---:|-----------------:|:-----------:|
| knee | ACL Tear | `acl-tear` | `knee-sports-acl-tear` | 18 | 21 | 6 | blocked |
| knee | PCL Injury | `pcl-injury` | `knee-sports-pcl-injury` | 8 | 15 | 6 | blocked |
| knee | Meniscus Tear | `meniscus-tear` | `knee-sports-meniscus-tear` | 14 | 28 | 6 | blocked |
| knee | Patellar Instability | `patellar-instability` | `knee-sports-patellar-instability` | 10 | 18 | 6 | blocked |
| knee | Multiligament Knee Injury | `multiligament-knee-injury` | `knee-sports-multiligament-knee-injury` | 6 | 12 | 6 | blocked |
| knee | Osteochondral Defect of the Knee | `osteochondral-defect-knee` | `knee-sports-osteochondral-defect-knee` | 5 | 14 | 6 | blocked |
| shoulder | Anterior Shoulder Instability | `anterior-shoulder-instability` | `shoulder-elbow-anterior-shoulder-instability` | 12 | 24 | 6 | blocked |
| shoulder | Rotator Cuff Tear | `rotator-cuff-tear` | `shoulder-elbow-rotator-cuff-tear` | 16 | 32 | 6 | blocked |
| shoulder | AC Joint Separation | `ac-joint-separation` | `shoulder-elbow-ac-joint-separation` | 6 | 16 | 6 | blocked |
| shoulder | SLAP Tear | `slap-tear` | `shoulder-elbow-slap-tear` | 5 | 14 | 6 | blocked |
| shoulder | Proximal Biceps Tendon Pathology | `proximal-biceps-tendon-pathology` | `shoulder-elbow-proximal-biceps-tendon-pathology` | 4 | 12 | 6 | blocked |
| elbow | UCL Injury | `ucl-injury` | `shoulder-elbow-ucl-injury` | 7 | 18 | 6 | blocked |
| elbow | Distal Biceps Tendon Rupture | `distal-biceps-tendon-rupture` | `shoulder-elbow-distal-biceps-tendon-rupture` | 4 | 10 | 6 | blocked |
| foot_ankle | Achilles Tendon Rupture | `achilles-tendon-rupture` | `foot-ankle-achilles-tendon-rupture` | 10 | 20 | 6 | blocked |
| foot_ankle | Chronic Lateral Ankle Instability | `chronic-lateral-ankle-instability` | `foot-ankle-chronic-lateral-ankle-instability` | 6 | 14 | 6 | blocked |
| foot_ankle | Syndesmotic Sprain | `syndesmotic-sprain` | `foot-ankle-syndesmotic-sprain` | 5 | 16 | 6 | blocked |
| foot_ankle | Osteochondral Lesion of the Talus | `osteochondral-lesion-talus` | `foot-ankle-osteochondral-lesion-talus` | 4 | 12 | 6 | blocked |

## Shared sports medicine anatomy

Owned by acl-tear pilot (`sports-medicine-cluster-shared`). Siblings reference these slugs; staging apply skips duplicate entity creation.

- `sports-medicine-anatomy-hub`
- `sports-knee-anatomy-hub`
- `sports-shoulder-anatomy-hub`
- `sports-elbow-anatomy-hub`
- `sports-foot-ankle-anatomy-hub`
- `mcl`
- `lcl`
- `posterolateral-corner`
- `medial-meniscus`
- `lateral-meniscus`
- `articular-cartilage`
- `femoral-condyles`
- `glenoid`
- `labrum`
- `rotator-cuff`
- `supraspinatus`
- `infraspinatus`
- `subscapularis`
- `teres-minor`
- `biceps-anchor`
- `ucl`
- `radial-collateral-ligament`
- `distal-biceps-tendon`
- `atfl`
- `cfl`
- `achilles-tendon`

## Cross-cluster trauma reuse

Sports neighborhoods reference canonical trauma anatomy and conditions without duplication:

- `tibial-plateau-fracture`
- `proximal-humerus-fracture`
- `clavicle-fracture`
- `ankle-fracture`
- `calcaneus-fracture`
- `talus-fracture`
- `patella-fracture`
- `distal-femur-fracture`
- `pilon-fracture`

## Gating policy applied

- Anatomy, classifications, metadata, curriculum bridges → auto-staged (low-risk)
- Operative indications, reconstruction, graft/fixation concepts → ATTENDING_REVIEW
- Return-to-play criteria, surgical decision points, rehab protocols → ATTENDING_REVIEW
- Educational claims, board traps, cognitive traps, clinical scripts → HUMAN_REVIEW
- Decision points not applied to staging without explicit draft mode
- Publication blocked pending clinical verification

## Per-topic report paths

### ACL Tear

- Evidence: `reports/kg-evidence/acl-tear/`
- Compiler: `reports/kg-compiler/acl-tear/`
- Factory: `reports/kg-pilots/acl-tear-*`

### PCL Injury

- Evidence: `reports/kg-evidence/pcl-injury/`
- Compiler: `reports/kg-compiler/pcl-injury/`
- Factory: `reports/kg-pilots/pcl-injury-*`

### Meniscus Tear

- Evidence: `reports/kg-evidence/meniscus-tear/`
- Compiler: `reports/kg-compiler/meniscus-tear/`
- Factory: `reports/kg-pilots/meniscus-tear-*`

### Patellar Instability

- Evidence: `reports/kg-evidence/patellar-instability/`
- Compiler: `reports/kg-compiler/patellar-instability/`
- Factory: `reports/kg-pilots/patellar-instability-*`

### Multiligament Knee Injury

- Evidence: `reports/kg-evidence/multiligament-knee-injury/`
- Compiler: `reports/kg-compiler/multiligament-knee-injury/`
- Factory: `reports/kg-pilots/multiligament-knee-injury-*`

### Osteochondral Defect of the Knee

- Evidence: `reports/kg-evidence/osteochondral-defect-knee/`
- Compiler: `reports/kg-compiler/osteochondral-defect-knee/`
- Factory: `reports/kg-pilots/osteochondral-defect-knee-*`

### Anterior Shoulder Instability

- Evidence: `reports/kg-evidence/anterior-shoulder-instability/`
- Compiler: `reports/kg-compiler/anterior-shoulder-instability/`
- Factory: `reports/kg-pilots/anterior-shoulder-instability-*`

### Rotator Cuff Tear

- Evidence: `reports/kg-evidence/rotator-cuff-tear/`
- Compiler: `reports/kg-compiler/rotator-cuff-tear/`
- Factory: `reports/kg-pilots/rotator-cuff-tear-*`

### AC Joint Separation

- Evidence: `reports/kg-evidence/ac-joint-separation/`
- Compiler: `reports/kg-compiler/ac-joint-separation/`
- Factory: `reports/kg-pilots/ac-joint-separation-*`

### SLAP Tear

- Evidence: `reports/kg-evidence/slap-tear/`
- Compiler: `reports/kg-compiler/slap-tear/`
- Factory: `reports/kg-pilots/slap-tear-*`

### Proximal Biceps Tendon Pathology

- Evidence: `reports/kg-evidence/proximal-biceps-tendon-pathology/`
- Compiler: `reports/kg-compiler/proximal-biceps-tendon-pathology/`
- Factory: `reports/kg-pilots/proximal-biceps-tendon-pathology-*`

### UCL Injury

- Evidence: `reports/kg-evidence/ucl-injury/`
- Compiler: `reports/kg-compiler/ucl-injury/`
- Factory: `reports/kg-pilots/ucl-injury-*`

### Distal Biceps Tendon Rupture

- Evidence: `reports/kg-evidence/distal-biceps-tendon-rupture/`
- Compiler: `reports/kg-compiler/distal-biceps-tendon-rupture/`
- Factory: `reports/kg-pilots/distal-biceps-tendon-rupture-*`

### Achilles Tendon Rupture

- Evidence: `reports/kg-evidence/achilles-tendon-rupture/`
- Compiler: `reports/kg-compiler/achilles-tendon-rupture/`
- Factory: `reports/kg-pilots/achilles-tendon-rupture-*`

### Chronic Lateral Ankle Instability

- Evidence: `reports/kg-evidence/chronic-lateral-ankle-instability/`
- Compiler: `reports/kg-compiler/chronic-lateral-ankle-instability/`
- Factory: `reports/kg-pilots/chronic-lateral-ankle-instability-*`

### Syndesmotic Sprain

- Evidence: `reports/kg-evidence/syndesmotic-sprain/`
- Compiler: `reports/kg-compiler/syndesmotic-sprain/`
- Factory: `reports/kg-pilots/syndesmotic-sprain-*`

### Osteochondral Lesion of the Talus

- Evidence: `reports/kg-evidence/osteochondral-lesion-talus/`
- Compiler: `reports/kg-compiler/osteochondral-lesion-talus/`
- Factory: `reports/kg-pilots/osteochondral-lesion-talus-*`

