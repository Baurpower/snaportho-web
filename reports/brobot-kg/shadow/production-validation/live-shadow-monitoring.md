# Live shadow monitoring

## Deployment prerequisite

Set and verify these values in the production application environment before calling traffic live:

```text
BROBOT_KG_MODE=shadow
BROBOT_KG_RETRIEVAL_DEADLINE_MS=275
BROBOT_KG_STORE_SANITIZED_QUERY=false
```

The release is compile-pinned as `kg-beta-20260716-002`. The current session could not inspect the deployed Vercel environment, so this prerequisite is open.

## Admin monitoring endpoint

The implementation exposes `GET /api/admin/brobot-kg-shadow`. It requires a reviewer session with at least `content_admin` and supports `from`, `to`, `mode`, `status`, `neighborhood`, `entityId`, `gapType`, `cacheStatus`, `latency` (`lt75`, `75to250`, `gt250`), and `turn` (`first`, `follow_up`) filters.

Suggested first checks after deployment:

```text
/api/admin/brobot-kg-shadow?from=<ISO>&latency=gt250
/api/admin/brobot-kg-shadow?from=<ISO>&status=error
/api/admin/brobot-kg-shadow?from=<ISO>&gapType=missing_entity
/api/admin/brobot-kg-shadow?from=<ISO>&turn=follow_up
/api/admin/brobot-kg-shadow?from=<ISO>&cacheStatus=hit
```

Track request count, retrieval/bypass distribution, p50/p95/p99 latency, deadline and RPC errors, cache hits, empty packets, candidate misses, leakage flags, gap-type frequency, and first-turn versus follow-up behavior. Split each by BroBot mode and neighborhood where volume permits.

## Initial operating rule

Keep the answer path unchanged. Alert on any inactive/excluded/high-risk object, any raw-query retention, RPC error rate over 1%, p95 over 250 ms, or a telemetry-completion rate below 99%. Review the growth queue daily during the first week, but do not promote proposed repairs automatically.

The endpoint code is present locally but was not verified on the deployed application. Until it is deployed and queried under real authenticated traffic, monitoring readiness is partial.

