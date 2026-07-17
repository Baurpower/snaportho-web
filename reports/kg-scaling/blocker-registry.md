# Knowledge Graph Blocker Registry

Generated: 2026-07-16T03:52:39.397Z

Normalized blocker classes: 11. Database-verification-blocked neighborhoods: 15. Publication-blocked neighborhoods: 20.

| Rank | Blocker ID | Class | Affected | Immediate DB unlocks | Publication unlocks | Human | Attending | Schema | Difficulty | Status | ROI |
|---:|---|---|---:|---:|---:|---|---|---|---|---|---:|
| 1 | CURRICULUM_BRIDGE_NODE_MISSING | bridge | 14 | 8 | 0 | yes | no | no | moderate | ready_for_review | 79 |
| 2 | PUBLICATION_ATTENDING_REVIEW_PENDING | publication | 20 | 0 | 0 | yes | yes | no | major | ready_for_review | 70 |
| 3 | PUBLICATION_CLINICAL_REVIEW_PENDING | publication | 20 | 0 | 0 | yes | no | no | major | ready_for_review | 70 |
| 4 | PUBLICATION_RECORD_LEVEL_PROVENANCE_GAP | publication | 8 | 0 | 0 | yes | no | no | moderate | ready_for_review | 25 |
| 5 | LABRUM_NAMESPACE_COLLISION | identity | 6 | 0 | 0 | yes | no | no | moderate | ready_for_review | 15 |
| 6 | AGGREGATE_APPLY_PROVENANCE_GAP | provenance | 1 | 0 | 0 | yes | no | no | moderate | ready_for_review | -10 |
| 7 | POLYETHYLENE_CONDITION_PROCEDURE_OWNERSHIP_MISMATCH | ownership | 1 | 0 | 0 | yes | no | no | moderate | ready_for_review | -10 |
| 8 | HIP_OA_RELATIONSHIP_APPLY_GAP | staging_integrity | 1 | 1 | 0 | yes | no | no | major | ready_for_review | -22 |
| 9 | PUBLICATION_DATABASE_STATE_STALE | publication | 20 | 0 | 0 | no | no | no | small | resolved | 95 |
| 10 | EXTENSOR_MECHANISM_PROPOSAL_DRIFT | identity | 14 | 7 | 0 | no | no | no | small | resolved | 86 |
| 11 | AC_JOINT_PROPOSAL_DRIFT | identity | 1 | 0 | 0 | no | no | no | small | resolved | 0 |

## Resolution summaries

### CURRICULUM_BRIDGE_NODE_MISSING

An applied curriculum bridge references a curriculum-node slug that does not exist, leaving the proposal marked applied without a canonical bridge result.

Affected neighborhoods (14): `boxer-fracture`, `femoral-neck-fracture-adult-recon`, `hip-prosthetic-joint-infection`, `knee-instability-after-tka`, `knee-osteoarthritis`, `knee-prosthetic-joint-infection`, `lt-ligament-injury`, `middle-phalanx-fracture`, `patellofemoral-arthroplasty`, `periprosthetic-femur-fracture`, `periprosthetic-joint-infection`, `periprosthetic-knee-fracture`, `polyethylene-wear-osteolysis`, `unicompartmental-knee-arthritis`.

Proposed resolution: Adjudicate whether each missing slug should map to an existing curriculum node or whether the bridge proposal must be rejected; create no curriculum nodes from proposal metadata alone.

### PUBLICATION_ATTENDING_REVIEW_PENDING

Database-verified neighborhoods retain unresolved attending decisions for publication-sensitive objects.

Affected neighborhoods (20): `acetabular-fracture`, `adverse-local-tissue-reaction`, `aseptic-loosening-tha`, `aseptic-loosening-tka`, `bearing-surface-selection`, `bone-loss-revision-arthroplasty`, `calcaneus-fracture`, `carpal-tunnel-syndrome`, `clavicle-fracture`, `compartment-syndrome`, `distal-femur-fracture`, `extensor-mechanism-failure`, `femoral-shaft-fracture`, `hip-instability-after-tha`, `implant-fixation-principles`, `lisfranc-injury`, `patella-fracture`, `pilon-fracture`, `proximal-humerus-fracture`, `talus-fracture`.

Proposed resolution: Consume explicit attending decisions through the existing post-review workflow.

### PUBLICATION_CLINICAL_REVIEW_PENDING

Database-verified neighborhoods retain unresolved clinical-curator decisions.

Affected neighborhoods (20): `acetabular-fracture`, `adverse-local-tissue-reaction`, `aseptic-loosening-tha`, `aseptic-loosening-tka`, `bearing-surface-selection`, `bone-loss-revision-arthroplasty`, `calcaneus-fracture`, `carpal-tunnel-syndrome`, `clavicle-fracture`, `compartment-syndrome`, `distal-femur-fracture`, `extensor-mechanism-failure`, `femoral-shaft-fracture`, `hip-instability-after-tha`, `implant-fixation-principles`, `lisfranc-injury`, `patella-fracture`, `pilon-fracture`, `proximal-humerus-fracture`, `talus-fracture`.

