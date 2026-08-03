# SnapOrtho master-deck tag audit

Recommendation: **DO_NOT_PUBLISH**

- Coverage: 3071/5095 (60.3%)
- Missing cards: 2024
- Distinct tags: 451
- One-off tags: 110
- Clinical tags without assertion provenance: 5647
- Singular/plural collisions: 13

## Blocking findings

- deck_spine_missing_matching_specialty: 39/217
- deck_hand_missing_matching_specialty: 45/256
- deck_foot_missing_matching_specialty: 95/389
- deck_shoulder_missing_matching_specialty: 118/442
- deck_pediatrics_missing_matching_specialty: 204/370
- deck_oncology_missing_matching_specialty: 25/93
- distal_radius_under_hand_osteology: 43/3071
- medial_meniscus_classed_as_ligament: 8/3071
- calcar_under_general_anatomy: 7/3071
- pelvis_repeated_as_child_of_pelvis: 28/3071
- clinical_tag_without_assertion_provenance: 5647/9688

## Review protocol

Use `KEEP`, `REMOVE`, `REPLACE`, or `ADD` in `reviewer_decision`. `REPLACE` and `ADD` require governed paths in `replacement_tags`; every non-KEEP decision requires a rationale.
