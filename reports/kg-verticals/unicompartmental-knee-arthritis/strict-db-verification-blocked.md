# Unicompartmental Knee Arthritis — Strict Database Verification Blocked

Run date: 2026-07-16. Prior state: `staging_applied`; resulting state: `database_verification_blocked`.

The exact legacy apply membership was reconstructed from 71 recorded structural fingerprints. Database fallback was disabled. 2 staging-integrity discrepancy(s) prevented membership repair and strict audit.

## Discrepancies

- `create|anatomy_structure|labrum`: canonical_identity_mismatch; expected anatomy_structure/Acetabular Labrum; observed anatomy_structure/Glenoid Labrum.
- `bridge|adult-recon-unicompartmental-knee|unicompartmental-knee-arthritis`: bridge_endpoint_cardinality; expected one curriculum node adult-recon-unicompartmental-knee and one entity unicompartmental-knee-arthritis; observed 0 node(s), 1 entity row(s).

Automatic repair attempted: no. Exact next action: `resolve_canonical_identity`.
