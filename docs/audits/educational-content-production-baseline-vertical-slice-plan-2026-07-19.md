# Educational Content Layer: production baseline and vertical-slice plan

Date: 2026-07-19 (America/Los_Angeles)

Fresh production snapshot: 2026-07-20T03:26:35.684Z

Production KG release: `kg-beta-20260716-002` (`beta_active`, `active`, `automated_beta`)

Scope: read-only measurement, repository audit, offline simulation, and implementation planning

## Executive decision

The smallest structurally viable cohort is Patellar Instability, but it is **not ready to launch**.

The provisional post-remediation cohort is:

| Selector | Exact value |
|---|---|
| Canonical entity | `1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a` — Patellar Instability |
| Primary production neighborhood | `patellar-instability` |
| Orthobullets specialty/topic | `knee-sports` / `patellar-instability` |
| Orthobullets questions | 30 |
| Eligible Anki cards | 4; return at most 3 |
| Eligible deck branch | `Marty McFlyin's Ortho Deck::3) OrthoBullets::Knee & Sports::Knee::Knee Extensor Mechanism::Patellar Instability` |
| Link policy for launch | active, approved, production-eligible, human-reviewed direct question/card links, confidence >= 0.95 |
| Explicit exclusion | `osteochondral-defect-knee`, despite its structural tie, because its 30 questions and 4 cards are the same shared Patellar Instability entity |

Four independent blockers prevent release:

1. All 30 question links and all 4 card links are curriculum-node retargets. There are zero links produced by direct question/card analysis. The same three cards are consequently recommended for every question; shared IDs alone cannot establish relevance.
2. Precision at 1, precision at 3, mapping-error rate, and launch suitability are not measurable until a human labels the reviewer packet. They are intentionally reported as `null`, not inferred from link confidence.
3. The repository has no add-on implementation or API action that resolves and opens a canonical card. `note GUID + card ordinal` is fully populated and unique, but launch success has not been tested.
4. There is no durable, idempotent missed-question event. The extension detects authoritative review state, but no backend path records correctness.

The production BroBot Anki schema also differs from checked-in code: six `brobot_anki_*` tables exist only in production, no matching migration was found, and the study-session API writes four columns absent from the measured production table.

## Safety and reproducibility

The audit connected to `aws-0-us-east-2.pooler.supabase.com`, opened one PostgreSQL transaction, executed `SET TRANSACTION READ ONLY`, verified `transaction_read_only = on`, and ended with `ROLLBACK`. No production DDL or DML was issued. Generated CSV/JSON files are local only.

The executable audit and its exact SQL are in [`scripts/audit-educational-content-production-baseline.ts`](../../scripts/audit-educational-content-production-baseline.ts). The complete machine-readable result is [`production-baseline.json`](../../reports/educational-content-layer/production-baseline-2026-07-19/production-baseline.json).

## 1. Fresh production baseline

### Anki inventory

Imported rows and canonical rows are distinct layers even though their current counts happen to match.

| Measure | Production count |
|---|---:|
| Total imported notes (active) | 4,681 (4,681) |
| Total imported source cards (active) | 5,095 (5,095) |
| Total canonical cards (active) | 5,095 (5,095) |
| Total canonical card versions | 5,095 |
| Active canonical card versions | 5,095 |
| Canonical cards with an active current version | 5,095 |
| Canonical cards with any row in `card_canonical_entity_links` | 377 |
| Canonical cards with an approved production-eligible link | 4 |
| Unique production-eligible card entities | 1 |
| Cards mapped only through the legacy curriculum layer | 1,111 |
| Legacy curriculum-mapped cards with no direct entity-table row | 734 |
| Cards with multiple active canonical-entity links | 0 |
| Cards with no row in `card_canonical_entity_links` | 4,718 |
| Direct-analysis link rows | 0 |
| Curriculum-node-retargeted link rows | 377 |

