# Tibial Shaft Fracture — Identity and Ownership Report

Generated: 2026-07-15 (America/Los_Angeles)

Canonical owner: `tibial-shaft-fracture-neighborhood`.

The database-backed compiler resolved 12 existing canonical entities rather than creating parallel identities. `anterior-compartment` and `leg-compartment-complex` are reused from the compartment-syndrome backbone. Tibial-shaft anatomy, fibula, tibial blood supply, IM nailing, segmental fracture pattern, and tibial complications were reused from canonical database rows.

Two identities remain below the automatic reuse threshold and require curator adjudication: `tibial-shaft` and `tibial-shaft-fracture`. The primary condition's existing database metadata attributes its pilot to `compartment-syndrome-neighborhood`, conflicting with the registered neighborhood owner; no ownership metadata was silently rewritten.

Classification and general imaging coverage remain absent or incomplete. Shared implant/fixation, complications, and compartment concepts should remain cross-neighborhood references rather than be duplicated locally.

See `ownership_map.json`, `reuse_map.json`, `alias_candidates.json`, `merge_candidates.json`, and `identity_escalations.json` in this directory for machine-readable results.
