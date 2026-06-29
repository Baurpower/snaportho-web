# Legacy Retargeting Completion Report

Generated: 2026-06-29T14:51:59.102Z

## Summary

- Total legacy card mappings: 1111
- Total legacy question mappings: 7557
- Canonical-retargeted card mappings: 377 (33.9%)
- Canonical-retargeted question mappings: 1801 (23.8%)
- Fully retargeted legacy curriculum nodes: 41
- Remaining blocked legacy curriculum nodes: 711
- Legacy card_knowledge_links unchanged: 1111
- Legacy external_question_curriculum_mappings unchanged: 7557

## Bucket Summary

- blocked because no canonical entity exists yet: 693
- blocked because node is ambiguous/split-risk: 15
- blocked because label is too generic: 3

## Fully Retargeted Nodes

| Curriculum node | Slug | Legacy card mappings | Legacy question mappings |
|---|---|---:|---:|
| Acetabular Fractures | trauma-acetabular-fractures | 24 | 74 |
| ACL Tear | knee-sports-acl-tear | 0 | 115 |
| Adolescent Idiopathic Scoliosis | spine-adolescent-idiopathic-scoliosis | 8 | 35 |
| Ankle Fractures | trauma-ankle-fractures | 12 | 98 |
| Calcaneus Fractures | trauma-calcaneus-fractures | 11 | 48 |
| Cervical Myelopathy | spine-cervical-myelopathy | 18 | 53 |
| Cervical Radiculopathy | spine-cervical-radiculopathy | 14 | 40 |
| Chondrosarcoma | pathology-chondrosarcoma | 7 | 24 |
| Conventional Intramedullary Osteosarcoma | pathology-conventional-intramedullary-osteosarcoma | 0 | 32 |
| Diabetic Foot Ulcers | foot-ankle-diabetic-foot-ulcers | 0 | 35 |
| Distal Femur Fractures | trauma-distal-femur-fractures | 9 | 19 |
| Distal Humerus Fractures | trauma-distal-humerus-fractures | 7 | 26 |
| Distal Radius Fractures | trauma-distal-radius-fractures | 0 | 41 |
| Femoral Neck Fractures | trauma-femoral-neck-fractures | 9 | 64 |
| Femoral Shaft Fractures | trauma-femoral-shaft-fractures | 28 | 60 |
| Giant Cell Tumor | pathology-giant-cell-tumor | 7 | 28 |
| Hallux Valgus | foot-ankle-hallux-valgus | 6 | 52 |
| Humeral Shaft Fractures | trauma-humeral-shaft-fractures | 10 | 47 |
| Intertrochanteric Fractures | trauma-intertrochanteric-fractures | 10 | 40 |
| Knee Dislocation | trauma-knee-dislocation | 8 | 20 |
| Leg Compartment Syndrome | trauma-leg-compartment-syndrome | 10 | 23 |
| Lumbar Disc Herniation | spine-lumbar-disc-herniation | 9 | 49 |
| Olecranon Fractures | trauma-olecranon-fractures | 9 | 12 |
| Patellar Instability | knee-sports-patellar-instability | 4 | 30 |
| Pelvic Ring Fractures | trauma-pelvic-ring-fractures | 14 | 64 |
| Posterior Tibial Tendon Insufficiency (PTTI) | foot-ankle-posterior-tibial-tendon-insufficiency-ptti | 10 | 50 |
| Prosthetic Joint Infection | recon-prosthetic-joint-infection | 11 | 64 |
| Proximal Third Tibia Fracture | trauma-proximal-third-tibia-fracture | 10 | 24 |
| Radial Head Fractures | trauma-radial-head-fractures | 11 | 20 |
| Rheumatoid Arthritis | basic-science-rheumatoid-arthritis | 8 | 34 |
| Rotator Cuff Tears | shoulder-elbow-rotator-cuff-tears | 15 | 82 |
| Scapula Fractures | trauma-scapula-fractures | 12 | 13 |
| Soft Tissue Sarcoma | pathology-soft-tissue-sarcoma | 4 | 25 |
| Subtrochanteric Fractures | trauma-subtrochanteric-fractures | 11 | 20 |
| Supracondylar Fracture - Pediatric | pediatrics-supracondylar-fracture-pediatric | 0 | 58 |
| Talar Neck Fractures | trauma-talar-neck-fractures | 13 | 28 |
| Tarsal Coalition | pediatrics-tarsal-coalition | 8 | 21 |
| Tibial Plafond Fractures | trauma-tibial-plafond-fractures | 5 | 27 |
| Tibial Plateau Fractures | trauma-tibial-plateau-fractures | 15 | 68 |
| Tibial Shaft Fractures | trauma-tibial-shaft-fractures | 10 | 63 |
| Traumatic Anterior Shoulder Instability (TUBS) | shoulder-elbow-traumatic-anterior-shoulder-instability-tubs | 0 | 75 |

## Remaining Blocked Nodes