The 1,111 legacy curriculum-mapped cards split into 377 with a retargeted canonical-entity row and 734 with no such row. All 377 current entity-link rows have `review_status = approved`, but all 377 also have `retarget_path = curriculum_node_bridge`. Approval is therefore not evidence that the card itself was directly analyzed. The mapping-candidate table contains 4,619 `needs_review` rows and 1,111 `auto_mapped` rows. There are no rejected or ambiguous active entity-link rows in the measured link table; unresolved ambiguity/pending work is represented by the candidate statuses rather than multiple active links.

All 4 production-eligible cards are `condition` links in the `knee-sports` specialty and the one Patellar Instability deck branch named above. Detailed breakdowns:

- [`anki-coverage-by-deck.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/anki-coverage-by-deck.csv)
- [`anki-coverage-by-deck-branch.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/anki-coverage-by-deck-branch.csv)
- [`anki-coverage-by-specialty.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/anki-coverage-by-specialty.csv)
- [`anki-coverage-by-entity-type.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/anki-coverage-by-entity-type.csv)
- [`shared-coverage-matrix.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/shared-coverage-matrix.csv) for production-neighborhood coverage
- [`shared-coverage-by-entity.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/shared-coverage-by-entity.csv) for every production-eligible entity

### Orthobullets inventory

| Measure | Production count |
|---|---:|
| Total Orthobullets `external_questions` (active) | 7,557 (7,557) |
| Questions with active curriculum mappings | 7,557 |
| Questions with any row in `question_canonical_entity_links` | 1,801 |
| Questions with an approved production-eligible link | 145 |
| Unique production-eligible question entities | 2 |
| Questions with multiple active canonical-entity links | 0 |
| Questions without a direct entity-table row | 5,756 |
| Direct-analysis link rows | 0 |
| Curriculum-node-retargeted link rows | 1,801 |

All 1,801 link rows are marked approved, but every row is a `curriculum_node_bridge` retarget. Production-eligible coverage consists of 115 ACL Tear topic questions and 30 Patellar Instability topic questions. Only the latter has any shared cards.

Detailed breakdowns:

- [`orthobullets-coverage-by-specialty-topic.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/orthobullets-coverage-by-specialty-topic.csv)
- [`orthobullets-coverage-by-specialty.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/orthobullets-coverage-by-specialty.csv)
- [`orthobullets-coverage-by-entity-type.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/orthobullets-coverage-by-entity-type.csv)
- [`shared-coverage-matrix.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/shared-coverage-matrix.csv) for production-neighborhood coverage
- [`shared-coverage-by-entity.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/shared-coverage-by-entity.csv) for every production-eligible entity

### Shared question/card coverage and ranking

The rank is structural only. It rewards question/card overlap and penalizes migrated-only evidence; it is not a quality score.

| Rank | Neighborhood | KG coverage | Questions | Cards | Questions with >=1 | Questions with >=3 | Avg candidates | Avg link confidence | Migrated links | Decision |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | `patellar-instability` | full | 30 | 4 | 30 (100%) | 30 (100%) | 4.0 | 0.99 | 100% | Only coherent provisional cohort; blocked pending review/launch |
| 2 | `osteochondral-defect-knee` | partial | 30 | 4 | 30 (100%) | 30 (100%) | 4.0 | 0.99 | 100% | False independent candidate; same entity, questions, and cards as rank 1 |
| 3 | `acl-tear` | full | 115 | 0 | 0 | 0 | 0 | 0.99 | 100% | Reject: no card coverage |
| 4 | `multiligament-knee-injury` | partial | 115 | 0 | 0 | 0 | 0 | 0.99 | 100% | Reject: same ACL entity and no card coverage |

For every non-empty row above, the minimum and average link confidence are both 0.99 and the filtered review-status distribution is 100% `approved`. The complete matrix preserves minimum/average confidence and status distribution for every neighborhood; the per-entity file does the same for every production-eligible entity.

The overlap collapse is important:

- Patellar Instability entity `1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a` is a member of both `patellar-instability` and `osteochondral-defect-knee`. It accounts for the same 30 questions and 4 cards in both rows.
- ACL Tear entity `1b49dd16-56bc-4715-afef-84bed49be08e` is a member of both `acl-tear` and `multiligament-knee-injury`. It accounts for the same 115 questions and zero cards.
- The other 79 measured production neighborhoods have no shared question/card coverage. Carpal tunnel/median-nerve neighborhoods therefore do not qualify.

The entity-membership evidence is in [`production-entity-cross-neighborhood-memberships.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/production-entity-cross-neighborhood-memberships.csv).

