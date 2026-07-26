# SnapOrtho Master note type + `.apkg` bootstrap — implementation doc

**Purpose:** Self-contained build guide for the **two remaining steps** that unblock end-to-end deck install. The delta-apply path is already written; it cannot run on a fresh install until notes carry marker fields.

**Companion design:** [`DECK_UPDATE_DESIGN.md`](./DECK_UPDATE_DESIGN.md) (architecture, safety invariants, status).  
**Status of this doc:** implementation-ready. No code for these two steps exists yet (as of the handoff that produced this file).

---

## 0. Why these two steps are the blocker

### What already works

| Piece | Where |
|---|---|
| Central-sync hash parity (client ↔ server) | `src/lib/education/anki-deck-incorporation.ts` `computeCentralSyncHash` ↔ `addon/.../sync.py` `central_sync_hash`; frozen vectors in both test suites |
| Identity hash parity | `buildCanonicalContentHash` ↔ `editor.py` `proposed_content_hash` |
| Version gate (`426 upgrade_required`) | `deck-addon-version.ts` + `sync/plan` |
| Media signed URL | `GET …/releases/[id]/media/[sha256]` |
| Sync-ack ledger | `POST …/deck/sync/ack` |
| Reviewer queue | `GET …/reviewer/queue` |
| Delta apply (pure + gateway + dialog) | `deck_update.py`, `anki_runtime.py`, `sync.py` Apply button |
| Add-on package | `dist/snaportho-reviewer-0.6.0.ankiaddon` |

### What does **not** work yet

`installed_card_inventory` (`sync.py`) only inventories notes that have **all three** marker fields populated:

```text
SnapOrtho_ID | SnapOrtho_Version | SnapOrtho_Installed_Hash
```

Today nothing creates notes with those fields filled. So inventory is empty → sync plan is all-`add` or useless → user has no baseline.

**Bootstrap `.apkg`** is how a first-time user gets:

1. The `SnapOrtho Master` note type (with markers + `Personal_Notes`).
2. One note per published release card, GUID-pinned, markers filled, media in package.
3. A baseline the delta path can update forever after.

Until bootstrap lands, delta apply has nothing to key off on a fresh profile.

### Hard invariants (do not violate in either step)

- Never put personal content into the bootstrap package (leave `Personal_Notes` empty).
- Never invent GUIDs — use release membership `note_guid` only.
- Markers must be fields (not tags): survive Anki sync, per-note, browser-friendly.
- Marker fields **excluded** from central-sync hash (already in both hash implementations).
- After bootstrap import, `localCentralContentHash == installedContentHash == contentHash` for every card (plan → all `unchanged` against the same release).
- Do not schedule, ease, or due-manipulate cards in the package; leave Anki defaults for new cards.

---

## 1. Step A — `SnapOrtho Master` note type + marker population

This is a **contract**, not only a UI note type. The add-on already hard-codes the name and field names.

### 1.1 Locked names (already in code — do not rename)

| Constant | Value | Consumers |
|---|---|---|
| Note type name | `SnapOrtho Master` | `deck_update.NOTE_TYPE_NAME`, `anki_runtime.create_central_card` |
| Marker ID | `SnapOrtho_ID` | `deck_update.MARKER_ID`, `sync.MASTER_ID_FIELDS` |
| Marker version | `SnapOrtho_Version` | `deck_update.MARKER_VERSION`, `sync.VERSION_FIELDS` |
| Marker hash | `SnapOrtho_Installed_Hash` | `deck_update.MARKER_HASH`, `sync.HASH_FIELDS` |
| Personal field | `Personal_Notes` | personal regex `^(personal\|user\|local)(_\|::)` also covers it |

`sync.py` also accepts space-separated aliases (`SnapOrtho ID`, etc.) for **read** resilience. **Write only the underscore forms.**

### 1.2 Field set construction

Source of truth for educational field *values* is each card’s `canonical_card_versions.field_snapshot` (JSON array). Import stores fields as:

```ts
{ ordinal: number; name: string; rawValue: string; plainText: string }
```

Manifest construction (`loadReleaseManifest` in `src/app/api/anki/deck/_lib.ts`) already exposes:

