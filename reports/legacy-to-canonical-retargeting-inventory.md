# Legacy → Canonical Retargeting Inventory

Generated: 2026-06-29T14:51:56.240Z

## Key reality check

- **Legacy concept rows in DB: 0.** The legacy concept layer is empty. There are no concept-based mappings to retarget. Retargeting proceeds via the approved `curriculum_node → canonical_entity` bridge (`curriculum_node_entities`).

## Legacy mapping totals (full universe)

- Active card_knowledge_links: 1111
- Active external_question_curriculum_mappings: 7557
- Distinct legacy-mapped cards (via curriculum node): 1111
- Distinct legacy-mapped questions (via curriculum node): 7493

## Concept → canonical entity matching

- Concepts with exact canonical-entity matches: 0 (no concepts exist)
- Concepts with inferred matches via curriculum-node bridges: 0 (no concepts exist)
- Concepts requiring manual review: 0 (no concepts exist)

## Curriculum-node bridge retargeting (the live path)

- Approved primary_coverage bridges (node → entity): 41
- Distinct bridged curriculum nodes: 41
- Ambiguous bridged nodes skipped (map to >1 entity): 0

### Safe to retarget now (exact-label, unambiguous, approved)

- Cards safely retargetable now: 377
- Questions safely retargetable now: 1801

| Curriculum node | Canonical entity | Match | Cards | Questions | Card dupes avoided | Q dupes avoided |
|---|---|---|---:|---:|---:|---:|
| ACL Tear | ACL Tear | exact_label | 0 | 115 | 0 | 115 |
| Ankle Fractures | Ankle Fractures | exact_label | 12 | 98 | 12 | 98 |
| Acetabular Fractures | Acetabular Fractures | exact_label | 24 | 74 | 24 | 74 |
| Rotator Cuff Tears | Rotator Cuff Tears | exact_label | 15 | 82 | 15 | 82 |
| Femoral Shaft Fractures | Femoral Shaft Fractures | exact_label | 28 | 60 | 28 | 60 |
| Tibial Plateau Fractures | Tibial Plateau Fractures | exact_label | 15 | 68 | 15 | 68 |
| Pelvic Ring Fractures | Pelvic Ring Fractures | exact_label | 14 | 64 | 14 | 64 |
| Traumatic Anterior Shoulder Instability (TUBS) | Traumatic Anterior Shoulder Instability (TUBS) | exact_label | 0 | 75 | 0 | 75 |
| Prosthetic Joint Infection | Prosthetic Joint Infection | exact_label | 11 | 64 | 11 | 64 |
| Tibial Shaft Fractures | Tibial Shaft Fractures | exact_label | 10 | 63 | 10 | 63 |
| Femoral Neck Fractures | Femoral Neck Fractures | exact_label | 9 | 64 | 9 | 64 |
| Cervical Myelopathy | Cervical Myelopathy | exact_label | 18 | 53 | 18 | 53 |
| Posterior Tibial Tendon Insufficiency (PTTI) | Posterior Tibial Tendon Insufficiency (PTTI) | exact_label | 10 | 50 | 10 | 50 |
| Calcaneus Fractures | Calcaneus Fractures | exact_label | 11 | 48 | 11 | 48 |
| Hallux Valgus | Hallux Valgus | exact_label | 6 | 52 | 6 | 52 |
| Lumbar Disc Herniation | Lumbar Disc Herniation | exact_label | 9 | 49 | 9 | 49 |
| Supracondylar Fracture - Pediatric | Supracondylar Fracture - Pediatric | exact_label | 0 | 58 | 0 | 58 |
| Humeral Shaft Fractures | Humeral Shaft Fractures | exact_label | 10 | 47 | 10 | 47 |
| Cervical Radiculopathy | Cervical Radiculopathy | exact_label | 14 | 40 | 14 | 40 |
| Intertrochanteric Fractures | Intertrochanteric Fractures | exact_label | 10 | 40 | 10 | 40 |
| Adolescent Idiopathic Scoliosis | Adolescent Idiopathic Scoliosis | exact_label | 8 | 35 | 8 | 35 |
| Rheumatoid Arthritis | Rheumatoid Arthritis | exact_label | 8 | 34 | 8 | 34 |
| Talar Neck Fractures | Talar Neck Fractures | exact_label | 13 | 28 | 13 | 28 |
| Distal Radius Fractures | Distal Radius Fractures | exact_label | 0 | 41 | 0 | 41 |
| Giant Cell Tumor | Giant Cell Tumor | exact_label | 7 | 28 | 7 | 28 |
| Diabetic Foot Ulcers | Diabetic Foot Ulcers | exact_label | 0 | 35 | 0 | 35 |
| Proximal Third Tibia Fracture | Proximal Third Tibia Fracture | exact_label | 10 | 24 | 10 | 24 |
| Patellar Instability | Patellar Instability | exact_label | 4 | 30 | 4 | 30 |
| Leg Compartment Syndrome | Leg Compartment Syndrome | exact_label | 10 | 23 | 10 | 23 |
| Distal Humerus Fractures | Distal Humerus Fractures | exact_label | 7 | 26 | 7 | 26 |
| Tibial Plafond Fractures | Tibial Plafond Fractures | exact_label | 5 | 27 | 5 | 27 |
| Conventional Intramedullary Osteosarcoma | Conventional Intramedullary Osteosarcoma | exact_label | 0 | 32 | 0 | 32 |
| Subtrochanteric Fractures | Subtrochanteric Fractures | exact_label | 11 | 20 | 11 | 20 |
| Radial Head Fractures | Radial Head Fractures | exact_label | 11 | 20 | 11 | 20 |
| Chondrosarcoma | Chondrosarcoma | exact_label | 7 | 24 | 7 | 24 |
| Soft Tissue Sarcoma | Soft Tissue Sarcoma | exact_label | 4 | 25 | 4 | 25 |
| Tarsal Coalition | Tarsal Coalition | exact_label | 8 | 21 | 8 | 21 |
| Distal Femur Fractures | Distal Femur Fractures | exact_label | 9 | 19 | 9 | 19 |
| Knee Dislocation | Knee Dislocation | exact_label | 8 | 20 | 8 | 20 |
| Scapula Fractures | Scapula Fractures | exact_label | 12 | 13 | 12 | 13 |
| Olecranon Fractures | Olecranon Fractures | exact_label | 9 | 12 | 9 | 12 |

### Blocked from auto-retarget

- Plans blocked (non-exact match basis): 0
- Cards/questions blocked by ambiguous nodes: covered by the 0 ambiguous node(s) above

## Projected coverage after safe retargeting

- Canonical-mapped cards would go from 377 to ~377 (distinct card-entity links).
- Canonical-mapped questions would go from 1801 to ~1801 (distinct question-entity links).
- Legacy mappings remain fully intact (additive retargeting).

## Proposals

- Retarget proposals built: 76 (35 card, 41 question)
- Written to DB: yes — 0 inserted, 76 updated