## 2. Anki identity and opening audit

### Imported educational database

The APKG import path preserves two different identity families:

1. Import-row identity uses `source_note_key = anki-note:<native note id>` and `source_card_key = anki-card:<native card id>`. Upserts conflict on `(source_id, source_note_key)` and `(source_id, source_card_key)`.
2. Logical Anki identity is `anki_note_guid + card_ord`. The schema already indexes `(source_id, anki_note_guid)` and `(note_id, card_ord)`.

Canonical cards point to imported note/card UUIDs, and the current version points to a content-hashed canonical-card version. A native card ID is useful as a fast local hint, but it is not the safest durable key across replacement imports or deck rebuilds. The importer does not currently reconcile a changed native card ID by GUID and ordinal; a source-key change can create/churn the imported card identity and therefore the canonical-card binding.

Fresh identity measurements:

| Identity check | Result |
|---|---:|
| Active cards with native card ID | 5,095 / 5,095 |
| Active cards with note GUID | 5,095 / 5,095 (100%) |
| Unique note-GUID/card-ordinal identities | 5,095 |
| Duplicate note-GUID/card-ordinal identities | 0 |

Conclusion: the technically valid hierarchy is canonical resource ID -> canonical card ID -> source note GUID + card ordinal -> local Anki card ID resolved by the add-on. The native card ID should remain an optimization/hint, not the sole durable contract.

### BroBot add-on integration

Checked-in APIs support:

- device linking and token authentication;
- prep requests containing generated keywords/topics/tags;
- keyword/tag/hybrid plan settings;
- add-on polling of pending prep;
- study-session and matched-card preview reporting using raw local card/note IDs.

They do **not** expose a canonical-card resolver, an `open_card` command, a browser-search command, a filtered-study launch command, or an extension-to-add-on launch path. The add-on implementation itself is not present in this repository, so its actual GUI capability cannot be verified. The extension README explicitly treats Anki generation as out of scope, and the extension and add-on use separate device-token contracts.

Fresh production operational evidence:

| Production table | Rows |
|---|---:|
| `brobot_anki_device_links` | 53 |
| `brobot_anki_device_tokens` | 40 |
| `brobot_anki_addon_devices` | 0 |
| `brobot_anki_prep_requests` | 0 |
| `brobot_anki_study_sessions` | 0 |
| `brobot_anki_session_matches` | 0 |

RLS is enabled (not forced) on all six tables, with no rows visible in `pg_policies`; service-role access is therefore the effective backend boundary. None of the six tables has a checked-in migration. Additionally, `src/app/api/brobot-anki/study-session/route.ts` writes `max_cards`, `min_match_score`, `include_cloze_siblings`, and `total_candidates_found`, but those columns are absent from the measured production `brobot_anki_study_sessions` schema. This drift must be reconciled before extending the integration.

### Versioned launch contract

Use a queue-based contract because the browser extension cannot directly address a desktop add-on, while the existing add-on integration already polls the backend.

```json
{
  "schemaVersion": "anki_launch_v1",
  "requestId": "uuid",
  "resource": {
    "resourceType": "anki_card",
    "resourceId": "canonical-card-uuid",
    "canonicalCardId": "canonical-card-uuid"
  },
  "sourceIdentity": {
    "sourceSlug": "snaportho-anki",
    "noteGuid": "source-note-guid",
    "cardOrdinal": 0,
    "sourceCardIdHint": "native-card-id",
    "contentHashHint": "optional-version-hash"
  },
  "action": "open_card",
  "fallbackAction": "show_in_browser",
  "expiresAt": "RFC-3339 timestamp"
}
```

