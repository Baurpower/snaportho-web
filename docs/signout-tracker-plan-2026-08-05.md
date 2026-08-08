# Ortho Sign-Out Tracker — Implementation Plan

_Date: 2026-08-05 · Status: pre-implementation design · Owner: workspace_

## 1. Goal

A shared, freeform, collaborative sign-out ("handoff") surface for an ortho service —
the SnapOrtho-native version of a shared Apple Note, but scoped to a program/service,
sitting next to the call schedule, with an LLM "draft a sign-out text" button.

The north star: **make signing out easier and all in one place.** It must feel freeform
and aesthetic (Craft / Linear / Apple Notes), never a clunky table, yet be more powerful
than a table — action items that survive the handoff, visual triage, auto-POD rollover.

Explicitly **not** a SMART-on-FHIR EHR integration and **not** a rigid I-PASS form.

## 2. Product decisions (locked in conversation)

| Decision | Choice |
|---|---|
| Structure | Freeform, **card-per-patient**; structure emerges from typing, not enforced fields |
| Views | **Card view** (depth, editing, SOAP sections) and **Table view** (dense roster) toggle over the same data — like Linear board vs. list |
| Feel | Aesthetic card list (Craft/Linear/Notes), mobile-first, not a spreadsheet |
| Clinical depth | Optional collapsible **sections** (Subjective, Objective/PE, Vitals, Labs, Imaging, Assessment & Plan) for a full attending sign-out; a one-liner card stays a one-liner |
| Audience | One card renders two ways: terse **overnight handoff** (I-PASS, action-first) and **attending sign-out** (SOAP presentation); draft-text is audience-aware |
| Sharing | Shared service/team list (multiple residents edit) |
| Identifiers (name, DOB, MRN) | **Isolated in a separate table with a separate, tightly-scoped key** ("crypto-shredding"), not literal E2E |
| Card body | Managed-key AES-256-GCM at rest, handles only ("7W-12") |
| Facets (severity, POD, status, handle, order) | Non-identifying → **plaintext columns**, so sort/filter/collapse/rollover need no decrypt |
| Text feature (v1) | **Draft only** — LLM produces a de-identified blurb; no sending |
| Attribution | "Last edited by X at 9:42 PM" per card |
| PHI gating | Per-program `phi_enabled` flag, off by default until BAA in place |

## 3. Encryption architecture

### 3.1 Bar we are matching
A **shared** Apple Note is not end-to-end encrypted — Apple holds the keys. Matching /
exceeding it requires: TLS in transit (have it) + AES-256-GCM at rest with a key we
manage + access control (existing memberships layer). We deliberately choose
**managed-key**, not true E2E, because E2E on a shared, rotating clinical list creates a
key-distribution and recovery problem (a covering resident locked out of patient names at
2am is a patient-safety problem, not just UX).

### 3.2 Two crypto scopes

| Scope | Protects | Key | Decrypt path | Fed to LLM? |
|---|---|---|---|---|
| **Card key** | Per-patient freeform body (handles only) | `CARD_ENC_KEY` | Normal read path | Yes (handles only) |
| **Identifier key** | name / DOB / MRN | `ID_ENC_KEY` (separate) | Narrow "reveal" path only, audited | **Never** |

- **Crypto-shred:** destroy `ID_ENC_KEY` → every name/DOB/MRN is instantly unrecoverable
  while clinical cards survive. This is our retention kill-switch.
- **Blast radius:** a dump of the card table reveals no identities; identities require a
  second, separately-guarded key.
- **De-identification is structural:** the draft-text path reads card bodies only, so it
  *cannot* emit a name — the safety property falls out of the architecture.
- **Facets are plaintext on purpose** (§4): severity/POD/status/handle/order are
  operational and non-identifying, and keeping them queryable is exactly what makes the
  UI powerful without decrypting every card.

### 3.3 Algorithm & key handling
- **AES-256-GCM** (authenticated, tamper-evident). 12-byte random nonce per write, stored
  with ciphertext. Ciphertext stored as `bytea`.
