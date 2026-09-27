# Anki search retirement rollout

The relay search feature is retired. Direct browser search, Learn this now,
launch commands, and deck sync remain supported.

## Releases

- Anki user and reviewer add-ons: 1.0.5. Both packages are committed under `dist/`.
- Browser extension: 0.1.1. The production prebuild builds, verifies, and packages
  it under `public/downloads/`, with a release JSON containing its checksum.
- The authenticated Anki download endpoint and Next.js file tracing reference
  the 1.0.5 user package.

## Existing installations

Install the new add-on using Anki's Tools → Add-ons → Install from file, then
restart Anki. If both editions are installed, update both. Only the user edition
owns launch polling when both are present.

For an unpacked browser extension, download and extract the new extension ZIP,
then load that folder in Chrome's extension manager (or replace the files in the
existing folder and reload it). A website deployment cannot replace installed
Anki add-ons or unpacked browser extensions.

Old add-ons may continue sending search polls until updated. Middleware returns
an empty successful response before session authentication, which allows clients
with idle backoff to slow down. The request does not reach a relay route, query
the relay database, or redirect to sign-in. Other retired relay operations return
410 with an update message. These requests still traverse middleware; this is
not a promise of zero requests or zero hosting cost.

## Checks

- `npm run education:anki-search:test` covers retired middleware requests,
  unaffected authentication, resource search, and add-on tests.
- `npm run education:claim-overlap:learner:test` covers launch commands.
- `npm run extension:orthobullets:release` tests and verifies the browser package.
- Both `anki:user:verify-package` and `anki:reviewer:verify-package` check archive
  checksums, matching versions, relay removal, and launch-poller ownership.
- After deployment, GET `/api/anki/search-requests/pending` must return 200 JSON
  with an empty requests array and no Location header. The old extension search
  endpoint must return 410. Launch pending must still reject missing credentials.
- Confirm the extension release JSON reports 0.1.1 and the signed-in Anki
  download returns `snaportho-1.0.5.ankiaddon`.
