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
`habit_2`, `conversion_1`, `profile_completion_1`, and `reengagement_1`.

## Campaign navigation and test review

All main campaign CTAs are Universal Links with explicit native destinations:

| Emails | App path | Native screen | Website fallback |
| --- | --- | --- | --- |
| Activation 1–3, Habit 1–2, Reengagement | `/app/brobot/chat` | BroBot Chat | `/brobot/chat` |
| Profile completion | `/app/account/profile` | Profile form after authentication | `/account/profile` |
| Conversion | `/app/brobot/pricing` | Unlimited plan screen | `/brobot/pricing` |

The old `/app/brobot/guest` path remains a Chat alias. New iOS code handles
both cold launch and links received while CasePrep is already open, preserves
profile navigation through authentication, and routes app-owned links before
Branch attribution. The app already had a profile form; the missing piece was
a deep-link destination pointing to it.

**Release both the website routes and the iOS routing update before using the
new links in a customer campaign.** An old installed app does not gain new
routes when the website deploys. Every email also has a direct website link
for clients or installed app versions that cannot hand off correctly.

Web campaign visitors can ask their first question without signing in. The
sign-in invitation appears after an answer; existing guest quotas still apply.
Campaign parameters only control this invitation and never authenticate a user
or grant extra quota. Profile editing still requires authentication.

Run `npm run marketing:campaign:test` for rendered-link and fallback coverage.
The manual acceptance check is: signed-out web click → chat → first answer →
sign-in invitation, plus a real iPhone click with the app installed and absent.
The native app route still needs device verification; browser tests cannot prove
iOS handoff. Check cold and warm app launches and the actual email client.

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