```ts
fieldSnapshot: fields,  // from version.field_snapshot
contentHash: computeCentralSyncHash(fields, tags, card_ordinal),
centralTags: tags.filter(t => t.startsWith("SnapOrtho::")),
// plus: noteGuid, cardOrdinal, deckPath, mediaHashes, …
```

**Problem:** different source note types may have different field names (`Front`/`Back` vs `Text`/`Extra`/…). A single Anki note type must have a **fixed** ordered field list.

**v1 rule (shipped — ultimate style contract):**

Field order is **locked** in `src/lib/education/anki-master-card-style.ts` and
`integrations/snaportho-anki/note-types/SnapOrtho Master/fields.json` (cloze `Text` +
`Extra` + full ortho resource set + personal/markers). Do **not** derive order from
import snapshots. Every bootstrap note uses the full list; missing snapshot values are `""`.

Human-editable templates: `note-types/SnapOrtho Master/{front,back}.html` + `style.css`.
Style version: see `SNAPORTHO_STYLE_VERSION` (`1.0.0`). Model type is **cloze** (`type: 1`).

**Lock the field list into the artifact metadata** (e.g. write `field_order.json` next to the builder output and/or store in artifact `safe_metadata` if you add it later) so successive builder runs for the same release are byte-stable.

### 1.3 Marker values (population formula)

For each release membership row / manifest card `c`:

| Field | Value |
|---|---|
| `SnapOrtho_ID` | `c.canonicalCardId` (UUID string) |
| `SnapOrtho_Version` | `c.canonicalCardVersionId` (UUID string) |
| `SnapOrtho_Installed_Hash` | `c.contentHash` = `computeCentralSyncHash(fieldSnapshot, tags, cardOrdinal)` |

This must match `deck_update.marker_values`:

```python
{
  "SnapOrtho_ID": card["canonicalCardId"],
  "SnapOrtho_Version": card["canonicalCardVersionId"],
  "SnapOrtho_Installed_Hash": card["contentHash"],
}
```

**Critical:** hash over **central fields only** (markers + personal already excluded by `computeCentralSyncHash`). Populate markers **after** central field values are known, but **do not** include marker values in the hash input.

### 1.4 Central field values on the note

For field name `N` in the ordered central list:

- Find snapshot entry with `name === N`.
- Prefer `rawValue` (HTML as imported). Fall back to `value` if present (manifest tests use `value`).
- If absent → `""`.

Never write personal content into bootstrap: always set `Personal_Notes` to `""`.

### 1.5 Templates (render central only)

Minimum viable single template (`Card 1`, ord `0`):

```html
<!-- qfmt -->
{{Front}}
<!-- if Front may be absent for some releases, use a safer generic qfmt: first non-empty display field -->

<!-- afmt -->
{{FrontSide}}
<hr id=answer>
{{Back}}
```

**If the derived field list has no `Front`/`Back`**, generate qfmt/afmt from the first one/two central fields by name order, or use a dump template:

```html
{{#FieldName}}<div class="field"><b>FieldName</b><br>{{FieldName}}</div>{{/FieldName}}
```

…for every central field (not personal, not markers). Markers must **not** appear in qfmt/afmt (users should not see UUIDs while reviewing). Optional: hide them with CSS `display:none` only if you ever need them on-card for debug builds — default is omit.

**Multi-ordinal cards:** `max(card_ordinal) + 1` templates required. For each ord `k`, create `Card k+1` with `ord: k`. If source cards used cloze or multi-template layouts and you only ship Basic-style templates, document that cloze-class content is out of scope for bootstrap v1 (or block bootstrap for non-zero ordinals until templates exist). **v1 recommendation:** support `card_ordinal === 0` only; fail the build if any included card has `card_ordinal > 0` until multi-template work is scoped.

### 1.6 CSS (minimal)

```css
.card { font-family: arial; font-size: 20px; text-align: left; color: black; background-color: white; }
img { max-width: 100%; }
```

No branding requirement for v1.

### 1.7 Tags and decks

