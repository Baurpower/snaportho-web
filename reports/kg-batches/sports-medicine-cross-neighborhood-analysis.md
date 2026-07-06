# Sports Medicine Prepare Cluster — Cross-Neighborhood Analysis

Generated: 2026-07-05T23:24:00.898Z

## Intra-cluster connectivity

| Condition | Cross-neighborhood links | Trauma cross-links |
|-----------|-------------------------|-------------------|
| ACL Tear | `meniscus-tear`, `patellar-instability`, `multiligament-knee-injury` | `tibial-plateau-fracture` |
| PCL Injury | `acl-tear`, `multiligament-knee-injury` | `tibial-plateau-fracture` |
| Meniscus Tear | `acl-tear`, `osteochondral-defect-knee` | `tibial-plateau-fracture` |
| Patellar Instability | `acl-tear`, `osteochondral-defect-knee` | `patella-fracture` |
| Multiligament Knee Injury | `acl-tear`, `pcl-injury` | `tibial-plateau-fracture`, `distal-femur-fracture` |
| Osteochondral Defect of the Knee | `meniscus-tear`, `patellar-instability` | `tibial-plateau-fracture` |
| Anterior Shoulder Instability | `rotator-cuff-tear`, `slap-tear` | `proximal-humerus-fracture` |
| Rotator Cuff Tear | `anterior-shoulder-instability`, `proximal-biceps-tendon-pathology` | `proximal-humerus-fracture` |
| AC Joint Separation | `anterior-shoulder-instability`, `rotator-cuff-tear` | `clavicle-fracture`, `proximal-humerus-fracture` |
| SLAP Tear | `anterior-shoulder-instability`, `proximal-biceps-tendon-pathology`, `rotator-cuff-tear` | `proximal-humerus-fracture` |
| Proximal Biceps Tendon Pathology | `rotator-cuff-tear`, `slap-tear` | `proximal-humerus-fracture` |
| UCL Injury | `distal-biceps-tendon-rupture` | `distal-humerus-fracture` |
| Distal Biceps Tendon Rupture | `ucl-injury` | `distal-humerus-fracture` |
| Achilles Tendon Rupture | `chronic-lateral-ankle-instability`, `osteochondral-lesion-talus` | `calcaneus-fracture`, `talus-fracture`, `ankle-fracture` |
| Chronic Lateral Ankle Instability | `syndesmotic-sprain`, `achilles-tendon-rupture` | `ankle-fracture` |
| Syndesmotic Sprain | `chronic-lateral-ankle-instability` | `ankle-fracture`, `pilon-fracture` |
| Osteochondral Lesion of the Talus | `chronic-lateral-ankle-instability`, `syndesmotic-sprain` | `talus-fracture`, `ankle-fracture` |

## Shared anatomy reuse strategy

- **Knee sports**: Reuses LE trauma slugs (`acl`, `pcl`, `patella`, `tibial-plateau`, `extensor-mechanism`, `popliteal-artery`, `common-peroneal-nerve`) plus owned sports knee hub entities.
- **Shoulder sports**: Reuses UE trauma slugs (`humeral-head`, `proximal-humerus`, `axillary-nerve`, `ac-joint`) plus owned rotator cuff and labrum entities.
- **Elbow sports**: Reuses UE trauma nerve and elbow joint slugs plus owned UCL and distal biceps entities.
- **Foot & ankle sports**: Reuses LE trauma (`talus`, `calcaneus`) and ankle-fracture pilot (`syndesmosis`, `deltoid-ligament`) plus owned ATFL/CFL/Achilles entities.

## Auditor cross-neighborhood consistency

Batch audit file: `reports/kg-audits/batches/sports-medicine/batch-summary.json`

- Average auditor score: **—**
- Publication blocked: **17/17** neighborhoods

- `acl-tear`: overall 85, cross-neighborhood 96
- `pcl-injury`: overall 84, cross-neighborhood 96
- `meniscus-tear`: overall 85, cross-neighborhood 96
- `patellar-instability`: overall 85, cross-neighborhood 96
- `multiligament-knee-injury`: overall 87, cross-neighborhood 96
- `osteochondral-defect-knee`: overall 85, cross-neighborhood 96
- `anterior-shoulder-instability`: overall 85, cross-neighborhood 96
- `rotator-cuff-tear`: overall 86, cross-neighborhood 96
- `ac-joint-separation`: overall 83, cross-neighborhood 96
- `slap-tear`: overall 85, cross-neighborhood 96
- `proximal-biceps-tendon-pathology`: overall 86, cross-neighborhood 96
- `ucl-injury`: overall 83, cross-neighborhood 96
- `distal-biceps-tendon-rupture`: overall 86, cross-neighborhood 96
- `achilles-tendon-rupture`: overall 83, cross-neighborhood 96
- `chronic-lateral-ankle-instability`: overall 86, cross-neighborhood 96
- `syndesmotic-sprain`: overall 85, cross-neighborhood 96
- `osteochondral-lesion-talus`: overall 86, cross-neighborhood 96
