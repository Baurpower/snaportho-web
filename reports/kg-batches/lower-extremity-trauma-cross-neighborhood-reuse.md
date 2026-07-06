# Lower Extremity Trauma Cluster — Cross-Neighborhood Reuse

Generated: 2026-07-05T22:52:03.890Z

## LE cluster shared anatomy (owned)

Owner pilot: `pelvic-ring-injury-neighborhood` (`lower-extremity-trauma-cluster-shared`).
Sibling pilots emit reference proposals; staging apply skips `entity exists` for these slugs.

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

## Hip fracture cluster reuse (not re-created)

Acetabular and femoral shaft neighborhoods reference hip cluster slugs via `sharedHipAnatomyForLeSibling`:

- `proximal-femur-anatomy-hub` (owner: hip-fracture-cluster-shared)
- `femoral-head` (owner: hip-fracture-cluster-shared)
- `femoral-neck` (owner: hip-fracture-cluster-shared)
- `intertrochanteric-region` (owner: hip-fracture-cluster-shared)
- `lesser-trochanter` (owner: hip-fracture-cluster-shared)
- `greater-trochanter` (owner: hip-fracture-cluster-shared)
- `calcar` (owner: hip-fracture-cluster-shared)
- `medial-femoral-circumflex-artery` (owner: hip-fracture-cluster-shared)
- `sciatic-nerve` (owner: hip-fracture-cluster-shared)
- `hip-joint` (owner: hip-fracture-cluster-shared)

## Tibial shaft / leg anatomy reuse (not re-created)

Tibial plateau and pilon neighborhoods reference tibial-shaft-fracture pilot leg slugs:

- `tibial-shaft` (owner: tibial-shaft-fracture-neighborhood)
- `fibula` (owner: tibial-shaft-fracture-neighborhood)
- `leg-compartment-complex` (owner: tibial-shaft-fracture-neighborhood)
- `anterior-compartment` (owner: tibial-shaft-fracture-neighborhood)

## Per-neighborhood reuse matrix

| Neighborhood | LE shared | Hip shared | Leg shared |
|--------------|:---------:|:----------:|:----------:|
| Pelvic Ring Injury | owner | — | — |
| Acetabular Fracture | ref | ref | — |
| Femoral Shaft Fracture | ref | ref | — |
| Distal Femur Fracture | ref | — | — |
| Patella Fracture | ref | — | — |
| Tibial Plateau Fracture | ref | — | ref |
| Pilon Fracture | ref | — | ref |
| Calcaneus Fracture | ref | — | — |
| Talus Fracture | ref | — | — |
| Lisfranc Injury | ref | — | — |

## Staging apply deduplication signals

### Pelvic Ring Injury

Skipped 6 duplicate entity insert(s) (shared slug reuse).

- entity exists: pelvic-binder-application
- entity exists: pelvic-ring-injury
- entity exists: young-burgess-classification
- entity exists: pelvic-external-fixation
- entity exists: pelvic-hemorrhage
- entity exists: unstable-pelvic-ring-pattern
### Acetabular Fracture

Skipped 37 duplicate entity insert(s) (shared slug reuse).

- entity exists: calcar
- entity exists: pelvis
- entity exists: sciatic-nerve
- entity exists: proximal-femur-anatomy-hub
- entity exists: intertrochanteric-region
- entity exists: femoral-head
- …and 31 more

### Femoral Shaft Fracture

Skipped 38 duplicate entity insert(s) (shared slug reuse).

- entity exists: calcar
- entity exists: pelvis
- entity exists: sciatic-nerve
- entity exists: proximal-femur-anatomy-hub
- entity exists: intertrochanteric-region
- entity exists: femoral-head
- …and 32 more

### Distal Femur Fracture

Skipped 26 duplicate entity insert(s) (shared slug reuse).

- entity exists: sacrum
- entity exists: sacroiliac-joint
- entity exists: common-peroneal-nerve
- entity exists: popliteal-artery
- entity exists: calcaneus
- entity exists: plantar-soft-tissues
- …and 20 more

### Patella Fracture

Skipped 27 duplicate entity insert(s) (shared slug reuse).

- entity exists: common-peroneal-nerve
- entity exists: patella-baja
- entity exists: subtalar-joint
- entity exists: talus
- entity exists: pelvis
- entity exists: calcaneus
- …and 21 more

### Tibial Plateau Fracture

Skipped 21 duplicate entity insert(s) (shared slug reuse).

- entity exists: plantar-soft-tissues
- entity exists: bicondylar-tibial-plateau-fracture
- entity exists: pubic-symphysis
- entity exists: sacrum
- entity exists: sacroiliac-joint
- entity exists: iliac-wing
- …and 15 more

### Pilon Fracture

Skipped 31 duplicate entity insert(s) (shared slug reuse).

- entity exists: sacrum
- entity exists: pubic-symphysis
- entity exists: iliac-wing
- entity exists: tibial-plateau
- entity exists: calcaneus
- entity exists: patella
- …and 25 more

### Calcaneus Fracture

Skipped 27 duplicate entity insert(s) (shared slug reuse).

- entity exists: tibial-plateau
- entity exists: pelvis
- entity exists: iliac-wing
- entity exists: acetabulum
- entity exists: pcl
- entity exists: subtalar-joint
- …and 21 more

### Talus Fracture

Skipped 27 duplicate entity insert(s) (shared slug reuse).

- entity exists: talus-fracture
- entity exists: tibial-plateau
- entity exists: calcaneus
- entity exists: subtalar-joint
- entity exists: lower-extremity-trauma-anatomy-hub
- entity exists: extensor-mechanism
- …and 21 more

### Lisfranc Injury

Skipped 16 duplicate entity insert(s) (shared slug reuse).

- entity exists: tibial-plateau
- entity exists: calcaneus
- entity exists: lisfranc-injury
- entity exists: lisfranc-orif
- entity exists: lisfranc-chronic-instability
- entity exists: iliac-wing
- …and 10 more

