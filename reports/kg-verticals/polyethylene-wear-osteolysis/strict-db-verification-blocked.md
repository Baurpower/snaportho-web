# Polyethylene Wear and Osteolysis — Strict Database Verification Blocked

Run date: 2026-07-16. Prior state: `staging_applied`; resulting state: `database_verification_blocked`.

The exact legacy apply membership was reconstructed from 64 recorded structural fingerprints. Database fallback was disabled. 5 staging-integrity discrepancy(s) prevented membership repair and strict audit.

## Discrepancies

- `apply-report`: aggregate_reconstruction_cardinality; expected {"byType":{"add_canonical_relationship":7,"create_canonical_entity":2,"link_curriculum_node_to_entity":0},"total":9}; observed {"byType":{"add_canonical_relationship":7,"create_canonical_entity":3,"link_curriculum_node_to_entity":0},"total":10,"uniqueFingerprints":10}.
- `apply-report`: unreconstructable_created_structural_membership; expected fingerprint-level outcomes for every created structural object; observed 9 created structural object(s) recorded only as aggregate counts.
- `create|condition|polyethylene-wear-osteolysis`: canonical_identity_mismatch; expected condition/Polyethylene Wear and Osteolysis; observed procedure/Polyethylene Wear Osteolysis.
- `create|anatomy_structure|labrum`: canonical_identity_mismatch; expected anatomy_structure/Acetabular Labrum; observed anatomy_structure/Glenoid Labrum.
- `bridge|adult-recon-polyethylene-wear|polyethylene-wear-osteolysis`: bridge_endpoint_cardinality; expected one curriculum node adult-recon-polyethylene-wear and one entity polyethylene-wear-osteolysis; observed 0 node(s), 1 entity row(s).

Automatic repair attempted: no. Exact next action: `resolve_canonical_identity`.
