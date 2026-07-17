# Talus Fracture — Strict Database Verification Blocked

Run date: 2026-07-16. Prior state: `staging_applied`; resulting state: `database_verification_blocked`.

The exact legacy apply membership was reconstructed from 61 recorded structural fingerprints. Database fallback was disabled. 1 staging-integrity discrepancy(s) prevented membership repair and strict audit.

## Discrepancies

- `create|anatomy_structure|extensor-mechanism`: competing_semantic_identity; expected {"label":"Knee Extensor Mechanism","proposal_type":"create_canonical_entity","proposed_bridge_type":null,"proposed_entity_type":"anatomy_structure","proposed_predicate":null,"slug":"extensor-mechanism","source_signal_type":"reference_import"}; observed {"label":"Extensor Mechanism","proposal_type":"create_canonical_entity","proposed_bridge_type":null,"proposed_entity_type":"anatomy_structure","proposed_predicate":null,"slug":"extensor-mechanism","source_signal_type":"reference_import"}.

Automatic repair attempted: no. Exact next action: `resolve_canonical_identity`.
