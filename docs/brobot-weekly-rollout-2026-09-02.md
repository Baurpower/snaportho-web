# BroBot staged rollout — September 2–8, 2026

## Current status

Consent and DMARC setup are complete. The 25-person Activation 1 pilot sent on September 2. Further customer sends are ON HOLD because at least 3 recipients bounced (12% of the pilot), above the rollout threshold. Do not expand or send follow-ups until the bounce causes and audience quality are reviewed. The user requested launch and a rollout throughout the week on September 1. On September 2, in response to the legacy-audience disclosure question, the user confirmed: “yes they were told.” The existing opted-in audience is included under the requested rollout; individual consent flags and suppressions remain enforced.

Verified September 1 evening, America/Los_Angeles:

- Production deployment `dpl_HLK8PvB1VnN6cMgjbi9mh5SD3NmL` is Ready, serving `snap-ortho.com`; commit `b2d72c4` passed Vercel.
- Live destination preflight passes.
- Live one-click unsubscribe, simulated signed bounce handling, global suppression and blocked resubscription passed against a disposable test account. That account and its synthetic delivery/webhook rows were removed. No email was sent by this test. Reusable command: `node --env-file=.env.local --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs scripts/check-marketing-live-suppression.ts --confirm=TEST-DISPOSABLE-USER`.
- Resend domain `snap-ortho.com` is verified; webhook is enabled and recent delivered events return HTTP 200.
- Resend Configuration offers **Enable tracking metrics → Configure** and the resulting screen is **New tracking subdomain**. No tracking domain is configured. Do not add one for this campaign.
- Resend Free transactional/API quota: 100/day, 3,000/month; UI showed 24/day and 34/month used. These are changing account-wide values, so recheck before sending. No paid plan or overage was enabled.
- Initial eligibility snapshot: activation 512, conversion 48, profile 337, reengagement 28. Cohorts overlap.

## Launch requirements still pending

- RESOLVED September 2: user confirmed older users were told they would receive marketing emails (“yes they were told”). Use the existing opted-in audience subject to all current suppressions and eligibility rules. This records the user's confirmation; no database consent timestamps were backfilled.
- RESOLVED September 2: added TXT `_dmarc` = `v=DMARC1; p=none;`, automatic TTL, in Namecheap. Verified publication at authoritative server 156.154.132.200 and Cloudflare 1.1.1.1. Google 8.8.8.8 initially retained a negative cache. Received-message header authentication has not been independently inspected.

## Scheduled daily work

Daily at 9:00 AM America/Los_Angeles, September 2 through September 8. This is a local Codex task heartbeat, so the computer/app must be available for execution. No system cron or cloud worker is installed.

No sends while a launch requirement is unresolved. A missed or blocked day does not create a catch-up batch. The first actual batch is at most 25; after at least 24 hours and a healthy delivery review the second is at most 50; after another healthy 24 hours later batches are at most 75 total campaign messages per day. Budgets include both initial and follow-up emails, and every send attempt consumes budget even if its result is uncertain. Check the database for previous same-day attempts before any command so repeated runs do not repeat a budget.

Keep at least 25 messages of the account's 100/day quota available for other email. Today's campaign allowance is the smaller of its stage budget remaining and `75 - current account daily usage`. Check monthly allowance as well. If account usage cannot be verified, do not send. Do not purchase upgrades or enable overage.

Prioritize due Activation 2, then due Activation 3, then new Activation 1 within the shared budget. The existing runner enforces 3 days before Activation 2, 4 more days before Activation 3, and excludes users who have used BroBot. Use each command's `--limit` for only the remaining budget. Do not run Habit, Conversion, Profile or Reengagement during this initial activation pilot; this avoids overlapping campaigns while initial delivery is being measured. Do not change template versions or clear reservations to force sends.

At most 512 new Activation 1 recipients may be enrolled during this rollout. New signups must not expand that numeric cap. Recalculate eligibility at each run. The weekly capacity is lower than sending all eight templates; remaining invitations and follow-ups are reported at the end rather than silently extending the schedule.

## Health checks before later batches

Review only actual campaign rows, excluding test campaigns. Require at least 24 hours since the preceding batch, at least 95% delivered, zero complaints, less than 2% bounced, no unresolved `sending`/failed reservations, and no unresolved campaign webhook processing errors. Any complaint, insufficient metrics, a delivery failure, or unavailable database/provider telemetry means hold and notify the user. These thresholds are conservative rollout decisions, not provider guarantees.