- 32-byte keys from **env vars** (Vercel-managed, encrypted at rest, out of the DB and out
  of the codebase). Each row records a `key_id` so keys can rotate: new writes use the
  current key id; old rows stay readable under their old id. `crypto.ts` reads keys through
  a single `getKey(keyId)` function so the source is swappable without touching call sites
  or re-encrypting data — but env vars are the intended home, not a placeholder.
- **Upgrade path (not v1):** envelope encryption — a master key wraps per-program data
  keys. `key_id` means we adopt it with no schema change.
- **True E2E (only if a program's threat model demands it):** per-member public-key
  wrapping of the identifier key **plus an admin break-glass escrow wrap** so a lost
  passphrase never locks the team out. Deferred; documented so we don't design it out.

## 4. Data model

Follows existing migration conventions: `supabase/migrations/YYYYMMDD_HHMMSS_*.sql`,
wrapped in `begin; … commit;`, `create table if not exists`, idempotent policy/trigger
replacement, RLS on every table.

The note is a **vertical list of per-patient cards** — not one blob, not a table. Each
card has an **encrypted body** (source of truth for content) plus a few **non-identifying
facet columns** in plaintext so the app can sort, filter, collapse, and auto-roll POD
without decrypting every card.

The body is a **serialized ordered set of optional sections** (§7.1), encrypted as one
blob under the card key — not separate columns. So depth is optional (one-liner ⇢ full
SOAP) with **no schema change and no new PHI surface**: labs/vitals/PE are clinical
values, not direct identifiers, so they live in the encrypted body like everything else.
Only name/DOB/MRN are quarantined under the separate key.

```sql
signout_services
  id            uuid pk default gen_random_uuid()
  program_id    uuid not null references programs(id) on delete cascade
  name          text not null            -- "Trauma", "Joints", "Spine"
  phi_enabled   boolean not null default false
  created_by    uuid not null
  is_active     boolean not null default true
  created_at    timestamptz not null default now()
  unique (program_id, name)

-- One card per patient. Freeform body encrypted; facets queryable.
signout_cards
  id            uuid pk default gen_random_uuid()
  service_id    uuid not null references signout_services(id) on delete cascade
  handle        text not null            -- "7W-12" operational locator (non-PHI)
  severity      text not null default 'stable'  -- stable | watcher | unstable (I-PASS rail)
  pod_number    smallint                 -- nullable; nightly auto-increment if set
  status        text not null default 'active'  -- active | discharged
  sort_order    integer not null default 0
  pinned        boolean not null default false
  body_ct       bytea                    -- AES-256-GCM: one-liner, action items, O/N, pending
  body_nonce    bytea
  key_id        text not null            -- card key id
  version       bigint not null default 1  -- optimistic concurrency, PER CARD
  updated_by    uuid not null
  updated_at    timestamptz not null default now()
  created_by    uuid not null
  created_at    timestamptz not null default now()

signout_card_history            -- append-only: body_ct/nonce/key_id, version, edited_by/at
  id, card_id references signout_cards(id) on delete cascade, ...

-- Quarantined identifiers — SEPARATE key, linked per card, audited decrypt.
signout_patient_ids
  id            uuid pk default gen_random_uuid()
  card_id       uuid not null references signout_cards(id) on delete cascade
  name_ct       bytea
  dob_ct        bytea
  mrn_ct        bytea
  nonce         bytea
  id_key_id     text not null            -- separate identifier key id
  created_by    uuid not null
  created_at    timestamptz not null default now()

signout_id_access               -- append-only audit ("who revealed a patient's identity")
  id, patient_id references signout_patient_ids(id) on delete cascade,
  revealed_by uuid not null, revealed_at timestamptz not null default now()
```

Why facets are plaintext: severity/POD/status/handle/order are operational and
non-identifying; keeping them queryable is what lets the UI feel powerful (sort by
severity, filter to unstable, collapse stable, nightly POD rollover) without decrypting
and re-parsing every card on every read. Direct identifiers stay encrypted under the
separate key. In strict PHI mode `handle` can also be encrypted (a numeric facet stays
for ordering) — see §13.

## 5. Access control & RLS

**Permission model (decided):** **any active member** of a program can create a service
list and add/edit cards — no special role gate. Identifier reveal is likewise open to any
active member but **always audited** (`signout_id_access`); it can be tightened to a role
later without schema change.

Reuse the existing layer:
- `getActiveMembershipForUser(userId)` → `program_id` (`src/lib/workspace/memberships.ts`).
- `requireWorkspaceAccess` / `requireWorkspacePermission` (`src/lib/workspace/access-control.ts`)
  gate the routes.
- **RLS on every table** keyed off `program_memberships`: a card is visible only if the
  requesting `auth.uid()` has an active membership in the card's service's `program_id`:

```sql
create policy signout_cards_select on public.signout_cards for select using (
  exists (
    select 1
    from public.signout_services s
    join public.program_memberships m on m.program_id = s.program_id
    where s.id = signout_cards.service_id
      and m.user_id = auth.uid()
      and m.is_active
  )
);
```

- `signout_id_access` and `signout_card_history` are **insert-only** for normal users so
  the audit/history trail can't be rewritten.
- The identifier decrypt path runs server-side via the **admin client**
  (`createAdminClient`, `src/lib/supabase/admin.ts`) after an explicit permission check,
  and writes a `signout_id_access` row before returning plaintext.

## 6. API surface

Routes under `src/app/api/workspace/signout/`:

| Route | Method | Purpose |
|---|---|---|
| `/services` | GET / POST | List services for the user's program / create one |
| `/cards?serviceId=` | GET | List cards (facets + decrypted bodies) for a service |
| `/cards` | POST | Create a card (quick-add) |
| `/cards/[id]` | PUT | Save body + facets; requires `version`; 409 on stale |
| `/cards/[id]` | DELETE | Discharge / remove a card |
| `/cards/reorder` | PATCH | Persist drag-reorder / pin (`sort_order`, `pinned`) |
| `/patients` | POST / PATCH | Create/update a quarantined identifier record for a card |
| `/patients/[id]/reveal` | POST | Audited decrypt of name/DOB/MRN |
| `/cards/[id]/draft` | POST | LLM draft text for one patient (de-identified) |
| `/services/[id]/draft` | POST | LLM draft for the whole handoff (de-identified) |

Crypto in `src/lib/workspace/signout/crypto.ts`:
`encrypt(plaintext, scope) -> { ct, nonce, keyId }` / `decrypt(ct, nonce, keyId, scope)`,
`scope` ∈ `card | identifier`.

## 7. Editor experience — freeform, card-based, powerful (not a table)

**Design principle: structure emerges from freeform typing.** The resident writes
naturally; the app recognizes ortho patterns and renders them as beautiful, actionable
UI. Feel target: Craft / Linear / Apple Notes. Never a spreadsheet.

**Layout**
- The service is a **single scroll of patient cards**. Each card has a **colored left
  rail** for I-PASS severity (green stable / amber watcher / red unstable) — visual triage
  with no "status column."
- **Collapsible:** stable patients collapse to a one-line summary; watcher/unstable stay
  expanded. The whole service is scannable at a glance = "all in one place."
- **Drag to reorder; pin** critical patients to the top.
- **Quick-add bar** at top: type a handle, press enter → new card, cursor in the body.
  Frictionless capture is the whole point of "make signing out easier."

### 7.0 View modes — card and table

A board-level toggle switches the same cards between two presentations (same data, no
re-fetch — the table reads the plaintext facets + a truncated body preview):

- **Card view** (default): the scroll of rich cards above — depth, editing, SOAP sections.
- **Table view**: one dense row per patient — the classic sign-out whiteboard. Columns:
  severity dot · handle · patient (age/sex/side) · dx / procedure · POD · WB · overnight
  one-liner (with a `☐ 2` action-item count) · pending tags. **Sortable / filterable on
  the plaintext facets** (severity, POD, status) with no decrypt.
- **Interaction:** inline-edit facets in a cell (severity, WB, POD); click a row → expand
  the full card (or a side peek) for body/section edits. Same autosave + version rules.
- The **handoff/print view** (§7 below) is the print-optimized snapshot of the table.

### 7.0.1 UI redesign — structured fields (2026-08-05, from real-world feedback)

Audit against a resident's real Google-Doc sign-out (columns: Attending · Name · Room ·
HPI/Exam · Labs/Imaging/PT · Plan/ToDo) found the freeform `## markdown` editor too
clunky (users typed `## Vitals` as literal text). Replaced the single markdown textarea +
chip toolbar with a **structured labeled-field editor** matching those columns:
**Attending · One-liner · HPI/Exam · Labs/Imaging/PT · Plan/To-Do**, each a labeled box.
Fields serialize to/from the single encrypted body via `## Title` sections
(`fields.ts` `splitFields`/`serializeFields`), so no schema/crypto change and display is
unchanged. Added an `attending` plaintext facet (migration `..._140000_...attending.sql`)
shown in the card header, for grouping like the real doc. Names stay in the encrypted
identity panel (the plaintext bed/handle field must not hold PHI).

