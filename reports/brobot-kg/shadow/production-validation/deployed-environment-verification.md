# Deployed environment verification

Verification date: 2026-07-16 America/Los_Angeles

## Result

Deployment verification is blocked. No intended KG shadow application code was deployed in this session, and no deployed environment value was verified.

## Local source state

- Branch: `main`
- Local commit: `fc173ffb9852a994f05f101397cd87a610df0c3c`
- Local `origin/main` ref: `fc173ffb9852a994f05f101397cd87a610df0c3c`
- Commit timestamp: `2026-07-08 20:33:38 -0700`
- Commit subject: `Knowledge graph improvements`

The intended implementation is not contained in that commit. `src/lib/brobot/kg/`, `src/app/api/admin/brobot-kg-shadow/route.ts`, and the shadow migration are untracked; `src/app/api/brobot/chat/route.ts` is locally modified. The worktree also contains extensive unrelated changes. Deploying the dirty worktree would not provide a reviewable or reproducible production artifact.

## Deployment identity and credentials

- `.vercel/project.json`: absent
- Vercel CLI: absent
- `VERCEL_*` credential variables: absent
- GitHub CLI account: configured but token invalid
- Vercel project/environment serving production BroBot: not discoverable from repository files
- Production deployment identifier/commit: not verified

Therefore it is not possible to establish that production contains the KG library, chat integration, admin endpoint, telemetry emission, or growth-gap classification.

## Environment values

The local implementation defaults the deadline to `275`, defaults the feature mode to shadow unless explicitly disabled/enabled, stores sanitized text only when explicitly set to `true`, and compile-pins `kg-beta-20260716-002`. These code defaults are not deployed-runtime verification.

| Required production value | Runtime verification |
|---|---|
| `BROBOT_KG_MODE=shadow` | Not measured |
| `BROBOT_KG_RETRIEVAL_DEADLINE_MS=275` | Not measured |
| `BROBOT_KG_STORE_SANITIZED_QUERY=false` | Not measured |
| Release `kg-beta-20260716-002` | Not measured in application runtime |

## Exact operator steps

1. Isolate the KG implementation into a clean branch/commit containing only the intended source, migration, scripts, tests, and reports. Review the diff and push it to the repository.
2. Re-authenticate deployment tooling: `gh auth login -h github.com`; install/authenticate the Vercel CLI using the organization-approved workflow, or use the Vercel dashboard.
3. Identify the production project from the current production domain in Vercel, then record its project ID, team, production domain, current deployment ID, and Git commit.
4. In the Vercel project's Production environment, set `BROBOT_KG_MODE` to `shadow`, `BROBOT_KG_RETRIEVAL_DEADLINE_MS` to `275`, and `BROBOT_KG_STORE_SANITIZED_QUERY` to `false`. Never set mode to `enabled`.
5. Deploy the reviewed commit through the established production workflow. Record the resulting deployment ID and commit SHA.
6. Verify the three values from the deployed runtime using a protected diagnostic or Vercel runtime logs that report only non-secret configuration state. Verify the compile-pinned release is `kg-beta-20260716-002`.
7. With approved test and `content_admin` accounts, execute the smoke suite and 75-case application suite, then inspect application-created telemetry and the protected admin endpoint.

