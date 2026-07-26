# AWS binary media deployment

Supabase remains authoritative for releases, cards, field text, membership, checksums, and
authorization. AWS stores only binary `.apkg` artifacts and card media.

## Required application secrets

```text
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
SNAPORTHO_ANKI_AWS_BUCKET=snaportho-master-deck
SNAPORTHO_ANKI_CLOUDFRONT_DOMAIN=<distribution>.cloudfront.net
SNAPORTHO_ANKI_CLOUDFRONT_KEY_PAIR_ID=<CloudFront public key id>
SNAPORTHO_ANKI_CLOUDFRONT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

Use a dedicated IAM principal. The publisher needs multipart S3 write/read/head permissions
under `deck-releases/*`; the deployed web app only needs the CloudFront signing private key.
Do not give the web runtime S3 write permission.

## Provision

1. Generate a dedicated RSA key pair for CloudFront signed URLs.
2. Deploy `infra/anki-media-aws.yaml`, passing the public key.
3. Save the stack outputs and private key as deployment secrets.
4. Apply `supabase/migrations/20260726_180000_anki_aws_media_storage.sql`.

## Publish

The publisher builds locally, uploads media and the bootstrap package to S3, verifies object
metadata, smoke-tests a signed CloudFront Range request, registers the binary locations in
Supabase, and publishes the release last.

```bash
npm run education:anki:bootstrap:publish-cloze-beta -- \
  --release-key=snaportho-master-cloze-media \
  --release-version=0.3.1-cloze-media \
  --out=/tmp/SnapOrtho-Master-0.3.1-cloze-media.apkg
```

For a package-only emergency release, pass `--apkg-only-upload`. Normal releases should also
upload individual content-addressed media so later delta updates can fetch missing files.

## Rollback

Old rows default to `storage_provider='supabase_storage'`, so existing artifacts continue to
work. Do not delete Supabase binaries until the AWS release passes a clean-profile import and
Anki's Check Media operation.
