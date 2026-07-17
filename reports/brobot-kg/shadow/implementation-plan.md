# Implementation plan

Implemented:

1. Versioned contracts, feature mode, decision policy, mode policy, budgets.
2. Process-local bounded TTL packet cache.
3. Release-pinned read-only RPC and high-volume event/growth schema.
4. Optional shadow provider with a 275 ms default deadline.
5. Authenticated chat integration without prompt injection.
6. Privacy sanitizer/query hashing and automatic gap classification.
7. Content-admin trace API.
8. Fixed 75-prompt evaluation fixture and focused unit tests.

Before answer injection:

1. Apply `20260716_150000_brobot_kg_shadow_retrieval.sql`.
2. Run fixtures against production shadow traffic/RPC.
3. Collect top-1 precision, latency, cache, leakage, and timing-completeness metrics.
4. Remediate failed exit gates.
5. Retain an experiment holdout; do not switch `BROBOT_KG_MODE` to `enabled` in this phase.
