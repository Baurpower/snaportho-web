# Complications — Staging Apply Report

Manufactured: 2026-07-08

## Persistence stage

- Proposal table available: **yes**
- Inserted: 31 (iteration 2 delta)
- Updated: 331
- Skipped: 0
- Errors: 0
- Raw result: `reports/kg-pilots/complications-persist-result.json`

Prior iteration also persisted the initial proposal set (282 inserted / 45
updated). All 362 proposals are active in staging with curated review status.

## Guarded apply (`KG_TARGET_ENV=staging`)

- Staging guard: allowed (`geznczcokbgybsseipjg`)
- Approved proposals loaded: 291
- Entities applied: **79**
- Relationships applied: **166**
- Curriculum bridges applied: 0
- Claims inserted as draft: 0
- Decision points inserted as draft: 0
- Claims inserted as verified: **0**
- Decision points inserted as verified: **0**
- Proposals marked applied: 291
- Skipped: 46
- Errors: 0

Skip reasons:

- Existing entity identities reused (duplicate prevention): majority of skips
- Existing relationships reused: open-fracture / fracture-related-infection edges
- Curriculum node not found: `orthopaedic-complications`

Full machine result: `reports/kg-pilots/complications-staging-apply-result.json`

No claim or decision point leaked into a verified state. Management-changing
and time-sensitive decision points remain in the human/attending review queues.
