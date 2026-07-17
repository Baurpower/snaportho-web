# COMPLICATIONS — Knowledge Factory Audit

Generated: 2026-07-09T04:21:10.824Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **84** |
| Ontology Completeness | 84 |
| Evidence Quality | 85 |
| Graph Integrity | 100 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 30 |
| Claim Quality | 84 |
| Decision Points | 77 |
| Metadata Quality | 90 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 91 |
| Educational Quality | 78 |
| Cross-Neighborhood Consistency | 100 |
| Publication Readiness | 68 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 71 proposals still awaiting human review
- 53 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.

## Top Findings

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/362 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from orthopaedic-complications
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from orthopaedic-complications
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [HIGH] Missing relationship requirements (10)

- **Evidence:** 10 gaps of kind missing_relationship
- **Reason:** Ontology contract requires complete relationship coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_relationship.

### [HIGH] No classification system present

- **Evidence:** 0 classification entities in merged draft
- **Reason:** Fracture diagnoses require classification when one exists clinically.
- **Impact:** -8
- **Fix:** Link has_classification and has_grade edges to a classification system.

### [HIGH] Missing clinical edge: has_imaging_finding

- **Evidence:** 0 outbound has_imaging_finding edges from orthopaedic-complications
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -8
- **Fix:** Add has_imaging_finding relationship via relationship-builder agent.

### [HIGH] Missing clinical edge: at_risk_structure

- **Evidence:** 0 outbound at_risk_structure edges from orthopaedic-complications
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -8
- **Fix:** Add at_risk_structure relationship via relationship-builder agent.

## Prioritized Recommendations

1. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
2. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
3. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
4. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
5. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (10)_
6. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_
7. **[Relationship Quality]** Add has_imaging_finding relationship via relationship-builder agent. — _Missing clinical edge: has_imaging_finding_
8. **[Relationship Quality]** Add at_risk_structure relationship via relationship-builder agent. — _Missing clinical edge: at_risk_structure_
9. **[Relationship Quality]** Add treated_by relationship via relationship-builder agent. — _Missing clinical edge: treated_by_
10. **[Relationship Quality]** Add has_complication relationship via relationship-builder agent. — _Missing clinical edge: has_complication_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 12
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

