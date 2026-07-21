# Educational Content Layer: Patellar Instability unblock report

Date: 2026-07-19 (America/Los_Angeles)

Scope: BroBot Anki schema reconciliation, add-on recovery audit, pilot identity verification, and direct-review workflow. No production migration was applied, no mapping was approved, and no user-facing recommendation or launch UI was added.

## Decision

The checked-in BroBot Anki server schema is now reproducible and the four pilot cards have valid server-side source identities. The launch foundation remains blocked because the actual Anki add-on source or distributable is unavailable, no real client can exercise a command contract, and the 30 question plus 4 card mappings still lack human review.

`ANKI_LAUNCH_FOUNDATION_BLOCKED`

## 1. Add-on source determination

The Anki add-on is **unavailable** in the accessible workspace.

Searches covered:

- the current repository and its complete reachable git history;
- unreachable/stashed git commits still present in the object database;
- sibling repositories under `/Users/alexbaur/snaportho_dev`;
- configured remotes and remote branches (`origin/main`, `origin/caseprep`);
- submodules (none configured);
- Desktop, Documents, Downloads, and Spotlight-indexed filenames;
- Python sources, ZIPs, and `.ankiaddon` artifacts;
- references to `x-snaportho-anki-token`, prep polling, and study-session APIs.

Commits `caf63ac` (“validation and bug fixes”), `142fc00` (“anki add-on fixes”), and `dbbd9e7` (“anki fixes”) contain only Next.js API/web changes. No Python client, add-on manifest, `.ankiaddon`, or add-on distribution metadata exists in their trees. The checked-in `extensions/orthobullets-brobot` project is the browser extension, not an Anki add-on.

Consequences:

- maintainability and reproducibility of the add-on cannot be established;
- token storage, polling cadence, local matching, Anki-version support, GUI behavior, error reporting, and update distribution cannot be audited client-side;
- no add-on files were changed;
- no launch queue/table/routes or internal launch harness were created, per the brief's explicit stop condition;
- `anki_launch_v1` remains a design target, not a final exercisable contract.

### Reconstruction plan

Before implementing the launch server, recover ownership and establish a dedicated add-on source package containing:

1. an add-on manifest and supported Anki/Qt version matrix;
2. link-code exchange and hashed-token-aware API client compatible with the existing header contract;
3. durable local configuration with token revocation and device/profile registration;
4. background poller with bounded retries, cancellation, expiry, and UI-thread handoff;
5. a collection resolver that uses note GUID then card/template ordinal, with native card ID only as a verified hint;
6. browser GUI selection with explicit resolved/opened/failed acknowledgements;
7. sanitized error codes and no card/question body transmission;
8. unit tests against a fake collection and integration tests against supported Anki releases;
9. deterministic `.ankiaddon` packaging, checksums, versioning, and update/distribution documentation.

Only after a real client can run should the server add the `anki_launch_v1` queue. The intended state model remains:

```text
pending -> claimed -> resolved -> opened
                    -> not_found | ambiguous | unsupported | failed
pending | claimed | resolved -> expired
```

`created`, `claimed`, `resolved`, and `opened` must remain separate facts. Terminal commands cannot be reclaimed; claim must bind the authenticated user and one active device; GUI completion—not queue insertion—produces `opened`.

## 2. Production schema audit

The read-only catalog snapshot verified all six production tables and captured columns, defaults, constraints, indexes, triggers, grants, policies, and RLS state in [`brobot-anki-schema-verification.json`](../../reports/educational-content-layer/anki-launch-foundation/brobot-anki-schema-verification.json).

### Existing production drift

Production currently has:

- all six tables but no checked-in baseline migration;
- four missing `brobot_anki_study_sessions` columns still used by live code: `max_cards`, `min_match_score`, `include_cloze_siblings`, and `total_candidates_found`;
- RLS enabled but not forced;
- no RLS policies;
- broad table privileges for both `anon` and `authenticated` (access happens to be denied by policy absence, but the ownership boundary is implicit and fragile);
- no updated-at triggers on five mutable tables;
- missing operational indexes for add-on devices, prep polling, and study-session ownership;
- no nonnegative count/score constraints;
- zero add-on device, prep-request, study-session, and match rows in the baseline, so there is no production evidence that the add-on workflow has run successfully.

The new verifier reports 129 expected pre-migration findings, dominated by per-privilege access findings. It proves `transaction_read_only=on` and ends with `ROLLBACK`.

### Intended behavior decision

The four study controls are retained because the checked-in API validates and writes them and they describe the local matching run. Production is not treated as authoritative merely because it predates those fields. No table or existing column was deemed obsolete: every table is still referenced by a route, and absent add-on source is not sufficient evidence for destructive removal.

Two additional live-write bugs were reconciled:

- study-session code sent explicit `NULL` for non-null `applied_base_tag` and `matching_strategy`; it now uses their intended defaults;
- session-match code omitted required `user_id`; it now writes the authenticated owner.

Authenticated requests now verify the caller with the browser/bearer session but access operational tables with the admin client and explicit `userId` filters. This matches the new service-route-only grant boundary.

Application reconciliation changed only existing routes/libraries:

- `src/app/api/brobot-anki/_lib.ts`: authenticated callers receive a service client after identity verification;
- `src/app/api/brobot-anki/prep/route.ts`: prep writes use the service client with the authenticated user ID;
- `src/app/api/brobot-anki/study-session/route.ts`: optional base tag and strategy now resolve to non-null schema defaults;
- `src/app/api/brobot-anki/session-matches/route.ts`: inserted match rows include required authenticated `user_id`.

Server routes added: **none**. Launch routes are intentionally gated on real add-on recovery.

## 3. Migrations added

### Six-table baseline and reconciliation

[`20260719_120000_brobot_anki_schema_reconciliation.sql`](../../supabase/migrations/20260719_120000_brobot_anki_schema_reconciliation.sql) provides:

- clean-database `CREATE TABLE IF NOT EXISTS` definitions for all six tables;
- current primary/foreign/unique/status constraints and expiry/timestamps;
- additive missing study columns;
- nonnegative counts and scores;
- operational ownership/polling indexes;
- updated-at triggers;
- forced RLS;
- removal of direct `anon`/`authenticated` grants;
- exact CRUD grants plus service-role-only policies;
- no destructive row change.

It was not applied to production. The schema verifier is therefore expected to remain red until the migration passes the normal reviewed deployment process.

### Direct-review assertions

[`20260719_121000_educational_link_review_assertions.sql`](../../supabase/migrations/20260719_121000_educational_link_review_assertions.sql) adds a review assertion attached to exactly one existing question or card link. It preserves the link's `curriculum_node_bridge` origin rather than overwriting it.

Each assertion records:

- safe source resource ID and entity ID;
- role (`tests`, `teaches`, `explains`, `demonstrates`, or `broadly_related`);
- reviewer decision and authenticated reviewer UUID;
- timestamp, confidence, safe notes, and optional evidence hashes;
- fixed `direct_human_review` provenance.

A trigger rejects resource/entity snapshots that do not match the attached link. Forced RLS and a service-only policy protect the table. Two pilot views enforce the exact entity, Orthobullets topic or deck branch, active resource/current card version, link approval, direct human approval, role, and confidence >= 0.95. A bridge link alone can never enter either view.

This migration was also not applied to production and contains no review decisions.

## 4. Deterministic schema verification

[`verify-brobot-anki-schema.ts`](../../scripts/verify-brobot-anki-schema.ts) compares the connected database with the checked-in contract and fails on:

