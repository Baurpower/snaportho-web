# Deployed environment verification

Verification date: 2026-07-16 America/Los_Angeles

## Result

Deployment verification is partial. The synchronized KG shadow commit was pushed and the public production host serves the protected KG admin route, but the exact Vercel deployment/commit and runtime environment values could not be authenticated.

## Local source state

- Branch: `main`
- Local commit: `cb86a6ae91a0ad2e0eaeb16031abadb968913d94`
- Local `origin/main` ref: `cb86a6ae91a0ad2e0eaeb16031abadb968913d94`
- Commit timestamp: `2026-07-16 19:24:30 -0700`
- Commit subject: `KG v0.0.1`

The intended implementation is tracked in that commit, including `src/lib/brobot/kg/`, the chat integration, admin route, telemetry, gap classification, and migration. The local branch is synchronized with `origin/main` and the worktree was clean during verification.

## Public production evidence

At 2026-07-16 19:33 America/Los_Angeles:

- `GET https://snap-ortho.com/` returned HTTP 200 with `server: Vercel`.
- Unauthenticated `GET https://snap-ortho.com/api/admin/brobot-kg-shadow` returned HTTP 401 and `{"error":"Authentication required."}`.
- Vercel reported the matched path `/api/admin/brobot-kg-shadow`.

This proves the production host is healthy and a deployment containing the local admin-route behavior is serving. It does not prove that the serving deployment is exactly `cb86a6a`, because no authenticated Vercel deployment metadata was available.

## Deployment identity and credentials

- `.vercel/project.json`: absent
- Vercel CLI: absent
- `VERCEL_*` credential variables: absent
- GitHub CLI account: configured but token invalid
- Public production host: `snap-ortho.com`, served by Vercel
- Vercel project/environment serving production BroBot: not discoverable from repository files or public response headers
- Production deployment identifier/commit: not verified

The deployed admin endpoint is established, but the public check cannot independently establish the deployed chat integration, telemetry emission, or growth-gap classification.

## Environment values

The local implementation defaults the deadline to `275`, defaults the feature mode to shadow unless explicitly disabled/enabled, stores sanitized text only when explicitly set to `true`, and compile-pins `kg-beta-20260716-002`. These code defaults are not deployed-runtime verification.

| Required production value | Runtime verification |
|---|---|
| `BROBOT_KG_MODE=shadow` | Not measured |
| `BROBOT_KG_RETRIEVAL_DEADLINE_MS=275` | Not measured |
| `BROBOT_KG_STORE_SANITIZED_QUERY=false` | Not measured |
| Release `kg-beta-20260716-002` | Not measured in application runtime |

## Exact operator steps

1. Open the Vercel dashboard, locate the project owning `snap-ortho.com`, and record its team/project, Production deployment ID, Git SHA, and deployment state. Confirm the SHA is `cb86a6ae91a0ad2e0eaeb16031abadb968913d94` or a documented descendant containing it.
2. In that project's Production environment, verify `BROBOT_KG_MODE=shadow`, `BROBOT_KG_RETRIEVAL_DEADLINE_MS=275`, and `BROBOT_KG_STORE_SANITIZED_QUERY=false`. Never set mode to `enabled`. Redeploy the verified commit if any value changes.
3. Verify those non-secret states from deployed runtime logs or a protected diagnostic and verify the compile-pinned release is `kg-beta-20260716-002`.
4. Provide approved normal-user and `content_admin` sessions/test accounts. Execute the smoke suite and 75-case application suite, then inspect only application-created telemetry and growth rows.