Read `delivered_at`, `bounced_at`, `complained_at`, `suppressed_at` and `failure_reason`, not just `send_status` (events can arrive out of order). Check webhook association against `resend_email_id`. Keep suppressions intact. Resend may still be retrying old test events; distinguish them from campaign events.

## Execution and reporting

Work in `/Users/alexbaur/snaportho_dev/snaportho-web`. Run the existing dry-run command before each send. Use local `.env.local` credentials without printing them or exporting addresses. Enable the send flag only in the individual command environment:

`BROBOT_MARKETING_SEND_ENABLED=true npm run marketing:campaign -- --campaign=activation_1 --limit=N --send --confirm=SEND-activation_1`

Substitute only a due activation step and its remaining approved budget. Never persist the send flag in `.env.local` or Vercel. Record attempted/sent/delivered/bounced/complained/suppressed counts and remaining budget in this document after each run. Stop immediately on any ambiguous error; do not rerun it blindly. Notify on a completed batch, actionable hold, failure or completion; stay quiet if a previously reported hold is unchanged.

After September 8, stop sending and report remaining eligible users and pending follow-ups. Do not extend without user direction.

## Run log

- September 1: launch preparation; customer sends 0. Deployment and disposable live suppression smoke test passed. Awaiting historical audience answer and Namecheap DMARC setup.
- Daily task heartbeat created: `brobot-weekly-rollout`, active at 9:00 AM, with an end date after September 8. It checks launch requirements before sending and remains on hold while they are unresolved.

- September 2, 02:01 AM Pacific: heartbeat fired at 09:01 UTC, before the allowed sending window. Sent nothing. Corrected the scheduler to 16:00 UTC (09:00 AM Pacific for this rollout); preserved all launch holds, budgets and the September 8 end date. Consent and DMARC resolution remain unrecorded.

- September 2, 09:01 AM Pacific: scheduled check reached the permitted window. Launch holds unchanged: legacy-audience consent and DMARC publication remain unresolved in this task. Send attempts this run: 0; no customer data or sending configuration changed. Provider usage and delivery checks were deferred because launch authorization requirements are unresolved. Initial pilot remains capped at 25 when cleared; no catch-up budget accrued. No repeat notification issued.

- September 2: user confirmed historical marketing disclosure. Consent launch hold resolved. Namecheap still requires sign-in; no email sent during this setup step.

- September 2 setup: DMARC saved and verified. No prior customer campaign rows. Resend Usage currently renders 0/0 rather than usable quota data; refreshing before launch. Runner now stops the batch on the first send exception, matching rollout policy.

- September 2 pilot started: both launch holds cleared; live destination preflight and campaign tests passed; dry run 511 eligible, 25 selected. Resend live Usage reported 24/100 daily and 34/3,000 monthly before send. No prior customer campaign rows. Authorized Activation 1 command started with limit 25 and command-scoped send flag. Awaiting command completion; do not start another batch until reconciled.

- September 2, approximately 4:08 PM Pacific: pilot command completed with sent=25, duplicate=0, skipped=0, failed=0 (provider acceptance). Early webhook check found 3 bounces. Further sending held immediately; no second batch authorized while this delivery-quality hold remains.

- Reconciled pilot: 25 accepted, 22 delivered, 3 bounced (12%), 0 complaints, 0 unresolved sends, 0 campaign webhook errors. All 3 bounced users have global suppression records. Resend classifies all as Transient/General and supplies only a generic recipient-provider bounce explanation; this does not establish invalid addresses or a specific DNS failure. Automation updated to a read-only delivery hold until diagnosis and a revised rollout decision are recorded with the user. No further sends or follow-ups may run under the original expansion schedule. The command-scoped sending flag was not persisted.

- September 2 address-policy correction: user explicitly requested profile-table email first, confirmed authentication email only as fallback. Implemented locally with one alternate-address reservation, last-moment rechecks, and webhook handling that distinguishes profile address failure from account opt-out. Requires webhook deployment before any new sender run. Campaign regression tests pass; rollout remains held and no fallback sends were made. Existing pilot bounces used authentication addresses and retain their blocks.
