# Postoperative Protocols — Staging Apply Report

Manufactured: 2026-07-08 (America/Los_Angeles)

The existing persistence stage was executed. The configured proposal table was unavailable in this environment, so no database rows were inserted or updated. The factory reported `tableAvailable: false` and continued as required.

The existing staging dry-run validated **79 mutations** across entity creation, relationship creation, and bridge creation. No production publication was attempted.

| Measure | Result |
|---|---:|
| Curated proposals | 110 |
| Auto-approved staging candidates | 79 |
| Dry-run mutations | 79 |
| Persisted rows | 0 |
| Persistence errors | 1 environment/table-availability error |
| Database modified | No |

Source artifacts: `reports/kg-pilots/postoperative-protocols-persist-result.json` and `reports/kg-pilots/postoperative-protocols-dry-run-mutations.json`.
