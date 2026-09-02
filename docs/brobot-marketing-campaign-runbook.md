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

Learning emails use `https://snap-ortho.com/app/brobot/guest`, an existing iOS
Universal Link. With the app installed, iOS can open its guest BroBot screen.
When the link opens on the website, the route redirects to `/brobot/chat` and
preserves campaign attribution. Deploy the fallback before sending revised
emails: the previous production endpoint returned 404 in the September 1 review.

Web campaign visitors can ask their first question without signing in. The
sign-in invitation appears after an answer; existing guest quotas still apply.
Campaign parameters only control this invitation and never authenticate a user
or grant extra quota.

Profile completion goes to `/account/profile`, retaining that destination through
sign-in. Conversion goes to `/brobot/pricing`. These two remain website links
because the existing iOS router has no account-profile or pricing destination.
Do not substitute its `onboarding` target: that opens signup, not profile editing.

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
Distinguish Gmail Spam placement from Promotions before diagnosing delivery;
copy changes do not guarantee Primary placement. See
[Gmail sender guidelines](https://support.google.com/mail/answer/81126).

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