### 7.1 Optional clinical sections (attending sign-out depth)

Inside a card the resident can add collapsible **sections** — via a `/` command or a
"+ section" chip — each freeform inside, each optional:

- **Subjective** — overnight events / interval history.
- **Objective** — **Vitals**, **Exam / PE**, **Labs**, **Imaging**, I/O & drains.
- **Assessment & Plan** — the problem + plan, what the attending actually wants.
- (plus the handoff-native blocks: **Action items**, **Overnight / contingency**, **Pending**.)

- **Labs** — **manual, flexible entry** (no fixed fishbone/grid): the resident adds the
  labs that matter for *this* patient as `label → value` rows (e.g. `Hgb 9.1`, `Cr 1.4`,
  `INR 2.3`), since different cases track different labs. Rows render as a clean compact
  list; out-of-range values can be flagged manually. No enforced CBC/BMP template.
- **Vitals** — a one-line `T/HR/BP/RR/SpO2` strip, manual entry, out-of-range tintable.

Sections are collapsed by default in the overnight view and expanded in the attending
sign-out view (§9). Empty sections never render — depth is opt-in per patient.

**Smart inline tokens (the "more powerful than a table" magic)**
As the resident types, recognized tokens render as styled chips and drive facets:
- `WBAT` / `NWB` / `TTWB` → colored weight-bearing pill.
- `POD1` → day counter that sets `pod_number`; the **nightly job auto-bumps it**.
- `[ ]` / `[x]` → **interactive checkbox** — action items the covering resident checks off
  overnight; the to-do **survives the handoff**. This alone beats any static table.
