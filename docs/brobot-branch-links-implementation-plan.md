# BroBot Branch links implementation plan

## Goal

Measure each campaign step from email click through BroBot use while preserving the current app-first experience. The implementation must work with the released iOS app and fall back to the matching website page when the app is unavailable.

## Supported destinations

| Campaign steps | Primary Branch destination | Website fallback | Released-app support |
| --- | --- | --- | --- |
| `activation_1`, `activation_2`, `activation_3` | `$deeplink_path=brobot/guest` | `/brobot/chat` | Yes |
| `habit_1`, `habit_2`, `reengagement_1` | `$deeplink_path=brobot/guest` | `/brobot/chat` | Yes |
| `profile_completion_1` | Direct website link | `/account/profile` | No existing profile deep-link route |
| `conversion_1` | Direct website link | `/brobot/pricing` | No existing pricing deep-link route |

Do not add unsupported native paths. The current iOS router recognizes `brobot/guest` and records `~campaign` and `~channel`. Profile completion and pricing remain web links until a later app release adds those routes.

## Branch link design

Create one reusable Branch link for each supported campaign step. Do not create recipient-specific links and do not place email addresses, user IDs, preference tokens, or other personal data in Branch parameters.

Each link uses:

- `~channel=email`
- `~feature=brobot_lifecycle_email`
- `~campaign` equal to the existing campaign key, such as `brobot_activation_v1`
- `~tags` containing the campaign step, such as `activation_2`
- `$deeplink_path=brobot/guest`
- `$fallback_url` and `$desktop_url` set to the direct SnapOrtho web destination with `utm_source=branch`, `utm_medium=email`, `utm_campaign`, and `utm_content`

Use the existing live Branch domain already associated with the app. Keep Resend click rewriting disabled; Branch is the primary-link redirect and click counter.

## Web implementation

1. Add a small Branch-link configuration module with one environment variable per supported campaign step. Validate that values use an approved SnapOrtho Branch domain.
2. Change `marketingActionUrl()` in `src/lib/marketing/links.ts` to return the configured Branch link for supported BroBot steps. Preserve a separate direct `campaignWebUrl()` for the secondary “Open Chat on the website” link.
3. Keep profile completion and pricing CTAs on their current direct web URLs.
4. Extend `verifyMarketingDestinations()` to require every configured Branch step, verify the Branch host allow-list, and confirm its browser fallback reaches the expected SnapOrtho path with the expected UTM campaign and step.
5. Update link and rendering tests to assert that the primary CTA uses Branch, the browser link stays direct, no recipient data appears in either URL, and unsupported app routes are never generated.
6. Fail closed in production when a required Branch link is missing. Do not silently send a direct primary link under a tracked campaign configuration.

## Attribution repair

Production currently lacks the `product_events` table defined by `20260823_140000_brobot_product_analytics_foundation.sql`. Deploy and verify the analytics schema before the next measured batch.

Then complete the web funnel:

1. Record `brobot_opened` once when the campaign Chat page loads, including the UTM campaign and step.
2. Preserve the allow-listed campaign attribution for the guest session.
3. Pass the anonymous analytics ID and campaign attribution through the BroBot request boundary.
4. Attach that attribution to the server-owned `brobot_request_completed` and `brobot_first_success` events. Do not trust a client-only success event.
5. Validate campaign names against the configured campaign allow-list and continue excluding prompts, answers, email addresses, and other sensitive content.
6. Verify RLS, service-role-only access, analytics views, and production inserts after the migration.

Branch remains the source for email clicks and native app opens. `product_events` becomes the source for website opens and successful website/guest use. The existing `brobot_usage_events` table remains the operational usage source.

## Validation before customer sends

1. Create test-mode Branch links with the same parameter structure.
2. Run unit tests and the campaign link preflight.
3. Send every updated template only to the designated test inbox.
4. Test from iOS Mail and Gmail with the app installed, killed, and absent.
5. Confirm the installed app opens the existing BroBot guest destination and the absent-app path reaches `/brobot/chat` without requiring sign-in before the first use.
6. Confirm one Branch click and deep-link open are visible under the correct campaign step.
7. Submit one guest question on the website and verify `brobot_opened`, `brobot_first_success`, and `brobot_request_completed` carry the same campaign attribution.
8. Confirm unsubscribe links and the direct browser link are never routed through Branch.

## Measured rollout

Resume with a maximum 25-recipient batch after delivery health is cleared. Report these per step:

- delivered messages
- unique Branch clicks and click-through rate
- native app opens
- website campaign opens
- first successful BroBot uses
- click-to-first-use conversion
- complaints, bounces, and unresolved sends

Use aggregate step-level reporting. Do not attempt recipient-level click surveillance. Hold expansion on any broken destination, missing analytics, unresolved provider event, complaint, or delivery-health failure.

## Rollback

Keep the direct SnapOrtho web URLs available. If Branch routing fails during testing, remove the Branch-link environment values and redeploy the prior template behavior before sending. Do not enable Resend click rewriting as an emergency fallback.
