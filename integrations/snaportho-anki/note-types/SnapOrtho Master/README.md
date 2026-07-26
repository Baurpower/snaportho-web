# SnapOrtho Master — card style contract

**Style version:** `1.0.0`  
**Note type name:** `SnapOrtho Master` (locked — do not rename)  
**Shape:** Cloze (`Text` + `Extra` + resource fields)

This folder is the **source of truth** for presentation (Channel A). Card *content* (filled resource fields) ships via deck releases (Channel B).

| File | Role |
|---|---|
| `fields.json` | Ordered field contract + roles + day-one flags |
| `front.html` | Anki front template (`qfmt`) |
| `back.html` | Anki back template (`afmt`) |
| `style.css` | Anki styling |
| `README.md` | This contract |

The TypeScript bootstrap builder embeds these templates via `src/lib/education/anki-bootstrap-notetype.ts` / `anki-master-card-style.ts`. Keep them in sync when editing.

## Field rules

1. **Never rename** fields after ship. Append new fields only (before the personal/marker tail).
2. **Link fields** (`*_Link`) hold bare `https://…` URLs.
3. **Resource fields** hold curated HTML/text you own (bullets, citations) — not full scraped third-party pages.
4. **Empty fields** do not render buttons (`{{#Field}}` conditionals).
5. **Personal_Notes** and markers never appear as central content; markers are hidden from the card face.

## How users get style updates (AnKing pattern)

1. Edit files here and bump `styleVersion` in `fields.json` + CSS header + back template comment.
2. Ship via SnapOrtho add-on **Update Card Style** (rewrites qfmt/afmt/css; may append missing fields).
3. Do **not** require users to re-import the deck for pure CSS/layout changes.
4. Filling Orthobullets/ROCK/etc. is a normal **deck release** delta, not a style update.

## Payload policy

| Resource | Preferred content |
|---|---|
| Orthobullets / ROCK / podcasts / video | Short curated bullets + `*_Link` |
| Classifications / Anatomy | Text and selective licensed media |
| Textbooks | Citation + key points |
| Qbank / OITE | Teaching points you write — not full copyrighted stems |

## Day-one fill priority

Orthobullets, ROCK, Nailed It, Video, Miller's, OKU, Campbell's.

Reserved empty (invisible until filled): Podcasts, Classifications, Anatomy, OITE, CasePrep, BroBot, Additional, Missed Qs.
