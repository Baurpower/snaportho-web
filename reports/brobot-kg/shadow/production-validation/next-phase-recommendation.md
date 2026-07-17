# Next-phase recommendation

Remain in shadow mode. Do not inject KG material into BroBot answers yet.

## Required next steps

1. Deploy the instrumentation and admin endpoint with an explicit `BROBOT_KG_MODE=shadow`; confirm the pinned release and 275 ms deadline in the deployed environment.
2. Run authenticated production BroBot smoke cases for retrieval, bypass, multiple candidates, uncovered topics, cache repeat, forced timeout, and forced RPC failure. Confirm answers are byte-equivalent with shadow instrumentation enabled and disabled.
3. Collect enough real telemetry to measure completion and privacy gates without recording raw clinical queries.
4. Fix alias/query normalization, then rerun the 75-case corpus. Adjudicate bypass and expected-neighborhood labels before tuning thresholds.
5. Recheck filtering for the nine evidence-empty cases and ranking for the seven true ranking defects.
6. Measure latency from the deployed app region and shared cache. The direct pooler p50 failure should not be treated as an application latency diagnosis.

Advance only when every mandatory gate is measured and passing. The current production status is `BROBOT_KG_SHADOW_PRODUCTION_PARTIAL`: migration applied, production RPC exercised, production BroBot shadow traffic not executed.

