# SnapOrtho Master Deck versioning audit and rebuild plan

Date: 2026-07-28  
Status: architecture audit; do not continue production rollout of sync v1

## Executive decision

The current `snaportho-deck-sync-manifest.v1` updater should be frozen. It is not
safe to repair by changing the dialog or relaxing the conflict rule.

The replacement should be note-centric, cursor-based, and backed by a small local
SQLite mirror. Published releases must be immutable. Updates should use a
field-aware merge policy with explicit protected fields, while SnapOrtho-owned tag
namespaces remain server-authoritative.

The desired experience is:

1. SnapOrtho checks automatically after normal Anki sync or on startup.
2. Settings shows `Up to date`, `Update available`, `Updating`, or `Needs attention`.
3. One **Update now** action applies a resumable delta.
4. A native Anki progress indicator reports notes and media processed.
5. A small completion toast reports the result; detailed logs are optional.

## Evidence from the failed run

| Observation | Architectural implication |
|---|---|
| The first plan contained exactly 1,000 actions despite 3,670 local Master cards. | The release read is capped by Supabase's row limit. `anki_deck_release_cards`, versions, and mappings are not fully paginated. The client never received a complete release. |
| The next plan contained exactly 1,000 conflicts. | The same truncated cohort was evaluated again after the first attempted write. The installed baseline no longer matched the locally recomputed aggregate hash. |
| Local Master card count changed from 3,670 to 3,921. | Applying note content changed the set of generated cloze cards. Counting cards is not equivalent to counting subscribed notes, and writes can create/delete cloze siblings. |
| The release remained `0.3.1-cloze-media` while governed tags changed. | Published release content was effectively changed after publication. A release identifier cannot be trusted as an immutable snapshot. |
| A tag publication caused “content updates.” | Content, tags, media, template, and placement are collapsed into one hash and one update category. The updater cannot explain or safely merge the change. |

## Root causes in SnapOrtho sync v1

### P0 — incomplete manifests

`loadReleaseManifest()` reads `anki_deck_release_cards` without range pagination.
The result is capped at 1,000 rows. Related `.in(...)` reads for versions and
mappings are also not chunked consistently.

Consequence: every plan is computed against a partial deck, and completeness is
neither declared nor verified.

### P0 — card identity stored on an Anki note

The fields `SnapOrtho_ID`, `SnapOrtho_Version`, and
`SnapOrtho_Installed_Hash` live on a note, but their values describe a canonical
card and include `cardOrdinal`.

That is invalid for cloze notes. All sibling cards share the same note fields,
while each sibling has a different ordinal. The last value written to the note
cannot identify every generated card.

Consequence: sibling cards overwrite one another's identity and baseline. A note
content update can also change the sibling set, which makes inventory counts and
identity comparisons unstable.

### P0 — post-publication mutation

The latest independently published rendered-tag manifest is overlaid onto an
older deck release at read time. The overlay also changes `contentHash`.

Consequence: the same deck release ID and version can produce different manifests
on different days. Clients cannot reproduce, resume, verify, or roll back a
release.

### P0 — manifest/write field contract mismatch

The assembled normalized manifest emits field snapshots as
`{"name": ..., "rawValue": ...}`. The add-on writer reads
`field["value"]`.

Consequence: a production delta can fail while writing fields even though the
fixture tests pass, because those tests use `value`. This contract mismatch must
be removed rather than patched independently inside sync v1.

### P0 — the baseline hash is too broad and not durable

Conflict detection compares:

`local central hash != installed aggregate hash`

The aggregate includes all central fields, every `SnapOrtho::*` tag, and card
ordinal. It does not say which field or tag changed. It is stored in the note
itself rather than in a durable local subscription database.

Consequence: a legitimate tag update, normalization difference, cloze ordinal,
or partial write can convert an entire note into an opaque conflict.

### P1 — all-or-nothing conflict policy

Any local central difference blocks the whole card. SnapOrtho has no protected
field registry and no three-way field merge.

Consequence: one harmless local edit prevents unrelated clinical, tag, and media
updates. The user is presented with hundreds of “conflicts” that are neither
actionable nor meaningfully classified.

### P1 — apply is not a durable transaction

Manifest/media fetch happens separately from local writes. Notes are updated one
card at a time, even when multiple cards belong to one note. The sync cursor is
not advanced atomically with a local baseline mirror.

