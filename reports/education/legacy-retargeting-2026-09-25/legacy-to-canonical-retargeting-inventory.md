# Legacy → Canonical Retargeting Inventory

Generated: 2026-09-25T02:25:13.048Z

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

- Approved primary_coverage bridges (node → entity): 67
- Distinct bridged curriculum nodes: 49
- Ambiguous bridged nodes skipped (map to >1 entity): 18 — Femoral Shaft Fractures, Tibial Plateau Fractures, Humeral Shaft Fractures, Tibial Shaft Fractures, Femoral Neck Fractures, Ankle Fractures, Leg Compartment Syndrome, Distal Humerus Fractures, Pelvic Ring Fractures, Talar Neck Fractures, Subtrochanteric Fractures, Acetabular Fractures, Calcaneus Fractures, Intertrochanteric Fractures, Tibial Plafond Fractures, Distal Femur Fractures, Supracondylar Fracture - Pediatric, Distal Radius Fractures

### Safe to retarget now (exact-label, unambiguous, approved)

- Cards safely retargetable now: 184
- Questions safely retargetable now: 1063

| Curriculum node | Canonical entity | Match | Cards | Questions | Card dupes avoided | Q dupes avoided |
|---|---|---|---:|---:|---:|---:|
| ACL Tear | ACL Tear | exact_label | 0 | 115 | 0 | 115 |
| Rotator Cuff Tears | Rotator Cuff Tears | exact_label | 15 | 82 | 15 | 82 |
| Traumatic Anterior Shoulder Instability (TUBS) | Traumatic Anterior Shoulder Instability (TUBS) | exact_label | 0 | 75 | 0 | 75 |
| Prosthetic Joint Infection | Prosthetic Joint Infection | exact_label | 11 | 64 | 11 | 64 |
| Cervical Myelopathy | Cervical Myelopathy | exact_label | 18 | 53 | 18 | 53 |
| Posterior Tibial Tendon Insufficiency (PTTI) | Posterior Tibial Tendon Insufficiency (PTTI) | exact_label | 10 | 50 | 10 | 50 |
| Hallux Valgus | Hallux Valgus | exact_label | 6 | 52 | 6 | 52 |
| Lumbar Disc Herniation | Lumbar Disc Herniation | exact_label | 9 | 49 | 9 | 49 |
| Proximal Humerus Fractures | Proximal Humerus Fracture | curriculum_inferred (blocked) | 0 | 57 | 0 | 0 |
| Cervical Radiculopathy | Cervical Radiculopathy | exact_label | 14 | 40 | 14 | 40 |
| Adolescent Idiopathic Scoliosis | Adolescent Idiopathic Scoliosis | exact_label | 8 | 35 | 8 | 35 |
| Rheumatoid Arthritis | Rheumatoid Arthritis | exact_label | 8 | 34 | 8 | 34 |
| Giant Cell Tumor | Giant Cell Tumor | exact_label | 7 | 28 | 7 | 28 |
| Diabetic Foot Ulcers | Diabetic Foot Ulcers | exact_label | 0 | 35 | 0 | 35 |
| Proximal Third Tibia Fracture | Proximal Third Tibia Fracture | exact_label | 10 | 24 | 10 | 24 |
| Patellar Instability | Patellar Instability | exact_label | 4 | 30 | 4 | 30 |
| Lisfranc Injury | Lisfranc Injury | exact_label | 0 | 34 | 0 | 0 |
| Conventional Intramedullary Osteosarcoma | Conventional Intramedullary Osteosarcoma | exact_label | 0 | 32 | 0 | 32 |
| Radial Head Fractures | Radial Head Fractures | exact_label | 11 | 20 | 11 | 20 |
| Chondrosarcoma | Chondrosarcoma | exact_label | 7 | 24 | 7 | 24 |
| Soft Tissue Sarcoma | Soft Tissue Sarcoma | exact_label | 4 | 25 | 4 | 25 |
| Tarsal Coalition | Tarsal Coalition | exact_label | 8 | 21 | 8 | 21 |
| Knee Dislocation | Knee Dislocation | exact_label | 8 | 20 | 8 | 20 |
| Scapula Fractures | Scapula Fractures | exact_label | 12 | 13 | 12 | 13 |
| Achilles Tendon Rupture | Achilles Tendon Rupture | exact_label | 0 | 25 | 0 | 0 |
| Carpal Tunnel Syndrome | Carpal Tunnel Syndrome | exact_label | 0 | 24 | 0 | 0 |
| Clavicle Fractures - Midshaft | Clavicle Fracture | curriculum_inferred (blocked) | 0 | 22 | 0 | 0 |
| Olecranon Fractures | Olecranon Fractures | exact_label | 9 | 12 | 9 | 12 |
| PCL Injury | PCL Injury | exact_label | 0 | 20 | 0 | 0 |
| Patella Fracture | Patella Fracture | exact_label | 5 | 11 | 0 | 0 |
| Scaphoid Fracture | Scaphoid Fracture | exact_label | 0 | 16 | 0 | 0 |

### Blocked from auto-retarget

- Plans blocked (non-exact match basis): 2
- Cards/questions blocked by ambiguous nodes: covered by the 18 ambiguous node(s) above

## Projected coverage after safe retargeting

- Canonical-mapped cards would go from 8795 to ~8800 (distinct card-entity links).
- Canonical-mapped questions would go from 1801 to ~1931 (distinct question-entity links).
- Legacy mappings remain fully intact (additive retargeting).

## Proposals

- Retarget proposals built: 51 (20 card, 31 question)
- Written to DB: yes — 9 inserted, 42 updated
