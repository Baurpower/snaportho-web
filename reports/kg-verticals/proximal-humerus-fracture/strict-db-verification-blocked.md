# Proximal Humerus Fracture — Strict Database Verification Blocked

Run date: 2026-07-16. Prior state: `staging_applied`; resulting state: `database_verification_blocked`.

The exact legacy apply membership was reconstructed from 57 recorded structural fingerprints. Database fallback was disabled. 2 staging-integrity discrepancy(s) prevented membership repair and strict audit.

## Discrepancies

- `apply-report`: unreconstructable_created_structural_membership; expected fingerprint-level outcomes for every created structural object; observed 6 created structural object(s) recorded only as aggregate counts.
- `create|anatomy_structure|ac-joint`: competing_semantic_identity; expected {"label":"Acromioclavicular Joint","proposal_type":"create_canonical_entity","proposed_bridge_type":null,"proposed_entity_type":"anatomy_structure","proposed_predicate":null,"slug":"ac-joint","source_signal_type":"reference_import"}; observed {"label":"Ac Joint","proposal_type":"create_canonical_entity","proposed_bridge_type":null,"proposed_entity_type":"anatomy_structure","proposed_predicate":null,"slug":"ac-joint","source_signal_type":"reference_import"}.

Automatic repair attempted: no. Exact next action: `resolve_canonical_identity`.
