# BroBot claims retrieval v3 — live inventory (2026-09-29 UTC)

Source: read-only REST snapshot of production (`/tmp/bb-snapshot`, not committed).
Direct Postgres is unreachable from this sandbox (DNS blocked); REST is the live path.

## Corpus

- `educational_claims`: 6,447 total, 6,447 active.
  - Parent `review_status`: 6,443 `unreviewed`, 4 `approved`.
  - Parent `content_source`: 6,417 `generated_draft`, 19 `deprecated`, 7 `needs_review`, 4 `verified`.
  - `importance_level`: 6,304 L2, 134 L1, 6 L4, 3 L3.
- `educational_claim_versions`: 6,447 (one current version per claim in practice).
  - `review_status`/`content_source`: 6,443 `unreviewed`, 4 `approved`+`verified`.
  - `approval_method`: 6,258 `machine_consensus`, 189 `unreviewed`.
  - NOTE: the 4 approved/verified claims use `approval_method='machine_consensus'`,
    not `human_review`. The reviewed path must keep `machine_consensus` permitted.
  - `claim_type`: fact 3,847; anatomy_pearl 1,668; complication 328; imaging_point 322;
    treatment_indication 167; contraindication 41; + small counts of imaging,
    epidemiology, pathophysiology, diagnosis, anatomy, classification, etc.
  - NOTE: v2 mode-fit scoring keys on claim types (`anatomy`, `operative_technique`,
    `diagnosis`, `physical_exam`, ...) that barely exist in the live corpus —
    mode scoring is effectively dead. v3 must map the real factory types.
  - `predicate`: teaches_fact 5,368; complication_of 328; imaging_finding 322;
    indication 145; v5_assertion 79; contraindication 41; preferred_treatment 25; '' 139.
- `card_claim_links`: 3,309 total, all active.
  - 3,290 `auto_approved` / `machine_consensus` / `card-claim-factory.v1` (servable).
  - 19 `needs_review` / `claims-v2.3` (must never be served).
- Deck: latest published release `7764b632-…` (2026-07-26), 16,123 included cards.
- `canonical_entities`: 1,401 active (condition 273, anatomy_structure 273,
  treatment_principle 149, complication 131, ...). All sampled rows `status='reviewed'`.
- `source_aliases`: 8,320 active. **No abbreviation aliases**: ACL/CTR/ORIF/SCFE/FPL/TCL
  return zero rows. Abbreviation expansion must live in query understanding.
- `canonical_entity_aliases`: 68 reviewed rows (schema: alias_name/normalized_alias).
- `canonical_relationships`: 2,248 active.
- `card_canonical_entity_links`: 9,352 rows (965 active+approved).

## Search facilities

- `pg_trgm` installed (migration: `create extension ... pg_trgm with schema extensions`).
  Call as `extensions.similarity` / `%` operator under empty `search_path`.
- Full-text: `english` config usable in SQL (proven by existing
  `search_latest_anki_deck_by_concept`, precision-first card search over latest deck).
- No vector/embedding columns on claims or cards. No semantic index. Hybrid =
  lexical + trigram + FTS + graph traversal; rerank is deterministic.
- Card documents: `canonical_card_versions.field_snapshot` = jsonb array of
  `{name, ordinal, rawValue, plainText}`; primary fields Text/Front/Question,
  supporting Back/Extra/Orthobullets/Classifications/Anatomy.

## Key entity fragmentation (confirmed)

- `Ankle Fracture` / `Ankle Fractures` / `Ankle Fracture Classification` are
  separate canonical entities; v2 exact query returns all three as anchors while
  the natural consult query returns none usable.
- `Radius` (anatomy_structure) vs `Distal Radius` / `Distal Radius Fracture(s)` /
  `Distal Radius ORIF`: generic `Radius` links dominate distal-radius ORIF retrieval.
- `SCFE` entity exists but `slipped...` labels do not; no SCFE aliases.
- CTR regression claim exists and is eligible (approved/verified, id `9e52b505-…`):
  "Iatrogenic transection of the recurrent motor branch … when the transverse
  carpal ligament is cut radially." It has 0 card links, so exact-card yield for
  that prompt is correctly 0 until a published link exists.

## Serving boundary (frozen)

- Reviewed path: current version + `approved` + `verified` + approval_method in
  (`human_review`, `sampled_audit`, `machine_consensus`).
- Factory path: active link + exact current claim/card version ids + card in current
  published release + link `auto_approved|approved` + (`machine_consensus` +
  `card-claim-factory.v1` for automatic admission) + non-empty evidence_hashes +
  factory-produced version (`unreviewed`/`generated_draft`/`machine_consensus`).
- Always excluded: needs_review/rejected/superseded/inactive/stale-version/
  unpublished-deck/claimless rows, the 19 review-queue links, vague-entity admissions.
- RPC: `security invoker`, `set search_path=''`, revoke public/anon/authenticated,
  grant service_role only.
