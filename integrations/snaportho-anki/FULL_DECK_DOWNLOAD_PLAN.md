# Full SnapOrtho Master Deck Download Plan

**Goal:** Ship a downloadable `.apkg` that uses the **new SnapOrtho Master card style** (cloze `Text` + resource fields), then move from the **successful pilot (~50 cards, media-heavy)** to the **entire active deck** for end-user install.

**Status of today**

| Capability | State |
|---|---|
| Card style v1.0.0 (templates/CSS/fields) | ✅ Written and unit-tested |
| Bootstrap `.apkg` builder | ✅ Works for pilot-shaped inputs |
| Device download API + add-on UI | ✅ `GET …/artifact/bootstrap_apkg` + Master Deck dialog |
| Pilot release publish script | ✅ `publish-master-deck-pilot.ts` (default `--limit=50`) |
| Pilot artifact on disk | ✅ `/tmp/SnapOrtho-Master-0.1.0-pilot.apkg` |
| Field normalize → style contract | ❌ **Missing** (source snapshots still Front/Back/etc.) |
| Central-hash parity after full field list | ❌ **Broken if not fixed** (empties change hash) |
| Full-deck selection (all active cards) | ❌ Pilot is media-first + limited |
| Full-deck media packaging at scale | ⚠️ Partial (local collection.media; budgets) |
| Style-only update channel in add-on | ⏳ Later (not required for first full download) |

---

## 1. End-user download journey (what we are shipping)

```
Link device (add-on)
  → GET /api/anki/deck/releases/current          # latest published release
  → GET /api/anki/deck/releases/{id}/artifact/bootstrap_apkg
  → signed URL → download .apkg (SHA-256 verified in add-on)
  → Anki File → Import
  → notes = SnapOrtho Master (style v1.0.0) + markers filled
  → "I've already imported it — refresh"
  → sync plan: all unchanged (same release)
  → later releases: delta apply (add/update only)
```

**Website optional path (Phase C):** authenticated download page that hits the same artifact endpoint (or a short-lived user-session signed URL). Add-on remains the primary path; website is marketing + fallback.

**Success criteria after import**

1. Note type name is `SnapOrtho Master`, cloze template, style CSS present.  
2. Every note has `SnapOrtho_ID` / `_Version` / `_Installed_Hash` populated.  
3. `Personal_Notes` empty.  
4. Front shows cloze; back shows Extra + any filled resource expanders (most empty at first).  
5. Check for updates → **0 update / 0 add / 0 conflict** against the same release.  
6. Scheduling starts as new cards (never rewritten by SnapOrtho).

---

## 2. Why pilot ≠ full deck with new style

### 2.1 Pilot success (what worked)

`npm run education:anki:bootstrap:publish-pilot` selected a **small media-rich cohort**, wrote:

- `anki_deck_releases` (published)
- `anki_deck_release_cards` membership
- `anki_deck_media_assets` + storage uploads
- bootstrap `.apkg` artifact + `anki_deck_release_artifacts`

Add-on can download that artifact when it is the **current** published release.

### 2.2 Gaps the new style introduced

| Issue | Pilot behavior | Full-deck + style v1 requirement |
|---|---|---|
| Field names | Raw `field_snapshot` from import (often `Front`/`Back`/`Text`/custom) | **Normalize into** locked `SNAPORTHO_MASTER_FIELD_ORDER` (`Text`, `Extra`, resources…) |
| Card model | Builder now emits **cloze** | Source content must be valid cloze **or** converted to `{{c1::…}}` on `Text` |
| Content hash | `computeCentralSyncHash(field_snapshot, …)` on sparse fields | Hash of **full installed field set** (all master fields; empties included) so post-import inventory matches release |
| Membership `content_hash` | Stored as version `content_hash` (identity), while bootstrap uses central-sync hash | Release membership + manifest `contentHash` + marker hash **must agree** on central-sync of **normalized** fields |
| Selection | Notes **with media first**, `--limit=50` | All active `card_ord === 0` cards (plus explicit multi-ord policy) |
| Media | Local Anki media dir; max-media budget | Full set: missing media → card still ships text-only **or** excluded with report |
| Size | ~pilot MB | Full deck may be 100s of MB–GB; need streaming, chunked upload, timeout |

