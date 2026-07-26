# SnapOrtho Master cloze-style beta

Downloadable beta deck: **existing AnKing-style cloze cards** + **SnapOrtho Master** note type (style v1.0.0) **with media**.

## Recommended package (with media) — `0.3.1-cloze-media`

| Item | Value |
|---|---|
| Version | `0.3.1-cloze-media` |
| Cards | **3,670** cloze (`card_ord === 0`) |
| Media files | **2,894** embedded (~907 MB source) |
| Package size | **~914 MB** |
| Excluded | Image Occlusion (~1,011), multi-ordinal rows (~414) |
| Style | SnapOrtho Master cloze v1.0.0 |
| Local paths | `/tmp/SnapOrtho-Master-0.3.1-cloze-media.apkg` and `~/Downloads/SnapOrtho-Master-0.3.1-cloze-media.apkg` |
| SHA-256 | `9d4d45e233b3205cee5d6b7bbf8e0cfdfdff6364d9e65ca6eece4e22b7768811` |

### How to install (media package)

**Import the local file** (works now; media is inside the `.apkg`):

1. Open Anki  
2. **File → Import**  
3. Choose `~/Downloads/SnapOrtho-Master-0.3.1-cloze-media.apkg`  
4. Import  

Remote add-on download for this ~914 MB package is **not fully published yet** (Supabase storage resets single-shot uploads of this size). Membership draft exists; resumable/TUS or multipart upload is the next step for Master Deck one-click download.

Add-on already has **streaming download** (no 200 MB cap) for when the artifact is online.

## Text-only fallback — `0.3.0-cloze-style` (published)

| Item | Value |
|---|---|
| Release key | `snaportho-master-beta` |
| Version | `0.3.0-cloze-style` |
| Cards | 3,670 |
| Media | **none** (current published download) |
| Size | ~6.5 MB |

## Rebuild / republish

```bash
# Inventory with media counts
npm run education:anki:bootstrap:publish-cloze-beta -- --dry-run

# Build local media package only (recommended; ~10–15 min)
npm run education:anki:bootstrap:publish-cloze-beta -- \
  --local-only \
  --release-key=snaportho-master-beta-media \
  --release-version=0.3.1-cloze-media \
  --out=/tmp/SnapOrtho-Master-0.3.1-cloze-media.apkg

# Build + try remote register (skips per-file media upload; still needs large apkg upload)
npm run education:anki:bootstrap:publish-cloze-beta -- \
  --skip-remote-media-upload \
  --release-key=snaportho-master-beta-media \
  --release-version=0.3.1-cloze-media \
  --out=/tmp/SnapOrtho-Master-0.3.1-cloze-media.apkg
```

## Field mapping

- `Text` / `Extra` preserved (cloze markup unchanged)
- AnKing resource fields (First Aid, Sketchy, …) folded into `Additional_Resources` when non-empty
- SnapOrtho resource slots (Orthobullets, ROCK, …) empty until a later content release
- Markers `SnapOrtho_ID` / `_Version` / `_Installed_Hash` filled for sync

## Known limits

1. **Multi-cloze notes** only package `card_ord === 0` (typically `c1`). Higher cloze indices are not separate cards in this beta.
2. **No IO cards** — visual occlusion stays out until a dedicated path.
3. **`--skip-media`** beta: Extra/Additional may reference missing media filenames.
4. Membership stores **source** identity hashes (DB trigger); bootstrap markers use **normalized central-sync** hashes so post-import plans match `assembleDeckSyncManifest` (which normalizes field snapshots).
