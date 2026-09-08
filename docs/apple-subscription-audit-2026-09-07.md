# Apple subscription audit — September 7, 2026

Production is processing Apple subscriptions, but this audit does not establish full end-to-end correctness.

## Verified production evidence

Read-only queries against the SnapOrtho Supabase project found:

- 8 production Apple subscriptions: 5 active, 3 expired.
- 3 sandbox Apple subscriptions, all expired.
- All 11 records were last verified on September 7 at 04:27 UTC. Their statuses match the Apple Server API responses saved in their metadata.
- All 5 active records have future expiration dates and auto-renew enabled; no renewal-flag discrepancies were found.
- No missing owners, duplicate Apple identities, unknown Apple products, or users with multiple current entitlements were found in the stored subscription rows.
- The production webhook returns HTTP 400 with `Missing signedPayload` for an empty POST. This confirms routing and input validation, not successful signed-notification delivery.

## Unresolved purchase

Two unprocessed production notifications (`DID_RENEW` and `DID_CHANGE_RENEWAL_STATUS`, received September 3) refer to original transaction **460003277439759**, which has no subscription row. The recorded transaction is for the monthly product and expires October 2, 2026 at 12:41:45 UTC. It contains no appAccountToken.

The owner is unknown. Do not assign this purchase to an account based only on its transaction ID. Obtain ownership evidence through a support case, verify the current purchase with Apple, and then repair the mapping and replay the notifications. The stored payload was decoded for diagnosis; this audit did not independently reverify its signature or fetch its latest Apple status.

The recovery cron looks back 72 hours and reconciliation scans existing subscription rows. An older unlinked purchase can therefore remain outside both recovery paths.

## Local fixes

- Webhook and reconciliation use the grace-period expiration for subscriptions in grace, rather than the already-ended paid period.
- Grace-period expiration removes access. Terminal events for the same transaction can supersede its extended grace deadline; older transactions remain protected by ordering checks.
- Transaction-lookup fallback respects revocation.
- Reconciliation ignores results belonging to another original transaction. Apple's status API returns all of a customer's subscription groups.
- Billing retry does not inherit a grace deadline when a paid expiration is absent.

Apple documents continued access during grace and the status API's multiple-group response:
- https://developer.apple.com/documentation/StoreKit/Product/SubscriptionInfo/RenewalInfo/gracePeriodExpirationDate
- https://developer.apple.com/documentation/appstoreserverapi/get-all-subscription-statuses

## Validation and remaining work

Apple TypeScript check and 8 targeted test files passed: server state/verification, ordering, reconciliation periods, notification recovery, mobile sync events, notification handler, ownership, and entitlement resolution. No production database changes or deployments were performed.

Local `.env.local` does not contain a usable Apple signing key. The available `.p8` file has a different key ID from the configured key. Direct Apple refresh and a signed test-notification round trip remain unverified; use the deployed environment or obtain the matching server API credentials.

The iOS purchase manager currently permits purchases without a signed-in account and sends a later claim request, while the backend rejects transactions lacking appAccountToken. This contract mismatch can leave signed-out purchases unable to activate automatically. Resolve the intended signed-out purchase/offer-code ownership flow before declaring it reliable. This audit did not change or build the iOS app.

Deploy the tested backend changes through the normal release process, then verify renewal, grace expiration, refund, restore, and signed-out redemption with StoreKit sandbox transactions.