Proposed resolution: Consume explicit clinical-curator decisions through the existing review workflow; do not infer or inherit clinically distinct decisions.

### PUBLICATION_RECORD_LEVEL_PROVENANCE_GAP

Publication objects have source metadata and structural signals but no record-level source attachment.

Affected neighborhoods (8): `adverse-local-tissue-reaction`, `aseptic-loosening-tha`, `aseptic-loosening-tka`, `bearing-surface-selection`, `bone-loss-revision-arthroplasty`, `extensor-mechanism-failure`, `hip-instability-after-tha`, `implant-fixation-principles`.

Proposed resolution: Attach record-level sources to every proposed publication object and preserve the existing approved-only publication gate.

### LABRUM_NAMESPACE_COLLISION

The shared slug labrum is used for both Acetabular Labrum and Glenoid Labrum, which are clinically distinct anatomy structures.

Affected neighborhoods (6): `knee-instability-after-tka`, `knee-osteoarthritis`, `patellofemoral-arthroplasty`, `periprosthetic-femur-fracture`, `polyethylene-wear-osteolysis`, `unicompartmental-knee-arthritis`.

Proposed resolution: Split the namespace into explicit acetabular-labrum and glenoid-labrum identities, then retarget only evidence-backed neighborhood memberships and relationships.

### AGGREGATE_APPLY_PROVENANCE_GAP

Legacy apply reports record created structural objects only as aggregate counts, so exact proposal-to-canonical membership cannot be reconstructed from the report alone.

Affected neighborhoods (1): `polyethylene-wear-osteolysis`.

Proposed resolution: The exact reconstruction unlocked the two one-to-one cases. The remaining Polyethylene packet has ten unique unrecorded structural fingerprints against nine aggregate-created objects, so a provenance reviewer must adjudicate the extra entity before membership repair.

### POLYETHYLENE_CONDITION_PROCEDURE_OWNERSHIP_MISMATCH

The blocked packet expects Polyethylene Wear and Osteolysis as a condition while the active canonical row uses the same slug as a procedure.

Affected neighborhoods (1): `polyethylene-wear-osteolysis`.

Proposed resolution: Adjudicate condition versus procedure ownership and split identities if both concepts are required; do not relabel the active canonical row automatically.

### HIP_OA_RELATIONSHIP_APPLY_GAP

Hip Osteoarthritis proposals were marked applied while 27 expected canonical relationship triples are absent.

Affected neighborhoods (1): `hip-osteoarthritis`.

Proposed resolution: Reconcile each applied proposal outcome against canonical state; do not recreate clinical edges until identity and predicate intent are confirmed.

### PUBLICATION_DATABASE_STATE_STALE

Publication audits still report that approved canonical entities are absent even though strict database verification succeeded.

Affected neighborhoods (20): `acetabular-fracture`, `adverse-local-tissue-reaction`, `aseptic-loosening-tha`, `aseptic-loosening-tka`, `bearing-surface-selection`, `bone-loss-revision-arthroplasty`, `calcaneus-fracture`, `carpal-tunnel-syndrome`, `clavicle-fracture`, `compartment-syndrome`, `distal-femur-fracture`, `extensor-mechanism-failure`, `femoral-shaft-fracture`, `hip-instability-after-tha`, `implant-fixation-principles`, `lisfranc-injury`, `patella-fracture`, `pilon-fracture`, `proximal-humerus-fracture`, `talus-fracture`.

Proposed resolution: Regenerate publication readiness from the verified database-backed membership snapshot; do not relax any human, attending, provenance, claim, or decision-point gate.

### EXTENSOR_MECHANISM_PROPOSAL_DRIFT

The active semantic proposal says Extensor Mechanism while the applied packets and canonical entity say Knee Extensor Mechanism for the same slug and entity type.

Affected neighborhoods (14): `acetabular-fracture`, `calcaneus-fracture`, `distal-femur-fracture`, `femoral-shaft-fracture`, `knee-instability-after-tka`, `knee-osteoarthritis`, `patella-fracture`, `patellofemoral-arthroplasty`, `periprosthetic-femur-fracture`, `periprosthetic-knee-fracture`, `pilon-fracture`, `polyethylene-wear-osteolysis`, `talus-fracture`, `unicompartmental-knee-arthritis`.

Proposed resolution: Confirm one active canonical target and knee-specific relationship context, then normalize the stale active proposal label to the canonical preferred label without merging or changing the canonical entity.

### AC_JOINT_PROPOSAL_DRIFT

The active semantic proposal says Ac Joint while the blocked packet expects Acromioclavicular Joint for slug ac-joint.

Affected neighborhoods (1): `proximal-humerus-fracture`.

Proposed resolution: Verify canonical identity and relationship context, then normalize stale proposal label metadata if it is the same entity.