- `!!` or a severity word → sets the card's severity rail.
- `#pending`, `#OR`, `#dispo` tags → surface in the matching filter.

**Editing & collaboration**
- **Per-card autosave with optimistic concurrency** (each card carries its `version`;
  stale save → 409 → reload + "Jordan just edited this"). Because concurrency is per-card,
  two residents editing different patients never collide — a real win over one blob.
- Every save appends `signout_card_history` (undo + who-changed-what).
- **Presence** via Supabase realtime: "2 viewing" + live "edited by X at 9:42."

**Views & density (powered by the plaintext facets — no table needed)**
- Filters: "my unstable," "#pending," "#OR add-ons," "post-op only."
- **Handoff / print view:** one click → clean, dense, printable list residents still carry.

**Mobile-first**
- Residents sign out on phones — cards, quick-add, checkboxes must work in the existing
  `src/components/workspace/mobile` patterns, not as an afterthought.

## 8. Ortho vocabulary & templates

- **Skeleton insert** (quick-add or `/` command):
  `7W-12 · 34M R hip · s/p ORIF POD1 · WB: WBAT · Ppx: lovenox · O/N: ___`
- **Chip palette:** `NWB` `TTWB` `WBAT` · `splint` `brace` · `VTE ppx` · `ORIF` `washout`
  · `compartment check` · `PT/dispo`.
- Per-program custom snippets later; house style = handles-not-names in the body.

## 9a. Generate-text button — v1 ✅ BUILT 2026-08-06

Delivered files:
- `src/lib/workspace/signout/draft-prompt.ts` (+test) — `buildDraftMessages`/`draftPayload`;
  payload carries body fields + surgery/POD context only, NEVER location or identifiers.
