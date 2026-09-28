# Acronym + Type-Gap Findings (Phases K–L)

## K — acronym collisions

- Live acronym canonicals are clean singletons: PIN (nerve sense verified),
  FDS/FCR/ECU/FCU/FDP, TUBS (as parenthetical in full-form label). No
  acronym-acronym collisions in the live index.
- Joint-ambiguous acronym targets: MCL → Medial Collateral Ligament
  (elbow-context claim; tradeoff upheld, split backlogged in
  `duplicate-governance.md` P3); LCL proposals all correctly DEFER on
  joint-divergence (knee vs elbow); PCL → Posterior Cruciate Ligament
  approved (no competing orthopaedic sense; weak single-claim context noted).
- Bare "Hawkins" must never be an alias (Classification vs Sign collision);
  slice 3 promotes "Hawkins Sign" with surface-form-only alias.

## L — type gaps (medication / organism / symptom)

- Live enum has exactly 15 values — no medication, organism, or symptom home.
  Confirmed via full-index value census.
- 48 proposals match a med/organism/symptom lexicon: organisms correctly
  DEFER (Pseudomonas, Staph aureus, Group A strep); most symptoms DEFER.
- Leakage into PROMOTE (low-impact tail, outside slice 3 — must be swept in
  slice 4 before any batch apply): "Pain on extension"→biomechanics_concept,
  "Pain out of proportion to injury"→condition,
  "Single localized deformity"→condition,
  "Periscapular muscle weakness"→anatomy_structure,
  'Tenodesis - "groove pain'→anatomy_structure (malformed label).
- Ruling needed (ontology owner): add symptom (+/- medication/organism) enum
  values, or formally declare symptoms out of scope (→ REJECT class). Until
  ruled: symptoms DEFER, never promote; the 5 leaked rows above are
  pre-rejected in this review.
- Related flag debt: `measurement_like` (178), `likely_verb_fragment` (24),
  `generic_single_token` (4) proposals need the slice-4 sweep alongside.
