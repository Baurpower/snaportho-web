# EXTENSOR_MECHANISM_PROPOSAL_DRIFT — Adjudication Packet

Generated: 2026-07-16

## Decision

Classify this blocker as historical proposal metadata drift, not a duplicate identity. Normalize the one active semantic proposal label from `Extensor Mechanism` to the canonical preferred label `Knee Extensor Mechanism`. Preserve the original label and resolution evidence in proposal metadata. Do not alter, merge, or recreate canonical entities.

## Canonical entities involved

- `extensor-mechanism` (`anatomy_structure`) — canonical preferred label `Knee Extensor Mechanism`; owner `lower-extremity-trauma-cluster-shared`; region `knee`; description identifies the quadriceps-patella-tibial tubercle linkage.
- `extensor-mechanism-disruption` (`complication`) and `extensor-mechanism-failure` (`condition`) are related but distinct concepts with different slugs and entity types. They are not merge candidates.

Exactly one active canonical row uses slug `extensor-mechanism`. Exactly one active semantic proposal uses fingerprint `create|anatomy_structure|extensor-mechanism`.

## Neighborhoods affected

Fourteen database-verification-blocked neighborhoods reference the stale proposal shape:

- `acetabular-fracture`
- `calcaneus-fracture`
- `distal-femur-fracture`
- `femoral-shaft-fracture`
- `knee-instability-after-tka`
- `knee-osteoarthritis`
- `patella-fracture`
- `patellofemoral-arthroplasty`
- `periprosthetic-femur-fracture`
- `periprosthetic-knee-fracture`
- `pilon-fracture`
- `polyethylene-wear-osteolysis`
- `talus-fracture`
- `unicompartmental-knee-arthritis`

Seven have no other known blocker and should become eligible for database verification immediately: Acetabular, Calcaneus, Distal Femur, Femoral Shaft, Patella, Pilon, and Talus Fracture.

## Ownership and history

Current canonical ownership is `lower-extremity-trauma-cluster-shared`. Thirty-eight current curated packets use `Knee Extensor Mechanism`. The only generic-label packet is the older `surgical-approaches` packet; its own metadata describes the “quadriceps-patella-tendon apparatus of the knee” and identifies `orthopaedic-anatomy` as its source neighborhood.

The active semantic proposal was auto-approved and applied from Surgical Approaches. Its migrated legacy batch membership lacks a canonical target ID. This is single-owner metadata drift caused by globally deduplicated proposal history, not conflicting clinical ownership.

## Relationship impact

Nine active incident relationships are knee-specific: patella membership, patella-fracture and patellar-instability anatomy links, lower-extremity anatomy ownership, extensor-mechanism-failure reuse, and medial parapatellar/subvastus/midvastus approach prerequisites. No hand or upper-extremity relationship uses this canonical row.

## Staging and publication impact

The stale proposal label blocks exact semantic membership reconstruction for 14 neighborhoods. The repair changes no canonical object or clinical relationship. It directly unlocks an estimated seven strict database reloads. Publication readiness does not change directly; every newly verified neighborhood remains subject to its existing clinical, attending, claim/decision-point, metadata, and provenance gates.

## Alternatives considered

- Create a second generic `extensor-mechanism` entity: rejected because the slug, entity type, canonical description, 38 packets, and all relationships resolve to the knee identity.
- Rename the canonical entity to the generic label: rejected because it would discard established knee specificity and increase ambiguity with upper-extremity extensor mechanisms.
- Add only an alias: insufficient because the active semantic proposal would still disagree with the canonical preferred label during exact membership reconstruction.
- Require clinical identity review: unnecessary for this metadata-only correction because no competing canonical row or clinically distinct packet meaning exists.

## Review role and expected unlock

- Required review role: none for the metadata normalization. Existing staging guard and deterministic identity proof are sufficient.
- Schema change: none.
- Expected blocker instances cleared: 14.
- Expected immediate `database_verified` gains: 7.
- Expected publication-ready gains: 0.

Evidence: `root-cause-investigation.json`, the affected strict verification reports, canonical database rows, proposal history, and batch membership history.
