# Anki KG Mapping v1 Report

## Dry Run Summary

- Import batch: `4bc171ba-2264-4805-918c-762b5b5d19c6`
- Total cards considered: 5,095
- High-confidence mappings: 1,111
- Medium-confidence mappings: 212
- No mapping: 3,772
- High-confidence mappings eligible for apply: 1,111
- Candidate mappings generated: 5,730

## Apply Summary

- Mapping run ID: `e54c3fbb-e027-4ffb-8b32-84d255b45c6d`
- Run status: `completed`
- Applied deterministic links: 1,111
- Candidate rows persisted: 5,730
- Curriculum node aliases created from this run: 195
- Broad/root-node applied links: 0

## Persistence Hardening

- Candidate persistence now uses batched `.insert(...)` instead of `.upsert(... onConflict ...)`, which avoids the PostgREST `42P10` conflict-target failure against the expression-based unique index on `anki_kg_mapping_candidates`.
- Apply mode now cleans incomplete runs for the same import batch before starting a new run.
- Failed apply attempts now trigger explicit cleanup of:
  - `anki_kg_mapping_candidates` by `mapping_run_id`
  - `card_knowledge_links` whose metadata contains the failed `mapping_run_id`
- Candidate rows are deduplicated in memory by `mapping_run_id + canonical_card_id + curriculum_node_id + concept_id`.
- Applied card links are deduplicated in memory by `canonical_card_id + curriculum_node_id + concept_id + mapper_type`.
- Alias inserts are deduplicated by `curriculum_node_id + normalized_alias`, then filtered against existing alias rows before insert.
- Batched write failures now include table name, batch index, batch size, first-record keys, full database error payload, and `mapping_run_id`.

## Failed Run Cleanup Verification

- Failed runs retained for audit: 4
- Cleaned failed runs:
  - `3eff95f9-ddb6-4865-a07a-a0e2fbe73862`
  - `d0aa3e94-78ab-42a8-82c9-2e8fd6872b28`
  - `bbfd9fd0-9edd-4364-90d2-9ac53704e1b3`
  - `c084dae8-4283-4fce-8d8c-3c364855b891`
- Remaining dependent rows for failed runs:
  - Candidates: 0
  - Applied links: 0

## Top Applied Topic Nodes

- Femoral Shaft Fractures (`trauma-femoral-shaft-fractures`): 28
- Acetabular Fractures (`trauma-acetabular-fractures`): 24
- Scoliosis (`spine-scoliosis`): 19
- Cervical Myelopathy (`spine-cervical-myelopathy`): 18
- Material Properties (`basic-science-material-properties`): 16
- Tibial Plateau Fractures (`trauma-tibial-plateau-fractures`): 15
- Rotator Cuff Tears (`shoulder-elbow-rotator-cuff-tears`): 15
- Knee Imaging (`knee-sports-knee-imaging`): 14
- Pelvic Ring Fractures (`trauma-pelvic-ring-fractures`): 14
- Cervical Radiculopathy (`spine-cervical-radiculopathy`): 14
- Talar Neck Fractures (`trauma-talar-neck-fractures`): 13
- Ankle Fractures (`trauma-ankle-fractures`): 12
- Shoulder Exam (`shoulder-elbow-shoulder-exam`): 12
- Legal Considerations in Orthopaedic Practice (`basic-science-legal-considerations-in-orthopaedic-practice`): 12
- Scapula Fractures (`trauma-scapula-fractures`): 12
- Subtrochanteric Fractures (`trauma-subtrochanteric-fractures`): 11
- Calcaneus Fractures (`trauma-calcaneus-fractures`): 11
- Prosthetic Joint Infection (`recon-prosthetic-joint-infection`): 11
- Radial Head Fractures (`trauma-radial-head-fractures`): 11
- Intertrochanteric Fractures (`trauma-intertrochanteric-fractures`): 10

## High-Confidence Applied Examples

- `Marty McFlyin's Ortho Deck::2) Pocket Pimped::09 Hip::09.02 Trauma::Intertrochanteric Fractures` -> Intertrochanteric Fractures (`trauma-intertrochanteric-fractures`) confidence `0.99`
- `Marty McFlyin's Ortho Deck::2) Pocket Pimped::09 Hip::09.02 Trauma::Subtrochanteric Fractures` -> Subtrochanteric Fractures (`trauma-subtrochanteric-fractures`) confidence `0.99`
- `Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity` cards now map into specific fracture topic nodes rather than Trauma root nodes.

## Needs-Review Candidate Patterns

- `Muscles`
- `GeneralAnatomy`
- `Hand`
- `Pediatric::Pediatrics`
- `FootAnkle`
- `LowerExtremity::Knee`
- `ShoulderAndElbow::Shoulder`
- `Leg::LegKnee`
- `TheBasics`
- `Forearm`

## Unmapped High-Priority Branches

- `Marty McFlyin's Ortho Deck::1) Netter's Concise Orthopaedic Anatomy::05 Forearm::05.11 Muscles`
- `Marty McFlyin's Ortho Deck::2) Pocket Pimped::14 Pediatrics::14.05 Lower Extremity`
- `Marty McFlyin's Ortho Deck::2) Pocket Pimped::06 Hand::06.02 Hand Conditions`
- `Marty McFlyin's Ortho Deck::3) OrthoBullets::Shoulder & Elbow::Shoulder`
- `Marty McFlyin's Ortho Deck::3) OrthoBullets::Recon::Hip Reconstruction`

## Validation

- Duplicate candidate logical keys in successful run: 0
- Duplicate applied link logical keys in successful run: 0
- Candidate rows missing confidence: 0
- Applied links missing confidence: 0
- Non-deterministic mapper methods in applied links: 0
- Applied mappings sourced only from provenance tags: 0
- Broad/root-node applied links: 0

## Readiness Call

- Deterministic KG mapping v1 is now persistence-safe, repeatable, and ready for review UI work.
- The next highest-value follow-up is alias enrichment for anatomy-heavy and branch-heavy cards that currently sit in the medium/no-mapping buckets.
- No blocker remains on the persistence path; remaining work is ontology coverage and review workflow, not import safety.
