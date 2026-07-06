# Adult Reconstruction Cluster — Cross-Neighborhood Analysis

Generated: 2026-07-05T23:31:58.156Z

## Recon cluster shared anatomy (owned)

Owner pilot: `hip-osteoarthritis-neighborhood` (`adult-reconstruction-cluster-shared`).
Sibling pilots emit reference proposals; staging apply skips `entity exists` for these slugs.

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

## Canonical implant concepts (shared, not duplicated)

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

## Trauma neighborhood reuse (not re-created)

Adult reconstruction neighborhoods reference trauma cluster slugs via cross-neighborhood bridges:

- `femoral-head` (hip-fracture / LE trauma cluster)
- `femoral-neck` (hip-fracture / LE trauma cluster)
- `greater-trochanter` (hip-fracture / LE trauma cluster)
- `lesser-trochanter` (hip-fracture / LE trauma cluster)
- `calcar` (hip-fracture / LE trauma cluster)
- `medial-femoral-circumflex-artery` (hip-fracture / LE trauma cluster)
- `sciatic-nerve` (hip-fracture / LE trauma cluster)
- `hip-joint` (hip-fracture / LE trauma cluster)
- `patella` (hip-fracture / LE trauma cluster)
- `tibial-plateau` (hip-fracture / LE trauma cluster)
- `extensor-mechanism` (hip-fracture / LE trauma cluster)
- `femoral-diaphysis` (hip-fracture / LE trauma cluster)
- `popliteal-artery` (hip-fracture / LE trauma cluster)
- `common-peroneal-nerve` (hip-fracture / LE trauma cluster)

## Cross-neighborhood bridge examples

| Recon neighborhood | Trauma / peer bridges |
|--------------------|-----------------------|
| Hip Osteoarthritis | femoral-neck-fracture, intertrochanteric-fracture, subtrochanteric-fracture |
| Periprosthetic Femur Fracture | femoral-shaft-fracture, total-hip-arthroplasty |
| Periprosthetic Knee Fracture | distal-femur-fracture, tibial-shaft-fracture |
| PJI (hip/knee/principles) | compartment-syndrome |
| Implant Fixation Principles | tibial-shaft-fracture (IM nail concepts) |
| Femoral Neck (Adult Recon) | femoral-neck-fracture (trauma neighborhood) |

## Per-neighborhood reuse matrix

| Neighborhood | Recon shared | Hip trauma | LE trauma | Implant hub |
|--------------|:------------:|:----------:|:---------:|:-----------:|
| Hip Osteoarthritis | owner | ref | ref | ref |
  - Skipped 32 duplicate entity insert(s)
| Femoral Neck Fracture (Adult Recon Perspective) | ref | ref | ref | ref |
  - Skipped 55 duplicate entity insert(s)
| Periprosthetic Femur Fracture | ref | ref | ref | ref |
  - Skipped 63 duplicate entity insert(s)
| Hip Prosthetic Joint Infection | ref | ref | ref | ref |
  - Skipped 63 duplicate entity insert(s)
| Aseptic Loosening of THA | ref | ref | ref | ref |
  - Skipped 64 duplicate entity insert(s)
| Hip Instability After THA | ref | ref | ref | ref |
  - Skipped 66 duplicate entity insert(s)
| Polyethylene Wear and Osteolysis | ref | ref | ref | ref |
  - Skipped 63 duplicate entity insert(s)
| Adverse Local Tissue Reaction (Metal Reaction) | ref | ref | ref | ref |
  - Skipped 66 duplicate entity insert(s)
| Knee Osteoarthritis | ref | ref | ref | ref |
  - Skipped 65 duplicate entity insert(s)
| Periprosthetic Knee Fracture | ref | ref | ref | ref |
  - Skipped 63 duplicate entity insert(s)
| Knee Prosthetic Joint Infection | ref | ref | ref | ref |
  - Skipped 62 duplicate entity insert(s)
| Aseptic Loosening of TKA | ref | ref | ref | ref |
  - Skipped 65 duplicate entity insert(s)
| Knee Instability After TKA | ref | ref | ref | ref |
  - Skipped 65 duplicate entity insert(s)
