# BroBot email audit — September 1, 2026

## Navigation changes

The current plan uses the existing app only. The proposed iOS routing update
was removed at the user's request; it is not required for this campaign.

| Email | Main CTA | Destination | Browser option |
| --- | --- | --- | --- |
| Activation 1–3 | Open BroBot | Existing `/app/brobot/guest` route | Open Chat on the website |
| Habit 1–2 | Open BroBot | Existing `/app/brobot/guest` route | Open Chat on the website |
| Reengagement | Open BroBot | Existing `/app/brobot/guest` route | Open Chat on the website |
| Conversion | View Unlimited plans | Website `/brobot/pricing` | Same |
| Profile completion | Complete my profile | Website `/account/profile` | Same |

The existing native guest route opens CasePrep. It cannot select Chat through
its current URL interface. The app's profile form exists, but the existing
router has no direct profile or pricing target. Website destinations therefore
provide those exact screens without an app update. New emails never generate
the unsupported `/app/brobot/chat`, `/app/account/profile`, or
`/app/brobot/pricing` paths. Previously sent test emails cannot be edited;
their website fallback handlers remain available.

## Copy changes

- Activation 1: retained the concrete anatomy prompt and first-question invitation.
- Activation 2: retained the three useful examples approved in the review; CTA uses the existing BroBot route; the browser option explicitly names Chat.
- Activation 3: retained one focused anatomy question; removed the implied need
  for a second guest turn to get value.
- Habit 1: retained the approved body; CTA uses the existing BroBot route.
- Habit 2: asks for three quiz questions with answers at the end, so a guest can
  complete the exercise using one response.
- Conversion: removed the fixed dollar price from the email. The web
  plan screen displays the current applicable offer before a purchase.
- Profile completion: names the fields to complete instead of promising
  personalization behavior that the email does not demonstrate.
- Reengagement: retained a concrete classification example and guest invitation.

## Footer and sending fixes

The unsubscribe handler previously treated a successful insert (`error = null`)
as a failure, returning 500. It now distinguishes success, an already-saved
opt-out, and actual database errors. Global profile-update errors are reported
instead of falsely confirming success. Preference and Resend webhook routes are
public only for the relevant methods; signed-token/signature checks remain in
the handlers.

The test sender checks the app fallback and the profile/pricing website destinations before
sending any emails. A missing route, login redirect, lost attribution, or wrong
destination stops the batch. This does not verify an installed app's version.
Test emails still use a dummy recipient user ID, so they are not an end-to-end
test of a real user's saved email preferences.

## Verification

- Campaign tests passed for compatible main links, browser Chat links, preserved
  attribution, preflight failures, and unsubscribe success/failure/one-click cases.
- The proposed campaign-specific native code and its tests were removed while
  preserving the pre-existing iOS modifications.
- Website changes still need deployment. No app release is required.
- The previously reported global typecheck errors in existing test files remain
  outside the campaign changes.

## Remaining checks

Seven original tests landed in Promotions and one in Primary; none were reported
as Spam. The earlier DNS audit found no DMARC record; address it separately.
The sending-only Resend key cannot inspect domain tracking settings. Check actual
email-client handoff using the supported guest link; use the direct browser Chat
link when the user wants the Chat interface rather than CasePrep.
