# SnapOrtho Deck Update — Design (v1, for approval)

**Goal:** get a user's local Anki deck to the latest *published* release safely —
refresh central educational content, add new cards, update KG-linked media — while
**never** disturbing their review scheduling or personal annotations.

**Chosen architecture:** `.apkg` bootstrap (first install) + in-place deltas (updates).

Status: **implementation in progress / largely landed.** See `BOOTSTRAP_IMPLEMENTATION.md` for the note-type + `.apkg` builder detail. Rollout order at the end.

---

## 1. How a deck gets to "latest"

Two phases, one identity model.

### Phase A — Bootstrap (first install)
The user imports a versioned **`.apkg`** built from the current published release. Anki's
native importer creates the note type, notes, cards, and media, and — because every note
carries a stable Anki GUID — a later re-import *matches by GUID* instead of duplicating.
This gives a correct, consistent baseline with minimal custom code.

### Phase B — Delta update (every release after)
The add-on's **Check for Master Deck Updates** flow already computes a sync plan
(`POST /api/anki/deck/sync/plan` → `add / update / conflict / media_download / unchanged`).
We add the missing **apply** step: the add-on writes central deltas onto the user's existing
notes in place, preserving scheduling and `Personal_*` fields, then records an acknowledgement.

Bootstrap is for users with nothing installed (or a corrupted baseline); deltas carry
everyone else forward release to release.

---

## 2. Identity & the marker fields (fixes today's blocking gap)

Today nothing populates the `SnapOrtho_*` fields the sync keys off, so `installed_card_inventory`
returns empty and no update is possible. Fix: a dedicated note type with read-only marker fields.

**Note type `SnapOrtho Master`** (shipped inside the bootstrap `.apkg`):

| Field | Role | Uploaded? | Overwritten by update? |
|---|---|---|---|
| central content fields (`Front`, `Back`, …) | educational content | yes (as proposals) | **yes** |
| `SnapOrtho_ID` | `canonicalCardId` (UUID) | identity only | rewritten |
| `SnapOrtho_Version` | installed `canonicalCardVersionId` | identity only | rewritten |
| `SnapOrtho_Installed_Hash` | central-sync hash of installed content | integrity only | rewritten |
| `Personal_Notes` (and any `Personal_*`) | user-owned | **never** | **never** |

- Marker fields are **excluded from the central-sync hash** (already stripped in
  `computeCentralSyncHash`), so they never cause false "changed" diffs.
- On delta apply, after writing new central content the add-on **recomputes and rewrites**
  `SnapOrtho_Version` + `SnapOrtho_Installed_Hash`, so the next plan sees the card as current.
- Fields (not tags) because they survive Anki sync, are per-note, and don't pollute the tag browser.

**Two hashes, kept distinct (do not conflate):**
- `canonicalContentHash` — full-note canonical identity. Internal only; not used for sync.
- **central-sync hash** (`computeCentralSyncHash`) — personal-stripped, `SnapOrtho::` tags only.
  This is the *only* hash the update flow compares. Client `central_sync_hash` and the server
  function **must stay byte-identical** — see Prerequisite C1 below.

---

## 3. Apply algorithm (add-on, delta path)

**Input:** the sync plan + the release manifest (already carries `fieldSnapshot`, `centralTags`,
`deckPath`, `mediaHashes` per card).

**Preconditions (all must hold or we abort before writing):**
1. Client add-on version ≥ release `minimum_addon_version` (server-enforced too — §4.4).
2. The plan's `targetManifestChecksum` matches the manifest we fetched.
3. All writes run inside **one Anki collection checkpoint** → fully undoable in one step.

**Hard invariants (never violated, per action):**
- Never write a `Personal_*` field.
- Never call any scheduling API — no due/interval/ease/reschedule. (Deck *move* preserves scheduling.)
- Never delete a user card.
- `conflict` cards are **skipped** and surfaced for manual resolution — never auto-overwritten.

**Per action:**
- **unchanged** → no-op.
- **update** → find local note by GUID; set each central field from the manifest snapshot
  (personal fields untouched); replace `SnapOrtho::` tags with the manifest's central tags
  (personal + non-SnapOrtho tags left alone); move the card to `deckPath` (scheduling preserved);
  rewrite marker fields; enqueue any missing media.
- **add** → create a note on `SnapOrtho Master` with central + marker fields, place in `deckPath`;
  it enters as a normal new card (no scheduling manipulation); enqueue media.
- **conflict** (`local_central_fields_changed` / `identity_mismatch`) → **no write**; add to a
  *"Needs your review"* list with a before/after diff. User chooses **keep mine** / **take theirs**
  (re-runs update for that card) / **open workspace** (propose a change instead).
- **media_download** → fetch each missing `sha256` from the media endpoint (§4.1), verify the
  hash, write into `collection.media` under its content-addressed name.

**After apply:** POST a sync acknowledgement (§4.2) with `applied|partial|failed`, the checksums,
and `conflictCount`; show a summary (`N updated, M added, K conflicts to review, media synced`).

---

## 4. Backend hardening — new / changed endpoints

Device auth already yields `{ userId, deviceLinkId, deviceTokenId }`.

### 4.1 `GET /api/anki/deck/releases/{id}/media/{sha256}` *(new, device auth)*
Look up `anki_deck_media_assets` by release + `content_sha256`, `license_status != 'excluded'`.
Return a **short-lived signed URL** (preferred) or stream bytes. Content-addressed ⇒ cache
`immutable`. 404 if the asset isn't part of that published release. Mime allowlist already
enforced by the table constraint.