- `src/lib/workspace/signout/repository.ts` — `getCard` (single card, decrypted).
- `src/app/api/workspace/signout/cards/[cardId]/draft/route.ts` — POST, gated by
  `SIGNOUT_DRAFT_ENABLED=true`, reuses `openai-client.ts` (`gpt-4o-mini`), returns `{{name}}` draft.
- `src/components/workspace/signout/DraftPanel.tsx` — inline panel; splices the name
  client-side via the audited reveal; editable; Copy / Regenerate. `api.ts` `apiDraftCard`.
- Wired into `PatientCard` (below identity panel) + board `generateDraft` (preview-mocked).

Verified in preview: narrative draft (name · age/sex · presentation → POD/surgery → HPI →
PE → labs → assessment), no room, no greeting; `{{name}}`→`[Name]` when no identity,
`{{name}}`→ real name (client-spliced) when identity on file. tsc clean; tests pass.
**To turn on for real data:** set `SIGNOUT_DRAFT_ENABLED=true` (after an OpenAI BAA) +
`OPENAI_API_KEY`. Original finalized spec below.

## 9a-spec. Generate-text button — finalized v1 (2026-08-06, from real examples)

Decisions locked with real sample texts the user sends attendings:
- **Format:** narrative "attending update" (mini-consult prose), NOT terse shorthand. No
  greeting. No room/location. One-liner (name + age/sex + presentation) → history → PE →
  labs/imaging (keep "image attached" notes) → assessment/recommendation. Built from the
  card's structured fields (one-liner, HPI/Exam, Labs/Imaging/PT, Plan).
- **Scope:** per-card first (inline panel like IdentityPanel). Whole-service + other
  formats (I-PASS, SMS) are v2.
- **Name handling (KEY):** LLM emits a literal `{{name}}` token — OpenAI never receives a
  name. The **browser splices the real name locally** via the audited identity reveal
  before the user copies. No identity on file → leave `[Name]`. Requires the name to live
  in the identity panel, not the plaintext bed/handle field.
- **Backend:** `POST /api/workspace/signout/cards/[cardId]/draft`; reuse existing
  `src/lib/brobot/openai-client.ts`; small fast model; strict "reformat-only, invent
  nothing, output {{name}}, no greeting, no room" prompt. Sends body + facets only — never
  identifiers, never room.
- **Compliance gate:** de-identified clinical narrative still goes to OpenAI, so gate the
  feature behind an **OpenAI BAA (zero-retention) + `phi_enabled`** before real-patient
  use (parallel to identifier gating). Mocked in preview. Name is out of scope for the BAA
  (client-side splice).
- **Flow:** draft → splice name → editable textarea → Copy / Regenerate. No send in v1
  (later: in-app APNs push, never carrier SMS).

## 9. LLM draft-text feature (v1: draft only)

- Reads decrypted **card bodies only** (handles) — structurally cannot see identifiers.
- Reuses existing LLM plumbing (Brobot / CasePrep patterns).
- **Per-card** ("draft this patient's blurb") and **whole-service** ("draft the handoff").
- **Audience-aware** (§2): (a) **attending sign-out** — SOAP presentation pulled from the
  Subjective/Objective/Labs/A-P sections; (b) **overnight handoff** — terse I-PASS blurb,
  action-first; (c) SMS-length de-identified one-liner.
- On-call recipient surfaced from the **call schedule** (`src/lib/workspace/call`) even
  though v1 does not send. **No send button in v1**; when added, only the de-identified
  blurb is eligible, via in-app APNs push, never carrier SMS.

## 10. Nightly job (Vercel cron)

Existing pattern: `vercel.json` crons + `src/app/api/cron/…`. One nightly job:
1. **POD rollover:** `pod_number = pod_number + 1` for active cards with a POD set — the
   biggest daily-busywork reducer.
2. **Purge:** hard-delete discharged cards (and their `signout_patient_ids`) older than
   14 days (program-configurable). Minimizing retained identifiers is the top risk reducer.

## 11. Module / file layout

