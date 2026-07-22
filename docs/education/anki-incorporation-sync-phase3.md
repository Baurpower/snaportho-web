# Anki incorporation and synchronization Phase 3 foundation

This implementation deliberately stops before canonical writes. It proves deterministic incorporation preview/validation and scheduling-safe sync planning before enabling apply or publish commands.

## Incorporation preview

`buildIncorporationPreview` validates approved proposal evidence, direct review actions, second-reviewer requirements, exact current base versions, GUID/ordinal uniqueness, central field/tag/deck governance, active mapping entities, resolved KG dependencies, and media checksum/MIME/size evidence. It emits deterministic input and preview checksums.

Commands:

```bash
npm run education:anki:incorporation:prepare -- --input=proposals.json --context=context.json --out=preview.json
npm run education:anki:incorporation:validate -- --preview=preview.json
```

Both are local/file-based. Neither connects to Supabase or writes canonical data. No `incorporation:apply` or `release:publish` command exists yet; enabling either before a staging rehearsal would violate the phase gate.

Draft delivery manifests can be built and independently validated with:

```bash
npm run education:anki:release:build -- --input=draft-release-input.json --out=draft-manifest.json
npm run education:anki:release:validate -- --input=draft-release-input.json
```

These commands reject duplicate card/identity keys, personal fields, invalid central paths/tags, and invalid content/media hashes. They do not insert a release or artifact.

## KG and media governance

The migration defines separate KG expansion packets/actions. Incorporation remains blocked until required KG work is independently resolved. Content-addressed media assets pin card version, logical filename, SHA-256, MIME, byte size, object key, license status, and provenance. Unsupported or unresolved media blocks preview.

## Sync plan

Authenticated device APIs expose only published releases and construct manifests from pinned release membership, exact field/tag snapshots, production-eligible version mappings, and licensed media. The sync planner returns `add`, `update`, `media_download`, `conflict`, or `unchanged`; it explicitly disallows scheduling and personal-data mutation.

The add-on's **Check for Master Deck Updates** screen is preview-only. It inventories notes carrying `SnapOrtho_ID`, `SnapOrtho_Version`, and `SnapOrtho_Installed_Hash`, computes a central-only hash that ignores personal fields/tags, and shows action counts and the exact plan. It does not apply updates.

## Deferred write boundary

Canonical version/card creation, mapping incorporation, KG materialization, release building/publication, APKG generation, media download, sync acknowledgement, and local update application remain disabled until:

1. Phase 2 and Phase 3 migrations pass isolated staging verification.
2. A disposable-profile reviewer workflow succeeds.
3. A deterministic preview is independently reproduced.
4. Media provenance is reviewed.
5. Anki note-type and scheduling-preservation tests pass with real collections.

No table in the Phase 3 migration writes to canonical cards, versions, mappings, entities, relationships, or releases.