- Tags on each note: only `centralTags` (`SnapOrtho::…`), space-joined Anki style: `" SnapOrtho::Foot SnapOrtho::Ankle "` (leading/trailing space, space-separated). Sort by code point before join for stability.
- Deck: `deckPath` from membership (`anki_deck_release_cards.deck_path`). Must start with `SnapOrtho::` (already validated by draft manifest builder). Create full path hierarchy (`SnapOrtho`, `SnapOrtho::Foot`, …) as separate deck records.

### 1.8 Pure module to implement first (before SQLite zip)

**New file:** `src/lib/education/anki-bootstrap-notetype.ts`

```ts
// Suggested public API — names can match style of anki-deck-incorporation.ts

export const SNAPORTHO_MASTER_NOTE_TYPE = "SnapOrtho Master";
export const MARKER_FIELDS = [
  "SnapOrtho_ID",
  "SnapOrtho_Version",
  "SnapOrtho_Installed_Hash",
] as const;
export const PERSONAL_NOTES_FIELD = "Personal_Notes";

export function deriveMasterFieldOrder(
  cards: Array<{ fieldSnapshot: Array<{ name: string }> }>,
): string[];

export function buildNoteFieldValues(
  fieldOrder: string[],
  card: {
    fieldSnapshot: Array<{ name: string; rawValue?: string; value?: string }>;
    canonicalCardId: string;
    canonicalCardVersionId: string;
    contentHash: string;
  },
): string[]; // parallel to fieldOrder; Personal_Notes always ""

export function buildMarkerValues(card: {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  contentHash: string;
}): Record<(typeof MARKER_FIELDS)[number], string>;

export function buildMasterNoteTypeSpec(fieldOrder: string[]): {
  name: string;
  fields: Array<{ name: string; ord: number }>;
  templates: Array<{ name: string; ord: number; qfmt: string; afmt: string }>;
  css: string;
};
```

**Unit tests** (`src/lib/education/anki-bootstrap-notetype.test.ts`):

1. Field order: union + sort + fixed tail; personal/marker names in snapshots are dropped from central section.
2. `buildNoteFieldValues` leaves `Personal_Notes` empty and sets markers from card ids/hash.
3. Round-trip with `computeCentralSyncHash`: hashing the central portion of `buildNoteFieldValues` (exclude personal + markers) equals the card’s `contentHash` when snapshot was used to compute that hash.
4. Frozen example with `≥` / `µ` in Front/Back matching existing parity vector when markers present (markers must not change hash).

Wire into package.json:

```json
"education:anki:bootstrap:test": "node --experimental-strip-types src/lib/education/anki-bootstrap-notetype.test.ts"
```

### 1.9 Where markers are *not* stored server-side

Markers are **not** columns on `anki_deck_release_cards`. They are derived at package/apply time from:

- `canonical_card_id`
- `canonical_card_version_id`
- recomputed central-sync hash from version snapshots

Do **not** add DB columns for markers unless a future requirement appears. Derivation keeps published releases as the single source of truth.

### 1.10 Add-on alignment checklist (no code required if already matching)

Confirm (already true as of 0.6.0):

- [x] `create_central_card` looks up note type by exact name `SnapOrtho Master`
- [x] `write_central_update` / `create_central_card` write marker map keys with underscore names
- [x] `central_snapshot_fields` strips personal + markers before central writes
- [x] Inventory skips notes missing any marker

Optional later polish (out of scope for bootstrap): migration helper that stamps markers onto an already-imported non-master deck by GUID match. Bootstrap does not need this.

---

## 2. Step B — `.apkg` bootstrap builder + serve endpoint

### 2.1 Goal artifact

Given a **published** `deck_release_id`, produce a zip `.apkg` and register:

```sql
anki_deck_release_artifacts (
  deck_release_id,
  artifact_type = 'bootstrap_apkg',  -- already allowed by check constraint
  artifact_schema_version = 'snaportho-bootstrap-apkg.v1',
  artifact_checksum = sha256(apkg_bytes)  -- 64 hex lowercase
  object_key = 'deck-releases/<release_id>/bootstrap/<checksum>.apkg',
  byte_size,
  media_type = 'application/apkg',  -- or application/octet-stream
  status = 'draft' | 'validated' | 'published'
)
```

Constraint reminder (`20260721_130000_anki_incorporation_sync_foundation.sql`):

