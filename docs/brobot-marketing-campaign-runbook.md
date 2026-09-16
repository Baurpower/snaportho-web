# BroBot Marketing Campaign Runbook

## Safety model

Campaign commands are dry-run by default. Production delivery requires both
`BROBOT_MARKETING_SEND_ENABLED=true` and an exact per-campaign confirmation
argument. The sender rechecks `user_profiles.receive_emails`, global/topic
opt-outs, and the unique delivery reservation immediately before each send.

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
```

Verify the sending subdomain's SPF, DKIM, and DMARC in Resend. Register the
webhook URL `https://snap-ortho.com/api/webhooks/resend` for delivered, clicked,
bounced, complained, suppressed, and failed events.

## Database rollout

Review and apply `supabase/migrations/20260901185616_brobot_marketing_campaigns.sql`
through the normal production migration workflow. The migration does not
backfill consent provenance: historical `receive_emails=true` records remain
identifiable because `marketing_consent_at` stays null.

## Preview and audience audit

Generate an HTML preview without accessing production data:

```bash
npm run marketing:campaign -- --campaign=activation_1 --preview
```

Count an eligible cohort without sending or printing email addresses:

```bash
npm run marketing:campaign -- --campaign=activation_1 --limit=100
```

Supported steps are `activation_1`, `activation_2`, `activation_3`, `habit_1`,
`habit_2`, `conversion_1`, `profile_completion_1`, `profile_grad_year_1`, and `reengagement_1`.

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

Keep the feature flag off during review. When the preview, migration, Resend
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
