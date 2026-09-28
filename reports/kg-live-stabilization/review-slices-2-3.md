# Review Slices 2–3 — Calibration Review (Phase I)

Reviewer: offline calibration review (claim-context adjudication), same method
as Phase 3 quality-review. Source: `full-index-entity-rerun.json` (1,924
proposals vs full live index). Every row below adjudicated against its example
claim(s); risky targets verified against the live `canonical_entities` extract
(1,295 rows, stable since Sep 26) and live usage maps (2,113 claims'
`primary_entity_id`, 8,800 canonical-card entity links).

## Slice 2 — all 72 live ALIAS_EXISTING → `slice-2-alias-review.csv`

- APPROVE 71, APPROVE_WITH_RETARGET 1, REJECT 0.
- All 37 exact-normalized matches verified correct in context.
- Elided nerve forms (Femoral/Median/Ulnar, Superficial peroneal, Anterior
  talofibular, Medial parapatellar/Kocher-Langenbeck/Modified Stoppa approaches)
  all confirmed by innervation/approach claim context.
- Full-form→acronym aliases verified: FDS/FCR/ECU/FCU/FDP single approved
  anatomy canonicals; Posterior Interosseous Nerve + Radial-PIN → PIN, whose
  nerve sense was verified via its 2 live linked claims ("PIN nerve is most
  at risk with a Monteggia fracture", "…greatest risk with the Kaplan and
  Kocher approaches").
- ORIF RETARGET: recommender targets orphan copy `cde42d55` (0 claims,
  0 cards); retarget to referenced copy `7d8332ef` (69 cards) and merge the
  orphan via governance.
- MCL: UPHELD the Phase 3 accepted tradeoff (elbow-context claim aliases to
  joint-ambiguous canonical); joint-sense split stays on the governance
  backlog (see `duplicate-governance.md`).
- Notes recorded: Pelvic fracture→Pelvic Ring Fractures mild over-narrow
  (acetabular separately proposed, acceptable); Posterior Wall Acetabular
  Fracture target type suspect (imaging_finding for a fracture → type queue);
  Pseudotumor→Pseudotumor (MoM) exactly matches metal-ion context.
- Dedup warning for decision compilation: 5 normalized-duplicate proposal
  pairs (Rheumatoid arthritis ×2 case variants, Lateral center-edge angle ×2,
  Open fracture(s), Post-traumatic arthritis ×2, Ceramic on ceramic ×2) must
  compile to single alias decisions (idempotent decision keys).

## Slice 3 — top 55 PROMOTE_CANONICAL by claims×cards → `slice-3-promote-review.csv`

- APPROVE 41, APPROVE_MERGE 2 (one canonical), REVISE 7, DEFER 2, REJECT 3.
- All 7 elided-nerve promotes carry correct full-form canonical labels
  (Obturator/Tibial/Deep peroneal/Lateral+Medial plantar/Musculocutaneous
  nerve); all verified absent from the live index (genuine gaps).
- Intra-queue merge: "Musculocutaneous" + "Musculocutaneous nerve" → single
  "Musculocutaneous nerve" promote + "Musculocutaneous" alias.
- Revises: Plantar flex foot → "Plantar Flexion" (biomechanics_concept);
  Dorsal scapular → "Dorsal scapular nerve" (anatomy); Tibial torsion →
  biomechanics_concept; Hawkins → "Hawkins Sign" (imaging_finding —
  radiographic lucency context; alias "Hawkins sign" only, no bare "Hawkins"
  which would collide with Hawkins Classification); Speed → "Speed Test";
  CN XI → "Spinal Accessory Nerve" + alias; Incompetent RSC ligament →
  promote the structure "Radioscaphocapitate Ligament" (incompetence is
  claim-level state).
- Defers: "posterior wall", "Posterior column" (fragments — "The visualized
  is …"; confirm acetabular context before aliasing).
- Rejects: "autosomal dominant" (genetics, out of scope), "<10 years old"
  (age criterion), "Femoral origin" (site descriptor).

## Promote-tail risk (beyond slice 3 — for slice 4)

48 med/organism/symptom-like proposals found by lexicon scan. Organisms
correctly DEFER (Pseudomonas, Staph aureus, Group A strep — no enum home).
But the low-impact PROMOTE tail contains symptom-as-entity errors:
"Pain on extension"→biomechanics_concept, "Pain out of proportion to
injury"→condition, "Single localized deformity"→condition,
"Periscapular muscle weakness"→anatomy_structure,
'Tenodesis - "groove pain'→anatomy_structure (malformed label).
Slice 4 must sweep: symptom-like promotes, quoted/malformed labels
(`likely_verb_fragment` 24, `measurement_like` 178 flags), and
`generic_single_token` before any batch promote apply. No batch promote
without it.
