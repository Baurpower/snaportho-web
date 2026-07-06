# DISTAL HUMERUS FRACTURE — Knowledge Factory Audit

Generated: 2026-07-05T22:23:10.243Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **81** |
| Ontology Completeness | 30 |
| Evidence Quality | 85 |
| Graph Integrity | 77 |
| Shared Knowledge Reuse | 100 |
| Relationship Quality | 77 |
| Claim Quality | 84 |
| Decision Points | 77 |
| Metadata Quality | 90 |
| Provenance Quality | 100 |
| Review Calibration | 92 |
| Agent Performance | 92 |
| Compiler Quality | 81 |
| Educational Quality | 92 |
| Cross-Neighborhood Consistency | 92 |
| Publication Readiness | 10 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 20 proposals still awaiting human review
- 12 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 19 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 10 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-1, gap-rel-2, gap-entity-neighbor-4
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Only 0 anatomy structures (minimum 3 required)

- **Evidence:** Entity slugs: 
- **Reason:** Condition neighborhoods require regional anatomy per condition.anatomy.min_structures.
- **Impact:** -15
- **Fix:** Add essential regional anatomy via anatomy builder or shared anatomy reuse.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/31 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] 11 dangling edges reference missing entities

- **Evidence:** distal-humerus-fracture -[at_risk_structure]-> median-nerve; distal-humerus-fracture -[at_risk_structure]-> ulnar-nerve; distal-humerus-fracture -[injured_in]-> distal-humerus
- **Reason:** Relationships must resolve to entities in the neighborhood graph.
- **Impact:** -15
- **Fix:** Create missing entities or remove invalid relationship proposals.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from distal-humerus-fracture
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 19 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [critical] Distal Humerus ORIF neighborhood has 0/1 anatomy_structure entities.

### [HIGH] 9 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship, missing_entity, missing_claim
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _10 critical ontology gaps remain_
2. **[Ontology Completeness]** Add essential regional anatomy via anatomy builder or shared anatomy reuse. — _Only 0 anatomy structures (minimum 3 required)_
3. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
4. **[Graph Integrity]** Create missing entities or remove invalid relationship proposals. — _11 dangling edges reference missing entities_
5. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
6. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
7. **[Publication Readiness]** [critical] Distal Humerus ORIF neighborhood has 0/1 anatomy_structure entities. — _19 critical/high ontology gaps remain unresolved_
8. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _9 high-priority ontology gaps_
9. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (13)_
10. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 12
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

