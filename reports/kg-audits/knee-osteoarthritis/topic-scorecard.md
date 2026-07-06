# KNEE OSTEOARTHRITIS — Knowledge Factory Audit

Generated: 2026-07-05T23:32:00.853Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **83** |
| Ontology Completeness | 87 |
| Evidence Quality | 85 |
| Graph Integrity | 84 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 34 |
| Claim Quality | 84 |
| Decision Points | 69 |
| Metadata Quality | 92 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 91 |
| Educational Quality | 78 |
| Cross-Neighborhood Consistency | 96 |
| Publication Readiness | 60 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 10 proposals still awaiting human review
- 9 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.

## Top Findings

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/16 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from knee-osteoarthritis
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from knee-osteoarthritis
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [HIGH] No classification system present

- **Evidence:** 0 classification entities in merged draft
- **Reason:** Fracture diagnoses require classification when one exists clinically.
- **Impact:** -8
- **Fix:** Link has_classification and has_grade edges to a classification system.

### [HIGH] 57 orphan entities with no relationships

- **Evidence:** Slugs: mechanical-axis-knee, acetabulum, calcar, collateral-ligaments, common-peroneal-nerve, cruciate-ligaments, distal-femur, extensor-mechanism, femoral-diaphysis, femoral-head, femoral-neck, femoral-nerve, femur, gluteus-medius, gluteus-minimus, greater-trochanter, hip-capsule, hip-joint, intertrochanteric-region, labrum, lesser-trochanter, medial-femoral-circumflex-artery, patella, patellar-tendon, pelvis, popliteal-artery, proximal-femur, proximal-femur-anatomy-hub, quadriceps-tendon, sciatic-nerve, short-external-rotators, tibia, bearing-surface-selection, compartment-syndrome, distal-femur-fracture, femoral-neck-fracture, femoral-shaft-fracture, hip-prosthetic-joint-infection, intertrochanteric-fracture, knee-prosthetic-joint-infection, periprosthetic-joint-infection, subtrochanteric-fracture, tibial-shaft-fracture, cement-mantle, cemented-fixation, press-fit-fixation, acetabular-component, femoral-component, femoral-stem, patellar-component, polyethylene-liner, tibial-baseplate, tibial-insert, adverse-local-tissue-reaction, polyethylene-wear-osteolysis, revision-arthroplasty, total-hip-arthroplasty
- **Reason:** Orphan entities cannot be traversed by products and indicate incomplete graph wiring.
- **Impact:** -8
- **Fix:** Add inbound or outbound clinical/anatomy edges, or merge duplicates.

### [HIGH] 31 disconnected anatomy structures

- **Evidence:** Disconnected: acetabulum, calcar, collateral-ligaments, common-peroneal-nerve, cruciate-ligaments, distal-femur, extensor-mechanism, femoral-diaphysis, femoral-head, femoral-neck, femoral-nerve, femur, gluteus-medius, gluteus-minimus, greater-trochanter, hip-capsule, hip-joint, intertrochanteric-region, labrum, lesser-trochanter, medial-femoral-circumflex-artery, patella, patellar-tendon, pelvis, popliteal-artery, proximal-femur, proximal-femur-anatomy-hub, quadriceps-tendon, sciatic-nerve, short-external-rotators, tibia
- **Reason:** Anatomy must connect to the condition graph for educational traversal.
- **Impact:** -8
- **Fix:** Add involves_anatomy, injured_in, or part_of edges from condition/procedure anchors.

### [HIGH] Missing clinical edge: at_risk_structure

- **Evidence:** 0 outbound at_risk_structure edges from knee-osteoarthritis
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -8
- **Fix:** Add at_risk_structure relationship via relationship-builder agent.

## Prioritized Recommendations

1. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
2. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
3. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
4. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
5. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_
6. **[Graph Integrity]** Add inbound or outbound clinical/anatomy edges, or merge duplicates. — _57 orphan entities with no relationships_
7. **[Graph Integrity]** Add involves_anatomy, injured_in, or part_of edges from condition/procedure anchors. — _31 disconnected anatomy structures_
8. **[Relationship Quality]** Add at_risk_structure relationship via relationship-builder agent. — _Missing clinical edge: at_risk_structure_
9. **[Relationship Quality]** Add treated_by relationship via relationship-builder agent. — _Missing clinical edge: treated_by_
10. **[Relationship Quality]** Add has_complication relationship via relationship-builder agent. — _Missing clinical edge: has_complication_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 13
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

