# Surgical Approaches — Knowledge Factory Execution Summary

Generated: 2026-07-08

## Outcome

- Topic: `surgical-approaches`
- Proposal packet: 1,248 proposals; 0 validation errors
- Auto-approved low-risk proposals: 1,178
- Human review: 65
- Attending review: 5
- Rejected: 0
- Compiler agents assigned/executed: 6/6
- Agent failures: 0
- Merge conflicts: 0
- Remaining ontology gaps: 1
- Independent neighborhood QA score: 84/100
- Publication maturity: Level 5/7; not ready

## Pipeline execution

Evidence Packet → Ontology Compiler → Neighborhood Planner → Gap Analysis →
Work Planner → Agent Assignment → All Assigned Agents Executed → Merge →
Duplicate Detection → Conflict Resolution → Quality Scoring → Auto Review →
Neighborhood QA → Publication Validation → Staging Persistence Attempted

All local stages completed and emitted their standard reports.

## Unavailable capabilities and blockers

- Evidence collectors reported no registered static Prepare slice, Anki mapping
  count, Orthobullets mapping count, or CasePrep mapping. These warnings are
  preserved in `reports/kg-evidence/surgical-approaches/evidence-warnings.json`.
- The proposal persistence adapter returned `tableAvailable: false`; no rows
  were inserted or updated. The result is preserved in
  `reports/kg-pilots/surgical-approaches-persist-result.json`.
- The staging apply command was invoked using the existing staging guard, but
  the configured Supabase endpoint could not be reached from the sandbox
  (`fetch failed`). The required network escalation was unavailable, so no
  staging database mutation occurred.
- Publication remains blocked by 70 pending clinical reviews and the absence of
  approved canonical database rows. Draft claims and decision points remain
  correctly gated from verified consumption.