- missing tables or columns;
- unexpected columns;
- incompatible types or nullability;
- missing named constraints, indexes, triggers, or policies;
- wrong RLS/forced-RLS state;
- missing or excessive service-role privileges;
- any direct `anon` or `authenticated` table grant;
- any non-service role in a table policy.

It has `--snapshot-only` and verification modes, writes a local JSON artifact, and uses a read-only transaction in both modes.

## 5. Pilot card identity results

[`pilot-card-identity-verification.json`](../../reports/educational-content-layer/anki-launch-foundation/patellar-instability-review/pilot-card-identity-verification.json) verifies all four cards:

| Canonical card ID | Active imported binding | Note GUID | Ordinal | Native ID hint | Active `(source, GUID, ordinal)` matches |
|---|---|---|---:|---|---:|
| `10eb1d14-4517-4a95-8563-f5d03a97a9c7` | yes | present | 0 | present | 1 |
| `1d2deaeb-534c-4260-9981-a885a0cf7ec9` | yes | present | 0 | present | 1 |
| `674a6a2c-a4b8-46d3-8c10-b66a6a37b1c9` | yes | present | 0 | present | 1 |
| `a9cf7f46-57b8-41b2-a575-0c790a2d6c6e` | yes | present | 0 | present | 1 |

Server identity verification is 4/4. This is not a local resolver test: changed native ID, missing note/deck, duplicate GUID, unsupported Anki, and GUI failure tests remain impossible until add-on source is recovered.

## 6. Human-review workflow and status

[`prepare-patellar-instability-review-packets.ts`](../../scripts/prepare-patellar-instability-review-packets.ts) uses a read-only transaction and refuses to generate unless it finds exactly 30 questions and 4 cards in the fixed cohort.

Generated artifacts:

- [`direct-mapping-review.csv`](../../reports/educational-content-layer/anki-launch-foundation/patellar-instability-review/direct-mapping-review.csv): 30 question-link and 4 card-link rows, with blank direct role/decision/reviewer fields;
- [`recommendation-review.csv`](../../reports/educational-content-layer/anki-launch-foundation/patellar-instability-review/recommendation-review.csv): 90 rows sorted/grouped by question;
- [`recommendation-review.md`](../../reports/educational-content-layer/anki-launch-foundation/patellar-instability-review/recommendation-review.md): safe grouped rendering for review;
- the four-card identity report linked above.

No Orthobullets stem, choices, explanation, or image is persisted. Mapping confidence does not pre-fill a human relevance label.

[`validate-patellar-instability-direct-review.ts`](../../scripts/validate-patellar-instability-direct-review.ts) requires exactly 30 question and 4 card decisions, validates reviewer UUID/timestamp, role, decision, confidence, safe-note length, evidence hashes, and fixed entity scope, then emits assertion-shaped JSON for a separately authorized persistence step. It never writes the database.

Current review status:

| Resource | Required | Directly reviewed | Pilot-eligible |
|---|---:|---:|---:|
| Orthobullets questions | 30 | 0 | 0 |
| Anki cards | 4 | 0 | 0 |

The validator correctly rejects the blank packet. Direct human-review provenance therefore remains a blocker.

## 7. Reviewer metrics

[`calculate-patellar-instability-review-metrics.ts`](../../scripts/calculate-patellar-instability-review-metrics.ts) accepts only these recommendation labels:

```text
highly_relevant
acceptable
weak
incorrect
duplicate_redundant
```

It requires reviewer UUID/timestamp and explicit booleans for mapping error and missing-obvious-card, enforces consistent question-level missing-card flags, and rejects incomplete packets. It calculates precision@1, precision@3, precision among returned cards, suitable-question percentage, mapping-error rate, duplicate/redundant rate, missing-obvious-card rate, no-result rate, and fewer-than-three rate.

Launch suitability exactly requires a relevant rank 1, at least two relevant recommendations, no `incorrect`, and no missing obvious card.

Current quality metrics are `null`: the packet is incomplete and the script intentionally exits non-zero instead of treating blanks as labels.

