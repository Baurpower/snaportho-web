# BroBot Marketing Campaign Runbook

## Safety model

Campaign commands are dry-run by default. Production delivery requires both
`BROBOT_MARKETING_SEND_ENABLED=true` and an exact per-campaign confirmation
argument. The sender rechecks `user_profiles.receive_emails`, global/topic
opt-outs, product-use signals when applicable, and the atomic daily quota
reservation immediately before each send.

**Production sending and scheduled automation remain on hold.** Do not enable
any send flag or configure an external schedule until an operator separately
approves the documented delivery-quality hold, verifies the quota migration
and telemetry, and confirms the deployed route and sender configuration.
Vercel cron is not used for this system.

Never export recipient emails to a CSV. Supabase remains the audience source of
truth and Resend receives one eligible recipient at delivery time.

## Required configuration

Set these server-only variables in the production deployment and trusted admin
shell:

```text
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
MARKETING_FROM_EMAIL=SnapOrtho BroBot <brobot@updates.snap-ortho.com>
MARKETING_POSTAL_ADDRESS=
MARKETING_PREFERENCES_SECRET=
BROBOT_MARKETING_SEND_ENABLED=false
MARKETING_SCHEDULER_SECRET=
MARKETING_AUTOMATION_ENABLED=false
MARKETING_DELIVERY_HEALTH_APPROVED=false
MARKETING_AUTOMATION_QUOTA_APPROVED=false
```

The scheduler secret is a separate random bearer token used only by the
external scheduler; do not reuse `CRON_SECRET`. Keep all four marketing flags
off by default. The last three variables are deliberate hold/approval gates,
not deployment defaults to turn on.

Verify the sending subdomain's SPF, DKIM, and DMARC in Resend. Register the
webhook URL `https://snap-ortho.com/api/webhooks/resend` for delivered, clicked,
bounced, complained, suppressed, and failed events.

## Database rollout

Review and apply `supabase/migrations/20260901185616_brobot_marketing_campaigns.sql`
through the normal production migration workflow. The migration does not
backfill consent provenance: historical `receive_emails=true` records remain
identifiable because `marketing_consent_at` stays null.

Before enabling the scheduler, also review and apply
`supabase/migrations/20260926_190000_marketing_automation_quota.sql`. It
reserves campaign rows under a database advisory lock, enforces a shared cap of
50 marketing delivery reservations per Pacific calendar day, and allows at
most one marketing reservation per recipient per day. A reservation counts
against the cap even if delivery later becomes ambiguous or fails; this is
intentional to avoid exceeding the cap on retries. Only rows with a non-null
`campaign_key` count, so transactional lifecycle and billing win-back email
remain outside this cap. Both the operator runner and scheduled route use this
same reservation function. A separate durable batch claim enforces at least 24
hours between customer batches using the latest marketing reservation's
`sent_at` timestamp; this is not inferred from scheduler cadence. It also
allows only one active batch at a time, and a crashed/unfinalized batch blocks
subsequent runs until it is reconciled. A hard process termination can leave
the batch in `running`; ordinary send errors finalize it in `finally`, but an
operator must inspect every associated delivery reservation and reconcile
provider state with Resend before manually marking or completing a stale batch.
Never clear or complete a stuck batch blindly: an ambiguous send may already
have reached a customer.

## Preview and audience audit

Generate an HTML preview without accessing production data:

```bash
npm run marketing:campaign -- --campaign=activation_1 --preview
```

Count an eligible cohort without sending or printing email addresses:

```bash
npm run marketing:campaign -- --campaign=activation_1 --limit=100
```

The dry-run prints aggregate exclusion reasons so operators can see why the
cohort shrank without revealing addresses. Every marketing campaign requires a
non-null `marketing_consent_at`; `receive_emails=true` by itself is not enough.
Activation 1 is limited to accounts created in the last 30 days, and any prior
bounce, complaint, or provider suppression excludes the user from later sends.
Legacy users without recorded consent must be asked to opt in inside the
product. Do not email them to obtain marketing consent.

Supported steps are `activation_1`, `activation_2`, `activation_3`, `habit_1`,
`habit_2`, `conversion_1`, `profile_completion_1`, `profile_grad_year_1`,
`reengagement_1`, `caseprep_activation_1`, and `anki_activation_1`.

