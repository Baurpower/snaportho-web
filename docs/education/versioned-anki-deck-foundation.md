# Versioned SnapOrtho Anki deck foundation

This foundation defines release and mapping contracts only. It does not apply migrations, publish a deck, approve a mapping, or add add-on synchronization.

```text
Anki import
→ canonical card/version
→ draft deck release
→ immutable release manifest
→ version-specific entity candidates
→ human review
→ production-eligible mappings
→ future add-on manifest
```

## Deck release lifecycle

`anki_deck_releases` records `draft → review → published → superseded|retired`. A release pins its import batch, schema/checksum, optional predecessor, and compatibility version. `anki_deck_release_cards` pins the exact current active card version, GUID, ordinal, content hash, deck path, and stable ordering key. Publication freezes both header manifest fields and membership. Corrections require a successor; superseding or retiring never deletes the predecessor manifest.

The stable source identity is note GUID plus card ordinal. Native card ID is only a checked hint. `canonical_cards.id` is the durable SnapOrtho card identity and `canonical_card_versions.id` is the immutable content identity.

## Mapping lifecycle

`anki_card_entity_mapping_runs_v2` records reproducible input/rules hashes. `anki_card_entity_version_mappings` separates generated candidates, review, approval, and production eligibility. Curriculum/direct-link history may support a candidate but cannot stand in for direct review. Candidate generation always produces `needs_review` rows with blank reviewer fields and performs no writes.

Production eligibility requires the current active card/version, active approved canonical entity, published included deck membership, direct human approval at confidence ≥0.95, a substantive role, no unresolved ambiguity, and non-stale lifecycle. An older reviewed version remains history and is reported stale; approval never transfers to a new version.

## Add-on manifest contract

`snaportho-deck-manifest.v1` exposes release identity, checksum, compatibility version, card/version UUIDs, GUID/ordinal, content hash, deck path, ordering/inclusion state, and only production-eligible entity UUIDs. Runtime validation rejects unknown versions, duplicate identities/cards, stale card/version pairs, missing hashes, unsafe metadata, non-published delivery, and unapproved entity IDs. No download or add-on runtime is implemented.

## Administrative boundary

All four tables force RLS, revoke `anon`/`authenticated`, and grant administrative CRUD only to `service_role`. No browser/client write policy or delivery grant exists. Candidate generation, review, and a future publication command remain distinct operations.

## Local workflow

Run the read-only database cohort audit and generate a draft manifest/candidates/blank review CSV:

```bash
npm run education:deck-foundation:cohort -- --out=/tmp/snaportho-deck-foundation
```

The script opens a read-only transaction and rolls it back. Outputs contain IDs, hashes, paths, tags, field names, metrics, and blank review fields—not card bodies. A future apply tool must validate reviewer identity/decision/role/confidence, current version, active entity, and `direct_human_review`; then it may insert reviewed rows. A separate explicit publication action would validate the complete checksum and membership before transitioning a release to `published`. Neither apply path exists here.

Run tests with `npm run education:deck-foundation:test`.

## Rollback and dependencies

Before migration application, remove these source files. After a future application, drop the two views, four tables, four trigger functions, and SHA-array helper; existing cards, versions, mappings, entities, and relationships remain untouched.

Clinician review is required for entity identity, mapping role, ambiguity resolution, and confidence. Product/legal must decide deck-content licensing, manifest delivery rights, retention of review evidence, and whether metadata-only add-on distribution is acceptable.
