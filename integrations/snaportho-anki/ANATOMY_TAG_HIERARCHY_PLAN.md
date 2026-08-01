# SnapOrtho Anatomy Tag Hierarchy — Audit & Retag Plan

> ⚠️ **SUPERSEDED (2026-08-01).** This plan targeted the historical *Marty McFlyin* import
> (`anki_note_tags`). The live target is the **versioned deck**, whose anatomy tags come from
> the governed-tag pipeline, not `anki_note_tags`. Use the executable workflow in
> **`anatomy-hierarchy/RUNBOOK.md`** instead. Kept below for the original audit findings only.

Status: **planning / assessed** (2026-08-01). Owner: Alex. Execution = multi-agent, one region per agent.

## Goal

Give the master deck a single, consistent **anatomy tag hierarchy** so any "all X anatomy"
query returns the right cards. Today the anatomy signal is scattered across 5 competing
systems (see Findings). This pass **adds** one canonical layer; it does **not** rewrite or
delete existing tags.

## Decisions locked (2026-08-01)

1. **Strategy = additive.** Add a parallel canonical namespace. Existing tags untouched. Fully reversible. Retiring old duplicate tags is a separate later pass.
2. **Scope = all anatomy across all 4 sources** (Netter, Pocket Pimped, OrthoBullets, Hip & Knee Book / AAOS), not Netter-only.
3. **Deliverable = reviewable JSON diff → single apply.** Agents never write to Supabase directly.

## Ground-truth data facts

- Deck: **Marty McFlyin's Ortho Deck**, import batch `4bc171ba-2264-4805-918c-762b5b5d19c6`.
- **5,095 cards / 4,681 notes / 637 tags / 16,239 note-tag links.**
- Tags live in Supabase: `anki_tags` (defs) + `anki_note_tags` (links). This is the edit substrate.
- Source sub-decks by card count: OrthoBullets 1,760 · Netter 1,721 · Pocket Pimped 1,472 · AAOS Res Study 77 · Hip & Knee Book 49 · Alex 16.
- The three `.apkg` files in `~/Downloads` are **CasePrep cloze builds only** (3 tags) — NOT this deck. Ignore them.

## Findings — why anatomy is unsearchable today

Anatomy signal is split across five systems with no shared namespace:

| Sys | What | Examples | Defect |
|-----|------|----------|--------|
| A | Netter tissue tags | `#Ortho::Netters::Forearm::Muscles`, `#Ortho::Netters::Foot_Ankle::Osteology` | `#` prefix + `Under_scores`; cleanest hierarchy though |
| B | Orphan tissue tags | `Muscles` (162), `Joints` (85), `Nerves` (54), `Osteology` (53), `Arteries` (19) | no region attached |
| C | Flat region tags | `Hand` (265), `Spine` (186), `Forearm` (109), `Pelvis` (119), `ThighHip` (83) | no tissue depth |
| D | Region-hierarchy tags | `LowerExtremity::Knee`, `ShoulderAndElbow::Shoulder`, `FootAnkle` (254) | separate vocabulary |
| E | Anki deck path | `Netter's::05 Forearm::05.11 Muscles` | richest signal, but it's the folder tree not a tag |

Specific defects:
- **Region-name variants:** `FootAnkle` (254) / `FootAndAnkle` (29) / `Foot_Ankle`; `ThighHip` / `Thigh_Hip`; `ShoulderGirdle` (145) / `ShoulderAndElbow::Shoulder`.
- **Casing dup families** that fracture card sets: `Trauma` (310) vs `trauma` (258); `Infection` (33) vs `infections` (30); `Pathology` vs `pathology`.
- **Typos in tags:** `SpineDegnerative`, `Drawfism::Achondroplasia`.
- **Redundant self-prefixing:** `FootAnkle::Conditions::FootAnkleConditionsCavovarusFoot`, `Hand::Conditions::HandConditionsScaphoid`.

## Canonical schema (the target)

Form:

```
SnapOrtho::Anatomy::<Region>::<Tissue>[::<Structure>]
```

