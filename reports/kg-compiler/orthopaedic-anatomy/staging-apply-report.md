# Orthopaedic Anatomy — Staging Apply Report

Manufactured: 2026-07-08

## Result

- Reviewed proposals submitted to the existing persistence implementation: 420
- Auto-approved staging mutations validated by dry run: 417
- Attending-review items withheld: 3
- Proposal validation errors: 0
- Persistence table available: no
- Inserted: 0
- Updated: 0
- Existing implementation error: `[object Object]`

The factory persistence stage was executed. Its configured proposal table was
unavailable, so the reviewed drafts could not be written to database staging.
The validated staging mutation plan remains in
`reports/kg-pilots/orthopaedic-anatomy-dry-run-mutations.json`; the raw
persistence response remains in
`reports/kg-pilots/orthopaedic-anatomy-persist-result.json`.

This is a publication blocker. No direct database write or alternate persistence
path was used.