| Curriculum node | Bucket | Legacy card mappings | Legacy question mappings | Reason |
|---|---|---:|---:|---|
| Basic Science > Legal Considerations in Orthopaedic Practice | blocked because label is too generic | 12 | 48 | Entity creation is explicitly suppressed for this generic curriculum label. |
| Proximal Humerus Fractures | blocked because no canonical entity exists yet | 0 | 57 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Trauma > Amputations | blocked because no canonical entity exists yet | 10 | 42 | The node did not meet either bridge or create thresholds in this pass. |
| Basic Science > Osteopenia & Osteoporosis | blocked because node is ambiguous/split-risk | 10 | 41 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Basic Science > Material Properties | blocked because label is too generic | 16 | 34 | No acceptable existing canonical entity bridge target was available for this unbridged node. |
| Trauma > Evaluation, Resuscitation & DCO | blocked because node is ambiguous/split-risk | 0 | 48 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Basic Science > Statistic Definitions | blocked because no canonical entity exists yet | 3 | 44 | The node did not meet either bridge or create thresholds in this pass. |
| Total Shoulder Arthroplasty | blocked because no canonical entity exists yet | 0 | 47 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pathology > Metastatic Disease Extremity | blocked because no canonical entity exists yet | 0 | 46 | A create_canonical_entity proposal exists (0.660), but it was intentionally not auto-applied under the current guardrails. |
| Reverse Shoulder Arthroplasty | blocked because no canonical entity exists yet | 0 | 46 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Periprosthetic Fracture | blocked because no canonical entity exists yet | 0 | 44 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ankle Sprain | blocked because no canonical entity exists yet | 0 | 43 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Medial Ulnar Collateral Ligament Injury | blocked because no canonical entity exists yet | 7 | 36 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Pediatrics > Osteomyelitis - Pediatric | blocked because no canonical entity exists yet | 0 | 43 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Developmental Dysplasia the Hip (DDH) | blocked because no canonical entity exists yet | 0 | 42 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Distal Biceps Avulsion | blocked because no canonical entity exists yet | 4 | 38 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pediatrics > Slipped Capital Femoral Epiphysis (SCFE) | blocked because no canonical entity exists yet | 0 | 38 | The node did not meet either bridge or create thresholds in this pass. |
| Basic Science > Orthopaedic Implants | blocked because label is too generic | 3 | 34 | Entity creation is explicitly suppressed for this generic curriculum label. |
| THA Revision | blocked because no canonical entity exists yet | 0 | 37 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lumbar Spinal Stenosis | blocked because no canonical entity exists yet | 0 | 36 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Prosthesis Design | blocked because no canonical entity exists yet | 0 | 36 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Trauma > Open Fractures Management | blocked because no canonical entity exists yet | 7 | 28 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Pediatric Abuse | blocked because no canonical entity exists yet | 0 | 35 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hallux Rigidus (MTP joint arthritis) | blocked because no canonical entity exists yet | 0 | 34 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lisfranc Injury | blocked because no canonical entity exists yet | 0 | 34 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Shoulder & Elbow > Posterior Shoulder Instability & Dislocation | blocked because node is ambiguous/split-risk | 8 | 26 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Adult Spinal Deformity | blocked because no canonical entity exists yet | 0 | 32 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Meniscal Tears | blocked because no canonical entity exists yet | 0 | 32 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Recon > Wear & Osteolysis Basic Science | blocked because node is ambiguous/split-risk | 0 | 32 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Basic Science > Bone Grafting | blocked because no canonical entity exists yet | 4 | 27 | The node did not meet either bridge or create thresholds in this pass. |
| Femoral Shaft Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 31 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Femoroacetabular Impingement (FAI) | blocked because no canonical entity exists yet | 0 | 30 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hip Septic Arthritis - Pediatric | blocked because no canonical entity exists yet | 0 | 30 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Basic Science > Anticoagulation Medications | blocked because no canonical entity exists yet | 7 | 22 | The node did not meet either bridge or create thresholds in this pass. |
| Trauma > Radius and Ulnar Shaft Fractures | blocked because node is ambiguous/split-risk | 10 | 19 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| TKA Revision | blocked because no canonical entity exists yet | 0 | 29 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Concussions (Mild Traumatic Brain Injury) | blocked because no canonical entity exists yet | 0 | 28 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spine > Pediatric Spondylolysis & Spondylolisthesis | blocked because node is ambiguous/split-risk | 10 | 18 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| TKA Periprosthetic Fracture | blocked because no canonical entity exists yet | 0 | 28 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Fracture Healing | blocked because no canonical entity exists yet | 1 | 26 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Pediatrics > Neurofibromatosis | blocked because no canonical entity exists yet | 7 | 20 | The node did not meet either bridge or create thresholds in this pass. |
| Spinal Cord Injuries | blocked because no canonical entity exists yet | 0 | 27 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Adhesive Capsulitis (Frozen Shoulder) | blocked because no canonical entity exists yet | 4 | 22 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Exercise Science | blocked because no canonical entity exists yet | 0 | 26 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Peripheral Nerve Injury & Repair | blocked because no canonical entity exists yet | 0 | 26 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Achilles Tendon Rupture | blocked because no canonical entity exists yet | 0 | 25 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pediatrics > Achondroplasia | blocked because no canonical entity exists yet | 9 | 16 | The node did not meet either bridge or create thresholds in this pass. |
| Ankylosing Spondylitis | blocked because no canonical entity exists yet | 0 | 25 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Articular Cartilage | blocked because no canonical entity exists yet | 5 | 20 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Articular Cartilage Defects Knee | blocked because no canonical entity exists yet | 0 | 25 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Degenerative Spondylolisthesis | blocked because no canonical entity exists yet | 0 | 25 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Knee & Sports > Discoid Meniscus | blocked because no canonical entity exists yet | 9 | 16 | The node did not meet either bridge or create thresholds in this pass. |
| Duchenne Muscular Dystrophy | blocked because no canonical entity exists yet | 6 | 19 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Obstetric Brachial Plexopathy (Erb's, Klumpke's Palsy) | blocked because no canonical entity exists yet | 0 | 25 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Terrible Triad Injury Elbow | blocked because no canonical entity exists yet | 0 | 25 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Dislocation | blocked because no canonical entity exists yet | 0 | 25 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Basic Science > Bone Cells | blocked because no canonical entity exists yet | 8 | 16 | The node did not meet either bridge or create thresholds in this pass. |
| Carpal Tunnel Syndrome | blocked because no canonical entity exists yet | 0 | 24 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Clubfoot (congenital talipes equinovarus) | blocked because no canonical entity exists yet | 0 | 24 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Odontoid Fracture | blocked because no canonical entity exists yet | 0 | 24 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Osteochondroma & Multiple Hereditary Exostosis | blocked because no canonical entity exists yet | 0 | 24 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pigmented Villonodular Synovitis | blocked because no canonical entity exists yet | 5 | 19 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Unicompartmental Knee Replacement | blocked because no canonical entity exists yet | 0 | 24 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| 5th Metatarsal Base Fracture | blocked because no canonical entity exists yet | 0 | 23 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Brachial Plexus Injuries | blocked because no canonical entity exists yet | 9 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Peroneal Tendon Tears and Instability | blocked because no canonical entity exists yet | 0 | 23 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Suprascapular Neuropathy | blocked because no canonical entity exists yet | 0 | 23 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pediatrics > Charcot - Marie - Tooth Disease | blocked because no canonical entity exists yet | 4 | 18 | A create_canonical_entity proposal exists (0.660), but it was intentionally not auto-applied under the current guardrails. |
| Clavicle Fractures - Midshaft | blocked because no canonical entity exists yet | 0 | 22 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Knee Osteoarthritis | blocked because no canonical entity exists yet | 0 | 22 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Liposarcoma | blocked because no canonical entity exists yet | 4 | 18 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Pediatrics > Osteogenesis Imperfecta | blocked because no canonical entity exists yet | 7 | 15 | The node did not meet either bridge or create thresholds in this pass. |
| Ankle Arthritis | blocked because no canonical entity exists yet | 4 | 17 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cavovarus Foot in Pediatrics & Adults | blocked because node is ambiguous/split-risk | 4 | 17 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Diabetic Charcot Neuropathy | blocked because no canonical entity exists yet | 0 | 21 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Distal Femoral Physeal Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 21 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Fingertip Amputations & Finger Flaps | blocked because no canonical entity exists yet | 0 | 21 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Osteoid Osteoma | blocked because no canonical entity exists yet | 5 | 16 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Stability Techniques | blocked because no canonical entity exists yet | 0 | 21 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Thoracolumbar Burst Fractures | blocked because no canonical entity exists yet | 0 | 21 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Basic Science > Antibiotic Classification & Mechanism | blocked because node is ambiguous/split-risk | 3 | 17 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Basic Science > Bisphosphonates | blocked because no canonical entity exists yet | 2 | 18 | The node did not meet either bridge or create thresholds in this pass. |
| Trauma > Gun Shot Wounds | blocked because no canonical entity exists yet | 5 | 15 | The node did not meet either bridge or create thresholds in this pass. |
| Metastatic Disease Spine | blocked because no canonical entity exists yet | 0 | 20 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Trauma > Necrotizing Fasciitis | blocked because no canonical entity exists yet | 7 | 13 | The node did not meet either bridge or create thresholds in this pass. |
| PCL Injury | blocked because no canonical entity exists yet | 0 | 20 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spine > Scoliosis | blocked because no canonical entity exists yet | 19 | 1 | A create_canonical_entity proposal exists (0.660), but it was intentionally not auto-applied under the current guardrails. |
| Trauma > Subtalar Dislocations | blocked because no canonical entity exists yet | 9 | 11 | A create_canonical_entity proposal exists (0.660), but it was intentionally not auto-applied under the current guardrails. |
| Trauma > Capitellum Fractures | blocked because no canonical entity exists yet | 7 | 12 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Complex Regional Pain Syndrome (CRPS) | blocked because no canonical entity exists yet | 0 | 19 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Trauma > Elbow Dislocation | blocked because no canonical entity exists yet | 6 | 13 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Ankle Arthrodesis | blocked because no canonical entity exists yet | 0 | 18 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Domestic and Elder Abuse | blocked because node is ambiguous/split-risk | 4 | 14 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Enchondromas | blocked because no canonical entity exists yet | 0 | 18 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ethics in Orthopaedic Practice | blocked because no canonical entity exists yet | 0 | 18 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Flexor Tendon Injuries | blocked because no canonical entity exists yet | 0 | 18 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Glenohumeral Internal Rotation Deficit (GIRD) | blocked because no canonical entity exists yet | 0 | 18 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Incomplete Spinal Cord Injuries | blocked because no canonical entity exists yet | 0 | 18 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Intervertebral Disc | blocked because no canonical entity exists yet | 2 | 16 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Leg Length Discrepancy (LLD) | blocked because no canonical entity exists yet | 0 | 18 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Osteochondritis Dissecans | blocked because no canonical entity exists yet | 0 | 18 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Phalanx Fractures | blocked because no canonical entity exists yet | 0 | 18 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Rickets | blocked because no canonical entity exists yet | 4 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Sacral Fractures | blocked because no canonical entity exists yet | 6 | 12 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Thromboembolism (PE & DVT) Prophylaxis | blocked because no canonical entity exists yet | 0 | 18 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Unicameral Bone Cyst | blocked because no canonical entity exists yet | 0 | 18 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Acromioclavicular Joint Injury | blocked because no canonical entity exists yet | 0 | 17 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Coronoid Fractures | blocked because no canonical entity exists yet | 5 | 12 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hip Osteonecrosis | blocked because no canonical entity exists yet | 5 | 12 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Kienbock's Disease | blocked because no canonical entity exists yet | 0 | 17 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Paget's Disease | blocked because no canonical entity exists yet | 0 | 17 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Rehab & Prosthetics | blocked because node is ambiguous/split-risk | 3 | 14 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Replantation | blocked because no canonical entity exists yet | 0 | 17 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Sciatic Nerve Palsy | blocked because no canonical entity exists yet | 0 | 17 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Sagittal Plane Balancing | blocked because no canonical entity exists yet | 0 | 17 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Adult Isthmic Spondylolisthesis | blocked because no canonical entity exists yet | 0 | 16 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Biopsy Principles | blocked because no canonical entity exists yet | 2 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Clinical Trial Design | blocked because no canonical entity exists yet | 0 | 16 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spine > Congenital Scoliosis | blocked because no canonical entity exists yet | 5 | 11 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Trauma > Humeral Shaft Nonunion | blocked because no canonical entity exists yet | 6 | 10 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Knee & Sports > Knee Imaging | blocked because no canonical entity exists yet | 14 | 2 | The node did not meet either bridge or create thresholds in this pass. |
| Medial Epicondylar Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 16 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Metacarpal Fractures | blocked because no canonical entity exists yet | 0 | 16 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Patella Fracture | blocked because no canonical entity exists yet | 5 | 11 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Patellar Tendon Rupture | blocked because no canonical entity exists yet | 6 | 10 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Rotator Cuff Arthropathy | blocked because no canonical entity exists yet | 0 | 16 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Scaphoid Fracture | blocked because no canonical entity exists yet | 0 | 16 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Patellofemoral Alignment | blocked because no canonical entity exists yet | 0 | 16 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Basilar Thumb Arthritis | blocked because no canonical entity exists yet | 0 | 15 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Basic Science > Bone Signaling & RANKL | blocked because node is ambiguous/split-risk | 4 | 11 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Bunionette Deformity | blocked because no canonical entity exists yet | 3 | 12 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cerebral Palsy - General | blocked because no canonical entity exists yet | 4 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cerebral Palsy - Hip Conditions | blocked because no canonical entity exists yet | 5 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pediatrics > Congenital Vertical Talus | blocked because no canonical entity exists yet | 5 | 10 | The node did not meet either bridge or create thresholds in this pass. |
| Recon > Hip Osteoarthritis | blocked because no canonical entity exists yet | 6 | 9 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Infantile Blount's Disease (tibia vara) | blocked because no canonical entity exists yet | 0 | 15 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Internal Impingement | blocked because no canonical entity exists yet | 2 | 13 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Osteochondral Lesions the Talus | blocked because no canonical entity exists yet | 0 | 15 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Osteomyelitis - Adult | blocked because no canonical entity exists yet | 0 | 15 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Osteoporotic Vertebral Compression Fracture | blocked because no canonical entity exists yet | 0 | 15 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spine > Rheumatoid Cervical Spondylitis | blocked because no canonical entity exists yet | 8 | 7 | The node did not meet either bridge or create thresholds in this pass. |
| Scapular Winging | blocked because no canonical entity exists yet | 3 | 12 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| SLAP Lesion | blocked because no canonical entity exists yet | 0 | 15 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spinal Muscular Atrophy | blocked because no canonical entity exists yet | 6 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Synovial Sarcoma | blocked because no canonical entity exists yet | 0 | 15 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Total Elbow Arthroplasty | blocked because no canonical entity exists yet | 0 | 15 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Adult Hip Dysplasia | blocked because no canonical entity exists yet | 0 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Adult Pyogenic Vertebral Osteomyelitis | blocked because no canonical entity exists yet | 4 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cubital Tunnel Syndrome | blocked because no canonical entity exists yet | 0 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Dupuytren's Disease | blocked because no canonical entity exists yet | 0 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ewing's Sarcoma | blocked because no canonical entity exists yet | 0 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pathology > Fibrous Dysplasia | blocked because no canonical entity exists yet | 4 | 10 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Trauma > Hand & Forearm Compartment Syndrome | blocked because node is ambiguous/split-risk | 8 | 6 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Heterotopic Ossification | blocked because no canonical entity exists yet | 3 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| High Tibial Osteotomy | blocked because no canonical entity exists yet | 0 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lateral Ulnar Collateral Ligament Injury (PLRI) | blocked because no canonical entity exists yet | 0 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Trauma > Monteggia Fractures | blocked because no canonical entity exists yet | 7 | 7 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Multiple Myeloma | blocked because no canonical entity exists yet | 3 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Physeal Considerations | blocked because no canonical entity exists yet | 0 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Proximal Femur Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Septic Arthritis - Adult | blocked because no canonical entity exists yet | 0 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Shoulder & Elbow > Shoulder Exam | blocked because no canonical entity exists yet | 12 | 2 | The node did not meet either bridge or create thresholds in this pass. |
| Trauma > Sternoclavicular Dislocation | blocked because no canonical entity exists yet | 6 | 8 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| THA Trunnionosis | blocked because no canonical entity exists yet | 0 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| The Female Athlete | blocked because no canonical entity exists yet | 0 | 14 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Achilles Tendonitis | blocked because no canonical entity exists yet | 0 | 13 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Anti - inflammatory Medications | blocked because no canonical entity exists yet | 2 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Elbow Arthritis | blocked because no canonical entity exists yet | 0 | 13 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Foot Muscle Forces & Deformities | blocked because no canonical entity exists yet | 0 | 13 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Genetic Pearls | blocked because no canonical entity exists yet | 3 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hip Resurfacing | blocked because no canonical entity exists yet | 2 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Interdigital (Morton's) Neuroma | blocked because no canonical entity exists yet | 0 | 13 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lateral Epicondylitis (Tennis Elbow) | blocked because no canonical entity exists yet | 0 | 13 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Marfan Syndrome | blocked because no canonical entity exists yet | 3 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Mucopolysaccharidoses | blocked because no canonical entity exists yet | 6 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Non - Ossifying Fibroma | blocked because no canonical entity exists yet | 0 | 13 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Phalanx Dislocations | blocked because no canonical entity exists yet | 0 | 13 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Pseudotumor (Metal on Metal Reactions) | blocked because no canonical entity exists yet | 0 | 13 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hand > Trigger Finger | blocked because no canonical entity exists yet | 8 | 5 | The node did not meet either bridge or create thresholds in this pass. |
| Chondroblastoma | blocked because no canonical entity exists yet | 0 | 12 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Extremity Flap Reconstruction | blocked because no canonical entity exists yet | 0 | 12 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Halo Orthosis Immobilization | blocked because no canonical entity exists yet | 0 | 12 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hip Dislocation | blocked because no canonical entity exists yet | 5 | 7 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Lumbar Spine Anatomy | blocked because no canonical entity exists yet | 7 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Multidirectional Shoulder Instability (MDI) | blocked because no canonical entity exists yet | 0 | 12 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pectoralis Major Rupture | blocked because no canonical entity exists yet | 5 | 7 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Scaphoid Lunate Advanced Collapse (SLAC) | blocked because no canonical entity exists yet | 0 | 12 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spinal Cord Monitoring | blocked because no canonical entity exists yet | 5 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Trauma > Wound & Hardware Infection | blocked because node is ambiguous/split-risk | 8 | 4 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Aneurysmal Bone Cyst | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Arthrogryposis | blocked because no canonical entity exists yet | 5 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cardiac Conditions | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cerebral Palsy - Gait Disorders | blocked because no canonical entity exists yet | 4 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Distal Radius Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Exertional Compartment Syndrome | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Femoral Head Fractures | blocked because no canonical entity exists yet | 3 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Glenohumeral Arthritis (Shoulder Arthritis) | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hamstring Injuries | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hip Arthroscopy | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Infectious Diseases in Athletes | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Inheritance Patterns Orthopaedic Syndromes | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Juvenile Idiopathic Arthritis | blocked because no canonical entity exists yet | 4 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lateral Condyle Fracture - Pediatric | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Muscle Biology & Physiology | blocked because no canonical entity exists yet | 3 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Myelodysplasia (myelomeningocele, spinal bifida) | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Opiates & Analgesic Medications | blocked because no canonical entity exists yet | 2 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Radial Clubhand (radial deficiency) | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Shoulder Prosthetic Joint Infection | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Prosthesis Design | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Tibial Tubercle Fracture | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Coronal Plane Balancing | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Extensor Mechanism Rupture | blocked because no canonical entity exists yet | 0 | 11 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Trauma > Trauma Scoring Systems | blocked because no canonical entity exists yet | 4 | 7 | The node did not meet either bridge or create thresholds in this pass. |
| Turf Toe | blocked because no canonical entity exists yet | 5 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Accessory Navicular | blocked because no canonical entity exists yet | 0 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Bone Growth Factors | blocked because no canonical entity exists yet | 1 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pathology > Bone Tumor Staging Systems | blocked because no canonical entity exists yet | 7 | 3 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Cervical Facet Dislocations & Fractures | blocked because no canonical entity exists yet | 0 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Claw Toe | blocked because no canonical entity exists yet | 2 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ganglion Cysts | blocked because no canonical entity exists yet | 0 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| High Ankle Sprain & Syndesmosis Injury | blocked because no canonical entity exists yet | 0 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Little Leaguer's Shoulder | blocked because no canonical entity exists yet | 0 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Osteopetrosis | blocked because no canonical entity exists yet | 0 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Patellar Tendinitis | blocked because no canonical entity exists yet | 3 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Shoulder & Elbow > Shoulder Imaging | blocked because no canonical entity exists yet | 9 | 1 | The node did not meet either bridge or create thresholds in this pass. |
| Spinal Epidural Abscess | blocked because no canonical entity exists yet | 0 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Talus Fracture (other than neck) | blocked because no canonical entity exists yet | 4 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Approaches | blocked because no canonical entity exists yet | 0 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Iliopsoas Impingement | blocked because no canonical entity exists yet | 0 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Total Ankle Arthroplasty | blocked because no canonical entity exists yet | 0 | 10 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Biceps Tendonitis | blocked because no canonical entity exists yet | 1 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Burners & Stingers | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Calcific Tendonitis | blocked because no canonical entity exists yet | 3 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| DIP and PIP Joint Arthritis | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Elbow Arthroscopy: Indications & Approach | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Embryology | blocked because no canonical entity exists yet | 5 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Freiberg's Disease | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Glenohumeral Joint Anatomy, Stabilizer, and Biomechanics | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Gout | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Recon > Hip Anatomy | blocked because no canonical entity exists yet | 7 | 2 | The node did not meet either bridge or create thresholds in this pass. |
| Hook Hamate Fracture | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Leg Nerve Entrapment Syndromes | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Monteggia Fracture - Pediatric | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Occupational Health | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Outcome Measure Tools | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Plantar Fasciitis | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Posterolateral Corner Injury | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Shoulder Hemiarthroplasty | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Sickle Cell Anemia | blocked because no canonical entity exists yet | 2 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Subacromial Impingement | blocked because no canonical entity exists yet | 5 | 4 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Tibial Eminence Fracture | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Tibial Shaft Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Approaches | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Valgus Extension Overload (Pitcher's Elbow) | blocked because no canonical entity exists yet | 0 | 9 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Atlas Fractures & Transverse Ligament Injuries | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Avascular Necrosis the Shoulder | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Biceps Subluxation | blocked because no canonical entity exists yet | 4 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Both Bone Forearm Fracture - Pediatric | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cauda Equina Syndrome | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Diastrophic Dysplasia | blocked because no canonical entity exists yet | 5 | 3 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| DISH (Diffuse Idiopathic Skeletal Hyperostosis) | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Distal Humerus Physeal Separation - Pediatric | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Exertional Heat Illnesses | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Extensor Tendon Compartments | blocked because no canonical entity exists yet | 7 | 1 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Galeazzi Fractures | blocked because no canonical entity exists yet | 4 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Impending Fracture & Prophylactic Fixation | blocked because no canonical entity exists yet | 3 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Isolated Ulnar Shaft Fracture | blocked because no canonical entity exists yet | 4 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Level Evidence | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lunate Dislocation (Perilunate dissociation) | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lymphoma | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| MCP Dislocations | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Metatarsal Fractures | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spine > Neck & Upper Extremity Spine Exam | blocked because node is ambiguous/split-risk | 7 | 1 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Nonunion and Bone Defects | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Os Acromiale | blocked because no canonical entity exists yet | 4 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Posterior Labral Tear | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Proximal Humerus Fracture Nonunion and Malunion | blocked because node is ambiguous/split-risk | 2 | 6 | Automation raised flag_possible_split; this node stays manual until the split risk is resolved. |
| Pyogenic Flexor Tenosynovitis | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Quadrilateral Space Syndrome | blocked because no canonical entity exists yet | 4 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spine Biomechanics | blocked because no canonical entity exists yet | 6 | 2 | Only a low-confidence create_canonical_entity proposal exists (0.610); manual canonical modeling is still required. |
| Steroids & Stimulants | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Tarsal Navicular Fractures | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Tendons | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Polyethylene Wear & Manufacturing | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Stiffness | blocked because no canonical entity exists yet | 0 | 8 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Wrist Arthroscopy | blocked because no canonical entity exists yet | 6 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Wrist Ligaments & Biomechanics | blocked because no canonical entity exists yet | 3 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ankle Arthroscopy | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ankle Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Anterior Superior Iliac Spine (ASIS) Avulsion | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Bone Matrix | blocked because no canonical entity exists yet | 4 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Chemotherapy | blocked because no canonical entity exists yet | 3 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Constrictive Ring Syndrome (Streeter's Dysplasia) | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Down Syndrome | blocked because no canonical entity exists yet | 3 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Elbow Anatomy & Biomechanics | blocked because no canonical entity exists yet | 5 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Extra - abdominal Desmoid Tumor | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Flexor Pulley System | blocked because no canonical entity exists yet | 3 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Gait Cycle | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| General and Regional Anesthesia in Orthopaedics | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Geriatric Patient Trauma | blocked because no canonical entity exists yet | 3 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hammer Toe | blocked because no canonical entity exists yet | 2 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hip Biomechanics | blocked because no canonical entity exists yet | 3 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Juvenile Idiopathic Scoliosis | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Kohler's Disease | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Legg - Calve - Perthes Disease | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ligaments the Knee | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lipomas | blocked because no canonical entity exists yet | 1 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Low Back Pain | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lower Extremity Os | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lyme Disease | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Mallet Finger | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Midfoot Arthritis | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Molecular Biology Basics | blocked because no canonical entity exists yet | 1 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Morel - Lavallee Lesion | blocked because no canonical entity exists yet | 5 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| MTP Dislocations | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Neck Injuries in Athletes | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Neurilemmoma | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pelvis Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Posteromedial Tibial Bowing | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Proximal Tibia Metaphyseal Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Psoriatic Arthritis | blocked because no canonical entity exists yet | 3 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Quadriga Effect | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Radiation Therapy | blocked because no canonical entity exists yet | 4 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spontaneous Osteonecrosis the Knee (SONK) | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Thoracic Disc Herniation | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Tillaux Fractures | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Postoperative Inpatient Management | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Triangular Fibrocartilage Complex (TFCC) Injury | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Triceps Rupture | blocked because no canonical entity exists yet | 3 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ulnar Tunnel Syndrome | blocked because no canonical entity exists yet | 0 | 7 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Adolescent Blount's Disease | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Bone Circulation | blocked because no canonical entity exists yet | 4 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cerebral Palsy - Foot Conditions | blocked because no canonical entity exists yet | 3 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cervical Spine Trauma Evaluation | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Chance Fracture (Flexion - Distraction Injury) | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Clavicle Fractures - Distal | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Clinical Billing | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Discogenic Back Pain | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Endochondral Bone Formation | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Femoral Anteversion | blocked because no canonical entity exists yet | 3 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Fibular Deficiency (anteromedial bowing) | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hemangioma Soft Tissue | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| High - Pressure Injection Injuries | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Immunology | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Little League Elbow | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Myositis Ossificans | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Normal Bone Metabolism | blocked because no canonical entity exists yet | 2 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Osteochondritis Dissecans Elbow | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pediatric Trauma Evaluation & Management | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Polydactyly Hand | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Quadriceps Tendon Rupture | blocked because no canonical entity exists yet | 3 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Radial Head and Neck Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Raynaud's Syndrome | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Scaphoid Fracture Nonunion | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Scapholunate Ligament Injury & DISI | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spinal Cord Anatomy | blocked because no canonical entity exists yet | 3 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Synovial Facet Cyst | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Tarsal Tunnel Syndrome | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Acetabular Screw Fixation | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Implant Fixation | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Thumb Collateral Ligament Injury | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA in Patella Baja (Prior HTO) | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Wound Complications | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Undifferentiated Pleomorphic Sarcoma | blocked because no canonical entity exists yet | 0 | 6 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| AIN Compressive Neuropathy | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Anterior Tibialis Tendon Rupture | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Base Thumb Fractures | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cartilage | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cerebral Palsy - Upper Extremity Disorders | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cervical Adjacent Segment Disease | blocked because no canonical entity exists yet | 4 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cervical Disc Arthroplasty | blocked because no canonical entity exists yet | 3 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cervical Spine Anatomy | blocked because no canonical entity exists yet | 2 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Chordoma | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Congenital Radial Ulnar Synostosis | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| De Quervain's Tenosynovitis | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Distal Radial Ulnar Joint (DRUJ) Injuries | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Elbow Physical Exam | blocked because no canonical entity exists yet | 4 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Elbow Stiffness and Contractures | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Extensor Tendon Injuries | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Fat Embolism Syndrome | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Femoral Neck Stress Fractures | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Flexible Pes Planovalgus (Flexible Flatfoot) | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Foot Compartment Syndrome | blocked because no canonical entity exists yet | 4 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Foot Puncture Wounds | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hip Labral Tear | blocked because no canonical entity exists yet | 3 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hypothenar Hammer Syndrome | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Infantile Idiopathic Scoliosis | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Jersey Finger | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Neonatal Forearm Compartment Syndrome | blocked because no canonical entity exists yet | 4 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Osteofibrous Dysplasia | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| PIN Compression Syndrome | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Poland Syndrome | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| PTH & Vit D Physiology | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Revision Total Elbow Arthroplasty | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Sagittal Band Rupture | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Scapulothoracic Dissociation | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Scheuermann's Kyphosis | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Shoulder Arthroscopy: Indications & Approach | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Snapping Extensor Carpi Ulnaris (ECU) | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Snapping Hip (Coxa Saltans) | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Aseptic Loosening | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Other Complications | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Thoracic Spine Anatomy | blocked because no canonical entity exists yet | 3 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Thumb CMC Dislocation | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Tibial Shaft Stress Fractures | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Tibiotalar Impingement | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Axial Alignment | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Instability | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ulnocarpal Abutment Syndrome | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Vertebral Artery Injury | blocked because no canonical entity exists yet | 0 | 5 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Wrist Arthritis | blocked because no canonical entity exists yet | 4 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Acromioclavicular Joint | blocked because no canonical entity exists yet | 3 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Adamantinoma | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Adult Limb Deformity & Correction | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Anterior Inferior Iliac Spine Avulsion (AIIS) | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Arthroplasty | blocked because no canonical entity exists yet | 3 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Atlantoaxial Rotatory Displacement (AARD) | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Bone Remodeling | blocked because no canonical entity exists yet | 1 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Carpal Instability Nondissociative (CIND) | blocked because no canonical entity exists yet | 2 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cervical Spondylosis | blocked because no canonical entity exists yet | 3 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cleidocranial Dysplasia (Dysostosis) | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Congenital Trigger Thumb | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Disk Space Infection - Pediatric | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ear, Eye, Mouth Injuries | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Elbow Dislocation - Pediatric | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Eosinophilic Granuloma | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Epithelioid Sarcoma | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| FHL Tendonitis & Injuries | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Flail Chest | blocked because no canonical entity exists yet | 3 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Frostbite | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hallux Varus | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Intramembranous Bone Formation | blocked because no canonical entity exists yet | 3 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| LCL Injury the Knee | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lunotriquetral Ligament Injury & VISI | blocked because no canonical entity exists yet | 3 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| MCP Joint Arthritis | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Medial Epicondylitis (Golfer's Elbow) | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Melanoma | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Meniscus | blocked because no canonical entity exists yet | 1 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Metatarsus Adductus | blocked because no canonical entity exists yet | 3 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Neuropathic (Charcot) Joint Shoulder | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Osgood Schlatter's Disease (Tibial Tubercle Apophysitis) | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Parosteal Osteosarcoma | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Patellofemoral Joint | blocked because no canonical entity exists yet | 3 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Prophylactic Antibiotics | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Proximal Femoral Focal Deficiency | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Proximal Humerus Fracture - Pediatric | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Quadriceps Contusion | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Radial Tunnel Syndrome | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Sacroiliac Joint Dysfunction | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Scaphoid Nonunion Advanced Collapse (SNAC) | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Sesamoid Injuries the Hallux | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Sever's Disease | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Seymour Fracture | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| SI Dislocation & Crescent Fractures | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Squamous Cell Carcinoma | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Synovial Chondromatosis | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Synovitis 2nd MTP | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Leg Length Discrepancy | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Templating | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Thumb Hypoplasia | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Peroneal Nerve Palsy | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Vascular Injury and Bleeding | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Triplane Fractures | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Visceral Blunt Trauma | blocked because no canonical entity exists yet | 0 | 4 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Adductor Strain | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ankle Ligaments | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Bipartite Patella | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Congenital Dislocation the Knee | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Foot Anatomy and Biomechanics | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Genu Valgum (knocked knees) | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Giant Cell Tumor Tendon Sheath | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Gustilo Classification | blocked because no canonical entity exists yet | 1 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hemophilia | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hip Hemiarthroplasty Periprosthetic Fracture | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Humeral Shaft Fracture - Pediatric | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hyperparathyroidism | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Internal Tibial Torsion | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Intersection Syndrome | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Intrinsic Plus Hand | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lateral Patellar Compression Syndrome | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ligaments | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Madelung's Deformity | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| MCL Knee Injuries | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Multiple Epiphyseal Dysplasia (MED) | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Nerves the Foot | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Occipitocervical Instability | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Olecranon Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Operative Blood Loss & Transfusion | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ossification the Posterior Longitudinal Ligament | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pediatric Cervical Trauma Overview | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Periosteal Osteosarcoma | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Phases Throwing | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Platelet - Rich Plasma | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pleomorphic Sarcoma Bone (Malignant Fibrous Histiocytoma) | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Poliomyelitis | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pronator Syndrome | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pulmonary Conditions in Athletes | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Renal Osteodystrophy | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Rhabdomyosarcoma | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Shoulder Periprosthetic Fracture | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spinal Tuberculosis | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Synovium & Synovial Fluid | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Telangiectatic Intramedullary Osteosarcoma | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Tendon Transfer Principles | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Patellar Maltracking | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Transient Synovitis Hip | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ulnar Styloid Impaction Syndrome | blocked because no canonical entity exists yet | 0 | 3 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| AC Arthritis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Acute Subclavian Artery Thrombosis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Alignment | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Anterolateral Bowing & Congenital Pseudoarthrosis Tibia | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Apert Syndrome | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Atlantoaxial Instability | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Axillary Nerve | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Blood Supply to Hand | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Bone Infarct | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Boutonniere Deformity | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Brachial Neuritis (Parsonage - Turner Syndrome) | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Calcaneovalgus Foot | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Camptodactyly | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Chondromyxoid Fibroma | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Clavicle Shaft Fracture - Pediatric | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Congenital Muscular Torticollis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Congenital Radial Head Dislocation | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Deep Vein Thrombosis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Distal Clavicle Osteolysis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Distal Clavicle Physeal Fractures | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Distal Radius Malunion | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ehlers - Danlos Syndrome | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| External Tibial Torsion | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Femoral Neck Fracture Nonunion | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Gaucher Disease | blocked because no canonical entity exists yet | 1 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Glomus Tumor | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Gymnast's Wrist (Distal Radial Physeal Stress Syndrome) | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Human Bite | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hypophosphatasia | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Idiopathic Chondromalacia Patellae | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Informed Consent & Time Out | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Intramuscular Myxomas | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Klippel - Feil Syndrome | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Larsen's Syndrome | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lower Extremity Spine Exam | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Medial Clavicle Physeal Fracture | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Melorheostosis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Nail Bed Injury | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Neurofibroma | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Nursemaid's Elbow | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ochronosis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Other Trauma Topics | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Patella Sleeve Fracture | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Patellar Clunk Syndrome | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pathologic Scoliosis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pediatric | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Piriformis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Radial nerve | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Sacroiliitis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Sciatic nerve | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Shoulder Arthrodesis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spine Surgical Site Infections | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Sprengel's Deformity | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Subscapularis | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Postoperative Inpatient Management | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Rehabilitation | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| THA Vascular Injury & Bleeding | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Aseptic Loosening | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Patellar Prosthesis Loosening | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Postoperative Rehabilitation & Outpatient Management | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Traumatic Hip Dislocation - Pediatric | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ulnar Variance | blocked because no canonical entity exists yet | 0 | 2 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Abductor digiti minimi | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Achondroplasia Scaphoid Fracture | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Acquired Spastic Equinovarus Deformity | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Amyotrophic Lateral Sclerosis (ALS) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Angiosarcoma | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Anterior interosseous nerve | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Arthroplasty Preoperative Medical Optimization | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Athletic Pubalgia & Adductor strain | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Atypical Mycobacterium Infections | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Beckwith - Wiedemann Syndrome | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Biceps femoris short head | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Biomechanics | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Bladder Exstrophy | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Blood Supply to the Foot | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Brachymetatarsia | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Calcaneus Fractures Incomplete Spinal Cord | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cerebral Palsy - Spinal Disorders | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cervical Lateral Mass Fracture Separation | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cervical Myelopathy ACL Tear | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cervical Myelopathy Tibial Shaft Fractures -  | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Chronic Recurrent Multifocal Osteomyelitis (CRMO) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Clavicle Fractures - Midshaft Elbow Anatomy &  | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Cleft Hand | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Collagen | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Congenital Clasped Thumb | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Congenital Curly Toe | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Congenital Dislocation Patella | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Congenital Hallux Varus (Atavistic Great Toe) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Congenital Pseudoarthrosis Clavicle | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Deep Peroneal Nerve Entrapment | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Deep Space & Collar Button Infections | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Dermatofibrosarcoma Protuberans | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Developmental Coxa Vara | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Differential Groups | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Digital Artery Aneurysm | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Digital Collateral Ligament Injury | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Dog and Cat Bites | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Dysplasia Epiphysealis Hemimelica (Trevor's Disease) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Epidermal Inclusion Cyst | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Epiphyseal bracket | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Exercise Science Femoral Shaft Fractures | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Extensile Lateral Approach to Calcaneus | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Extensor digitorum longus | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Felon | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Femoral Anteversion TKA Patellofemoral | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Flexor Carpi Radialis Tendinitis | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Focal Fibrocartilaginous Dysplasia | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Forearm blood supply | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Fractures - Pediatric | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Friedreich's Ataxia | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Gluteus medius | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Gun Shot Wounds Pediatric Spondylolysis &  | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Gustilo Classification Hip Labral Tear | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hemophilic Arthropathy | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hip Arthrodesis | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| History and Physical Exam the Knee | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Hypoparathyroidism | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Idiopathic Transient Osteoporosis the Hip (ITOH) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Iliac Crest Contusion (Hip Pointer) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Iliotibial Band Friction Syndrome | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Injuries | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Intertrochanteric Fractures TKA Patellofemoral | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Intrinsic Minus Hand (Claw Hand) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Knee Biomechanics | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Knee Medial Parapatellar Approach | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Knee Osteoarthritis Adolescent Idiopathic | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lead Toxicity | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Leg Compartment Syndrome Femoral Shaft Fractures -  | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Leiomyosarcoma | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Leukemia | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Local Gigantism | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lumbosacral Plexus | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Lumbrical Muscles | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Luxatio Erecta (Inferior Glenohumeral Joint Dislocation) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Macrodactyly (local gigantism) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Malignant Peripheral Nerve Sheath Tumor | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Material Properties MTP Dislocations | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Multiple Sclerosis | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Nerve Conduction Studies | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Neuroblastoma | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Neuromuscular Scoliosis | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Nonunion | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Olecranon Stress Fracture | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Orthotics | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Osteitis Pubis | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Other Anatomy Topics | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Other Pathology Topics | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Periosteal Chondromas | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Physical Exam the Hand | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Piriformis Muscles Syndrome | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pisiform Fracture | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Plantar Fibromatosis (Ledderhose Disease) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Plicae | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Polydactyly Foot | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Popliteal Artery Entrapment Syndrome | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Popliteal Cyst in Children | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Posterior to Shoulder | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Preiser's Disease (Scaphoid AVN) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Proximal Tib - Fib Dislocation | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Proximal Tibiofibular Joint Ganglion Cysts | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pseudogout (CPPD) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Pseudosubluxation the Cervical Spine | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Psoas Abscess - Pediatric | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Quadrangular Space, Triangular Space, Triangular Interval | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Quadriceps Tendonitis | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Radiocarpal Fracture Dislocation | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Rectus Femoris Strain | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Rett Syndrome | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Rib Stress Fracture | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Rotator Cuff Tears Total Shoulder Arthroplasty | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Sacral Agenesis | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Sartorius | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Scapulothoracic Dyskinesis | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Scleroderma | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Scurvy | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| SI Joint Infection - Pediatric | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Skin Grafting | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spinal Cord Tumors | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spondyloepiphyseal Dysplasia (SED) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Spondylolisthesis | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Subaxial Cervical Vertebral Body Fractures | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Subtalar Arthritis | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Swan Neck Deformity | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Syndactyly | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Syndactyly the Toes | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Syndrome | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Syndrome) Brachial Neuritis (Parsonage - Turner | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Syrinx & Syringomyelia | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Teres Major | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Thoracic Outlet Syndrome | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Thoracolumbar Fracture - Dislocation | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Thromboangiitis Obliterans (Buerger's disease) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Tibial Deficiency | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Heterotopic Ossification | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Kinematic Alignment | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Metal Hypersensitivity | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Polyethylene Wear & Manufacturing Radial Head and Neck | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| TKA Postoperative Rehabilitation & Outpatient Management Reverse Shoulder | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Traumatic Spondylolisthesis Axis (Hangman's Fracture) | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Tumoral Calcinosis | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Ulnar nerve | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |
| Wrist Trauma Radiographic Evaluation | blocked because no canonical entity exists yet | 0 | 1 | No approved primary_coverage bridge and no safe additive retarget path were available in this pass. |

## Rollback Batch Keys

- `retarget:basic-science-rheumatoid-arthritis`
- `retarget:foot-ankle-diabetic-foot-ulcers`
- `retarget:foot-ankle-hallux-valgus`
- `retarget:foot-ankle-posterior-tibial-tendon-insufficiency-ptti`
- `retarget:knee-sports-acl-tear`
- `retarget:knee-sports-patellar-instability`
- `retarget:pathology-chondrosarcoma`
- `retarget:pathology-conventional-intramedullary-osteosarcoma`
- `retarget:pathology-giant-cell-tumor`
- `retarget:pathology-soft-tissue-sarcoma`
- `retarget:pediatrics-supracondylar-fracture-pediatric`
- `retarget:pediatrics-tarsal-coalition`
- `retarget:recon-prosthetic-joint-infection`
- `retarget:shoulder-elbow-rotator-cuff-tears`
- `retarget:shoulder-elbow-traumatic-anterior-shoulder-instability-tubs`
- `retarget:spine-adolescent-idiopathic-scoliosis`
- `retarget:spine-cervical-myelopathy`
- `retarget:spine-cervical-radiculopathy`
- `retarget:spine-lumbar-disc-herniation`
- `retarget:trauma-acetabular-fractures`
- `retarget:trauma-ankle-fractures`
- `retarget:trauma-calcaneus-fractures`
- `retarget:trauma-distal-femur-fractures`
- `retarget:trauma-distal-humerus-fractures`
- `retarget:trauma-distal-radius-fractures`
- `retarget:trauma-femoral-neck-fractures`
- `retarget:trauma-femoral-shaft-fractures`
- `retarget:trauma-humeral-shaft-fractures`
- `retarget:trauma-intertrochanteric-fractures`
- `retarget:trauma-knee-dislocation`
- `retarget:trauma-leg-compartment-syndrome`
- `retarget:trauma-olecranon-fractures`
- `retarget:trauma-pelvic-ring-fractures`
- `retarget:trauma-proximal-third-tibia-fracture`
- `retarget:trauma-radial-head-fractures`
- `retarget:trauma-scapula-fractures`
- `retarget:trauma-subtrochanteric-fractures`
- `retarget:trauma-talar-neck-fractures`
- `retarget:trauma-tibial-plafond-fractures`
- `retarget:trauma-tibial-plateau-fractures`
- `retarget:trauma-tibial-shaft-fractures`

## Recommendation

- Do not deprecate BroBot or Student Workspace legacy read paths yet. Current additive migration reaches only partial row parity, and blocked curriculum nodes still need manual canonical modeling or packet review. Revisit deprecation once card and question migration both exceed 95% and blocked high-traffic nodes are resolved.
