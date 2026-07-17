# Surgical Approaches — Staging Apply Report

Manufactured: 2026-07-08

## Persistence stage

- Proposal table available: **yes**
- Inserted: 1106
- Updated: 49
- Skipped: 0
- Errors: 0
- Raw result: `reports/kg-pilots/surgical-approaches-persist-result.json`

All 1155 proposals are active in staging with curated review status.

## Guarded apply (`KG_TARGET_ENV=staging`)

- Staging guard: allowed
- Approved proposals loaded: 1000 (apply loader capped / page; 1111 auto-approved in curation)
- Entities applied: **134**
- Relationships applied: **817**
- Curriculum bridges applied: 0
- Claims inserted as draft: 0
- Decision points inserted as draft: 0
- Claims inserted as verified: **0**
- Decision points inserted as verified: **0**
- Proposals marked applied: 1000
- Skipped: 49
- Errors: 0

Skip reasons (duplicate prevention):

- Existing anatomy identities reused (nerves, intervals, joints, safe zones)
- Existing complication identities reused from Complications backbone
- Curriculum node not found: `surgical-approaches` (if present among skips)

Full machine result: `reports/kg-pilots/surgical-approaches-staging-apply-result.json`

No claim or decision point leaked into a verified state. Approach-selection and
anatomy-at-risk safety decisions remain in human/attending review queues.
