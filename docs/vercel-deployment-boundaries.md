# Vercel Deployment Boundaries

This repo intentionally contains more than the production Next.js app:

- `src/` contains production application code.
- `scripts/` contains trusted local/admin automation entry points.
- `reports/` contains generated review artifacts, exports, and snapshots.
- `tmp/` contains local scratch output and diagnostics.

Those non-app paths stay in Git when they are useful for collaboration, but they are not meant to run automatically on Vercel.

## Current Production Rules

- `vercel.json` no longer declares a Vercel cron job.
- `ENABLE_CRON_JOBS=true` is required before `/api/cron/brobot-evaluate` will do work.
- `ENABLE_KG_AUTOMATION=true` is required before the Anki KG review dashboard or its action routes will respond normally.
- Missing cron prerequisites such as `CRON_SECRET`, `OPENAI_API_KEY`, or Supabase admin env vars return a safe disabled response instead of partially running.

## Why The Cron Was Removed

The previous Vercel cron schedule was:

- `/api/cron/brobot-evaluate`
- `*/2 * * * *`

That is not compatible with Vercel Hobby. Keeping the route is fine, but keeping the unsupported schedule in `vercel.json` can prevent intended production deployment behavior.

If scheduled evaluation should run in production again, do one of these deliberately:

1. Upgrade to a Vercel plan that supports the desired cron behavior and reintroduce a supported schedule.
2. Trigger the route from an external scheduler with `ENABLE_CRON_JOBS=true` and a valid `CRON_SECRET`.

## Deployment Packaging

`.vercelignore` excludes local-only and generated paths from the Vercel upload:

- `scripts/`
- `reports/`
- `tmp/`
- `docs/`
- `.agents/`
- `.codex/`

That keeps production deployments focused on the app without deleting useful repo history or local tooling.