| Extensor Mechanism Failure | ref | ref | ref | ref |
  - Skipped 63 duplicate entity insert(s)
| Patellofemoral Arthroplasty | ref | ref | ref | ref |
  - Skipped 64 duplicate entity insert(s)
| Unicompartmental Knee Arthritis | ref | ref | ref | ref |
  - Skipped 64 duplicate entity insert(s)
| Periprosthetic Joint Infection | ref | ref | ref | ref |
  - Skipped 61 duplicate entity insert(s)
| Bone Loss in Revision Arthroplasty | ref | ref | ref | ref |
  - Skipped 66 duplicate entity insert(s)
| Implant Fixation Principles | ref | ref | ref | ref |
  - Skipped 66 duplicate entity insert(s)
| Bearing Surface Selection | ref | ref | ref | ref |
  - Skipped 65 duplicate entity insert(s)

## Staging apply deduplication signals

### Hip Osteoarthritis

Skipped 32 duplicate entity insert(s) (shared slug reuse).

- entity exists: femoral-shaft-fracture
- entity exists: tibial-shaft-fracture
- entity exists: subtrochanteric-fracture
- entity exists: femoral-neck
- entity exists: hip-joint
- entity exists: hip-prosthetic-joint-infection
- …and 26 more

### Femoral Neck Fracture (Adult Recon Perspective)

Skipped 55 duplicate entity insert(s) (shared slug reuse).

- entity exists: femoral-neck-fracture-adult-recon
- entity exists: subtrochanteric-fracture
- entity exists: displaced-femoral-neck-fracture
- entity exists: proximal-femur
- entity exists: femoral-condyles
- entity exists: polyethylene-liner
- …and 49 more

### Periprosthetic Femur Fracture

Skipped 63 duplicate entity insert(s) (shared slug reuse).

- entity exists: acetabular-component
- entity exists: popliteal-artery
- entity exists: polyethylene-liner
- entity exists: proximal-femur
- entity exists: distal-femur-fracture
- entity exists: cement-mantle
- …and 57 more

### Hip Prosthetic Joint Infection

Skipped 63 duplicate entity insert(s) (shared slug reuse).

- entity exists: tibial-plateau
- entity exists: knee-prosthetic-joint-infection
- entity exists: hip-prosthetic-joint-infection
- entity exists: knee-osteoarthritis
- entity exists: adult-reconstruction-anatomy-hub
- entity exists: pelvis
- …and 57 more

### Aseptic Loosening of THA

Skipped 64 duplicate entity insert(s) (shared slug reuse).

- entity exists: femoral-shaft-fracture
- entity exists: tibial-plateau
- entity exists: hip-prosthetic-joint-infection
- entity exists: bearing-surface-selection
- entity exists: aseptic-loosening-tha
- entity exists: periprosthetic-radiolucency
- …and 58 more

### Hip Instability After THA

Skipped 66 duplicate entity insert(s) (shared slug reuse).

- entity exists: intertrochanteric-fracture
- entity exists: tibial-plateau
- entity exists: patellar-tendon
- entity exists: cement-mantle
- entity exists: femoral-shaft-fracture
- entity exists: hip-instability-after-tha
- …and 60 more

### Polyethylene Wear and Osteolysis

Skipped 63 duplicate entity insert(s) (shared slug reuse).

- entity exists: pelvis
- entity exists: gluteus-medius
- entity exists: short-external-rotators
- entity exists: femoral-condyles
- entity exists: femoral-component
- entity exists: acetabular-component
- …and 57 more

### Adverse Local Tissue Reaction (Metal Reaction)

Skipped 66 duplicate entity insert(s) (shared slug reuse).

- entity exists: knee-prosthetic-joint-infection
- entity exists: pseudotumor-mom
- entity exists: tibial-shaft-fracture
- entity exists: lesser-trochanter
- entity exists: sciatic-nerve
- entity exists: femoral-shaft-fracture
- …and 60 more

### Knee Osteoarthritis

Skipped 65 duplicate entity insert(s) (shared slug reuse).

- entity exists: knee-prosthetic-joint-infection
- entity exists: intertrochanteric-fracture
- entity exists: tibial-plateau
- entity exists: acetabular-component
- entity exists: patella
- entity exists: compartment-syndrome
- …and 59 more

