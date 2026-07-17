# Tibial Shaft Fracture — Ledger and Prior-State Report

Generated: 2026-07-15 (America/Los_Angeles)

- Registered topic: `tibial-shaft-fracture`
- Canonical neighborhood: `tibial-shaft-fracture-neighborhood`
- Primary canonical entity: `tibial-shaft-fracture`
- Starting state: applied to staging previously, but review pending and publication blocked
- Trustworthy resume source: canonical database snapshot plus existing proposal/review history
- Database snapshot: 12 entities, 19 relationships, 5 draft claims, 0 decision points, 36 proposals, 25 approved proposals
- Prior staging evidence: canonical rows carry `staging_apply: true` and July 5 staging metadata; this run did not repeat the write
- Current database identity discrepancy: the primary entity row is tagged to `compartment-syndrome-neighborhood`, while the registered canonical owner is `tibial-shaft-fracture-neighborhood`; this requires identity/ownership review rather than a silent rewrite
- Reused cross-neighborhood identities: `anterior-compartment` and `leg-compartment-complex` from compartment syndrome; existing canonical tibial/fibular anatomy and complications were resolved from the database
- Backbone dependencies: trauma fundamentals, compartment syndrome, imaging/radiographic measurements, implants/instruments, complications, postoperative protocols
- Highest valid current state after this run: report-only finalized; database-backed audit complete; not staging-ready; publication blocked

## Artifacts resumed or refreshed

- Evidence: `reports/kg-evidence/tibial-shaft-fracture/`
- Compiler and agent execution: `reports/kg-compiler/tibial-shaft-fracture/`
- Human review queue and proposal dry run: `reports/kg-pilots/tibial-shaft-fracture-*`
- Finalization: `reports/kg-finalization/tibial-shaft-fracture/`
- Database-backed QA: `reports/kg-audits/tibial-shaft-fracture/`

## Exact next action

Complete the 10-item human/attending review queue, export decisions through the supported review overlay, correct the invalid `tibial-shaft-fracture uses_fixation im-nail-fixation` triple, and add lifecycle traceability to the three inherited `part_of leg-compartment-complex` relationships. Then rerun finalization; only if it reports zero staging blockers should a new proposal packet and guarded staging apply be attempted.