```
supabase/migrations/2026xxxx_xxxxxx_signout_tracker_foundation.sql
src/lib/workspace/signout/
  crypto.ts            # AES-256-GCM, card|identifier scopes, key_id rotation
  crypto.test.ts       # round-trip, tamper-detect, key rotation
  repository.ts        # reads/writes, per-card version checks
  tokens.ts            # smart-token parse/serialize (facets ⇄ body)
  sections.ts          # section doc model + serialize/parse; labs/vitals shorthand
  types.ts
src/app/api/workspace/signout/…       # routes from §6
src/components/workspace/signout/
  SignoutBoard.tsx     # host: card/table view toggle, quick-add, filters
  SignoutTable.tsx     # dense roster: sortable facet columns, inline edit, row→card
  PatientCard.tsx      # severity rail, collapse, section editor, audience toggle
  SmartBody.tsx        # renders chips/checkboxes from freeform text
  ClinicalSection.tsx  # collapsible S / O / PE / A-P section
  LabsEntry.tsx        # manual, per-case label→value lab rows (no fixed template)
  HandoffPrintView.tsx # printable dense list
```

## 12. Phased milestones

**Phase 1 — Encrypted card core. ✅ BUILT 2026-08-05.** Migration (services, cards,
card_history, patient_ids, id_access + RLS + facets), `crypto.ts` + tests, card CRUD +
reorder routes with per-card version check, service create/list. _Acceptance:_ two users
in a program share a service; add/edit/reorder cards; stale save 409s; DB stores only
ciphertext for bodies/ids.

Delivered files:
- `supabase/migrations/20260805_120000_signout_tracker_foundation.sql`
- `src/lib/workspace/signout/`: `crypto.ts` (+`crypto.test.ts`), `types.ts`, `access.ts`,
  `repository.ts`, `validation.ts` (+`validation.test.ts`), `http.ts`
- `src/app/api/workspace/signout/`: `services/route.ts`, `cards/route.ts`,
  `cards/[cardId]/route.ts`, `cards/reorder/route.ts`
- `.env.example`: `SIGNOUT_KEY_ID`, `SIGNOUT_KEY_CARD_*`, `SIGNOUT_KEY_IDENTIFIER_*`

Verified: crypto tests (9 checks) + validation tests pass; `tsc --noEmit` clean project-wide.
**To activate:** run the migration in the Supabase SQL editor, then set the three env vars
(a `SIGNOUT_KEY_ID` epoch + a base64 32-byte key per scope) locally and in Vercel.

**Phase 2 — Editor experience + views. ✅ BUILT 2026-08-05.** Card list UI, severity rail,
collapse, pin + move up/down, quick-add, debounced autosave with 409-conflict handling,
presence (viewer count), handoff/print sheet; **card ↔ table view toggle** with sortable
facet columns and inline facet edit; mobile-friendly. _Acceptance:_ card view feels like
Craft; table view is a scannable roster; toggling switches without a re-fetch. Verified in
the browser preview (card + table render, POD/severity/legend/edited-time update live,
quick-add adds + clears).

Delivered files:
- `src/app/work/signout/page.tsx` (server page; `?preview=1` fixture mode in dev)
- `src/components/workspace/signout/`: `SignoutBoard.tsx`, `PatientCard.tsx`,
  `SignoutTable.tsx`, `severity.ts`, `api.ts`, `fixtures.ts`

Route: **/work/signout** (dev visual check: `/work/signout?preview=1`).
Deferred to later phases: true drag-reorder (using pin + up/down for now), live row-sync
(presence only; realtime postgres row sync needs the tables added to the
`supabase_realtime` publication), smart tokens + SOAP sections (Phase 3 / 3.5).

