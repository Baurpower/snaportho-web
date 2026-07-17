# Production application gate report

Every application gate is **not measured** because no request traversed a verifiably deployed production application. Prior direct-RPC measurements cannot satisfy application-path gates.

| Gate | Status |
|---|---|
| Mandatory retrieval precision >= 95% | Not measured |
| Bypass precision >= 97% | Not measured |
| Top-1 neighborhood or entity precision >= 90% | Not measured |
| Candidate miss rate <= 5% | Not measured |
| Retrieval p50 <= 75 ms | Not measured |
| Retrieval p95 <= 250 ms | Not measured |
| RPC error and deadline rate <= 1% | Not measured |
| Telemetry completion >= 99% | Not measured |
| Raw-query retention = 0 | Not measured |
| Sanitized-query retention = 0 | Not measured |
| Inactive/excluded/high-risk leakage = 0 | Not measured |
| User-visible answer-path differences = 0 | Not measured |

There is also insufficient sample for every subgroup. The prior RPC-only corpus continues to show failed quality gates, but it is not substituted here for the required production application evaluation.