Resolution order in the add-on:

1. Validate schema/version, user/device binding, expiry, and replay state.
2. Resolve the local note by GUID, then select the exact template/card ordinal.
3. If not found, try the native card ID hint only after confirming GUID/ordinal.
4. Compare the optional content hash as a warning, not a rejection, so learner-modified cards still open.
5. Prefer selecting the exact card in Anki's browser. Enter a reviewer only if the installed Anki API safely supports a particular-card transition; otherwise browser selection is the reliable fallback.
6. Acknowledge `resolved`, `opened`, `not_found`, `ambiguous`, `unsupported`, or `failed`, with a non-sensitive reason code.

Expected failure behavior:

| Condition | User-visible behavior |
|---|---|
| Add-on absent/offline | Command remains queued until short expiry; show “Open Anki to continue” and a copyable card title |
| Deck missing or source card deleted | `not_found`; keep recommendation visible, offer deck/browser troubleshooting |
| Note makes multiple cards | Resolve exact ordinal; never choose another sibling implicitly |
| Native card ID changed | Resolve by GUID + ordinal; update no server identity during the launch |
| Learner-modified deck | Open GUID + ordinal match and report content-hash mismatch as telemetry only |
| Duplicate GUID/ordinal | `ambiguous`; do not open an arbitrary card |

## 3. Missed-question lifecycle and event design

### Existing lifecycle

The extension extracts the visible source question ID, stem/choice state, selected key, correct key, explanation, and review signals. Its active question key combines page/test position, source ID, stem/choice/image fingerprints. Mutation observation, polling, and URL changes trigger re-extraction; a separate review-state key detects an unanswered-to-review transition without mistaking it for a new question.

Correctness is authoritative only when:

```text
reviewState == answered_review
and selectedAnswerKey is visible
and correctAnswerKey is visible
```

At that point `correct = selectedAnswerKey === correctAnswerKey`. The session store's fingerprint plus generation-based `canCommit` check rejects stale asynchronous responses, and answered explanations are quarantined unless the active fingerprint still matches. The Question Tutor controller then prefetches Explain output.

No durable attempt event exists. Current hint/explain backend calls log outcome, latency, token usage, and hashes/IDs, but do not persist correctness. Authenticated/device-linked extension calls can use Explain; an unlinked guest cannot use that backend route. Repeated DOM changes, manual refreshes, or network retries can observe the same answered-review state more than once, so both client suppression and database idempotency are required.

Provider differences:

- Orthobullets uses provider DOM review classes, selected/correct attributes, distribution rows, and explanation containers.
- AAOS Himalaya has its own extractor and fingerprint, with explicit selected/correct booleans and review state. It is not mapped into the production Orthobullets question source and is excluded from this slice.
- ROCK uses the generic/provider extraction path but has no measured durable source-question/canonical mapping. It is excluded.

### Minimal event

Add `educational_question_attempt_events`; do not add a generic resource registry yet.

| Field | Purpose |
|---|---|
| `id uuid primary key` | Server event identity |
| `user_id uuid not null` | Authenticated linked user; anonymous persistence is out of MVP scope |
| `provider text not null` | Initially constrained to `orthobullets` |
| `source_question_id text not null` | Provider's stable identity |
| `external_question_id uuid null` | Resolved `external_questions.id`; null records mapping/no-result diagnostics |
| `session_fingerprint_hash text not null` | Server-side SHA-256 of the transient fingerprint; never store stem/choices |
| `correct boolean not null` | Authoritative comparison result |
| `canonical_entity_ids uuid[] not null` | Approved production entity snapshot used at event time |
| `mapping_snapshot jsonb not null` | Release ID and exact link IDs/versions/confidences, not content |
| `extension_version text not null` | Debug/rollout dimension |
| `occurred_at timestamptz not null` | Client observation time, bounded server-side |
| `received_at timestamptz not null default now()` | Server receipt time |
| `idempotency_key text not null unique` | SHA-256 of user/provider/source question/fingerprint/review transition |

