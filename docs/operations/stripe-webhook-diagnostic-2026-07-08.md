# Temporary Stripe webhook production diagnostic

Verified at 2026-07-08 13:29 PDT after production deployment
`dpl_HvRNjVwoqccW9g2LCYQfqRkAVLz3`.

| Check | Result |
| --- | --- |
| Latest event ID processed | `evt_snap...1327` |
| Event type | `snaportho.webhook_diagnostic` |
| Mode | Live |
| First delivery HTTP status | 200 |
| Audit status | Processed; `success: true`; exactly one row |
| Duplicate delivery | HTTP 200; `duplicate: true`; still exactly one row |
| Entitlement update | Not applicable: diagnostic event intentionally had no customer or subscription |
| Production log errors | None; no `ON CONFLICT` error |

This was a signed, non-billing diagnostic payload sent directly to the production
webhook. It created no Stripe customer, checkout session, invoice, subscription,
charge, or entitlement mutation.

No natural Stripe retry or real subscription event had arrived after deployment
at the time of this check. Entitlement mutation must therefore be confirmed from
the next genuine Stripe subscription/invoice/checkout event.
