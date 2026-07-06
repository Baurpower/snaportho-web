# PATELLOFEMORAL ARTHROPLASTY — Knowledge Factory Audit

Generated: 2026-07-05T23:32:00.868Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **80** |
| Ontology Completeness | 66 |
| Evidence Quality | 85 |
| Graph Integrity | 84 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 34 |
| Claim Quality | 76 |
| Decision Points | 69 |
| Metadata Quality | 92 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 90 |
| Educational Quality | 78 |
| Cross-Neighborhood Consistency | 96 |
| Publication Readiness | 50 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 6

### Blockers

- 8 proposals still awaiting human review
- 3 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 3 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 2 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-1, gap-rel-2
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/14 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from patellofemoral-arthroplasty
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from patellofemoral-arthroplasty
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 3 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [critical] Patellofemoral Arthroplasty neighborhood has 0/1 anatomy_structure entities.

### [HIGH] No classification system present

- **Evidence:** 0 classification entities in merged draft
- **Reason:** Fracture diagnoses require classification when one exists clinically.
- **Impact:** -8
- **Fix:** Link has_classification and has_grade edges to a classification system.

### [HIGH] 57 orphan entities with no relationships

- **Evidence:** Slugs: patellofemoral-tracking, acetabulum, calcar, common-peroneal-nerve, cruciate-ligaments, distal-femur, extensor-mechanism, femoral-condyles, femoral-diaphysis, femoral-head, femoral-neck, femoral-nerve, femur, gluteus-medius, gluteus-minimus, greater-trochanter, hip-capsule, hip-joint, intertrochanteric-region, lesser-trochanter, medial-femoral-circumflex-artery, patellar-tendon, pelvis, popliteal-artery, proximal-femur, proximal-femur-anatomy-hub, quadriceps-tendon, sciatic-nerve, short-external-rotators, tibia, tibial-plateau, bearing-surface-selection, compartment-syndrome, distal-femur-fracture, femoral-neck-fracture, femoral-shaft-fracture, hip-prosthetic-joint-infection, intertrochanteric-fracture, knee-prosthetic-joint-infection, periprosthetic-joint-infection, subtrochanteric-fracture, tibial-shaft-fracture, cement-mantle, cemented-fixation, press-fit-fixation, acetabular-component, femoral-component, femoral-stem, polyethylene-liner, tibial-baseplate, tibial-insert, adverse-local-tissue-reaction, polyethylene-wear-osteolysis, revision-arthroplasty, total-hip-arthroplasty, total-knee-arthroplasty, unicompartmental-knee-arthroplasty
- **Reason:** Orphan entities cannot be traversed by products and indicate incomplete graph wiring.
- **Impact:** -8
- **Fix:** Add inbound or outbound clinical/anatomy edges, or merge duplicates.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _2 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
4. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
5. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
6. **[Publication Readiness]** [critical] Patellofemoral Arthroplasty neighborhood has 0/1 anatomy_structure entities. — _3 critical/high ontology gaps remain unresolved_
7. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_
8. **[Graph Integrity]** Add inbound or outbound clinical/anatomy edges, or merge duplicates. — _57 orphan entities with no relationships_
9. **[Graph Integrity]** Add involves_anatomy, injured_in, or part_of edges from condition/procedure anchors. — _30 disconnected anatomy structures_
10. **[Relationship Quality]** Add has_imaging_finding relationship via relationship-builder agent. — _Missing clinical edge: has_imaging_finding_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 13
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