Omit selected-answer ID from MVP because only correctness is needed for recommendations. If later analysis requires it and policy approves, store the answer key (`A`, `B`, etc.), never answer text.

The authoritative client trigger belongs in `QuestionTutorController` immediately after an active fingerprint commits a transition from a non-review state to `answered_review`, and only when both keys are present. It should:

1. mark the fingerprint as locally reported;
2. POST a non-blocking event only for an incorrect result;
3. let the backend resolve `external_question_id` and approved production links;
4. insert with `ON CONFLICT (idempotency_key) DO NOTHING` and return the existing event on retries;
5. request recommendations using the persisted event ID as correlation ID.

No question text, choices, explanations, percent distributions, or images cross this event boundary.

RLS: enable and force RLS; revoke table access from `anon` and `authenticated`; grant only `service_role`; accept writes through the authenticated extension API after device-user resolution. Admin review uses a service route. If anonymous recommendations become a product requirement, design a separately consented installation identifier and retention policy rather than silently weakening this table.

## 4. Offline direct-entity recommendation simulation

The simulator loaded active approved production-eligible question links, joined active approved card links on the exact entity ID, performed no neighborhood expansion and no LLM ranking, deduplicated siblings by note GUID, and returned at most three cards. Ranking is deterministic: count of exact shared entities, minimum question/card confidence, direct-link provenance, then canonical card ID.

Because only one coarse entity is available, every one of the 30 questions receives the same top three cards from a four-card pool. This is precisely why structural coverage must not be reported as relevance quality.

The safe reviewer packet contains question identity/topic metadata but no stem, choices, explanation, or image. It has 90 recommendation rows and blank fields for `reviewerLabel`, `reviewerNotes`, and `missingObviousCard`:

- [`recommendation-reviewer-packet.csv`](../../reports/educational-content-layer/production-baseline-2026-07-19/recommendation-reviewer-packet.csv)
- [`reviewer-packet-metrics.json`](../../reports/educational-content-layer/production-baseline-2026-07-19/reviewer-packet-metrics.json)

Pre-review metrics:

| Metric | Result | Interpretation |
|---|---:|---|
| Sampled questions | 30 | All available structurally overlapping questions |
| Recommendation rows | 90 | Three per question |
| Precision@1 | `null` | Human labels required |
| Precision@3 | `null` | Human labels required |
| No-result rate | 0% | Structural only |
| Fewer-than-three rate | 0% | Structural only |
| Sibling-duplicate candidate rate | 0% | By note-GUID dedupe |
| Mapping-error rate | `null` | Human review required |
| Sets carrying GUID + ordinal | 100% | Resolvable identity, not successful launch |
| Local launch success | `null` | No open-card capability to test |
| Suitable-for-launch percentage | `null` | Cannot claim before labels and launch test |

Reviewer labels should be `highly_relevant`, `acceptable`, `weak`, `incorrect`, or `duplicate_redundant`; `missingObviousCard` is independent. Precision@k counts `highly_relevant` and `acceptable` as relevant. A question is launch-suitable only if rank 1 is relevant, at least two of three are relevant, none is incorrect, and no obvious missing card is flagged.

## 5. Exact launch-slice decision

No cohort meets the launch bar today. The cohort is therefore **selected for remediation and explicitly rejected for production launch**.

After remediation, selection must be enforced by the canonical entity UUID, not neighborhood membership. The allowed set contains only `1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a`. Require Orthobullets source, `knee-sports/patellar-instability`, the exact deck branch, active current card versions, and human-reviewed direct links at confidence >= 0.95. Exclude broad/ambiguous entities, all `curriculum_node_bridge`-only links, neighborhood-only expansion, ACL, and the osteochondral neighborhood alias.

## 6. First vertical-slice implementation plan

### A. Smallest non-dead-end architecture

Use `external_questions`, `question_canonical_entity_links`, `canonical_cards`, `canonical_card_versions`, and `card_canonical_entity_links` directly. Do not create `educational_resources`, `educational_resource_versions`, or `resource_entity_links` for the first release.