---

## 3. Architecture: one publish pipeline, two release tiers

```
                    ┌─────────────────────────────────────┐
                    │  Source of truth                     │
                    │  canonical_cards + versions          │
                    │  anki_notes / decks / media_refs      │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │  normalizeFieldSnapshotToMaster()   │  NEW pure helper
                    │  Front/Back/Text → Text + Extra     │
                    │  expand empty resource fields        │
                    │  recompute central-sync contentHash  │
                    └─────────────────┬───────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
    ┌─────────▼────────┐   ┌──────────▼─────────┐   ┌────────▼────────┐
    │ Select cohort    │   │ Package media      │   │ Build .apkg     │
    │ pilot | full     │   │ resolve + upload   │   │ style v1 cloze  │
    └─────────┬────────┘   └──────────┬─────────┘   └────────┬────────┘
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │  Publish release                    │
                    │  membership + media assets          │
                    │  bootstrap artifact (register)      │
                    │  supersede previous published       │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │  Download                           │
                    │  releases/current → bootstrap_apkg  │
                    │  add-on (primary) / website (later) │
                    └─────────────────────────────────────┘
```

**Do not** maintain a separate “style apkg” and “content apkg.” Style ships **inside** the note type of every bootstrap package. Resource field *values* fill later via deltas.

---

## 4. Field normalization contract (must land before full publish)

### 4.1 Pure helper (new)

`src/lib/education/anki-normalize-to-master.ts`

```
normalizeFieldSnapshotToMaster(snapshot) → {
  fieldSnapshot: Array<{name, rawValue}>,  // only non-empty master fields + always Text/Extra if present
  expandedForHash: Array<{name, value}>,   // full master order, empties ""
  contentHash: string,                     // computeCentralSyncHash(expanded, tags, ordinal)
  warnings: string[]                       // e.g. no_text_field, multi_cloze_detected
}
```

### 4.2 Mapping rules (v1)

| Source field(s) | Target |
|---|---|
| `Text` with cloze `{{cN::…}}` | `Text` as-is |
| `Text` without cloze | Wrap primary phrase **or** leave as-is and treat as single-line cloze `{{c1::Text}}` only if product accepts; default: **if no cloze markers, set Text = full body as one cloze** `{{c1::…}}` (escape inner `}}`) — **decision below** |
| `Front` + `Back` (Basic) | `Text = {{c1::Front}}` or `Text = Front` with Back → `Extra`; prefer **Front body as cloze answer surface**: `Text` = Front if already cloze else `{{c1::` + stripped Front + `}}`, `Extra` = Back |
| `Extra` | `Extra` (merge with Back if both) |
| Known resource names | Pass through if already master names |
| Everything else | Fold into `Additional_Resources` as labeled HTML blocks **or** drop with warning (prefer fold for zero data loss) |
| Personal / markers | Strip from central snapshot |

**Locked recommendation for Basic→Cloze:**  
`Text = "{{c1::" + plainFront + "}}"` when Front has no cloze; put original Front HTML in Extra if it had formatting; Back → Extra (append). Multi-cloze source notes stay multi-cloze (card_ord 0 only still generates c1 card in Anki; higher ords need multi-card bootstrap later).

### 4.3 Hash rule (non-negotiable)

```
contentHash = centralSyncHash(
  every field in SNAPORTHO_MASTER_FIELD_ORDER except Personal_* and markers,
  values = normalized or "",
  SnapOrtho:: tags only,
  cardOrdinal
)
```

Store **that** hash on:

- `anki_deck_release_cards.content_hash` (or a dedicated column if identity hash must stay — prefer **central-sync hash in content_hash for release membership** going forward; keep version’s original hash on the version row only)
- Bootstrap marker `SnapOrtho_Installed_Hash`
- Manifest `contentHash` (already recomputed in `assembleDeckSyncManifest` — must use **normalized** fields, not raw version snapshot)