- `artifact_type in ('manifest','bootstrap_apkg','delta_bundle','media_index')`
- checksum `^[a-f0-9]{64}$`
- unique `(deck_release_id, artifact_type, artifact_checksum)`

### 2.2 Package layout (emit **legacy** `collection.anki2`)

Prefer **legacy** format for maximum Anki import compatibility and simpler construction. Existing `parseApkg` falls back to `collection.anki2` when `collection.anki21b` is absent.

Zip entries:

```text
collection.anki2   # SQLite
media              # JSON object: { "0": "logical_filename.png", "1": "…", … }
0                  # bytes for media index 0
1
…
```

Do **not** require `collection.anki21b` for v1.

### 2.3 `collection.anki2` schema (minimal tables)

Create SQLite with Anki’s classic schema (sufficient for import):

```sql
CREATE TABLE col (
  id integer primary key,
  crt integer not null,
  mod integer not null,
  scm integer not null,
  ver integer not null,
  dty integer not null,
  usn integer not null,
  ls integer not null,
  conf text not null,
  models text not null,
  decks text not null,
  dconf text not null,
  tags text not null
);

CREATE TABLE notes (
  id integer primary key,
  guid text not null,
  mid integer not null,
  mod integer not null,
  usn integer not null,
  tags text not null,
  flds text not null,
  sfld text not null,
  csum integer not null,
  flags integer not null,
  data text not null
);

CREATE TABLE cards (
  id integer primary key,
  nid integer not null,
  did integer not null,
  ord integer not null,
  mod integer not null,
  usn integer not null,
  type integer not null,
  queue integer not null,
  due integer not null,
  ivl integer not null,
  factor integer not null,
  reps integer not null,
  lapses integer not null,
  left integer not null,
  odue integer not null,
  odid integer not null,
  flags integer not null,
  data text not null
);

CREATE TABLE graves (
  usn integer not null,
  oid integer not null,
  type integer not null
);

CREATE TABLE revlog (
  id integer primary key,
  cid integer not null,
  usn integer not null,
  ease integer not null,
  ivl integer not null,
  lastIvl integer not null,
  factor integer not null,
  time integer not null,
  type integer not null
);

CREATE INDEX ix_notes_guid on notes (guid);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
```

`col.ver`: use `11` (classic) unless you have a reason to bump.

### 2.4 `col.models` JSON

Single model keyed by string id (millisecond-ish integer as string is fine; **must be stable for a given release** — derive from a fixed seed, e.g. hash of `SnapOrtho Master` + field order):

```json
{
  "<mid>": {
    "id": <mid as number>,
    "name": "SnapOrtho Master",
    "type": 0,
    "mod": 0,
    "usn": -1,
    "sortf": 0,
    "did": null,
    "tmpls": [
      {
        "name": "Card 1",
        "ord": 0,
        "qfmt": "…",
        "afmt": "…",
        "bqfmt": "",
        "bafmt": "",
        "did": null,
        "bfont": "",
        "bsize": 0
      }
    ],
    "flds": [
      {
        "name": "Front",
        "ord": 0,
        "sticky": false,
        "rtl": false,
        "font": "Arial",
        "size": 20,
        "description": "",
        "plainText": false,
        "collapsed": false,
        "excludeFromSearch": false
      }
    ],
    "css": "…",
    "latexPre": "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
    "latexPost": "\\end{document}",
    "req": [[0, "any", [0]]],
    "tags": [],
    "vers": []
  }
}
```

Field `ord` must match position in `flds` array and in note `flds` split order.

### 2.5 `col.decks` JSON

- Always include default deck id `1` (Anki expects it).
- For every distinct `deckPath` and every parent segment:
  - id: stable positive int (e.g. FNV/hash of path string → 31-bit), never collide with `1`.
  - `name`: Anki uses `\x1f` as hierarchy separator **in some DB forms**; legacy `col.decks` often uses `::` in the name string. **Match what `parse-apkg.ts` expects:** it converts `\u001f` → `::`. Safest for import: use `::` in the name (Anki accepts both historically; verify with one live import).
  - Minimal deck object:

