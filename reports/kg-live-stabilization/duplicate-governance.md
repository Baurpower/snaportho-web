# Duplicate Governance Backlog (Phase J)

Method: exact normalized-label match + trigram≥0.80 fuzzy scan over the live
1,295-entity index (stable since Sep 26), adjudicated pairwise. Usage =
live claims (`primary_entity_id`, n=2,113) + live canonical-card links
(n=8,800). Aliases column: 0 everywhere (no alias table live). Release usage:
not queryable via REST (no release-membership endpoint); canonical-card links
are the closest proxy. All merge recommendations are HUMAN-LED (no auto-merge);
each needs reference retargeting (claims + cards), never bare delete.

## Priority 1 — exact/singular-plural duplicates (16 pairs, all approved/trusted)

| Survivor (claims/cards) | Retire (claims/cards) | Note |
|---|---|---|
| ORIF `7d8332ef` (0/69) | ORIF `cde42d55` (0/0) | exact dup; clean retire, zero references |
| Femoral Shaft Fracture `39f7a246` (14/33) | …Fractures `cce83fe1` (12/33) | prefer singular (matches Open Fracture precedent) |
| Tibial Plateau Fracture `abecba31` (7/20) | …Fractures `0942c1e1` (3/18) | |
| Ankle Fracture `def42a4b` (5/13) | …Fractures `f48b9bf4` (3/14) | |
| Tibial Shaft Fracture `42c31eeb` (4/18) | …Fractures `9cb7212c` (11/16) | |
| Humeral Shaft Fracture `839a6bfc` (9/13) | …Fractures `80fbba5b` (3/11) | |
| Femoral Neck Fracture `e21f56e9` (8/27) | …Fractures `bc603e59` (8/15) | |
| Acetabular Fracture `5ac4182a` (3/8) | …Fractures `111d682a` (3/27) | |
| Calcaneus Fracture `4abafffb` (8/17) | …Fractures `680e574f` (5/13) | |
| Subtrochanteric Fracture `3ff1653b` (2/5) | …Fractures `5a1ccb7d` (1/11) | |
| Talar Neck Fracture `ba523503` (4/10) imaging_finding | …Fractures `14b9ba3f` (3/14) condition | MERGE + TYPE RULING (condition; fracture, not finding) |
| Intertrochanteric Fracture `d64ea229` (1/3) | …Fractures `41f5a1c2` (1/10) | |
| Rotator Cuff Tear `51cc7686` (5/10) | …Tears `c1b84eb7` (3/16) | |
| Distal Humerus Fracture `f6bed51e` (5/53) | …Fractures `a8de29a3` (5/11) | |
| Distal Femur Fracture `e12358e3` (6/32) | …Fractures `34279d5e` (3/11) | |
| Distal Radius Fracture `c9095783` (10/23) | …Fractures `3920e40c` (1/1) | |

Root cause: the apply-time dedup key folds case/punctuation but NOT
plurals, so singular+plural variants double-promoted. Fix: add plural-folding
to the dedup key (with the existing -sis/-lis guards) before any batch
promote. Every pair above is dual-referenced — merges must retarget
claim primaries + card links to the survivor.

## Priority 2 — compartment duplicates (3 pairs, all approved)

- Deep Posterior Compartment `fe5a6bf7` × Deep Posterior Compartment of the
  Leg `3d4ad272` (usage: pull at merge time; both referenced).
- Anterior Compartment `123480ce` × Anterior Compartment of the Leg `9cb246ce`.
- Lateral Compartment `4290ac19` × Lateral Compartment of the Leg `44a846ca`.
- (Superficial Posterior Compartment `f3ef0b57` has no "of the Leg" twin.)
- Recommend surviving the SHORT form (matches live alias targets:
  "Deep posterior"→`fe5a6bf7`) with the long form as alias.

## Priority 3 — joint-sense split (MCL/LCL)

- Medial Collateral Ligament `6ae60b9d` (joint-ambiguous; knee + elbow claims);
  Lateral Collateral Ligament `3104da27` (same); elbow already has specific
  Ulnar Collateral Ligament `c9bc0ccf` + Radial Collateral Ligament `474c54ba`
  plus a UCL Injury family. Bare "Collateral Ligaments" `a39bf748` also exists.
- Options: (a) joint-qualified children (…(Knee)/…(Elbow)) + keep ambiguous
  parent for legacy refs; (b) split + migrate refs. Needs ontology owner
  ruling; do NOT alias elbow MCL claims to knee-specific targets in the
  meantime (current ambiguous alias upheld as the safe interim).

## Audited and CLEARED (similar but distinct — keep both)

- PCL/UCL injury families (7 parallel pairs ≥0.88 — distinct ligaments).
- Perilunate vs Lunate (dislocation classification/procedure pairs).
- Weight-Bearing vs Non-Weight-Bearing Radiographs (antonym — must never merge).
- SL vs LT Ligament imaging findings; Aseptic Loosening THA vs TKA.
- Hip/Knee PJI + parent PJI; Hip/Knee I&D + parent I&D; Leg vs generic
  Compartment Syndrome; Post-traumatic Ankle Arthritis vs Arthritis;
  Focal vs generic Periprosthetic Osteolysis (hyponym hierarchies — keep,
  consider explicit parent links later, not now).
- Carpal Tunnel Approach vs Open Carpal Tunnel Approach: near-dup, keep
  pending surgeon ruling (open may be the default approach).

## Sequencing

P1 (16) + P2 (3) merges unblock alias-apply correctness (ORIF retarget in
slice 2 depends on the ORIF merge). P3 needs the ontology ruling first.
Total backlog: 19 merges + 1 split + 1 type ruling (Talar Neck).
