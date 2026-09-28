# Live Baseline — Before (Phase D)

Captured 2026-09-28 via read-only Supabase REST (service key, `Prefer:
count=exact` + paginated fetches). No writes performed.

## Row counts

| Table | Count | Notes |
|---|---|---|
| canonical_cards (total) | 5,095 | 1,425 inactive legacy imports |
| canonical_cards (active) | 3,670 | EXACT match to offline corpus size |
| canonical_card_versions | 5,095 | |
| educational_claims | 2,113 | pre-atomic, single-style rows |
| educational_claim_versions | 2,113 | 1:1 with claims |
| card_claim_links | 19 | sparse: Phase 2 backfill not run |
| canonical_entities | 1,295 | 1,292 reviewed + 3 canonical; 1,087 approved + 208 unreviewed; 0 inactive |
| canonical_entities (trusted) | 1,087 | active + approved + (reviewed,canonical) |
| kg_automation_proposals | 7,421 | applied 3,613; needs_review 1,919; generated 935; superseded 803; approved 124; rejected 27 |
| external_questions | 7,618 | |
| source_aliases | 8,320 | ZERO with entity_type=canonical_entity (all legacy) |
| concept_aliases | 0 | table exists, empty |
| claim_entities | DOES NOT EXIST | Phase 2 migration not applied |
| claim_quality_flags | DOES NOT EXIST | Phase 2 migration not applied |
| canonical_entity_aliases | DOES NOT EXIST | Phase 3 migration not applied |
| entity_review_decisions | DOES NOT EXIST | Phase 3 migration not applied |

## Claims by type (live, 2,113)

anatomy_pearl 908, fact 830, complication 163, imaging_point 140,
treatment_indication 62, contraindication 9, clinical_script 1.

## Entities by type (live, 1,295)

condition 251, anatomy_structure 227, treatment_principle 149,
complication 129, biomechanics_concept 103, procedure 84, implant 80,
imaging_finding 75, surgical_approach 61, classification_system 45,
diagnostic_test 34, exam_maneuver 30, fixation_method 19, surgical_positioning
5, classification_grade 3. All 15 enum values present.

## Migration status (inferred)

`supabase_migrations` schema is not exposed via REST, so history is inferred
from object presence: `semantic_fingerprint_hash` column absent and all four
Phase tables absent → NONE of the 4 Phase 1–3 migrations applied. Consistent
with the offline assumption. NOT a drift signal.

## Drift verdict

NO BLOCKING DRIFT. Active card count matches the offline corpus exactly
(3,670). Live claims (2,113) vs offline proposed claims (5,976) reflects
pipeline stage (pre-atomic live rows vs post-backfill dry-run), not data
divergence: live card titles/content match the offline corpus format
(spot-checked Velpeau/shoulder-dislocation card).
