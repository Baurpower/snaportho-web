# Production admin endpoint validation

Status: **partially measured**.

The deployed endpoint at `GET https://snap-ortho.com/api/admin/brobot-kg-shadow` returned HTTP 401 with `{"error":"Authentication required."}` for an unauthenticated request. The response exposed no prompt or telemetry fields. This verifies production reachability and the unauthenticated denial path.

Normal-user denial, `content_admin` success, all filters, result limits, and application-generated telemetry subsets remain unmeasured because approved authenticated sessions are unavailable.

After deployment, test `from`, `to`, `mode`, `status`, `neighborhood`, `entityId`, `gapType`, `cacheStatus`, `latency`, and `turn`, including the five required example queries. Confirm 401/403 behavior for unauthorized and insufficient-role sessions, successful access for `content_admin`, safe result limits, exact subsets, and absence of prompt text or unnecessary sensitive fields.