## 8. Launch implementation and real-test status

No `anki_launch_v1` server table, route, add-on resolver, GUI action, or internal harness was implemented. This is the required behavior when the real add-on source is unavailable.

| Gate | Result |
|---|---|
| Command delivery | not testable; 0 attempts |
| Local GUID/ordinal resolution | not testable; 0 attempts |
| GUI browser open | not testable; 0 attempts |
| macOS environment 1 | not run |
| distinct profile/installation | not run |
| additional/Windows environment | not run |
| Required >=30 attempts, >=95% resolved and opened | not met |

The eventual contract must resolve all source metadata server-side from `canonical_card_id`; the client may submit only the canonical card, chosen active device, action, and idempotency key. Final field/version choices should be made with the recovered client so polling, claim atomicity, GUI threading, and supported Anki APIs are testable together.

## 9. Validation results

| Command | Result |
|---|---|
| `npm run education:patellar:test` | pass: CSV, schema/API foundation, complete/incomplete direct-review and metrics tests |
| `npm run lint` | pass, no warnings/errors |
| `npm run build` | pass, 228 static pages generated |
| `npm run typecheck` | fails on 8 unrelated pre-existing test errors; no changed/new file is reported |
| `node --experimental-strip-types scripts/prepare-patellar-instability-review-packets.ts` | pass: 30 questions, 4 cards, 90 rows, identity valid |
| `node --experimental-strip-types scripts/verify-brobot-anki-schema.ts --snapshot-only` | pass: read-only snapshot |
| `node --experimental-strip-types scripts/verify-brobot-anki-schema.ts` | expected fail: production has 129 pre-migration drift findings |
| direct-review validator on blank packet | expected fail: incomplete human review |
| metrics calculator on blank packet | expected fail: incomplete human labels |

Repository-wide typecheck failures are pre-existing:

- six test files import `.ts` paths without `allowImportingTsExtensions`;
- `src/lib/workspace/call/persisted-rule-migration.test.ts` has two union-property errors.

The successful production build includes its own lint/type validity phase and compiled the changed application routes.

## 10. Exact operational commands

```bash
node --experimental-strip-types scripts/verify-brobot-anki-schema.ts --snapshot-only
node --experimental-strip-types scripts/verify-brobot-anki-schema.ts
node --experimental-strip-types scripts/prepare-patellar-instability-review-packets.ts
node --experimental-strip-types scripts/validate-patellar-instability-direct-review.ts
node --experimental-strip-types scripts/calculate-patellar-instability-review-metrics.ts
npm run education:patellar:test
npm run lint
npm run typecheck
npm run build
```

Read-only source-recovery inspection also used `find`, `mdfind`, `rg`, `git log --all`, `git ls-tree`, `git submodule status`, `git branch -a`, and `git fsck --unreachable`. The production scripts explicitly run:

```sql
begin;
set transaction read only;
show transaction_read_only;
-- catalog/cohort SELECT statements only
rollback;
```

## 11. Remaining blockers and minimum next work

1. Recover or authorize reconstruction of the real Anki add-on, check it into a maintained repository, and establish a supported Anki/Qt test matrix.
2. Review and deploy the additive schema migration through the normal process; rerun the verifier until production is green. Do not suppress the four-column mismatch.
3. Review/deploy the assertion migration, have a qualified reviewer complete all 34 mapping rows, validate them, and persist them through an explicitly authorized service workflow.
4. Complete all 90 recommendation labels and meet the existing precision/suitability gates.
5. With the real add-on available, finalize and implement `anki_launch_v1`, atomic claim/ack APIs, GUID/ordinal resolver, browser GUI action, and the internal harness.
6. Run at least 30 launch attempts over three representative environments and achieve >=95% separately measured local resolution and GUI-open success.

## Final verdict

`ANKI_LAUNCH_FOUNDATION_BLOCKED`