## Profile reactivation campaigns (September 16 revision)

These are two separate, mutually exclusive opted-in audiences, not a resend
of the earlier all-gaps profile email. `profile_completion_1` targets accounts
with no meaningful profile details beyond name/email: no training level,
graduation year in either profile table, country, city, institution, or
subspecialty. `profile_grad_year_1` now targets only accounts whose saved
training level is exactly `MD/DO Student` and whose graduation year is absent
from both profile tables. Residents and other training levels are excluded;
they need separate copy and a separate future campaign. Other partial profiles
are not in either step. Both require `receive_emails=true`; never-indicated accounts are
excluded because the revised emails promote product features. Unsubscribes,
topic opt-outs, paid entitlements, address failures, and prior delivery
reservations retain their existing safeguards. The sender rechecks the cohort
immediately before delivery.

The medical-student note is a short message from Alex that acknowledges
their training, encourages them to keep up the good work, and asks for their
medical school graduation year. Its single CTA opens `/account/grad-year`,
which asks for only that field and preserves campaign attribution through
sign-in. A successful save routes to `/whats-new`, where they can try BroBot
or download the Anki add-on. The empty-profile note is unchanged and has a
separate audience. The two steps have distinct campaign keys and UTM labels.
The new routes must be deployed and tested before another student test email;
the previously sent test points to the old `/account/profile` link.
For now, only the medical-student step is a candidate for a pilot. Do not run
the empty-profile step without a separate decision, or run either step during
the activation delivery-quality hold. Review copy, current feature destinations, a fresh dry run, and the
existing bounce/complaint hold with the user before authorizing any pilot.

```bash
npm run marketing:campaign -- --campaign=profile_completion_1 --preview
npm run marketing:campaign -- --campaign=profile_grad_year_1 --preview
npm run marketing:campaign -- --campaign=profile_completion_1 --limit=25
npm run marketing:campaign -- --campaign=profile_grad_year_1 --limit=25
```

The old `reports/profile-gap-audit.json` is a historical snapshot of the
former all-gaps audience, not a send count for these two steps. Re-run the
audit and both dry runs after live database access is available. Compare
new-product visits and profile saves alongside delivery, bounce, complaint,
and unsubscribe metrics before expanding the pilot.

September 16 live dry run after the medical-student filter: 240 eligible for
`profile_grad_year_1`; 25 would be selected with `--limit=25`; zero selected
Apple private-relay addresses. This read-only check sent no email. Recalculate
before any future send because eligibility changes.

## Campaign navigation and test review

Campaign links must work with the existing app; no iOS update is required.

| Emails | Main destination | Browser option |
| --- | --- | --- |
| Activation 1–3, Habit 1–2, Reengagement | `/app/brobot/guest` — existing guest BroBot route | `/brobot/chat` |
| CasePrep onboarding | `/app/brobot/guest` — CasePrep guest entry | `/brobot` |
| Anki onboarding | `/anki` — Anki setup page | Same |
| Empty-profile reactivation | BroBot feature link in the email; profile link goes to `/account/profile` | Web profile editor |
| Medical-student graduation year | `/account/grad-year` one-field form, then `/whats-new` | BroBot Chat or Anki download |
| Conversion | `/brobot/pricing` — website plans | Same |

The existing guest route opens CasePrep, not Chat. Its CTA says “Open BroBot”;
the secondary link explicitly says “Open Chat on the website.” The app contains
a profile form but its existing router does not expose a profile deep link.
Do not generate `/app/brobot/chat`, `/app/account/profile`, or
`/app/brobot/pricing` for new emails. Browser fallbacks for previously sent test
links remain, but cannot change what an old installed app does with those URLs.

My campaign-specific iOS changes were removed; other existing iOS work was
preserved. Deploy the website/email changes as usual. Web campaign guests can
ask their first question before the sign-in invitation. Existing quotas apply,
and profile editing still requires sign-in with a return to `/account/profile`.

Run `npm run marketing:campaign:test` for destinations, rendered links, preflight,
and unsubscribe regression coverage. Test the existing guest link on the
installed app and use the direct website link when Chat is desired.

