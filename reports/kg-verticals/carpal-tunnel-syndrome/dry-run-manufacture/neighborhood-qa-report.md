# Neighborhood QA Report

Result: **PASS for report-only dry-run completeness; FAIL for publication**

Checks:

- Evidence, compiler, planner, gap, work, assignment, all-agent execution,
  merge, duplicate, conflict, scoring, auto-review, QA, and publication stages:
  present
- Agents completed: 10/10
- Failed/partial/skipped agents: 0/0/0
- Entity slug duplicates: 0
- Relationship triple duplicates: 0
- Unsafe generic CTS placeholders: absent
- Unsafe fracture-style CTS claims: absent
- Claims `needs_review`: 8/8
- Decision inputs attending-gated: 8/8
- Database writes: none
- Staging/persistence: not run
- Independent score: 87/100

The auditor CLI reported compiler files “missing” because it looks in the
default compiler source directory even when `--out-dir` is supplied. The files
are present in the isolated dry-run folder. This tooling-path mismatch does not
alter the 87/100 spec audit or publication block.
