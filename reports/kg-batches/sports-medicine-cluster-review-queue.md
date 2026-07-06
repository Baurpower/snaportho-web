# Sports Medicine Prepare Cluster — Review Queue

Generated: 2026-07-05T23:24:00.888Z

## ACL Tear

| Bucket | Count |
|--------|------:|
| Safe curator approval | 87 |
| Needs clinical judgment | 12 |
| Needs attending judgment | 6 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 18 |

- **HUMAN_REVIEW** — acl-tear -[tested_by]-> acl-tear-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — acl-tear-mri-finding -[indicates_treatment]-> acl-tear-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — acl-tear -[treated_by]-> acl-tear-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — acl-tear -[treated_by]-> acl-tear-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — acl-tear -[differential_for]-> meniscus-tear (add_canonical_relationship)
- **HUMAN_REVIEW** — acl-tear -[differential_for]-> patellar-instability (add_canonical_relationship)
- …and 12 more

## PCL Injury

| Bucket | Count |
|--------|------:|
| Safe curator approval | 84 |
| Needs clinical judgment | 9 |
| Needs attending judgment | 5 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 14 |

- **HUMAN_REVIEW** — pcl-injury -[tested_by]-> pcl-injury-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — pcl-injury-mri-finding -[indicates_treatment]-> pcl-injury-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — pcl-injury -[treated_by]-> pcl-injury-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — pcl-injury -[treated_by]-> pcl-injury-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — pcl-injury -[differential_for]-> acl-tear (add_canonical_relationship)
- **HUMAN_REVIEW** — pcl-injury -[differential_for]-> multiligament-knee-injury (add_canonical_relationship)
- …and 8 more

## Meniscus Tear

| Bucket | Count |
|--------|------:|
| Safe curator approval | 86 |
| Needs clinical judgment | 9 |
| Needs attending judgment | 6 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 15 |

- **HUMAN_REVIEW** — meniscus-tear -[tested_by]-> meniscus-tear-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — meniscus-tear-mri-finding -[indicates_treatment]-> meniscus-tear-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — meniscus-tear -[treated_by]-> meniscus-tear-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — meniscus-tear -[treated_by]-> meniscus-tear-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — meniscus-tear -[differential_for]-> acl-tear (add_canonical_relationship)
- **HUMAN_REVIEW** — meniscus-tear -[differential_for]-> osteochondral-defect-knee (add_canonical_relationship)
- …and 9 more

## Patellar Instability

| Bucket | Count |
|--------|------:|
| Safe curator approval | 84 |
| Needs clinical judgment | 9 |
| Needs attending judgment | 5 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 14 |

- **HUMAN_REVIEW** — patellar-instability -[tested_by]-> patellar-instability-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — patellar-instability-mri-finding -[indicates_treatment]-> patellar-instability-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — patellar-instability -[treated_by]-> patellar-instability-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — patellar-instability -[treated_by]-> patellar-instability-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — patellar-instability -[differential_for]-> acl-tear (add_canonical_relationship)
- **HUMAN_REVIEW** — patellar-instability -[differential_for]-> osteochondral-defect-knee (add_canonical_relationship)
- …and 8 more

## Multiligament Knee Injury

| Bucket | Count |
|--------|------:|
| Safe curator approval | 89 |
| Needs clinical judgment | 10 |
| Needs attending judgment | 8 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 18 |

- **HUMAN_REVIEW** — multiligament-knee-injury -[tested_by]-> multiligament-knee-injury-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — multiligament-knee-injury-mri-finding -[indicates_treatment]-> multiligament-knee-injury-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — multiligament-knee-injury -[treated_by]-> multiligament-knee-injury-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — multiligament-knee-injury -[treated_by]-> multiligament-knee-injury-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — multiligament-knee-injury -[differential_for]-> acl-tear (add_canonical_relationship)
- **HUMAN_REVIEW** — multiligament-knee-injury -[differential_for]-> pcl-injury (add_canonical_relationship)
- …and 12 more

## Osteochondral Defect of the Knee

| Bucket | Count |
|--------|------:|
| Safe curator approval | 84 |
| Needs clinical judgment | 9 |
| Needs attending judgment | 5 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 14 |

- **HUMAN_REVIEW** — osteochondral-defect-knee -[tested_by]-> osteochondral-defect-knee-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — osteochondral-defect-knee-mri-finding -[indicates_treatment]-> osteochondral-defect-knee-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — osteochondral-defect-knee -[treated_by]-> osteochondral-defect-knee-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — osteochondral-defect-knee -[treated_by]-> osteochondral-defect-knee-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — osteochondral-defect-knee -[differential_for]-> meniscus-tear (add_canonical_relationship)
- **HUMAN_REVIEW** — osteochondral-defect-knee -[differential_for]-> patellar-instability (add_canonical_relationship)
- …and 8 more

## Anterior Shoulder Instability