**Change `assembleDeckSyncManifest`:** normalize before `computeCentralSyncHash`, and emit normalized `fieldSnapshot` in the manifest so delta apply writes master fields.

---

## 5. Cohort selection: pilot → full

### 5.1 Inclusion criteria (full deck v1)

Include card if **all** hold:

1. `canonical_cards.is_active`  
2. Note + card active, `card_ord === 0`  
3. Stable `anki_note_guid`  
4. Current version active with non-empty normalized `Text`  
5. Deck path resolvable → product path under `SnapOrtho::…`  
6. Media: if referenced and present on disk/storage, attach; if missing, **include text-only** (do not drop the card) and log `missing_media`

**Exclude (report, do not silent-drop without count):**

- Multi-ordinal (`card_ord > 0`) until multi-template cloze packaging is designed  
- Empty Text after normalize  
- Corrupt/missing GUID  

### 5.2 Pilot vs full flags

Extend publish script (rename conceptually to `publish-master-deck.ts`):

| Flag | Pilot | Full |
|---|---|---|
| `--mode=pilot\|full` | pilot | full |
| `--limit=N` | 50 default | omit / unlimited |
| `--require-media-ratio` | 0.5 | **0** (text-only OK) |
| `--prefer-media` | true | false (scan all notes) |
| `--max-media-files` | 200 | high or unlimited with progress |
| `--release-key` | `snaportho-master-pilot` | `snaportho-master` |
| `--release-version` | `0.1.0-pilot` | `1.0.0` (or `0.2.0-full-style`) |
| `--style-version` | stamp `1.0.0` in metadata | same |

### 5.3 Superseding pilot

1. Publish full release as **new** `release_key` **or** new version under `snaportho-master`.  
2. Set pilot release status → `superseded` (if schema supports) or leave published but ensure `releases/current` orders by `published_at desc` so full wins.  
3. Users on pilot: first sync plan against full release → mostly **update** (field reshape + more cards **add**).  
4. Document: pilot users may re-download full starter if inventory is tiny; delta `add` is preferred to preserve any review history on pilot cards.

---

## 6. Media strategy for entire deck

### 6.1 Sources

1. **Preferred for publish machine:** local Anki `collection.media` (pilot path).  
2. **Preferred for CI/prod later:** objects already in `anki-deck-media` / import-time media table if present.  
3. **Missing file:** card still included; mediaHashes omit missing; review later.

### 6.2 Full-deck packaging options

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **A. Fat bootstrap** — all media inside `.apkg` | One import; offline complete | Huge download; memory in builder | Use if total media **&lt; ~500 MB** |
| **B. Lean bootstrap + media_download** — text/notes in apkg; media via sync plan | Smaller first download | Needs linked device + second step | **Default if media &gt; 500 MB** |
| **C. Split specialty apkg** | Smaller chunks | Multiple imports; identity harder | Only if A/B fail |

**Decision rule at publish time:** measure `mediaBytes`; if &gt; threshold → lean mode (metadata on release: `bootstrapMediaMode: "embedded" | "deferred"`).

### 6.3 Builder hardening for scale

- Stream media into zip (avoid holding all buffers if possible).  
- Chunk Supabase uploads (already per-file).  
- Progress logs every N cards.  
- Timeouts: add-on download already allows large body (200 MB cap in `master_deck.py` — **raise for full deck** or stream to disk without full RAM buffer).

**Add-on fix (required for full):** write download to temp file in chunks; verify SHA-256 while streaming; remove 200 MB hard cap or make configurable.

---

## 7. Publish runbook (executable sequence)

### Phase A — Style-ready pilot rebuild (prove hash + cloze)

1. Land `normalizeFieldSnapshotToMaster` + unit tests (Front/Back, Text cloze, empty resources, hash stability).  
2. Wire normalize into:
   - `publish-master-deck-pilot.ts` / unified publish script  
   - `assembleDeckSyncManifest`  
   - bootstrap build path  
3. Dry-run pilot:  
   `npm run education:anki:bootstrap:publish-pilot -- --dry-run --limit=20`  