```json
{
  "id": 123,
  "name": "SnapOrtho::Foot",
  "mod": 0,
  "usn": -1,
  "collapsed": false,
  "browserCollapsed": false,
  "desc": "",
  "dyn": 0,
  "conf": 1,
  "extendNew": 0,
  "extendRev": 0
}
```

Also provide `dconf` with default config id `1` (copy Anki’s stock default conf JSON — can be a frozen fixture).

### 2.6 Notes rows

For each **included** release card (`inclusion_status = 'included'`, same set as manifest):

| Column | Value |
|---|---|
| `id` | unique positive int; stable order by `ordering_key` (e.g. start 1…n) |
| `guid` | `note_guid` from release membership — **exact string** |
| `mid` | model id |
| `mod` | unix seconds |
| `usn` | -1 |
| `tags` | `" " + centralTags.sorted.join(" ") + " "` |
| `flds` | `fieldValues.join("\u001f")`  (UNIT SEPARATOR) |
| `sfld` | plain text of first **central** field (strip HTML for sort; use existing `stripHtmlToText` from `scripts/lib/education/anki-import/hash.ts`) |
| `csum` | Anki checksum: first 8 hex digits of **sha1** of stripped sort field, parsed as int — see note below |
| `flags` | 0 |
| `data` | `""` |

**Anki `csum` (classic):**

```ts
import { createHash } from "node:crypto";
function ankiFieldChecksum(sfld: string): number {
  const digest = createHash("sha1").update(sfld, "utf8").digest("hex");
  return Number.parseInt(digest.slice(0, 8), 16);
}
```

(If a live Anki import rewrites csum, that is fine; for parse round-trips keep it correct.)

**GUID uniqueness:** builder must fail if two included cards share the same `note_guid` with conflicting field sets, or same guid+ord pair twice. Membership already has unique `(deck_release_id, note_guid, card_ordinal)`.

**One note vs multi-card:** for v1 (`ord === 0` only), one note → one card. If you later support multiple ords sharing a note GUID, group by `note_guid` and emit one note with multiple `cards` rows.

### 2.7 Cards rows

| Column | Value |
|---|---|
| `id` | unique int |
| `nid` | parent note id |
| `did` | deck id for `deckPath` |
| `ord` | `card_ordinal` |
| `mod` | unix seconds |
| `usn` | -1 |
| `type` | 0 (new) |
| `queue` | 0 (new) |
| `due` | note id or sequential new counter (Anki uses due as new-position for new cards) |
| `ivl` | 0 |
| `factor` | 0 |
| `reps` | 0 |
| `lapses` | 0 |
| `left` | 0 |
| `odue` | 0 |
| `odid` | 0 |
| `flags` | 0 |
| `data` | `""` |

### 2.8 Media packaging

Data sources:

- `anki_deck_media_assets` for the release where `license_status != 'excluded'`
- Storage bucket: `anki-deck-media` (`ANKI_DECK_MEDIA_BUCKET` in `_lib.ts`)
- Download by `object_key`; verify `sha256(bytes) === content_sha256`
- Package index: sequential `"0"`, `"1"`, … mapped to `logical_filename`
- Zip stores file entry named `0`, `1`, … with raw bytes
- `media` JSON: `{ "0": "<logical_filename>", … }` (UTF-8, not zstd for v1 — parser accepts plain JSON starting with `{`)

Only include media referenced by **included** cards (join via `canonical_card_version_id` or by scanning `mediaHashes` from the same logic as `loadReleaseManifest`). Skip excluded. Fail build if a referenced hash cannot be fetched or hash-mismatches.

Media filenames in HTML fields must match `logical_filename` (import pipeline already uses those names in HTML).

### 2.9 Builder script layout

**New pure builder lib:**  
`scripts/lib/education/anki-bootstrap/build-apkg.ts`

