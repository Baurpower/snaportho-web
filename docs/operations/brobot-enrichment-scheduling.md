# BroBot enrichment scheduling

`/api/cron/brobot-enrich` processes optional post-answer metadata and KG enrichment. It is a frequent queue worker and is not safe to reduce to one daily run: doing so would leave web enrichment pending for most of the day.

The endpoint remains deployed but is intentionally absent from `vercel.json` because Vercel Hobby permits scheduled functions at most once per day. Primary BroBot answers do not depend on this worker.

Until a frequent scheduler is approved, async suggested-question, tag, and KG enrichment may remain pending. Invoke the endpoint only from an approved scheduler using `Authorization: Bearer <CRON_SECRET>`. Supabase Cron is the preferred future home because the queue is already stored in Supabase; a GitHub Actions schedule is an acceptable alternative if repository policy permits it.

Do not expose the secret in workflow output, request logs, or documentation. Re-enable frequent execution only after verifying retry behavior, overlapping-run protection, and queue monitoring.
