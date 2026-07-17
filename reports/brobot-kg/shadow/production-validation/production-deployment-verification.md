# BroBot KG production deployment verification

Validated at 2026-07-16 (America/Los_Angeles) against the configured production Supabase project.

## Result

- Database migration applied: **yes**.
- Pinned release: `kg-beta-20260716-002` (`active`, `beta_active`).
- Production retrieval RPC exercised directly: **yes**.
- Production BroBot application traffic exercised: **no**.
- Overall deployment state: **partial**.

The production data plane is installed and callable, but this workspace has no Vercel credentials or CLI with which to verify or change the deployed application environment. `BROBOT_KG_MODE` was not present locally. The code defaults to `shadow`, but that is not evidence that the deployed service is configured identically.

## Database verification

The guarded migration runner required `BROBOT_KG_SHADOW_PRODUCTION_CONFIRM=kg-beta-20260716-002`. It verified the active release before applying the migration and verified afterward that canonical entity, relationship, claim, and decision-point counts were unchanged. The release manifest and publication status were also unchanged.

Verified objects and controls:

- shadow event and growth-queue tables exist with RLS enabled;
- retrieval RPC exists with the expected signature and is `STABLE`;
- authenticated and service roles can execute the RPC; anonymous execution is revoked;
- no user RLS policies exist on telemetry tables, so ordinary direct table access is denied despite inherited table grants;
- aggregation and update triggers are enabled;
- required lookup and monitoring indexes exist;
- a request using the wrong release ID returned no objects;
- an isolated growth event aggregated successfully and was removed after validation;
- the RPC limits results to the pinned production overlay and filters inactive, excluded, and high-risk objects and invalid relationship endpoints.

## Runtime smoke-test coverage

The 75-case fixture ran the production RPC over the production connection. It covered mandatory retrieval, bypass decisions, multiple candidates, uncovered topics, first-turn and follow-up prompts, and a controlled repeated lookup. It did not call the deployed BroBot answer endpoint and deliberately did not write fixture telemetry into production.

Consequently, these remain unverified in the deployed application: explicit shadow-mode configuration, fail-open behavior during timeout/RPC failure, telemetry completion, privacy of real telemetry, and zero user-visible answer differences. Static inspection found zero references that inject the shadow packet into the answer path, but static inspection is not a live-traffic result.

## Reproduction

Use the guarded scripts in `scripts/`:

```text
apply-brobot-kg-shadow-migration.ts
verify-brobot-kg-production-deployment.ts
run-brobot-kg-production-fixture.ts
validate-brobot-kg-growth-queue.ts
```