```ts
export type BootstrapBuildInput = {
  release: {
    id: string;
    releaseKey: string;
    releaseVersion: string;
    manifestChecksum: string;
  };
  cards: Array<{
    canonicalCardId: string;
    canonicalCardVersionId: string;
    noteGuid: string;
    cardOrdinal: number;
    contentHash: string; // central-sync hash
    deckPath: string;
    orderingKey: string;
    inclusionStatus: string;
    fieldSnapshot: Array<{ name: string; rawValue?: string; value?: string }>;
    centralTags: string[];
    mediaHashes: string[];
  }>;
  media: Array<{
    contentSha256: string;
    logicalFilename: string;
    bytes: Buffer;
  }>;
};

export type BootstrapBuildResult = {
  apkgBytes: Buffer;
  artifactChecksum: string;
  noteCount: number;
  cardCount: number;
  mediaCount: number;
  fieldOrder: string[];
  warnings: string[];
};

export function buildBootstrapApkg(input: BootstrapBuildInput): BootstrapBuildResult;
```

**CLI:** `scripts/build-bootstrap-apkg.ts`

```bash
# Suggested invocation
npm run education:anki:bootstrap:build -- \
  --release-id=<uuid> \
  --out=/tmp/snaportho-bootstrap.apkg \
  --register=false
```

Steps in CLI:

1. Service-role Supabase (same pattern as other education scripts — env `SUPABASE_SERVICE_ROLE_KEY` / project URL).
2. Load release; require `status === 'published'` (or allow `draft` with `--allow-draft` for staging).
3. Reuse **exactly** the same card assembly as `loadReleaseManifest` (best: extract shared `buildReleaseManifestData(supabase, releaseId)` from `_lib.ts` into `src/lib/education/…` so API and builder cannot drift).
4. Filter `inclusion_status === 'included'`.
5. Fetch media bytes; verify hashes.
6. Call `buildBootstrapApkg`.
7. Write file; print checksum + counts.
8. Optional `--register`: upload to storage, insert `anki_deck_release_artifacts` row as `validated` or `published`.

**package.json scripts:**

```json
"education:anki:bootstrap:build": "node --experimental-strip-types scripts/build-bootstrap-apkg.ts",
"education:anki:bootstrap:test": "node --experimental-strip-types src/lib/education/anki-bootstrap-notetype.test.ts && node --experimental-strip-types scripts/lib/education/anki-bootstrap/build-apkg.test.ts"
```

### 2.10 Builder unit tests (no Anki UI)

**File:** `scripts/lib/education/anki-bootstrap/build-apkg.test.ts`

Fixture: 2 cards, one shared image, unicode in fields (`≥`, `µ`), tags, two deck paths under `SnapOrtho::`.

Assertions:

1. Output is a zip containing `collection.anki2` + `media` + numbered blobs.
2. `parseApkg(tempPath)` (existing parser) returns:
   - 1 model named `SnapOrtho Master`
   - field names include the three markers + `Personal_Notes`
   - note count = 2; GUIDs match input
   - field values for markers match ids/hash
   - `Personal_Notes` empty
3. Recompute `computeCentralSyncHash` from parsed central fields + tags + ord → equals input `contentHash` for each note.
4. Media manifest maps to correct sha256 of packaged files.
5. Determinism: two builds with same input → identical `artifactChecksum`.

Optional golden: commit a tiny fixture `.apkg` under `scripts/lib/education/anki-bootstrap/fixtures/` once format stabilizes.

### 2.11 Serve endpoint

**New route:**  
`src/app/api/anki/deck/releases/[id]/artifact/bootstrap_apkg/route.ts`

Mirror media endpoint patterns:

1. `deviceAuth(request)` — device token only.
2. Load release; require `status === 'published'`.
3. Load artifact:

```ts
.from("anki_deck_release_artifacts")
.select("object_key,artifact_checksum,byte_size,media_type,status")
.eq("deck_release_id", id)
.eq("artifact_type", "bootstrap_apkg")
.eq("status", "published")
.maybeSingle()
```

4. Signed URL from storage (decide bucket: either reuse `anki-deck-media` under a `bootstrap/` prefix, or introduce `anki-deck-artifacts` — **document choice in PR**; reusing media bucket is fine for v1).
5. Response JSON:

```json
{
  "releaseId": "…",
  "artifactType": "bootstrap_apkg",
  "checksum": "…64 hex…",
  "byteSize": 12345,
  "url": "https://…signed…",
  "expiresInSeconds": 300,
  "filename": "SnapOrtho-Master-<release_version>.apkg"
}
```

