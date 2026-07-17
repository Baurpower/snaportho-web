# LT Ligament Injury — Strict Database Verification Blocked

Run date: 2026-07-16. Prior state: `staging_applied`; resulting state: `database_verification_blocked`.

The exact legacy apply membership was reconstructed from 163 recorded structural fingerprints. Database fallback was disabled. 1 staging-integrity discrepancy(s) prevented membership repair and strict audit.

## Discrepancies

- `bridge|hand-lt-ligament-injury|lt-ligament-injury`: bridge_endpoint_cardinality; expected one curriculum node hand-lt-ligament-injury and one entity lt-ligament-injury; observed 0 node(s), 1 entity row(s).

Automatic repair attempted: no. Exact next action: `restore_or_adjudicate_curriculum_node_bridge`.