The API contract should still return `{ resourceType: "anki_card", resourceId: canonicalCardId }`, allowing a later registry to adopt the same outward identity. A thin SQL view such as `v_educational_anki_card_resources` may normalize card/version/source identity, but it must not duplicate ownership or move cards into `canonical_relationships`.

Required new persistence is narrowly operational: attempt events and add-on launch commands/acknowledgements.

### B. Recommendation query

Inputs:

- authenticated user/device;
- persisted attempt event ID;
- Orthobullets source question ID;
- pinned active production release ID;
- allowlisted entity IDs and deck branch;
- maximum results fixed at 3.

Join/filter order:

```sql
external_sources(slug = 'orthobullets')
-> external_questions(source_id, external_question_id, is_active)
-> question_canonical_entity_links(external_question_id, is_active, approved, confidence >= .95)
-> kg_production_objects + kg_production_neighborhood_objects(release, published, risk != high)
-> card_canonical_entity_links(same canonical_entity_id, is_active, approved, confidence >= .95)
-> canonical_cards(is_active, active current_version_id)
-> canonical_card_versions(is_active)
-> anki_cards + anki_notes + anki_decks(exact branch)
```

For the pilot, also require reviewed direct provenance; the present migrated rows must not satisfy it. Rank by number of exact shared allowlisted entities, direct/manual review status, minimum link confidence, card curation status, then stable canonical-card UUID. Dedupe by `(note_guid, card_ord)` and also suppress multiple recommendations from one note unless a reviewer explicitly allows siblings. Return three. Do not expand to neighborhood siblings or keywords.

Fallback: return an explicit `no_results` reason and hide the card list; keep Explain Mode intact. Do not silently fall back to keyword search.

Latency target: recommendation endpoint p95 <= 150 ms server-side, excluding the desktop launch round trip.

Indexes to verify/add in a migration:

```sql
create index concurrently if not exists qcel_recommendation_lookup_idx
  on question_canonical_entity_links (external_question_id, canonical_entity_id, mapping_confidence desc)
  where is_active and review_status = 'approved';

create index concurrently if not exists ccel_recommendation_lookup_idx
  on card_canonical_entity_links (canonical_entity_id, canonical_card_id, mapping_confidence desc)
  where is_active and review_status = 'approved';

create index concurrently if not exists anki_notes_guid_resolver_idx
  on anki_notes (source_id, anki_note_guid)
  where is_active and anki_note_guid is not null;

create unique index if not exists educational_attempt_idempotency_uidx
  on educational_question_attempt_events (idempotency_key);

create index if not exists anki_launch_pending_device_idx
  on brobot_anki_launch_commands (user_id, addon_device_id, status, expires_at, created_at)
  where status = 'pending';
```

Use non-concurrent equivalents inside transaction-managed local migrations if the migration runner cannot run `CONCURRENTLY`; apply production indexes separately under the normal operational process. Existing unique/index definitions may make some redundant, so validate with `pg_indexes` before applying.

### C. Miss persistence and privacy

Implement the event described above. Resolve entity links server-side so a client cannot submit trusted canonical IDs. Keep the client's observed mapping/version only as an untrusted comparison field if needed. Store only IDs, booleans, version, timestamps, and hashes. Define a short product retention window for attempt/launch telemetry and deletion on account deletion.

### D. Complete Anki launch flow

```text
Extension card click
-> authenticated web API creates short-lived command
-> command is bound to user + active add-on device
-> add-on polls pending commands
-> add-on resolves note GUID + ordinal locally
-> add-on selects exact card in Browser (or supported reviewer)
-> add-on ACKs resolved/opened/failure
-> extension polls/subscribes for status and updates the card row
```

Commands must expire, be single-consumer, be replay-safe, and never contain card body content. The backend must not mark success when it merely queued a command; `opened` must be acknowledged by the add-on after the GUI action.

### E. UI placement

