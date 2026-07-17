# BroBot KG production shadow gate report

## Determination

`BROBOT_KG_SHADOW_PRODUCTION_PARTIAL`

The production database migration and direct retrieval path are validated. Advancement is blocked on retrieval quality, bypass precision, median latency, missing adjudication labels, and the absence of live deployed-application evidence.

| Gate | Target | Observed | Status |
|---|---:|---:|---|
| Mandatory retrieval precision | >= 95% | 100% | PASS |
| Bypass precision | >= 97% | 50% | FAIL |
| Top-1 entity precision | >= 90% | 76.67% | FAIL |
| Top-1 neighborhood precision | >= 90% | Not measurable; fixtures lack adjudicated neighborhood labels | NOT TESTED |
| Candidate miss rate | <= 5% | 53.13% | FAIL |
| Retrieval p50 | <= 75 ms | 146.50 ms | FAIL |
| Retrieval p95 | <= 250 ms | 154.13 ms | PASS |
| Timeout + RPC error rate | <= 1% | RPC errors 0%; timeout behavior not tested | PARTIAL |
| Telemetry completion | >= 99% | Not tested; fixture writes intentionally disabled | NOT TESTED |
| Inactive/excluded/high-risk leakage | 0 | 0 / 0 / 0 | PASS |
| Privacy leakage | 0 | Real app telemetry not tested | NOT TESTED |
| User-visible answer differences | 0 | Live answer path not tested; static packet references: 0 | NOT TESTED |

Additional observations: mandatory retrieval recall was 82.81%, bypass recall was 100%, p99 was 385.52 ms, and 71.70% of attempted packets were empty after filtering. The controlled repeated lookup demonstrated a cache hit; the aggregate cache-hit rate is not representative because the fixture corpus is intentionally diverse and process-local.

## Error corpus

Fifty cases were classified:

- 20 missing alias/entity normalization;
- 11 bypass-policy defects;
- 9 cases where filtering removed all eligible evidence;
- 7 ranking defects;
- 3 genuine KG coverage gaps.

The smallest sensible remediation is to improve normalized query/alias matching first, adjudicate the 11 bypass cases (especially ambiguous follow-ups), inspect the seven ranking cases, and add expected-neighborhood labels. Predicate/evidence filtering should then be reviewed for the nine empty packets. Latency should be remeasured from the deployed app region with the shared cache before architectural changes are made.

Do not enable answer-path injection. Deploy the existing instrumentation with an explicit `BROBOT_KG_MODE=shadow`, collect real telemetry, and rerun all untested gates first.