| Bucket | Count |
|--------|------:|
| Safe curator approval | 84 |
| Needs clinical judgment | 9 |
| Needs attending judgment | 6 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 15 |

- **HUMAN_REVIEW** — anterior-shoulder-instability -[tested_by]-> anterior-shoulder-instability-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — anterior-shoulder-instability-mri-finding -[indicates_treatment]-> anterior-shoulder-instability-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — anterior-shoulder-instability -[treated_by]-> anterior-shoulder-instability-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — anterior-shoulder-instability -[treated_by]-> anterior-shoulder-instability-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — anterior-shoulder-instability -[differential_for]-> rotator-cuff-tear (add_canonical_relationship)
- **HUMAN_REVIEW** — anterior-shoulder-instability -[differential_for]-> slap-tear (add_canonical_relationship)
- …and 9 more

## Rotator Cuff Tear

| Bucket | Count |
|--------|------:|
| Safe curator approval | 85 |
| Needs clinical judgment | 9 |
| Needs attending judgment | 5 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 14 |

- **HUMAN_REVIEW** — rotator-cuff-tear -[tested_by]-> rotator-cuff-tear-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — rotator-cuff-tear-mri-finding -[indicates_treatment]-> rotator-cuff-tear-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — rotator-cuff-tear -[treated_by]-> rotator-cuff-tear-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — rotator-cuff-tear -[treated_by]-> rotator-cuff-tear-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — rotator-cuff-tear -[differential_for]-> anterior-shoulder-instability (add_canonical_relationship)
- **HUMAN_REVIEW** — rotator-cuff-tear -[differential_for]-> proximal-biceps-tendon-pathology (add_canonical_relationship)
- …and 8 more

## AC Joint Separation

| Bucket | Count |
|--------|------:|
| Safe curator approval | 84 |
| Needs clinical judgment | 10 |
| Needs attending judgment | 5 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 15 |

- **HUMAN_REVIEW** — ac-joint-separation -[tested_by]-> ac-joint-separation-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — ac-joint-separation-mri-finding -[indicates_treatment]-> ac-joint-separation-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — ac-joint-separation -[treated_by]-> ac-joint-separation-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — ac-joint-separation -[treated_by]-> ac-joint-separation-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — ac-joint-separation -[differential_for]-> anterior-shoulder-instability (add_canonical_relationship)
- **HUMAN_REVIEW** — ac-joint-separation -[differential_for]-> rotator-cuff-tear (add_canonical_relationship)
- …and 9 more

## SLAP Tear

| Bucket | Count |
|--------|------:|
| Safe curator approval | 85 |
| Needs clinical judgment | 10 |
| Needs attending judgment | 5 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 15 |

- **HUMAN_REVIEW** — slap-tear -[tested_by]-> slap-tear-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — slap-tear-mri-finding -[indicates_treatment]-> slap-tear-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — slap-tear -[treated_by]-> slap-tear-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — slap-tear -[treated_by]-> slap-tear-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — slap-tear -[differential_for]-> anterior-shoulder-instability (add_canonical_relationship)
- **HUMAN_REVIEW** — slap-tear -[differential_for]-> proximal-biceps-tendon-pathology (add_canonical_relationship)
- …and 9 more

## Proximal Biceps Tendon Pathology

| Bucket | Count |
|--------|------:|
| Safe curator approval | 84 |
| Needs clinical judgment | 9 |
| Needs attending judgment | 5 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 14 |

- **HUMAN_REVIEW** — proximal-biceps-tendon-pathology -[tested_by]-> proximal-biceps-tendon-pathology-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — proximal-biceps-tendon-pathology-mri-finding -[indicates_treatment]-> proximal-biceps-tendon-pathology-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — proximal-biceps-tendon-pathology -[treated_by]-> proximal-biceps-tendon-pathology-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — proximal-biceps-tendon-pathology -[treated_by]-> proximal-biceps-tendon-pathology-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — proximal-biceps-tendon-pathology -[differential_for]-> rotator-cuff-tear (add_canonical_relationship)
- **HUMAN_REVIEW** — proximal-biceps-tendon-pathology -[differential_for]-> slap-tear (add_canonical_relationship)
- …and 8 more

## UCL Injury

| Bucket | Count |
|--------|------:|
| Safe curator approval | 81 |
| Needs clinical judgment | 8 |
| Needs attending judgment | 6 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 14 |

- **HUMAN_REVIEW** — ucl-injury -[tested_by]-> ucl-injury-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — ucl-injury-mri-finding -[indicates_treatment]-> ucl-injury-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — ucl-injury -[treated_by]-> ucl-injury-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — ucl-injury -[treated_by]-> ucl-injury-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — ucl-injury -[differential_for]-> distal-biceps-tendon-rupture (add_canonical_relationship)
- **HUMAN_REVIEW** — ucl-injury -[differential_for]-> distal-humerus-fracture (add_canonical_relationship)
- …and 8 more