Render a compact `Relevant Anki Cards` block directly below the answered-review explanation/action area in the existing Question Tutor panel. Show title/safe preview, deck label, and one `Open in Anki` action per row. Keep it hidden while unanswered, on correct answers for MVP, and when the recommendation endpoint returns no results. Show inline queued/opened/failure state without replacing Explain Mode.

### F. Telemetry

Use a recommendation correlation ID separate from existing KG retrieval telemetry:

- `recommendation_generated` (event ID, result count, link/version snapshot);
- `recommendation_impression`;
- `recommendation_card_clicked`;
- `anki_card_resolved_local`;
- `anki_card_opened`;
- `anki_launch_failed` (reason code);
- `recommendation_dismissed`;
- `recommendation_no_results`;
- `recommendation_feedback`.

Do not include question/card bodies. Preserve `attempt_event_id`, `recommendation_id`, and `launch_request_id` for correlation. Treat a local resolve and a successful GUI open as distinct events.

### G. File-by-file change plan

| File | Planned change |
|---|---|
| `supabase/migrations/<timestamp>_educational_question_attempt_events.sql` | Add attempt table, constraints, retention fields, forced RLS, service-role grants, idempotency index |
| `supabase/migrations/<timestamp>_brobot_anki_launch_commands.sql` | First reconcile/check in all existing BroBot Anki schema; add launch commands, statuses, expiry, device binding, ACK fields, indexes, forced RLS/service-only policies |
| `src/lib/education/recommendations/contracts.ts` | Version recommendation, attempt, and resource response types |
| `src/lib/education/recommendations/repository.ts` | Exact-entity, production-filtered SQL/Supabase query; release pinning and allowlist |
| `src/lib/education/recommendations/ranker.ts` | Deterministic ranking and GUID/ordinal sibling dedupe; no LLM/keyword fallback |
| `src/app/api/brobot/orthobullets/attempts/route.ts` | Authenticate extension, validate authoritative minimal payload, resolve question/entity snapshot, idempotent insert |
| `src/app/api/brobot/orthobullets/recommendations/route.ts` | Return up to three safe cards for an incorrect persisted event |
| `src/app/api/brobot-anki/launch/route.ts` | Create versioned short-lived command for a linked user/device |
| `src/app/api/brobot-anki/launch/pending/route.ts` | Add-on authenticated claim/poll endpoint |
| `src/app/api/brobot-anki/launch/ack/route.ts` | Add-on acknowledgement with validated reason codes |
| `src/app/api/brobot-anki/study-session/route.ts` | Reconcile four code/production column mismatches before relying on session APIs |
| `extensions/orthobullets-brobot/src/shared/messages.ts` | Add minimal attempt, recommendation, and launch messages/contracts |
| `extensions/orthobullets-brobot/src/sidepanel/question-session.ts` | Track prior review state, locally reported event key, recommendation state, and correlation IDs |
| `extensions/orthobullets-brobot/src/sidepanel/question-tutor-controller.ts` | Emit once on authoritative incorrect transition; fetch cards; guard every commit by fingerprint/generation |
| `extensions/orthobullets-brobot/src/background.ts` | Route authenticated attempts/recommendations/launch requests without passing protected bodies |
| `extensions/orthobullets-brobot/src/sidepanel/App.ts` | Add compact answered-review-only card block and graceful launch states |
| Corresponding `*.test.ts` files | Transition/idempotency, stale fingerprint, direct-only ranking, dedupe, no-result, privacy payload, launch status tests |
| Add-on repository (not present) `sync_client.py` | Poll/claim/ACK versioned launch commands |
| Add-on repository (not present) `launch_resolver.py` | Resolve GUID + ordinal with native-ID hint and ambiguity handling |
| Add-on repository (not present) `gui_actions.py` | Select exact card in browser/reviewer and report actual open outcome |

The final three paths are contractual placeholders, not confirmed filenames. The add-on repository must be located or checked in before implementation can be considered end-to-end.

## 7. Rollout gates

All gates are required for this cohort:

