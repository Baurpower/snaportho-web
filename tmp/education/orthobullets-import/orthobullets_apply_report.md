# Orthobullets Apply Report

- Environment applied to: Supabase project `geznczcokbgybsseipjg` from `.env.local`
- Timestamp: 2026-06-27T05:20:16.394Z
- Rows imported: 7557
- Questions upserted: 7557
- Curriculum nodes upserted: 763
- Mappings upserted: 7557
- Concepts created by this import: 0
- Remaining rows needing review: 64
- Source anomalies count: 64
- Tag assignments linked to this import: 40612
- Source aliases linked to this import: 8320

## Schema Checks

| Table | OK | Count | Error |
| --- | --- | --- | --- |
| external_sources | TRUE | 1 |  |
| external_questions | TRUE | 7557 |  |
| external_question_curriculum_mappings | TRUE | 7557 |  |
| source_aliases | TRUE | 8320 |  |
| tags | TRUE | 767 |  |
| tag_assignments | TRUE | 40612 |  |
| curriculum_nodes | TRUE | 763 |  |
| specialties | TRUE | 11 |  |
| concepts | TRUE | 0 |  |

## Top Mapped Topics

| Curriculum Node | Slug | Linked Questions |
| --- | --- | --- |
| ACL Tear | knee-sports-acl-tear | 115 |
| Ankle Fractures | trauma-ankle-fractures | 98 |
| Rotator Cuff Tears | shoulder-elbow-rotator-cuff-tears | 82 |
| Traumatic Anterior Shoulder Instability (TUBS) | shoulder-elbow-traumatic-anterior-shoulder-instability-tubs | 75 |
| Acetabular Fractures | trauma-acetabular-fractures | 74 |
| Tibial Plateau Fractures | trauma-tibial-plateau-fractures | 68 |
| Femoral Neck Fractures | trauma-femoral-neck-fractures | 64 |
| Pelvic Ring Fractures | trauma-pelvic-ring-fractures | 64 |
| Prosthetic Joint Infection | recon-prosthetic-joint-infection | 64 |
| Tibial Shaft Fractures | trauma-tibial-shaft-fractures | 63 |
| Femoral Shaft Fractures | trauma-femoral-shaft-fractures | 60 |
| Supracondylar Fracture - Pediatric | pediatrics-supracondylar-fracture-pediatric | 58 |
| Proximal Humerus Fractures | trauma-proximal-humerus-fractures | 57 |
| Cervical Myelopathy | spine-cervical-myelopathy | 53 |
| Hallux Valgus | foot-ankle-hallux-valgus | 52 |
| Posterior Tibial Tendon Insufficiency (PTTI) | foot-ankle-posterior-tibial-tendon-insufficiency-ptti | 50 |
| Lumbar Disc Herniation | spine-lumbar-disc-herniation | 49 |
| Calcaneus Fractures | trauma-calcaneus-fractures | 48 |
| Evaluation, Resuscitation & DCO | trauma-evaluation-resuscitation-and-dco | 48 |
| Legal Considerations in Orthopaedic Practice | basic-science-legal-considerations-in-orthopaedic-practice | 48 |

## Warnings

- 64 Orthobullets mappings still need review; these should correspond to true source anomalies.
- No topic-level concepts were created because --seed-topic-concepts remained off.
