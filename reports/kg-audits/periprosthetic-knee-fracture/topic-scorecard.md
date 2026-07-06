# PERIPROSTHETIC KNEE FRACTURE — Knowledge Factory Audit

Generated: 2026-07-05T23:32:00.856Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **81** |
| Ontology Completeness | 53 |
| Evidence Quality | 85 |
| Graph Integrity | 84 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 49 |
| Claim Quality | 84 |
| Decision Points | 69 |
| Metadata Quality | 92 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 85 |
| Educational Quality | 86 |
| Cross-Neighborhood Consistency | 96 |
| Publication Readiness | 30 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 12 proposals still awaiting human review
- 5 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 14 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 6 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-1, gap-rel-4, gap-rel-8
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/16 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from periprosthetic-knee-fracture
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 14 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [critical] Periprosthetic Knee Fracture neighborhood has 0/3 anatomy_structure entities.

### [HIGH] 8 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_entity, missing_relationship, missing_claim
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

### [HIGH] Missing relationship requirements (8)

- **Evidence:** 8 gaps of kind missing_relationship
- **Reason:** Ontology contract requires complete relationship coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_relationship.

### [HIGH] 55 orphan entities with no relationships

- **Evidence:** Slugs: acetabulum, calcar, collateral-ligaments, common-peroneal-nerve, cruciate-ligaments, distal-femur, extensor-mechanism, femoral-diaphysis, femoral-head, femoral-neck, femoral-nerve, femur, gluteus-medius, gluteus-minimus, greater-trochanter, hip-capsule, hip-joint, intertrochanteric-region, lesser-trochanter, medial-femoral-circumflex-artery, patella, patellar-tendon, pelvis, popliteal-artery, proximal-femur, proximal-femur-anatomy-hub, quadriceps-tendon, sciatic-nerve, short-external-rotators, tibia, tibial-plateau, bearing-surface-selection, compartment-syndrome, femoral-neck-fracture, femoral-shaft-fracture, hip-prosthetic-joint-infection, intertrochanteric-fracture, knee-osteoarthritis, knee-prosthetic-joint-infection, periprosthetic-joint-infection, subtrochanteric-fracture, cement-mantle, cemented-fixation, press-fit-fixation, acetabular-component, femoral-stem, patellar-component, polyethylene-liner, tibial-insert, adverse-local-tissue-reaction, polyethylene-wear-osteolysis, revision-arthroplasty, total-hip-arthroplasty, total-knee-arthroplasty, unicompartmental-knee-arthroplasty
- **Reason:** Orphan entities cannot be traversed by products and indicate incomplete graph wiring.
- **Impact:** -8
- **Fix:** Add inbound or outbound clinical/anatomy edges, or merge duplicates.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _6 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
4. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
5. **[Publication Readiness]** [critical] Periprosthetic Knee Fracture neighborhood has 0/3 anatomy_structure entities. — _14 critical/high ontology gaps remain unresolved_
6. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _8 high-priority ontology gaps_
7. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (8)_
8. **[Graph Integrity]** Add inbound or outbound clinical/anatomy edges, or merge duplicates. — _55 orphan entities with no relationships_
9. **[Graph Integrity]** Add involves_anatomy, injured_in, or part_of edges from condition/procedure anchors. — _31 disconnected anatomy structures_
10. **[Relationship Quality]** Add has_imaging_finding relationship via relationship-builder agent. — _Missing clinical edge: has_imaging_finding_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 13
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

