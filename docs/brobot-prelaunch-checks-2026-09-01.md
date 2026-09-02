# BroBot campaign prelaunch checks — September 1, 2026

Status: hold customer launch until the web fixes below are deployed and the remaining sender/consent checks are resolved. No customer emails were sent, production data was not changed, and the local sending flag remains locked. No iOS changes are required.

## Verified against production

- All three campaign destination families pass the HTTP preflight: existing app guest path redirects to web Chat with attribution; profile and pricing endpoints respond correctly.
- Signed preferences GET returns 200; invalid token returns 400; unsigned webhook POST returns 400. No unsubscribe POST was made against a real customer.
- Apple association endpoint returns 200. This does not establish device-level Universal Link behavior or Resend tracking settings.
- Webhook ledger contains 24 `email.sent` and 24 `email.delivered` events, all processed without recorded errors. These are test events; the campaign delivery ledger has no customer campaign rows.
- Marketing tables have RLS enabled, no anon/authenticated table grants, and the campaign delivery unique index is installed.
- Resend DKIM and sending-subdomain SPF DNS records exist. DMARC TXT at `_dmarc.snap-ortho.com` is missing.

## Audience dry runs

All runs used `BROBOT_MARKETING_SEND_ENABLED=false`, no `--send`, and a selection limit of 25. Counts are a snapshot, not mutually exclusive groups.

| Step | Eligible |
| --- | ---: |
| Activation 1 | 512 |
| Activation 2 | 0 |
| Activation 3 | 0 |
| Habit 1 | 0 |
| Habit 2 | 0 |
| Conversion | 48 |
| Profile completion | 337 |
| Reengagement | 28 |

Do not send all eight steps to the same audience. Follow-up activation steps require earlier successful sends and elapsed time. Profile, conversion, and reengagement cohorts can overlap.

## Fixes made locally in this round

- Successful bounce/complaint/suppression insertion no longer throws `null`. Profile update and event completion failures return an error so Resend can retry; successful retries clear the old processing error.
- Ambiguous provider failures and failed delivery-log finalization retain the unique delivery reservation. They require manual reconciliation instead of becoming eligible for automatic resend. A known provider ID is retained on the fallback logging attempt.
- Template validation occurs before reservation; production runner validates sender, postal address and live destination readiness before sending. Provider requests time out after 30 seconds; the runner spaces recipients by at least one second.
- First use includes conversation creation time, even if an old conversation was reopened recently. Unresolved sends block duplicate attempts but do not qualify as successful prerequisites.
- Subscription exclusion uses the shared entitlement policy, including Apple grace/billing retry access. Pagination uses a stable key.
- Resubscription preserves provider/unknown suppressions. Topic opt-in cannot silently remove a global opt-out.

## Validation

`npm run marketing:campaign:test` passes, including new failure-path regression tests and audience-history tests. `git diff --check` passes. The full typecheck still reports eight existing test-file errors (TS5097 imports and TS2578 unused directives); no new errors appeared in changed implementation files. A clean full typecheck/build is not claimed.

## Remaining launch checks

1. Deploy this round's web changes. Recheck the live routes and exercise unsubscribe/bounce handling with a dedicated test account before a customer pilot; current production event history proves delivery receipt, not the suppression write path.
2. Add a DMARC monitoring record through the DNS provider (`v=DMARC1; p=none;`), then inspect an actual received message's original headers for SPF/DKIM/DMARC results. DNS presence is not proof of authentication alignment. Gmail recommends all three; its bulk-sender requirement applies above 5,000 messages/day. See [Gmail sender guidelines](https://support.google.com/mail/answer/81126).
3. Confirm Resend domain click tracking is disabled for the app links. The local sending-only key cannot inspect domain settings. See [Resend tracking](https://resend.com/docs/dashboard/domains/tracking).
4. Verify historical consent: 568 profiles have `receive_emails=true`, but 566 have no timestamp in the newly introduced `marketing_consent_at` field. This does not prove missing consent; it means the new field cannot establish historical provenance. Confirm the original opt-in source before using the legacy cohort. No records were backfilled or excluded automatically.
5. Resolve the existing full-typecheck gate if required by deployment. Choose one small pilot cohort after the above checks. Keep broader rollout manual while inspecting bounces, complaints and opt-outs.

Operational limitation: event-to-delivery association relies on the provider ID being saved. An accepted send whose log cannot be finalized must be reconciled against Resend; do not clear its reservation or rerun it blindly. Event timestamps currently reflect processing time rather than an ordered provider event history.
