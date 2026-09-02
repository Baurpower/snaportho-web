# BroBot email audit — September 1, 2026

## Navigation changes

| Email | Main CTA | App destination | Browser destination |
| --- | --- | --- | --- |
| Activation 1 | Open BroBot Chat | Chat | `/brobot/chat` |
| Activation 2 | Open BroBot Chat | Chat | `/brobot/chat` |
| Activation 3 | Open BroBot Chat | Chat | `/brobot/chat` |
| Habit 1 | Open BroBot Chat | Chat | `/brobot/chat` |
| Habit 2 | Open BroBot Chat | Chat | `/brobot/chat` |
| Conversion | View Unlimited plans | Native plan screen | `/brobot/pricing` |
| Profile completion | Complete my profile | Native profile form, with authentication if needed | `/account/profile` |
| Reengagement | Open BroBot Chat | Chat | `/brobot/chat` |

Each email has a separate “Continue on the website” link. Attribution is retained
on website fallback; arbitrary redirect destinations are not accepted. The old
`/app/brobot/guest` link remains supported and now selects Chat in the updated app.

The original app routed the guest link into `BroBotRootView()` with its default
CasePrep mode. Explicit Chat routing now selects Chat both on entry and when a
BroBot container already exists. Initial pending links are consumed on shell
creation. App-owned links are routed before Branch; unrelated Branch callbacks
cannot replace a pending destination with an unknown route.

The profile form already existed in the app. The missing deep-link destination
now points to that form, waits for profile loading, and survives authentication.
The form is never made public and no email token signs a user into their account.

## Copy changes

- Activation 1: retained the concrete anatomy prompt and first-question invitation.
- Activation 2: retained the three useful examples approved in the review; CTA now
  explicitly names Chat.
- Activation 3: retained one focused anatomy question; removed the implied need
  for a second guest turn to get value.
- Habit 1: retained the approved body; CTA explicitly names Chat.
- Habit 2: asks for three quiz questions with answers at the end, so a guest can
  complete the exercise using one response.
- Conversion: removed the fixed dollar price from the email. The native or web
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

The test sender now checks all three website fallback destinations before
sending any emails. A missing route, login redirect, lost attribution, or wrong
destination stops the batch. This does not verify an installed app's version.
Test emails still use a dummy recipient user ID, so they are not an end-to-end
test of a real user's saved email preferences.

## Verification

- iOS build and all four `CampaignDeepLinkTests` passed on an iPhone simulator.
  Coverage includes Universal Links, custom URLs, Branch path parsing, legacy
  guest links, unrelated URLs, and profile authentication return.
- Website integration checks returned 307 to the expected Chat, profile, or
  pricing route for all four app paths, including the legacy guest path.
- Campaign tests passed, including rendered main/browser links, attribution,
  preflight rejection, and unsubscribe success/failure/duplicate/one-click cases.
- Full website typecheck still reports the pre-existing `.ts` import and unused
  `@ts-expect-error` issues in existing test files; no new errors were reported.
- A separate visual simulator check was blocked during simulator startup.
  A real email-client tap with the updated app still needs device verification.

## Release and remaining checks

Deploy the website and release/install the updated iOS app before retesting the
main email CTAs. Old installed versions do not understand the new Chat, profile,
or pricing paths. Test a cold launch, CasePrep already open, signed-out profile
access, a signed-in incomplete profile, and the no-app website fallback.

Seven of the original tests landed in Gmail Promotions and one in Primary; none
were reported as Spam. There is no evidence that the Primary email's copy was
better. The earlier DNS audit found no DMARC record; add and verify it separately.
The sending-only Resend key cannot inspect domain tracking settings. Confirm
whether click tracking rewrites the app links before testing the actual emails.