Resend click tracking rewrites URLs, which can interfere with direct Universal
Links. Confirm click tracking is disabled on the sending domain before the next
device test. The local sending-only API key cannot inspect domain settings.
See [Resend tracking](https://resend.com/docs/dashboard/domains/tracking) and
[Apple Universal Links](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content).

The September 1 DNS check found an SPF record at `send.snap-ortho.com` and a
Resend DKIM public key, but no `_dmarc.snap-ortho.com` TXT record. Add a DMARC
record through the DNS provider (a monitoring policy starts with
`v=DMARC1; p=none;`), then verify SPF/DKIM/DMARC results in a received message's
original headers. DNS presence alone does not establish authentication success.
The user confirmed that all eight tests arrived: seven in Promotions and one
in Primary. This was categorization, not Spam placement; copy changes do not
guarantee Primary placement. See
[Gmail sender guidelines](https://support.google.com/mail/answer/81126).

The test sender checks the three website fallback destinations before sending
any messages. A missing or incorrect fallback stops the batch. It does not
verify whether the recipient has an updated iOS build. See
[the email audit](./brobot-email-audit.md) for the full review.

To send the test set using local configuration:

```bash
NODE_ENV=production node --env-file=.env.local --experimental-strip-types \
  --experimental-loader ./tmp/alias-loader.mjs scripts/send-brobot-marketing-tests.ts \
  --to=beccabaur24@gmail.com --confirm=SEND-MARKETING-TESTS
```

## Pilot send

This is the existing operator-only procedure, not authorization to send during
the current hold. Do not run it until the delivery-quality hold is separately
cleared. Keep the feature flag off during review. When the preview, migration, Resend
domain, webhook, postal address, and audience count have been approved, enable
the flag temporarily and send a small activation pilot:

```bash
BROBOT_MARKETING_SEND_ENABLED=true npm run marketing:campaign -- \
  --campaign=activation_1 --limit=75 --send --confirm=SEND-activation_1
```

Turn the feature flag off after the command. Review delivery, bounce, complaint,
unsubscribe, first-use, and subscription metrics before expanding the cohort.

## Sequence behavior

- Activation 2 requires Activation 1 to have been sent at least three days ago.
- Activation 3 requires Activation 2 to have been sent at least four days ago.
- Any recorded BroBot use removes a user from all activation steps.
- Activation 1 only includes accounts created within the previous 30 days.
- Every campaign requires explicit, timestamped marketing consent.
- Any prior bounce, complaint, or provider suppression blocks future campaigns.
- Current paid/trialing users are excluded from every campaign in this runner.
- Bounces and complaints create global suppression and turn off
  `receive_emails`.
- The email preference page supports topic-level and global unsubscribe.

The pilot remains intentionally operator-triggered. Add scheduled automation
only after the pilot demonstrates healthy complaint, bounce, and conversion
rates.

## September 1 prelaunch follow-up

See [prelaunch findings and audience counts](./brobot-prelaunch-checks-2026-09-01.md).
Uncertain delivery attempts now keep their unique reservation and require manual
reconciliation against Resend before retry. Do not mark them failed or change
template versions simply to bypass duplicate protection. The production runner
now checks sender/postal configuration and destination readiness and paces sends.

## Profile email first, confirmed authentication email second

New campaign selection prefers `user_profiles.email`. When it is missing or
malformed, use the confirmed authentication email. When a new profile-address
delivery receives `email.bounced` or `email.failed`, its delivery record becomes
eligible for one alternate-address attempt on a later normal campaign run. The
fallback must be different, currently confirmed, and free of known delivery
failures. Timeouts, missing receipts, and messages known to have been delivered
do not trigger fallback.

The sender rechecks both addresses, confirmation, consent, suppression and
history immediately before reserving a send. Unsubscribes, complaints and
provider suppressions block both addresses. Profile-address bounce/failure
events are tracked on the delivery row instead of changing the user's consent.
Legacy/authentication-address bounces retain their existing global blocks.

The alternate attempt uses the stable reservation version `v1.auth-fallback`
and metadata linking it to the failed primary delivery, where applicable. This
is an explicit single alternate-address attempt, not an arbitrary template
version bump. Never change that key to force another retry. Fallback attempts
consume the normal daily send budget; the webhook never sends email directly.

Deploy the webhook and sender changes together before resuming production. The
current rollout remains on its delivery-quality hold. The three pilot bounces
were authentication-address sends; they are not failed profile sends and are
not eligible for this fallback. No existing suppressions were cleared.

## Multi-product onboarding and external scheduler

The automated daily journey includes only these one-message cohorts:

| Step | Signal and eligibility |
| --- | --- |
| `activation_1` | Confirmed, explicitly opted-in account created within 30 days and no recorded BroBot request use. |
| `caseprep_activation_1` | Authenticated `product_events.caseprep_completed` within 30 days and no CasePrep start/first-section/completion/failure event in at least two days. |
| `anki_activation_1` | Authenticated `anki_addon_first_downloaded` between one and 14 days ago, with no currently active linked Anki device. |

Anonymous product events are not joined to accounts and never qualify. CasePrep
uses the first-party completion event, not the prompt-bearing `caseprep_runs`
table; Anki uses the user-bound download event and active device-token state.
Missing or failed telemetry therefore excludes a person instead of broadening
eligibility. Consent, confirmed email, current entitlement, provider
suppression, opt-out, address validation, idempotency, and product-signal
checks are repeated immediately before delivery. Product steps use the
`product_updates` topic and distinct campaign keys/UTM labels.

Measure product use by joining each campaign's `lifecycle_emails.user_id` and
`sent_at` to that user's matching product event within 14 days. Report each
journey separately and compare with an unmessaged cohort where available.
This is an observed post-send association, not proof email caused product use.
Do not add prompts, patient details, card contents, or email addresses to
analytics for attribution.

The external scheduler calls the deployed app endpoint:

```text
POST https://snap-ortho.com/api/marketing/automation/run
Authorization: Bearer <MARKETING_SCHEDULER_SECRET>
```

Configure an external scheduler for once daily at **9:00 AM
America/Los_Angeles**, with no Vercel cron entry. The route only runs from
9:00–9:59 AM Pacific and rejects requests outside that window. Retries within
the hour are idempotent: each recipient/step has a durable reservation, a
recipient can receive at most one marketing email per Pacific day, and a
database-wide reservation lock prevents concurrent requests from exceeding 50
marketing reservations/day. The database checks the 24-hour minimum against
the latest actual `sent_at`, so a 9:59 AM batch cannot be followed by a 9:00 AM
batch only 23 hours later. Reservations count against the cap even when a
delivery is ambiguous or fails, avoiding over-send on retries. Only
`lifecycle_emails` rows with non-null `campaign_key` count; transactional
lifecycle and billing win-back messages remain outside the cap. The route
returns aggregate counts only. HTTP 401 means scheduler authentication failed;
HTTP 409 means the call was outside the window; HTTP 503 returns a closed-gate
reason.

The route is fail-closed. In addition to all approval flags and sender
configuration, it requires a delivery confirmation within the preceding
30 days, no unresolved or failed webhook events, no bounce/complaint/provider
suppression or failed delivery in that period, no unresolved `sending`
reservation older than 15 minutes, and delivery confirmation for sends older
than 24 hours. Lookup failures or incomplete telemetry block sending. The
database reservation function independently enforces the 50/day cap even if
the scheduler is called concurrently or an operator runs the CLI.
The temporary zero-bounce/complaint rule is intentionally stricter than the
documented `<2%` delivery-quality target; it is a launch-hold safeguard, not a
permanent replacement for that policy.

**Launch remains blocked pending a separate operator decision.** Known pilot
bounces remain within the 30-day health lookback as of this runbook revision,
so the route is expected to refuse sends even if approval flags are set. Do
not clear suppressions, delete delivery history, mark uncertain sends failed,
or bypass the gate to make a run pass. The operator must resolve the existing
delivery-quality hold, review webhook and quota evidence, deploy and verify
both migrations and the route, validate sender/link preflight, and explicitly
approve rollout. Only then may the operator configure the external schedule
and set the automation, delivery-health, quota-approval, and existing send
flags to `true`.

To hold or roll back automation, disable the external schedule first, then set
`MARKETING_AUTOMATION_ENABLED=false` and
`BROBOT_MARKETING_SEND_ENABLED=false`; leave delivery history, suppressions,
and ambiguous reservations intact. The operator-run dry-run path remains
available while automation is held. Do not configure external scheduling,
production secrets, Vercel settings, DNS, or Resend as part of this repository
change.