### 4.2 `POST /api/anki/deck/sync/ack` *(new, device auth)*
Body: `{ targetReleaseId, syncPlanChecksum, installedManifestChecksum, status, conflictCount }`.
Insert into the existing **`anki_deck_sync_acknowledgements`** table with `userId`/`deviceTokenId`
from auth. Idempotent on `(device_token_id, deck_release_id, sync_plan_checksum)`. This is our
**per-user "who is on which version" telemetry** — currently a total blind spot.

### 4.3 `GET /api/anki/deck/releases/{id}/artifact/bootstrap_apkg` *(new)*
Serve the published `bootstrap_apkg` artifact (`anki_deck_release_artifacts.object_key`) via
signed URL — the first-install download. (Optional in-Anki "Download starter deck" button, or
distribute via the website.)

### 4.4 Version gate *(cross-cutting)*
Deck endpoints parse `X-SnapOrtho-Client: reviewer-addon/<ver>` and compare to
`release.minimum_addon_version`. Stale client ⇒ `sync/plan` returns **`426 upgrade_required`**
with the download URL; manifest withheld. Stops an old add-on from misapplying a newer schema.

### 4.5 `GET /api/anki/reviewer/queue` *(new, reviewer auth)*
The priority queue the reworked add-on already calls. Returns
`{ cards: [{ noteGuid, cardOrdinal, priority, reason, front }] }`. Backed initially by a simple
view (e.g. `v_anki_deck_release_cards_missing_eligible_links`, or a flagged-rows table); later the
AI pipeline writes flags. Client already degrades gracefully to empty on 404.

---

## 5. The `.apkg` builder *(new — largest piece)*

Given a published release, emit a `bootstrap_apkg` artifact:
- `SnapOrtho Master` note type (central + marker + `Personal_Notes` fields; templates render
  central fields only).
- One note per included release card (`field_snapshot` + marker values), tags = central tags,
  deck = `deckPath`, GUID = the release card's `note_guid`.
- Bundle referenced media (content-addressed).
- Register as `anki_deck_release_artifacts(artifact_type='bootstrap_apkg', object_key, checksum)`.

Start as a script (`scripts/build-bootstrap-apkg.ts`), promote to an endpoint later.

---

## 6. Safety / integrity checklist
- Published-manifest immutability — **enforced by DB triggers today.**
- **Prerequisite C1:** central-sync-hash parity client↔server (Python `ensure_ascii`, tag order,
  personal-field stripping). Must land *before* deltas are trustworthy, or every card false-conflicts.
- Apply is transactional + one-step undoable; conflicts never auto-resolve; personal + scheduling untouched.
- Media content-addressed and sha256-verified on download.
- Version gate blocks stale clients.
- Every apply leaves an auditable `anki_deck_sync_acknowledgements` row.

---

## 7. Rollout order & status
1. ✅ **C1 hash parity** — central-sync hash (`computeCentralSyncHash` ↔ `sync.py`) and identity
   hash (`buildCanonicalContentHash` ↔ `editor.py`) now byte-identical. Locked with cross-language
   frozen vectors (`anki-deck-incorporation.test.ts` ↔ `test_reviewer.py`).
2. ✅ **Marker fields on `SnapOrtho Master` + populate in the release→bootstrap path.** — pure contract in `anki-bootstrap-notetype.ts`; markers populated by builder + delta apply.
3. ✅ `.apkg` bootstrap builder + artifact-serve endpoint (§4.3, §5) — `build-apkg.ts`, `build-bootstrap-apkg.ts` CLI, `GET …/artifact/bootstrap_apkg`. Live Anki import smoke still required on a disposable profile.
4. ✅ Media endpoint (§4.1) — `GET …/releases/[id]/media/[sha256]`, signed URL, published-only, hash-verified.
5. ✅ Add-on delta apply (§3) — `deck_update.py` (pure, tested) + gateway writes + Deck Update dialog
   Apply button + media fetch + conflict surfacing. Network on worker thread, collection writes on
   main thread, one undoable checkpoint. **Needs live-Anki smoke test** (aqt paths unverifiable here).
6. ✅ Sync-ack endpoint (§4.2) — `POST …/deck/sync/ack`, append-only ledger, wired from the add-on.
7. ✅ Version gate (§4.4) — `sync/plan` returns 426 `upgrade_required` for stale add-ons.
8. ✅ Queue endpoint (§4.5) — `GET …/reviewer/queue`, backed by the missing-eligible-links view.

**Remaining for live E2E:** build+register a bootstrap artifact for a real published release
(`npm run education:anki:bootstrap:build -- --release-id=… --out=… --register=true`), import in a
disposable Anki profile, confirm plan is all-`unchanged` against the same release, then apply a
successor release delta.

## 8. Open questions
1. **Note type:** dedicated `SnapOrtho Master` (recommended, cleanest identity) vs. adopting an
   existing AnKing-style note type (interop, but messier marker-field placement)?
2. **Media hosting:** Supabase Storage signed URLs (assumed) vs. streaming through the API?
3. **Bootstrap distribution:** in-Anki one-click "Download starter deck" vs. website download link?
4. **Conflict default:** when a user locally edited a central field, is the default *keep mine*
   (safer) or *prompt every time* (louder but explicit)?