6. Contract test in `scripts/lib/education/anki-deck-update-api.test.ts` (or sibling) — same style as media/ack tests: mock supabase, assert 401 without device auth, 404 when no artifact, 200 shape when present.

**Optional website path:** public marketing download can use a staff-signed or CDN URL later; device-auth endpoint is for in-add-on “Download starter deck” (open question in design §8).

### 2.12 Add-on client hook (optional in same PR, not required for builder)

If implementing in-Anki download:

- `api.py`: `deck_bootstrap_apkg(release_id) → GET …/artifact/bootstrap_apkg`
- Surfaces: button on Deck Update dialog when inventory empty: “Download starter deck…”, open URL or save file for user to File → Import.

Out of scope if you only need website distribution for v1.

---

## 3. End-to-end acceptance criteria

### 3.1 Automated

| Check | Command / method |
|---|---|
| Note-type pure tests | `npm run education:anki:bootstrap:test` |
| Hash still parity | `npm run education:anki:phase3:test` + `npm run education:anki-reviewer-addon:test` |
| Round-trip parse | builder test uses `parseApkg` |
| Endpoint contract | extend `anki-deck-update-api` tests |

### 3.2 Live disposable Anki profile (manual — required before calling it done)

1. Fresh Anki profile, install add-on **0.6.0+**.
2. Import generated `.apkg`.
3. Confirm note type `SnapOrtho Master` exists; Browser shows marker fields filled; `Personal_Notes` empty.
4. Open **Check for Master Deck Updates** against the **same** published release:
   - Plan should be **all unchanged** (0 updates / 0 adds / 0 conflicts) if inventory + hashes align.
5. If plan shows mass `conflict` / `add`, debug:
   - Marker missing → inventory empty → all `add` (builder field names wrong or not populated).
   - `local_central_fields_changed` → installed hash ≠ recomputed central hash (field order / value / tag / ordinal mismatch).
   - `identity_mismatch` → GUID/ord diverge from membership.
6. Create a successor release with one card text change; plan should show `1 update`; Apply; scheduling untouched; personal still empty; markers rewritten; ack row appears.
7. Edit a central field locally; re-plan → that card `conflict`; Apply must **not** overwrite it (already tested in pure suite; confirm live).

### 3.3 Definition of done for the two steps

- [ ] `anki-bootstrap-notetype` pure module + tests green  
- [ ] `buildBootstrapApkg` pure module + parseApkg round-trip tests green  
- [ ] CLI builds apkg from a real published (or staging) release  
- [ ] Artifact row + storage object registered  
- [ ] Serve endpoint contract-tested  
- [ ] Live Anki: import → inventory non-empty → plan all unchanged on same release  
- [ ] `DECK_UPDATE_DESIGN.md` §7 steps 2–3 marked done  

---

## 4. Suggested implementation order (half-day slices)

### Slice 1 — Note type contract (Step A pure)

1. Implement `anki-bootstrap-notetype.ts` + tests.  
2. Add frozen vector that includes markers and proves hash unchanged.  
3. No network, no zip.

### Slice 2 — SQLite + zip builder (Step B pure)

1. Implement `build-apkg.ts` against in-memory fixtures (no Supabase).  
2. Round-trip through `parseApkg`.  
3. Deterministic checksum test.

### Slice 3 — Data wiring CLI

1. Extract shared manifest loader used by API + CLI (avoid drift).  
2. `build-bootstrap-apkg.ts` fetches release, media, writes file.  
3. Manual: build against staging release; import once in Anki.

### Slice 4 — Register + serve

1. Upload + `anki_deck_release_artifacts` insert.  
2. GET bootstrap_apkg route + contract tests.  
3. Document operator runbook in this file’s appendix (below).

### Slice 5 — Live smoke + design doc status flip

1. Disposable profile checklist §3.2.  
2. Update `DECK_UPDATE_DESIGN.md` §7 items 2–3 to ✅.  
3. Optional: empty-inventory CTA in add-on.

---

## 5. Key existing code map (read before coding)

