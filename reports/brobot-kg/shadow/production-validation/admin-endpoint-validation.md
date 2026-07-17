# Production admin endpoint validation

Status: **not measured**.

The endpoint exists only in the local untracked implementation at `GET /api/admin/brobot-kg-shadow`. Production reachability and deployment were not established. No unauthorized, normal-user, or `content_admin` production request was made, and no filter was tested against application-generated telemetry.

After deployment, test `from`, `to`, `mode`, `status`, `neighborhood`, `entityId`, `gapType`, `cacheStatus`, `latency`, and `turn`, including the five required example queries. Confirm 401/403 behavior for unauthorized and insufficient-role sessions, successful access for `content_admin`, safe result limits, exact subsets, and absence of prompt text or unnecessary sensitive fields.

