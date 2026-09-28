# Migration History & Safe Release Procedure

## The problem (verified 2026-09-28)

`supabase/migrations/` holds 167 local files, but only 30 use the valid
14-digit version prefix. 137 files use legacy 8-digit date prefixes across
51 dates (34 dates shared by multiple files), and the production ledger
holds exactly 22 versions. A normal `supabase db push --include-all` would
attempt to replay historical DDL against production — FORBIDDEN.

Do NOT "solve" this by replaying history or broadly repairing the remote
ledger. The ledger is correct; the local directory is the mess.

## What this release did

1. Assembled a controlled workdir with exactly the 22 ledger-expected
   files (`/tmp/snaportho-release.OS2d6S`, path recorded in
   `/tmp/snaportho-release-dir` — ephemeral; the SET is what matters, and
   it is re-derivable: ledger versions + new migration files).
2. Renamed 3 local files (content-identical) to their ledger timestamps.
3. Ran `supabase db push` from the workdir in a user terminal (9 applied).
4. Verified post-apply: ledger == 22 expected versions AND every workdir
   file byte-identical to the repo tree (catches applied-but-uncommitted
   drift, e.g. the 27170000 trigger-restore hunk).

## Repeatable procedure for the next release

1. `SELECT version FROM supabase_migrations.schema_migrations ORDER BY 1`
   (read-only) → the ledger set L.
2. Build a workdir: for each v in L, copy the repo file with that version;
   add the NEW migration files. New files MUST use valid 14-digit prefixes
   later than every ledger version.
3. `cmp` every workdir file against the repo tree — must be identical.
4. `supabase db push` from the workdir (never `--include-all` from the repo).
5. Re-run step 1 + step 3. Any version in L not present locally, or any
   byte difference, is a release blocker until explained.
6. Never rename a file AFTER its version is in the ledger; never edit an
   applied migration's statements (follow-ups go in new migrations).

## Long-term note

The 137 legacy files should eventually be normalized (valid prefixes,
ledger reconciliation) as a dedicated, carefully staged project — not as
a drive-by during a feature release.