**Phase 3 — Smart tokens & facets. ✅ BUILT 2026-08-05.** Inline chips (WB, POD, tags),
interactive `[ ]`/`[x]` checkboxes, facet-driven filters (severity, #tags, post-op),
nightly POD rollover cron. _Acceptance:_ `WBAT`/`NWB`/`POD1`/`#tag` render as chips;
checkboxes toggle + persist across handoff; filters work. Verified in preview (WB pills,
tag chips, checkbox check+strikethrough, #pending filter narrows the list).

Delivered files:
- `src/lib/workspace/signout/tokens.ts` (+`tokens.test.ts`) — parse/tokenize/toggle/extractTags
- `src/components/workspace/signout/SmartBody.tsx` — renders chips + checkboxes; click-to-edit
- `PatientCard.tsx` — edit/display toggle, checkbox handling; `SignoutBoard.tsx` — filter row
- `supabase/migrations/20260805_130000_signout_pod_rollover_fn.sql` — `signout_rollover_pod()`
- `src/app/api/cron/signout-pod-rollover/route.ts` + `vercel.json` cron (daily `0 8 * * *`)

Cron is gated by `ENABLE_CRON_JOBS` + `CRON_SECRET` (matches existing crons); the second
migration must be applied for the rollover RPC to exist. POD rollover does not bump
`version` (avoids spurious 409s on open clients).

**Phase 3.5 — Clinical sections. ✅ BUILT 2026-08-05.** Section parsing in `tokens.ts`
(`parseSections`), collapsible `## Subjective/Objective/Labs/A&P` sections in `SmartBody`,
an insert toolbar (section + token chips) in the card editor, and a board-level
**Overnight ↔ Attending** audience toggle that drives default section collapse. Labs/vitals
are freeform lines under their headers (manual, per case). _Acceptance:_ a card carries a
full SOAP workup; empty sections don't render; the audience toggle collapses/expands.
Verified in preview (sections render, Attending expands S/O/A&P, insert chips, and a
`## header`-leaks-as-tag bug was found + fixed with a regression test).

**Phase 4 — Identifiers. ✅ BUILT 2026-08-05.** `upsertIdentifiers` / `revealIdentifiers`
in the repository (name/DOB/MRN sealed as ONE combined GCM blob under the identifier key —
avoids nonce reuse given the single nonce column), audited reveal writing
`signout_id_access`, PHI-gated routes (`cards/[cardId]/identifiers` + `/reveal`, 403 unless
the service `phi_enabled`), `hasIdentifiers` flag on cards, and an `IdentityPanel` UI
(add form + on-file reveal with "access logged" note). _Acceptance:_ names under the
separate key; every reveal logs; the card/list path never returns identifiers. Verified in
preview (add form, reveal shows values + audit note; only shown when the service is PHI-on).

**Phase 5 — Draft text.** Per-card + whole-service draft; both formats; on-call recipient
from call schedule. _Acceptance:_ draft always de-identified; no send path.

**Phase 6 — Retention + PHI gating.** Purge in the nightly job; `phi_enabled` per program
(default off); Supabase BAA before flipping on for a pilot. _Acceptance:_ discharged
cards purge on schedule; PHI mode is opt-in.

## 13. Open questions

1. **Body format:** light markdown (needed for `[ ]` checkboxes + chip parsing) — assume
   yes unless you object.
1b. **Section set:** is Subjective / Objective (Vitals, PE, Labs, Imaging) / Assessment &
   Plan the right default section list for an attending sign-out, or add/rename any?
1c. ~~Labs entry~~ **Decided:** manual per-case `label → value` rows — no fixed
   fishbone/grid, since different cases track different labs.
2. ~~Key storage~~ **Decided:** env vars (Vercel), read via a single `getKey(keyId)`
   indirection; `key_id` per row enables rotation. No Supabase Vault.
3. **Strict PHI mode:** encrypt `handle` too (keeping a numeric facet for order), or is a
   room/bed locator acceptable in plaintext?
4. ~~Service seeding~~ **Decided:** free-text service names, no seed.
5. ~~Roles~~ **Decided:** any active program member creates services / edits cards;
   identifier reveal open to any member but audited, tightenable later.
6. **iOS parity:** web-first, or does the iOS app need a matching surface (affects contracts)?

## 14. Risks

- **Scope creep back into a rigid form/table** — resist; value is freeform + smart tokens.
- **Residents typing names in the body** — mitigate with house-style + handle-first
  skeleton; identifiers belong only in the quarantined table.
- **Key management burden** — start single-key + `key_id`; no envelope/E2E until needed.
- **PHI legal footprint** — `phi_enabled` off until a BAA exists; handle mode needs none.
- **Rich-editor complexity** — smart tokens are the one place to over-invest; keep the
  data model lean (encrypted body + plaintext facets) so the power lives in the UI.
