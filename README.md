## SnapOrtho Web

This repository contains the production SnapOrtho Next.js app plus internal scripts, reports, and review tooling that support backend and content workflows.

## Local Development

Run the app locally with:

```bash
npm run dev
```

## Deployment Boundaries

- Vercel production builds should only run intentional app behavior.
- Local/admin automation code remains committed, but is disabled on production unless the corresponding env flag is explicitly enabled.
- Vercel Hobby does not support the high-frequency cron schedule that was previously configured here, so scheduled jobs must remain disabled or be moved to a compatible scheduler or plan.

See [docs/vercel-deployment-boundaries.md](/Volumes/PS3000/snaportho_dev/snaportho-web/docs/vercel-deployment-boundaries.md) for the current production rules, env flags, and what is intentionally excluded from Vercel deployments.

## Useful Scripts

- `npm run lint`
- `npm run build`
- `npm run kg:auto:loop`
- `npm run kg:automation:generate`
- `npm run kg:automation:report`

The `kg:*`, `anki:*`, and other `scripts/*` entry points are intended for trusted local/admin execution, not automatic Vercel production startup.
