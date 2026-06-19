# Google Ads Customer Match Export

SnapOrtho uses Supabase Auth as the source of user accounts. This export creates Customer Match CSVs for Google Ads account `130-435-2227` and domain `snap-ortho.com`.

This is a manual export/import workflow. Do not automatically sync to the Google Ads API until Google Ads credentials, consent requirements, access controls, and upload logging are explicitly configured.

## Audited Data Sources

- `auth.users`: source of account emails.
- `public.user_profiles`: optional profile fields used only for `full_name` and `country`.
- `public.subscriptions`: entitlement/subscription source of truth for paid BroBot access. Stripe rows use Stripe IDs; Apple rows use provider fields. The export does not include provider IDs, Stripe customer IDs, subscription IDs, transaction IDs, product IDs, metadata, or billing details.
- `public.entitlement_overrides`: admin grants/blocks exist, but they are not treated as paid subscribers for these Customer Match audiences unless a future business rule explicitly says to include them.

## Audiences

- **All Registered Users**: every Supabase Auth user with a usable email address.
- **Active Subscribers**: registered users with a `subscriptions` row in `active`, `trialing`, or `past_due` status and no expired `current_period_end`.
- **Free Users / Non-subscribers**: registered users who are not in the Active Subscribers audience.

Google generally needs about 1,000 matched users before Customer Acquisition or lifecycle bidding signals become useful. Smaller lists can still be uploaded, but they may not serve or may have limited bidding value.

## CSV Formats

Manual Google Ads UI upload:

```csv
email,first_name,last_name,country,zip
user@example.com,Jane,Doe,US,
```

Google Ads API-style hashed export:

```csv
normalized_email_hash,first_name,last_name,country,zip
973dfe463ec85785f5f95af5ba3906ee...
```

Emails are normalized before hashing with lowercase + trim, then SHA-256.

## Export Script

Run only from a trusted admin/server shell with `SUPABASE_SERVICE_ROLE_KEY` available. The script loads `.env.local` and `.env` if present.

Plain CSVs for manual Google Ads upload:

```bash
npx tsx scripts/export-google-ads-customer-match.ts
```

Hashed CSVs for a future Google Ads API upload:

```bash
npx tsx scripts/export-google-ads-customer-match.ts --hashed
```

Custom output directory:

```bash
npx tsx scripts/export-google-ads-customer-match.ts --out=tmp/customer-match
```

Default output directory:

```text
tmp/google-ads-customer-match/
```

Generated files:

- `all-registered-users.csv`
- `active-subscribers.csv`
- `free-users-non-subscribers.csv`
- With `--hashed`: the same filenames ending in `.hashed.csv`.

## SQL Queries

The SQL equivalents live in:

```text
supabase/verification/google_ads_customer_match_audiences.sql
```

Run these only from Supabase SQL editor or another trusted admin/service-role context. They read `auth.users`, so they are not appropriate for public client code.

## Manual Upload To Google Ads

1. Open Google Ads account `130-435-2227`.
2. Go to **Tools**.
3. Open **Audience Manager**.
4. Open **Customer Lists**.
5. Choose **Upload customer list**.
6. Select the relevant CSV:
   - All Registered Users
   - Active Subscribers
   - Free Users / Non-subscribers
7. For manual UI upload, use the plain CSV. Google can hash supported identifiers automatically during upload.
8. Name lists clearly, for example `SnapOrtho - Active Subscribers - YYYY-MM-DD`.
9. Use the uploaded audiences to exclude existing customers from prospecting or to support Customer Acquisition bidding.

## Recommended Cadence

- Export monthly while lists are small or spend is low.
- Export weekly if active subscriber counts change quickly or acquisition campaigns depend on current exclusions.
- Avoid exporting more often than needed; every export creates sensitive customer-list files that need handling and deletion.

## Privacy And Compliance Safeguards

- Server-side only: the exporter is a local/admin script, not a public route.
- Service-role only: requires `SUPABASE_SERVICE_ROLE_KEY`.
- No passwords, auth tokens, refresh tokens, session tokens, PHI, clinical content, medical case data, Stripe IDs, Apple transaction IDs, subscription metadata, or billing data are exported.
- Only these columns are emitted: `email` or `normalized_email_hash`, `first_name`, `last_name`, `country`, `zip`.
- `zip` is currently blank because no safe ZIP/postal-code profile source was identified in the audited schema.
- Treat generated CSV files as sensitive customer data. Store them only temporarily, upload them directly to Google Ads, then delete local copies according to SnapOrtho retention policy.
- Confirm that SnapOrtho privacy disclosures, user consent, and Google Customer Match policies permit this use before uploading production lists.
