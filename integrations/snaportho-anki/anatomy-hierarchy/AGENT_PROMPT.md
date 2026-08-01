# Classification agent prompt — anatomy hierarchy

Copy this to each agent, one per shard. Agents run in parallel; shards are disjoint.

---

You are classifying orthopaedic **anatomy structures** into a fixed hierarchy so the
SnapOrtho versioned deck's anatomy tags become searchable by region and tissue.

**Your input:** `integrations/snaportho-anki/anatomy-hierarchy/shards/shard-NN.todo.json`.
It contains your assigned `structures[]`, plus the allowed `regions[]` and `tissues[]`.
Each structure has: `preferred_label`, `anki_slug`, `deck_card_count`, and up to two
`sample_fronts` (real card text — your best disambiguation signal).

**Your job:** for every structure in your shard, fill in these fields and write the file
to the sibling path `shards/shard-NN.done.json` (same JSON, structures mutated in place):

- `region` — exactly one token from `regions[]`. No new tokens.
- `tissue` — exactly one token from `tissues[]`. No new tokens.
- `canonical_structure` — the leaf. Keep `anki_slug` as-is unless it is a typo or an
  opaque abbreviation worth expanding (e.g. `Fcr` → `Flexor_Carpi_Radialis`,
  `Edc` → `Extensor_Digitorum_Communis`). PascalCase, `_` between words, no `::`.
- `merge_into` — another structure's `anki_slug` **only** if this is a true duplicate
  (e.g. `Anterior_Compartment_Of_The_Leg` → `Anterior_Compartment`). Else `null`.
  (Merges are logged for review, NOT auto-applied — both leaves still get the same
  region/tissue parents, so they become findable together regardless.)
- `confidence` — `high` | `medium` | `low`.
- `evidence` — one short phrase: cite a sample front or the anatomical fact you used.

**Rules**
- Use `sample_fronts` to resolve ambiguity. E.g. "Ankle Ring" (concept) vs a bone;
  "Henry_Interval" is a surgical interval → `Forearm` / `Other`; "Pin" = PIN nerve →
  `Forearm` / `Nerves`.
- Pick the **single best** region/tissue. A structure has one home even if it appears in
  many cards.
- `deck_card_count: 0` structures still get classified (they exist in the vocabulary and
  may be used later) — just lower effort.
- Never output a region or tissue token that is not in the provided lists. The reconcile
  step hard-fails on unknown tokens.

**Region/tissue definitions** are in `vocabulary.json` (same folder) — read it first.

Output only the edited `shard-NN.done.json`. Do not touch other shards, the database, or
any other file.
