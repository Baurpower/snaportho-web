# Audit evidence index

Completed October 9, 2026. Read-only audit; application/live database mutations were not performed.

- [Full audit report](/Users/alexbaur/snaportho_dev/snaportho-web/reports/knowledge-graph-reaudit-2026-10-09/audit-report.md)
- [Automatic improvement roadmap](/Users/alexbaur/snaportho_dev/snaportho-web/reports/knowledge-graph-reaudit-2026-10-09/automatic-improvement-roadmap.md)
- [Database snapshot](/Users/alexbaur/snaportho_dev/snaportho-web/reports/knowledge-graph-reaudit-2026-10-09/database-snapshot.json)
- [Read-only SQL queries](/Users/alexbaur/snaportho_dev/snaportho-web/reports/knowledge-graph-reaudit-2026-10-09/audit-queries.sql)
- [API pagination evidence](/Users/alexbaur/snaportho_dev/snaportho-web/reports/knowledge-graph-reaudit-2026-10-09/api-pagination.json)
- [Relationship type check](/Users/alexbaur/snaportho_dev/snaportho-web/reports/knowledge-graph-reaudit-2026-10-09/relationship-type-check.json)
- [Retrieval timing samples](/Users/alexbaur/snaportho_dev/snaportho-web/reports/knowledge-graph-reaudit-2026-10-09/retrieval-timing.json)
- [Database advisors](/Users/alexbaur/snaportho_dev/snaportho-web/reports/knowledge-graph-reaudit-2026-10-09/database-advisors.json)

The live-retrieval-definitions.sql file is a forensic snapshot, **not a migration**. Do not apply it.

The API probe requires the existing local Supabase environment and performs SELECTs only. It prints counts, not credentials or database records. The relationship check is offline and compares the captured snapshot to the current repository registry; record the registry revision when re-running it.

Snapshot sections were collected separately rather than atomically. Clinical correctness of every claim, production deployment/config, and user-outcome improvements are not certified by this audit. See the report's scope and confidence discussion.

Verification performed: current remediation test command passed 13 TypeScript suites and publication database integration; all evidence JSON files parse; full graph type check covered 2248 active edges; prerequisite SCC analysis covered 1339 edges.
