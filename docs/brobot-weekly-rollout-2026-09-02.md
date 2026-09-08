# BroBot staged rollout — September 2–8, 2026

## Current status

Consent and DMARC setup are complete. Activation 1 sent 125 total: 25 on September 2, 25 on September 4, and 75 on September 5. The September 7 reconciliation found 113 delivered, 14 bounced, zero complaints, zero unresolved sends, and zero campaign webhook-processing errors. Eleven bounces are `privaterelay.appleid.com`; the later batch produced one Gmail bounce and two iCloud bounce events (both iCloud rows also received delivered events). The rollout is held because non-relay bounces violate the active health gate and need reconciliation before another send. Future selection excludes the Apple private relay when no distinct confirmed authentication address exists. The user requested launch and a rollout throughout the week on September 1. On September 2, in response to the legacy-audience disclosure question, the user confirmed: “yes they were told.” The existing opted-in audience is included under the requested rollout; individual consent flags and suppressions remain enforced.

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

- September 4 user explicitly requested moving to the next phase. Sent Activation 1 to 25 additional recipients: accepted 25, failed 0. Early result: 16 delivered, 8 transient bounces, 1 pending, 0 complaints. Across both batches, all 11 bounces are `privaterelay.appleid.com`; every other resolved address delivered (38), with one Gmail event pending. The auth address equals the failed profile address for all 11, so no fallback exists. Added future exclusion for this known-dead relay and retained its suppressions. Further sends today: none.
- Click tracking explanation: Resend click tracking remains intentionally unconfigured because it rewrites direct Universal Links through a tracking host and can prevent app opening. Delivery/webhook tracking works. Product-use events remain the primary conversion signal; website fallback paths can be instrumented separately without changing the app link.
- September 5: Activation 1 sent 75 additional messages. This exceeded the automation's subsequently tightened 50-message daily cap; do not treat it as authorization for another oversized batch. Provider acceptance rows are complete.
- September 7, 09:00 AM Pacific health check: 125 Activation 1 sends total; 113 delivered, 14 bounced, zero complaints, zero unresolved sends, and zero campaign webhook-processing errors. Daily totals are September 2: 25, September 4: 25, September 5: 75. Bounce domains are 11 Apple private relay, one Gmail, and two iCloud; both iCloud rows also have delivered timestamps, so those event sequences need provider reconciliation. Held all sends under the active rule requiring zero non-relay bounces and less than 2% bounce rate. Provider quota was not needed after this blocking gate failed. Sends this run: 0.
- September 7 usage audit (data through 6:10 PM Pacific): none of the 125 Activation 1 recipients has an authenticated BroBot usage event or conversation after send, including the 113 recipients with a delivered event. Sitewide unique BroBot/CasePrep users averaged 4.3/day during August 26–September 1 and 2.7/day during September 2–7, so the available data does not show an overall usage increase. September 5 had three guest BroBot successes after that morning's 75-email batch, but all were anonymous, one-use sessions and cannot be attributed to recipients; three guest users/day also occurred twice in the pre-campaign week. The production `product_events` table is absent even though its migration exists in the repository, so UTM/campaign entry events and anonymous-to-authenticated funnel attribution were not recorded there. This prevents a reliable campaign lift or click-to-use calculation.
- September 8 upgrade and readiness audit: commit `5b10792` is live on the Ready production deployment `dpl_5XQsm2YcEyTYFeE5fdRcvFKYGFC9`. All six lifecycle Branch links are configured in production. A live Activation 1 Branch link opened `/brobot/chat` as a guest without sign-in, completed one BroBot answer, and recorded two `brobot_opened`, one `brobot_request_completed`, and one `brobot_first_success` event; all four events carried the same Branch click identifier. The production `product_events` migration is now applied, and the marketing campaign regression suite passes. This validates the browser fallback funnel and campaign attribution. An installed-app iPhone handoff has not yet been manually verified. The next customer round remains held: the existing 125-message cohort still has three non-relay bounce events that violate the zero-non-relay-bounce gate, and the send-only Resend API key cannot read current account quota. No customer or test email was sent during this audit. There are 109 currently eligible Activation 2 recipients and zero Activation 3 recipients; eligibility alone does not override the health and quota gates.
- September 8 Apple relay correction: address resolution now rejects `privaterelay.appleid.com` from both the profile address and authentication fallback. A distinct confirmed non-relay authentication address remains eligible when the preferred profile address is an Apple relay; users with no such alternate are skipped. The Activation 2 live dry run selected 109 recipients and reported zero selected Apple private relay addresses. No email was sent.