4. Publish style pilot:  
   `--release-key=snaportho-master-style-pilot --release-version=0.2.0-style --limit=30`  
5. Disposable Anki profile: download via add-on → import → verify cloze UI + plan all unchanged.  
6. Smoke: one card with filled Orthobullets_Link shows expander.

**Gate:** Phase A green before full selection.

### Phase B — Full deck inventory (no publish)

1. Dry-run full selection:  
   `--mode=full --dry-run`  
2. Report (write `reports/education/full-deck-inventory-{date}.json`):
   - total active cards  
   - included / excluded reasons  
   - multi-ord count  
   - media present / missing / MB  
   - field-name histogram pre-normalize  
   - post-normalize empty Text count  
3. Product sign-off on exclusions and package mode (fat vs lean).

### Phase C — Full publish + download

1. Publish full release (`release_key=snaportho-master`, `version=1.0.0`).  
2. Register bootstrap artifact.  
3. Verify `GET /api/anki/deck/releases/current` returns full.  
4. Verify artifact signed URL + checksum.  
5. Add-on E2E on clean profile.  
6. Add-on E2E on pilot profile (delta path).  
7. Announce download in Master Deck UI copy (“SnapOrtho Master 1.0.0”).

### Phase D — Website download (optional, same week)

1. Staff or authenticated `/education/anki/download` page.  
2. Same artifact; no second package.  
3. Instructions: import + install add-on for updates.

### Phase E — Content fill (not blocking download)

Resource fields stay empty; later releases fill Orthobullets/ROCK/etc.  
Style updates later via “Update Card Style” without re-download.

---

## 8. Implementation work packages

### WP1 — Normalize + hash (blocker)  **P0**

- [ ] `anki-normalize-to-master.ts` + tests  
- [ ] Use in publish script and `assembleDeckSyncManifest`  
- [ ] Align membership `content_hash` with central-sync of normalized expanded fields  
- [ ] Document hash in BOOTSTRAP_IMPLEMENTATION.md  

### WP2 — Unified publish CLI  **P0**

- [ ] Generalize `publish-master-deck-pilot.ts` → `publish-master-deck.ts`  
- [ ] `--mode=full|pilot`, media ratio 0 for full, progress logging  
- [ ] Stamp metadata: `styleVersion`, `bootstrapMediaMode`, `cardCount`, `normalizeVersion`  
- [ ] npm scripts: `education:anki:deck:publish`  

### WP3 — Full selection query  **P0**

- [ ] Paginate **all** active cards (not media-first only)  
- [ ] Exclusion report artifact  
- [ ] Deck path → `toProductDeckPath` at membership write time (consistent with manifest)  

### WP4 — Media modes + size  **P0/P1**

- [ ] Measure and choose fat vs lean  
- [ ] Lean: empty media in apkg; assets still on release for `media_download`  
- [ ] Add-on streaming download (remove 200 MB cap)  

### WP5 — Download UX polish  **P1**

- [ ] Master Deck copy: “Download SnapOrtho Master 1.0” (not only “starter”)  
- [ ] Show card count + size estimate from release metadata  
- [ ] Post-import: open import folder / reveal file  
- [ ] Optional website download page  

### WP6 — Pilot → full migration  **P1**

- [ ] Supersede pilot release  
- [ ] Document delta behavior for pilot users  
- [ ] Conflict rate monitoring after first full sync  

### WP7 — Out of scope for first full download

- Filling Orthobullets/ROCK/podcasts  
- Multi-ordinal cloze packaging  
- AnkiHub  
- Style-only add-on updater (nice-to-have once v1.0.1 CSS ships)

---

## 9. API / release metadata additions

On `anki_deck_releases.metadata` (JSON):

```json
{
  "purpose": "full_master_bootstrap",
  "styleVersion": "1.0.0",
  "normalizeVersion": "master-fields.v1",
  "bootstrapMediaMode": "embedded",
  "cardCount": 5095,
  "mediaFiles": 1200,
  "mediaBytes": 450000000,
  "excluded": { "multiOrd": 12, "emptyText": 3, "noGuid": 0 },
  "builtBy": "publish-master-deck"
}
```