Consequence: interruption can leave a mixture of remote content, old markers,
new cloze siblings, and an unacknowledged server state.

### P1 — update UX exposes implementation details

The dialog displays onboarding steps, raw action counts, release internals,
technical conflicts, duplicate refresh controls, and a starter-package escape
hatch. It asks the user to reason about the sync engine.

Consequence: even a successful update is difficult to recognize.

## How AnkiHub approaches the problem

AnkiHub is note-centric rather than card-marker-centric:

- A stable AnkiHub note UUID maps to the local Anki note ID in an add-on-owned
  SQLite database. The mirror also stores deck ID, note type ID, GUID, fields,
  tags, modification state, and last update type.
- Deck updates are requested incrementally using a saved `latest_update` cursor.
  The cursor advances only after import.
- Incoming notes are applied to the existing Anki notes; creation, update,
  deletion, and no-change are explicit operations.
- Protected fields are merged field by field. Users can protect all fields or an
  individual field with `AnkiHub_Protect::<field>`.
- Incoming authoritative tags replace ordinary remote tags, while protected,
  internal, and optional local tags are retained.
- Media has its own inventory and synchronization path.
- Note-type changes are handled separately, with operations that require a full
  Anki sync explicitly detected.
- Progress is shown through Anki's native progress surface, and normal deck
  updates can run as part of the broader sync lifecycle.

Primary implementation references:

- [AnkiHub add-on repository](https://github.com/AnkiHubSoftware/ankihub_addon)
- [Local AnkiHub note mirror](https://github.com/AnkiHubSoftware/ankihub_addon/blob/main/ankihub/db/models.py)
- [Incremental deck updater](https://github.com/AnkiHubSoftware/ankihub_addon/blob/main/ankihub/gui/deck_updater.py)
- [Note importer and protected-field merge](https://github.com/AnkiHubSoftware/ankihub_addon/blob/main/ankihub/main/importing.py)
- [Protection-tag behavior](https://github.com/AnkiHubSoftware/ankihub_addon/blob/main/ankihub/main/note_conversion.py)

SnapOrtho should adopt these patterns, not clone AnkiHub's product:

- stable note identity;
- local authoritative baseline;
- incremental cursor;
- field-aware protection;
- separate media and tag semantics;
- idempotent importer;
- native background progress.

## Proposed SnapOrtho sync v2

### 1. Immutable release model

Every published release pins:

- release ID and monotonically increasing sequence;
- parent release ID;
- note snapshot/version IDs;
- note-type schema versions;
- governed tag-manifest ID;
- media-manifest ID;
- deck-placement manifest ID;
- counts for notes, cards, media, and actions;
- checksums for each component and the aggregate release;
- minimum add-on version.

No “latest tag overlay” is allowed at read time. Publishing new tags creates a
new release, even if fields are unchanged.

### 2. Note-level canonical identity

Introduce `canonical_note_id` and `canonical_note_version_id`.

The Anki note stores only a stable `SnapOrtho_Note_ID` for portability and
recovery. The add-on SQLite database owns the mapping:

| Remote | Local |
|---|---|
| canonical note ID | Anki note ID |
| release sequence | applied cursor |
| canonical note version | applied version |
| remote field hashes | field baselines |
| governed tag hash | tag baseline |
| note-type version | local model ID |

Cards are derived children identified by `(canonical_note_id, template/card
ordinal)`. Card rows are never represented by competing note fields.

### 3. Incremental delta protocol

Endpoint shape:

`GET /api/anki/decks/{deckId}/updates?after=<cursor>&limit=<n>`

Each page contains ordered operations:

- `upsert_note`
- `delete_or_retire_note`
- `update_tags`
- `update_deck_placement`
- `update_note_type`
- `media_add`
- `media_remove`

Every page declares `page_count`, `remaining`, `next_cursor`, and a checksum.
The final page declares total expected counts. The client rejects incomplete
deltas.

### 4. Field-aware merge and protection

For each field, compare `base`, `local`, and `remote`:

| Condition | Result |
|---|---|
| local = base | apply remote |
| remote = base | keep local |
| local = remote | accept and advance baseline |
| both changed | apply configured protection policy |

Defaults:

- `Personal_*`, `User_*`, and `Local_*`: always local/protected;
- explicitly protected fields: local wins;
- unprotected canonical fields: remote wins;
- simultaneous unprotected edits: record a recoverable local snapshot, then
  apply remote—do not block the deck update.

Users may protect a field globally by note type or per note with
`SnapOrtho_Protect::<Field_Name>`.

### 5. Namespace-aware tags

Maintain separate sets:

- SnapOrtho governed: `SnapOrtho::Anatomy::*`, `Diagnosis::*`,
  `Treatment::*`, `Specialty::*`, `Workflow::*`;
- SnapOrtho internal/protection tags;
- user tags outside the SnapOrtho governed namespaces.

Only governed namespaces are replaced from the release. User and protection tags
are retained. Tag updates have their own hash and operation type; they do not
masquerade as content updates.

### 6. Safe local transaction and recovery

Before apply:

- require an Anki checkpoint;
- persist the downloaded delta and checksum;
- capture changed local fields/tags in the add-on SQLite journal;
- group all operations by note;
- preflight note type and cloze generation effects.

During apply:

- update each note once;
- allow Anki to regenerate sibling cards;
- never change existing scheduling;
- initialize genuinely new cards according to a declared policy;
- advance the local cursor only after the page commits.

After apply:

- verify note/card/media counts and component hashes;
- persist result;
- acknowledge the server;
- make the operation idempotent.

### 7. Minimal UI

Settings card:

```
Master Deck
Version 24 · Updated today
3,214 notes · 3,921 cards

[ Update now ]     Automatic updates: On
```

While running, use Anki's native progress dialog:

`Updating SnapOrtho · Notes 420/1,105 · Media 12/18`

On completion:

`SnapOrtho updated: 1,105 notes, 84 tag changes, 18 media files`

Only failures open a detailed window. Onboarding is shown only before the first
subscription.

## Delivery plan

### Phase 0 — contain and diagnose

1. Disable the v1 apply action in production.
2. Export a read-only diagnostic inventory from the affected Anki profile.
3. Back up the collection.
4. Classify the 1,000 conflicts by reason and measure duplicate
   `canonicalCardId`, GUID/ordinal drift, cloze sibling changes, and marker/hash
   divergence.
5. Build a one-time recovery preview; do not automatically delete or rewrite
   cards.

Exit criterion: the affected collection has a validated recovery plan and no
further v1 writes occur.

### Phase 1 — server release foundation

1. Add canonical notes and immutable note versions.
2. Pin tag/media/note-type components to releases.
3. Add ordered release sequence and delta operations.
4. Paginate every query and enforce declared completeness.
5. Add publication invariants and rollback metadata.

Exit criterion: a 4,000+ card fixture produces a complete, reproducible manifest
with identical checksums across repeated reads.

### Phase 2 — local mirror and importer

1. Add an add-on SQLite subscription database.
2. Import stable note mappings from the existing marker fields.
3. Implement cursor download/resume.
4. Implement protected-field three-way merge.
5. Implement namespace-aware tags and separate media sync.
6. Apply once per note with a recovery journal.

Exit criterion: running the same delta twice performs zero writes on the second
run.

### Phase 3 — adversarial validation

Required fixtures:

- more than 4,000 cards and more than 1,000 notes;
- multi-cloze notes with sibling creation/removal;
- locally edited protected and unprotected fields;
- personal and governed tags;
- tag-only and media-only releases;
- interrupted downloads and interrupted apply;
- note-type field/template changes;
- deleted/retired notes;
- multi-device AnkiWeb sync.

Required invariants:

- scheduling is unchanged for existing cards;
- personal/protected content is unchanged;
- every release page is accounted for;
- release snapshots are immutable;
- post-update local mirror equals the pinned release for unprotected data;
- rerun is idempotent;
- rollback restores content and sync cursor.

### Phase 4 — UX and controlled rollout

1. Replace the hub with the compact Settings card.
2. Add automatic checks and native Anki progress.
3. Canary with 25 notes, then 250, then the complete deck.
4. Require successful idempotency and collection-diff reports at each gate.
5. Enable automatic updates only after the complete-deck canary passes.

## Immediate recommendation

Do not click **Download starter pack** or attempt another v1 update on the
affected profile. Preserve the current collection so its marker and cloze-card
drift can be analyzed and repaired from a backup-aware preview.