| Concern | Path |
|---|---|
| Design + rollout status | `integrations/snaportho-anki/DECK_UPDATE_DESIGN.md` |
| Manifest assembly | `src/app/api/anki/deck/_lib.ts` → `loadReleaseManifest` |
| Central-sync hash | `src/lib/education/anki-deck-incorporation.ts` → `computeCentralSyncHash` |
| Sync plan semantics | same file → `buildSyncPlan` |
| Draft manifest validation | `buildDraftSyncManifest` + `education:anki:release:build` |
| APKG **parse** (inverse of builder) | `scripts/lib/education/anki-import/parse-apkg.ts` |
| Field strip/hash helpers | `scripts/lib/education/anki-import/hash.ts` |
| Media asset schema | migration `20260721_130000_anki_incorporation_sync_foundation.sql` |
| Release membership | migration `20260720_140000_versioned_anki_deck_foundation.sql` |
| Marker apply / inventory | `addon/.../deck_update.py`, `sync.py`, `anki_runtime.py` |
| Media download client | `sync.py` `apply` + `api.py` `deck_media` |
| Phase 3 docs (stale on “preview-only” wording) | `docs/education/anki-incorporation-sync-phase3.md` — delta apply has since landed; bootstrap still deferred |

---

## 6. Explicit non-goals (v1)

- Building `collection.anki21b` / zstd packages  
- Cloze models / non-zero `card_ordinal` multi-template fidelity  
- Auto-migrating users’ pre-existing non-Master notes to markers  
- Delta bundle artifacts (`delta_bundle` type reserved, not this work)  
- Publishing a release from the bootstrap script (release must already exist)  
- Changing hash algorithms or marker field names  

---

## 7. Operator runbook (after code lands)

```bash
# 1. Tests
npm run education:anki:bootstrap:test
npm run education:anki:phase3:test
npm run education:anki-reviewer-addon:test

# 2. Build from published release (service role env loaded)
npm run education:anki:bootstrap:build -- \
  --release-id="$RELEASE_ID" \
  --out="/tmp/SnapOrtho-Master.apkg" \
  --register=true

# 3. Verify package locally
python3 - <<'PY'
import zipfile, hashlib, sys
p="/tmp/SnapOrtho-Master.apkg"
print("sha256", hashlib.sha256(open(p,"rb").read()).hexdigest())
z=zipfile.ZipFile(p)
print(z.namelist()[:10])
assert "collection.anki2" in z.namelist()
assert "media" in z.namelist()
PY

# 4. Optional: parse round-trip via existing tooling / unit test

# 5. Import in disposable Anki profile; run Deck Update plan against same release
```

---

## 8. Open decisions (carry from design — pick defaults if unblocking)

| # | Question | Recommended default for v1 |
|---|---|---|
| 1 | Dedicated Master note type vs AnKing-style | **Dedicated `SnapOrtho Master`** (already coded) |
| 2 | Media/bootstrap storage bucket | **Reuse `anki-deck-media`** with `bootstrap/` prefix |
| 3 | Distribution | **CLI + signed device endpoint**; website link can wrap same object |
| 4 | Multi-ordinal / cloze | **Fail build if `card_ordinal > 0`** until templates scoped |
| 5 | Field order when union is large | Code-point sort of central names + fixed tail |

---

## 9. Implementation status (landed in tree)

| Slice | Status | Location |
|---|---|---|
| 1 Note-type contract | ✅ | `src/lib/education/anki-bootstrap-notetype.ts` + `.test.ts` |
| 2 Zip builder | ✅ | `scripts/lib/education/anki-bootstrap/build-apkg.ts` + `.test.ts` (classic `collection.anki2`) |
| 3 CLI + shared assemble | ✅ | `scripts/build-bootstrap-apkg.ts`, `anki-deck-manifest-assemble.ts`, `_lib.ts` uses assemble |
| 4 Serve endpoint | ✅ | `GET …/artifact/bootstrap_apkg`, contract tests, `api.deck_bootstrap_apkg` |
| 5 Live Anki smoke | ⏳ | Disposable profile still required before calling production ready |

```bash
npm run education:anki:bootstrap:test
npm run education:anki:bootstrap:build -- --release-id=<uuid> --out=/tmp/deck.apkg [--register=true]
```