Optional later: `GET /api/anki/deck/releases/current` includes `cardCount`, `artifactByteSize`, `styleVersion` so the add-on can show “~420 MB · 5,000 cards · style 1.0.0” before download.

---

## 10. Verification matrix

| # | Test | Pass criteria |
|---|---|---|
| V1 | Normalize unit tests | Front/Back, cloze Text, hash golden vectors |
| V2 | Style pilot apkg import | Cloze UI, markers, empty resources hidden |
| V3 | Plan vs same release | 100% unchanged |
| V4 | Full dry-run inventory | Report complete; emptyText &lt; 0.5% |
| V5 | Full publish | Artifact registered; current points to full |
| V6 | Clean profile download | Import succeeds; markers present |
| V7 | Pilot profile upgrade | adds + updates; no scheduling wipe; conflicts explained |
| V8 | Media spot-check | Images render for sample media cards |
| V9 | Mobile Anki | Optional; CSS `.mobile` already in style |

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Hash mismatch → every card “update” forever | WP1 golden tests; post-import plan gate |
| Huge apkg OOM / failed download | Lean media mode + streaming download |
| Basic cards look wrong as cloze | Normalize rules + sample review of 20 cards per specialty |
| Multi-ord silent loss | Explicit exclude report; phase 2 packaging |
| Pilot users confused | UI copy + re-download option; supersede messaging |
| Local media incomplete on build machine | Missing-media include + follow-up media release |
| Rights / license of full media set | Keep provenance; `license_status` on assets; exclude if needed |

---

## 12. Recommended timeline (engineering order)

1. **Day 1–2:** WP1 normalize + hash (hard gate).  
2. **Day 2–3:** WP2/WP3 full dry-run inventory + style pilot republish + V2/V3.  
3. **Day 3–4:** WP4 size decision; full publish; add-on stream download.  
4. **Day 4–5:** V5–V7; fix conflicts; flip `releases/current`.  
5. **Later:** WP5 website, WP7 resource fill, style updater.

---

## 13. Immediate next command sequence (after WP1 lands)

```bash
# Inventory only
npm run education:anki:deck:publish -- --mode=full --dry-run --out-report=reports/education/full-deck-inventory.json

# Style pilot (small, downloadable)
npm run education:anki:deck:publish -- \
  --mode=pilot --limit=40 \
  --release-key=snaportho-master-style-pilot \
  --release-version=0.2.0-style \
  --out=/tmp/SnapOrtho-Master-0.2.0-style.apkg

# Full (after gates)
npm run education:anki:deck:publish -- \
  --mode=full \
  --release-key=snaportho-master \
  --release-version=1.0.0 \
  --out=/tmp/SnapOrtho-Master-1.0.0.apkg
```

(Scripts names above are target state; today pilot script is `education:anki:bootstrap:publish-pilot`.)

---

## 14. Decision checklist (confirm before full publish)

- [ ] Accept Basic→Cloze normalize rule (Front → single cloze).  
- [ ] Full deck includes text-only cards (`require-media-ratio=0`).  
- [ ] Fat vs lean media mode threshold (recommend 500 MB).  
- [ ] Release key `snaportho-master` version `1.0.0` supersedes pilot for `releases/current`.  
- [ ] Multi-ord cards excluded from v1 full download with report.  
- [ ] Resource fields ship **empty** in 1.0.0 (style + core Text/Extra only).

---

## 15. Bottom line

**Download path already exists.** The work is not inventing a new distribution channel; it is:

1. **Normalize** every card into the new style’s field contract and **fix the hash** so import stays “unchanged.”  
2. **Select the entire active deck** (not media-first pilot 50).  
3. **Package media** at full scale (fat or lean).  
4. **Publish** as the current release and download via the existing Master Deck button (with a larger streaming download).  

Pilot code change: **WP1 field normalize + central-hash on expanded master fields.** Without it, a “full deck with new style” will look right in the editor but fail sync integrity.