### Periprosthetic Knee Fracture

Skipped 63 duplicate entity insert(s) (shared slug reuse).

- entity exists: patellar-component
- entity exists: knee-prosthetic-joint-infection
- entity exists: intertrochanteric-fracture
- entity exists: tibial-plateau
- entity exists: tibia
- entity exists: acetabular-component
- …and 57 more

### Knee Prosthetic Joint Infection

Skipped 62 duplicate entity insert(s) (shared slug reuse).

- entity exists: distal-femur
- entity exists: common-peroneal-nerve
- entity exists: distal-femur-fracture
- entity exists: bearing-surface-selection
- entity exists: knee-prosthetic-joint-infection
- entity exists: intertrochanteric-fracture
- …and 56 more

### Aseptic Loosening of TKA

Skipped 65 duplicate entity insert(s) (shared slug reuse).

- entity exists: cruciate-ligaments
- entity exists: cemented-fixation
- entity exists: proximal-femur-anatomy-hub
- entity exists: femoral-diaphysis
- entity exists: tibial-shaft-fracture
- entity exists: compartment-syndrome
- …and 59 more

### Knee Instability After TKA

Skipped 65 duplicate entity insert(s) (shared slug reuse).

- entity exists: tibial-baseplate
- entity exists: intertrochanteric-fracture
- entity exists: polyethylene-liner
- entity exists: proximal-femur-anatomy-hub
- entity exists: femoral-diaphysis
- entity exists: tibial-shaft-fracture
- …and 59 more

### Extensor Mechanism Failure

Skipped 63 duplicate entity insert(s) (shared slug reuse).

- entity exists: patellar-tendon
- entity exists: implant-concepts-hub
- entity exists: intertrochanteric-fracture
- entity exists: femoral-neck
- entity exists: polyethylene-liner
- entity exists: common-peroneal-nerve
- …and 57 more

### Patellofemoral Arthroplasty

Skipped 64 duplicate entity insert(s) (shared slug reuse).

- entity exists: hip-capsule
- entity exists: femoral-component
- entity exists: patella
- entity exists: intertrochanteric-fracture
- entity exists: knee-osteoarthritis
- entity exists: unicompartmental-knee-arthroplasty
- …and 58 more

### Unicompartmental Knee Arthritis

Skipped 64 duplicate entity insert(s) (shared slug reuse).

- entity exists: intertrochanteric-fracture
- entity exists: revision-arthroplasty
- entity exists: extensor-mechanism
- entity exists: subtrochanteric-fracture
- entity exists: collateral-ligaments
- entity exists: femoral-condyles
- …and 58 more

### Periprosthetic Joint Infection

Skipped 61 duplicate entity insert(s) (shared slug reuse).

- entity exists: biofilm-concept
- entity exists: intertrochanteric-fracture
- entity exists: revision-arthroplasty
- entity exists: extensor-mechanism
- entity exists: subtrochanteric-fracture
- entity exists: polyethylene-liner
- …and 55 more

### Bone Loss in Revision Arthroplasty

Skipped 66 duplicate entity insert(s) (shared slug reuse).

- entity exists: intertrochanteric-fracture
- entity exists: adult-reconstruction-anatomy-hub
- entity exists: extensor-mechanism
- entity exists: common-peroneal-nerve
- entity exists: subtrochanteric-fracture
- entity exists: revision-arthroplasty
- …and 60 more

### Implant Fixation Principles

Skipped 66 duplicate entity insert(s) (shared slug reuse).

- entity exists: intertrochanteric-fracture
- entity exists: extensor-mechanism
- entity exists: subtrochanteric-fracture
- entity exists: adult-reconstruction-anatomy-hub
- entity exists: collateral-ligaments
- entity exists: short-external-rotators
- …and 60 more

### Bearing Surface Selection

Skipped 65 duplicate entity insert(s) (shared slug reuse).

- entity exists: adult-reconstruction-anatomy-hub
- entity exists: pelvis
- entity exists: hip-capsule
- entity exists: polyethylene-liner
- entity exists: greater-trochanter
- entity exists: intertrochanteric-fracture
- …and 59 more