## Distal Biceps Tendon Rupture

| Bucket | Count |
|--------|------:|
| Safe curator approval | 81 |
| Needs clinical judgment | 8 |
| Needs attending judgment | 6 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 14 |

- **HUMAN_REVIEW** — distal-biceps-tendon-rupture -[tested_by]-> distal-biceps-tendon-rupture-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — distal-biceps-tendon-rupture-mri-finding -[indicates_treatment]-> distal-biceps-tendon-rupture-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — distal-biceps-tendon-rupture -[treated_by]-> distal-biceps-tendon-rupture-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — distal-biceps-tendon-rupture -[treated_by]-> distal-biceps-tendon-rupture-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — distal-biceps-tendon-rupture -[differential_for]-> ucl-injury (add_canonical_relationship)
- **HUMAN_REVIEW** — distal-biceps-tendon-rupture -[differential_for]-> distal-humerus-fracture (add_canonical_relationship)
- …and 8 more

## Achilles Tendon Rupture

| Bucket | Count |
|--------|------:|
| Safe curator approval | 83 |
| Needs clinical judgment | 11 |
| Needs attending judgment | 5 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 16 |

- **HUMAN_REVIEW** — achilles-tendon-rupture -[tested_by]-> achilles-tendon-rupture-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — achilles-tendon-rupture-mri-finding -[indicates_treatment]-> achilles-tendon-rupture-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — achilles-tendon-rupture -[treated_by]-> achilles-tendon-rupture-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — achilles-tendon-rupture -[treated_by]-> achilles-tendon-rupture-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — achilles-tendon-rupture -[differential_for]-> chronic-lateral-ankle-instability (add_canonical_relationship)
- **HUMAN_REVIEW** — achilles-tendon-rupture -[differential_for]-> osteochondral-lesion-talus (add_canonical_relationship)
- …and 10 more

## Chronic Lateral Ankle Instability

| Bucket | Count |
|--------|------:|
| Safe curator approval | 82 |
| Needs clinical judgment | 9 |
| Needs attending judgment | 5 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 14 |

- **HUMAN_REVIEW** — chronic-lateral-ankle-instability -[tested_by]-> chronic-lateral-ankle-instability-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — chronic-lateral-ankle-instability-mri-finding -[indicates_treatment]-> chronic-lateral-ankle-instability-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — chronic-lateral-ankle-instability -[treated_by]-> chronic-lateral-ankle-instability-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — chronic-lateral-ankle-instability -[treated_by]-> chronic-lateral-ankle-instability-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — chronic-lateral-ankle-instability -[differential_for]-> syndesmotic-sprain (add_canonical_relationship)
- **HUMAN_REVIEW** — chronic-lateral-ankle-instability -[differential_for]-> achilles-tendon-rupture (add_canonical_relationship)
- …and 8 more

## Syndesmotic Sprain

| Bucket | Count |
|--------|------:|
| Safe curator approval | 83 |
| Needs clinical judgment | 10 |
| Needs attending judgment | 5 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 15 |

- **HUMAN_REVIEW** — syndesmotic-sprain -[tested_by]-> syndesmotic-sprain-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — syndesmotic-sprain-mri-finding -[indicates_treatment]-> syndesmotic-sprain-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — syndesmotic-sprain -[treated_by]-> syndesmotic-sprain-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — syndesmotic-sprain -[treated_by]-> syndesmotic-sprain-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — syndesmotic-sprain -[differential_for]-> chronic-lateral-ankle-instability (add_canonical_relationship)
- **HUMAN_REVIEW** — syndesmotic-sprain -[differential_for]-> ankle-fracture (add_canonical_relationship)
- …and 9 more

## Osteochondral Lesion of the Talus

| Bucket | Count |
|--------|------:|
| Safe curator approval | 82 |
| Needs clinical judgment | 10 |
| Needs attending judgment | 5 |
| Reject / revise | 0 |
| Schema / ontology | 0 |
| Human review queue items | 15 |

- **HUMAN_REVIEW** — osteochondral-lesion-talus -[tested_by]-> osteochondral-lesion-talus-exam-maneuver (add_canonical_relationship)
- **ATTENDING_REVIEW** — osteochondral-lesion-talus-mri-finding -[indicates_treatment]-> osteochondral-lesion-talus-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — osteochondral-lesion-talus -[treated_by]-> osteochondral-lesion-talus-reconstruction (add_canonical_relationship)
- **ATTENDING_REVIEW** — osteochondral-lesion-talus -[treated_by]-> osteochondral-lesion-talus-rehab-protocol (add_canonical_relationship)
- **HUMAN_REVIEW** — osteochondral-lesion-talus -[differential_for]-> chronic-lateral-ankle-instability (add_canonical_relationship)
- **HUMAN_REVIEW** — osteochondral-lesion-talus -[differential_for]-> syndesmotic-sprain (add_canonical_relationship)
- …and 9 more