| Gate | Required threshold | Current |
|---|---:|---:|
| Human reviewer precision@1 | >= 95% | `null` |
| Human reviewer precision@3 | >= 90% | `null` |
| Suitable questions | >= 85% | `null` |
| No-result rate | <= 10% | 0% structural only |
| Fewer-than-three rate | <= 20% | 0% structural only |
| Duplicate/redundant rate | <= 5% | 0% sibling identity only |
| Mapping-error rate | <= 5% | `null` |
| Local card resolved and opened | >= 95% over >= 30 attempts and at least 3 environments | `null` |
| Recommendation latency p95 | <= 150 ms | not measured |
| Duplicate accepted attempt events | <= 0.1%; target 0 via unique key | not implemented |
| Raw protected question content in event/telemetry | 0 | design satisfies; implementation unverified |
| RLS/service-boundary tests | 100% pass, including cross-user denial | not implemented |

## 8. Privacy, licensing, RLS, and operational risks

- The reviewer packet intentionally excludes question stem, choices, explanation, and images. It contains safe source IDs/topic metadata and user-owned imported-card titles/previews.
- Do not persist protected Orthobullets/AAOS/ROCK content in events, telemetry, logs, or launch commands. Existing live DOM use for tutoring does not imply persistence rights.
- Canonical link confidence is not a relevance label. Migrated “approved” rows require direct human review for this use case.
- Never trust client-submitted entity IDs or correctness without checking answered-review keys and resolving server-side records.
- Service-role-only tables should use forced RLS where practical, explicit grants, cross-user tests, retention/deletion policy, and audit logging without content.
- The production-only BroBot Anki schema is a deployment-reproducibility risk. Check in a reconciled baseline migration before new launch tables.
- The study-session column mismatch can fail runtime inserts and is evidence that local code is not a sufficient description of production.
- The add-on may be able to show a browser card but not safely force an arbitrary reviewer card; the contract makes browser selection the reliable fallback and requires empirical verification.

## 9. Exact commands and queries run

Primary production measurement command, run from the repository root:

```bash
node --experimental-strip-types scripts/audit-educational-content-production-baseline.ts
```

The script loads `DATABASE_URL` from the existing local environment configuration, writes only to `reports/educational-content-layer/production-baseline-2026-07-19`, and contains every exact production query. Its safety preamble is:

```sql
begin;
set transaction read only;
set local statement_timeout = '120s';
show transaction_read_only;
-- SELECT statements in the checked-in script
rollback;
```

Read-only repository/report inspection used:

```bash
rg -n "source_note_key|source_card_key|anki_note_guid|card_ord|brobot_anki|answered_review|selectedAnswerKey|correctAnswerKey|canCommit" src extensions supabase scripts
find src/app/api/brobot-anki -type f -maxdepth 4 -print
jq '{generatedAt,safety,activeRelease,anki,orthobullets,preReviewMetrics}' reports/educational-content-layer/production-baseline-2026-07-19/production-baseline.json
git status --short
```

No production mutation, automatic mapping approval, new entity creation, LLM recommendation ranking, or copyrighted-question persistence was performed.

## 10. Minimum concrete work to become ready

1. Reconcile and check in the production BroBot Anki schema, fix the four study-session column mismatches, and identify/check in the actual add-on codebase.
2. Directly review the 30 question-to-entity mappings and 4 card-to-entity mappings for this use case. Record direct review provenance; do not let migrated-only status satisfy the launch query.
3. Have a qualified reviewer label all 90 packet rows. Meet precision, mapping-error, duplication, and suitability gates; otherwise narrow or reject the cohort.
4. Implement the minimal idempotent missed-question table/API and pass privacy, retry, stale-state, and cross-user RLS tests.
5. Implement `anki_launch_v1` end to end, including GUID/ordinal resolution in the add-on, actual GUI acknowledgement, expiry/replay behavior, and all failure paths.
6. Run at least 30 real launch attempts across three representative local environments and achieve >= 95% resolved-and-opened success.
7. Measure the exact recommendation query at production-like load and meet p95 <= 150 ms before a feature-flagged pilot.

## Final verdict

`VERTICAL_SLICE_BLOCKED`