Examples:
```
SnapOrtho::Anatomy::Forearm::Muscles::FlexorCarpiRadialis
SnapOrtho::Anatomy::Forearm::Nerves::MedianNerve
SnapOrtho::Anatomy::FootAnkle::Osteology::Calcaneus
SnapOrtho::Anatomy::Spine::Joints::FacetJoint
```

**Why the `SnapOrtho::` prefix (grounded in code):** `formatAnkiTags`
(`src/lib/education/anki-bootstrap-notetype.ts:257`) drops every tag NOT starting with
`SnapOrtho::` from the Master deck export. A bare `Anatomy::` tag would be invisible to any
future synced Master build. So the canonical form must be `SnapOrtho::Anatomy::…`.

**Controlled vocabulary — agents MUST NOT invent Region/Tissue values outside these.**

Regions (12):
`BasicScience`, `Spine`, `ShoulderGirdle`, `Arm`, `Elbow`, `Forearm`, `Hand`,
`Pelvis`, `ThighHip`, `LegKnee`, `FootAnkle`, `General` (pan-regional/systemic only).

Tissues (8):
`Osteology`, `Joints`, `Ligaments`, `Muscles`, `Nerves`, `Vasculature`, `Bursae`, `Other`.
(`Other` = topographic/surface/general-relationship anatomy that isn't one tissue.)

`<Structure>` is optional, PascalCase, singular where natural (e.g. `MedianNerve`,
`Calcaneus`). Omit if the card is general to the tissue.

### What counts as "anatomy" (inclusion rule)

Tag a card with `SnapOrtho::Anatomy::…` when its primary teaching point is a **normal
anatomical structure or relationship** — bones/osteology, joints, ligaments, muscles
(origin/insertion/action/innervation), nerves, vasculature, bursae, surface/topographic
anatomy, biomechanics of normal structures.

Do NOT anatomy-tag pure condition/procedure/management cards (fractures, arthroplasty
technique, tumor pathology, classifications) — those keep their existing tags and are out
of scope here. When a condition card also teaches the relevant normal anatomy, add only the
`Region` + best `Tissue` (structure optional), don't force a structure.

## Region alias map (deterministic backbone)

Agents derive Region first, mostly deterministically, from deck path (system E) + existing
region tags (C/D) using this map. Extend cautiously; log any unmapped term for the reconcile
pass.

| Canonical Region | Source terms that map to it |
|------------------|------------------------------|
| BasicScience | `01 Basic Science`, `BasicScience`, `MSKScience`, `Bones::BoneBasicScience`, bone/cartilage/tissue science |
| Spine | `02 Spine`, `Spine*`, `#Ortho::Netters::Spine*`, Cervical/Thoracic/Lumbar/Scoliosis |
| ShoulderGirdle | `03 Shoulder`, `ShoulderGirdle`, `Shoulder`, `ShoulderAndElbow::Shoulder`, `Scapula`, `Clavicle`, `AcromioclavicularJoint` |
| Arm | `04 Arm`, `Arm`, `Humerus`, `#Ortho::Netters::Arm*` |
| Elbow | `Elbow`, `UpperExtremity::UpperExtremityElbow`, `ShoulderAndElbow::Elbow` |
| Forearm | `05 Forearm`, `Forearm*`, `#Ortho::Netters::Forearm*`, `RadiusUlna` |
| Hand | `06 Hand`, `Hand*`, `Wrist`, `UpperExtremity::UpperExtremityHand`, `Carpal`, `DistalRadius` (wrist context) |
| Pelvis | `07 Pelvis`, `Pelvis`, `Acetabulum`, `#Ortho::Netters::Pelvis*` |
| ThighHip | `08 Thigh/Hip`, `ThighHip`, `Thigh_Hip`, `Femur`, `ProximalFemur`, `LowerExtremity::Hip`, `Hip*` |
| LegKnee | `09 Leg/Knee`, `Leg*`, `LegKnee`, `Knee`, `LowerExtremity::Knee`, `Tibia`, `Patella` |
| FootAnkle | `10 Foot/Ankle`, `FootAnkle`, `FootAndAnkle`, `Foot_Ankle`, `Ankle`, `Hindfoot`, `Calcaneus`, `Talus` |
| General | whole-body / systemic anatomy with no single region |

Tissue map: `Osteology`/`Bones`/`Bone*` → `Osteology`; `Joints`/`Articulations` → `Joints`;
`Ligament*` → `Ligaments`; `Muscles` → `Muscles`; `Nerves`/neuro structures → `Nerves`;
`Arteries`/`Ar[t]eries`/`BloodSupply`/vascular → `Vasculature`; `Bursa*` → `Bursae`;
`TopographicAnatomy`/`SurfaceAnatomy`/`OtherStructures`/`GeneralAnatomy` (non-specific) → `Other`.

## Multi-agent execution

### Sharding
One agent per **canonical Region** (~12 agents). Each agent's card set =
`anki_cards` whose deck path or region tags map to that region (query provided at apply time).
Region assignment is disjoint → no two agents touch the same card, so runs are parallel-safe.

### Per-agent input
- Its region name + the full schema/vocab/inclusion rule above (paste this doc).
- A dump of its cards: `canonical_card_id`, `note_id`, `deck_full_name`, existing tags, and the
  card's front/back field text (for tissue + structure inference).

### Per-agent output (the only artifact — no DB writes)
One JSON file `anatomy-diff.<Region>.json`:

```json
{
  "region": "Forearm",
  "schemaVersion": "anatomy-tags.v1",
  "generatedAt": "2026-08-01T00:00:00Z",
  "cards": [
    {
      "note_id": "uuid",
      "canonical_card_id": "uuid",
      "add": ["SnapOrtho::Anatomy::Forearm::Muscles::FlexorCarpiRadialis"],
      "evidence": "deck path 05 Forearm::05.11 Muscles + field 'flexor carpi radialis origin'"
    }
  ],
  "skipped": [{ "note_id": "uuid", "reason": "condition-only, no normal anatomy taught" }],
  "unmappedTerms": ["<any source term the alias map didn't cover>"]
}
```

Rules for agents:
- `add` values MUST match `SnapOrtho::Anatomy::<Region>::<Tissue>[::<Structure>]` with Region ==
  the agent's region and Tissue in the controlled set. No other prefixes, no `remove` (additive pass).
- Every card either appears in `cards` (with ≥1 add) or in `skipped` with a reason.
- Never fabricate a structure you can't support from deck path or field text — Region+Tissue is fine.

### Reconcile + validate pass (single run, after all agents)
1. Schema-lint every `add` (regex + Region/Tissue vocab). Reject/queue violators.
2. Dedupe; ensure each `note_id` appears under exactly one region file.
3. Coverage report: cards anatomy-tagged vs. skipped vs. untouched, per region and per source.
4. Aggregate `unmappedTerms` → decide vocab extensions before apply.
5. Emit `anatomy-apply.json` (flattened note_id → tags-to-add) + a human-readable summary.

### Apply (single transaction, after your review)
1. **Snapshot first:** `create table anki_note_tags_bak_20260801 as select * from anki_note_tags;`
2. Upsert new `anki_tags` rows for each distinct canonical tag (raw_name + slug).
3. Insert `anki_note_tags` links from `anatomy-apply.json` (idempotent on the `(note_id, tag_id)` unique constraint).
4. Re-run coverage query; confirm counts match the report.

## Guardrails / known gotchas
- **Central-sync hash:** `computeCentralSyncHash` hashes only `SnapOrtho::`-prefixed tags.
  Because our tags are `SnapOrtho::Anatomy::…`, they WILL enter that hash **at Master-release
  build time**. This is fine now (these imported cards aren't in a published Master release, so
  there's no installed base to churn), but the release builder must treat this as the tag
  baseline. Do not add `SnapOrtho::Anatomy::` tags to an already-published release incrementally
  without a version bump.
- Additive only — no deletes/renames this pass. Keeps rollback = drop the new links.
- Agents get disjoint card sets → safe to run concurrently.

## Open items before execution
- [ ] Confirm the exact card-dump query + where agents read/write files (scratchpad vs repo).
- [ ] Confirm `General` region is wanted, or force every card into a body region.
- [ ] Decide whether `<Structure>` depth is required for Netter cards (high-signal) vs optional elsewhere.
- [ ] Later pass (not now): retire duplicate/casing/typo tags once the Anatomy layer is trusted.
