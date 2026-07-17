# IMAGING & RADIOGRAPHIC MEASUREMENTS — Knowledge Factory Audit

Generated: 2026-07-09T04:16:28.202Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **80** |
| Ontology Completeness | 68 |
| Evidence Quality | 85 |
| Graph Integrity | 96 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 30 |
| Claim Quality | 84 |
| Decision Points | 69 |
| Metadata Quality | 90 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 74 |
| Educational Quality | 76 |
| Cross-Neighborhood Consistency | 100 |
| Publication Readiness | 60 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 67 proposals still awaiting human review
- 49 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 4 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/344 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from imaging-radiographic-measurements
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from imaging-radiographic-measurements
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 4 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [high] Upper Extremity Trauma Anatomy Hub missing outbound part_of (0/1).

### [HIGH] 4 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -8
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

### [HIGH] Missing relationship requirements (47)

- **Evidence:** 47 gaps of kind missing_relationship
- **Reason:** Ontology contract requires complete relationship coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_relationship.

### [HIGH] Missing claim requirements (137)

- **Evidence:** 137 gaps of kind missing_claim
- **Reason:** Ontology contract requires complete claim coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_claim.

## Prioritized Recommendations

1. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
2. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
3. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
4. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
5. **[Publication Readiness]** [high] Upper Extremity Trauma Anatomy Hub missing outbound part_of (0/1). — _4 critical/high ontology gaps remain unresolved_
6. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _4 high-priority ontology gaps_
7. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (47)_
8. **[Ontology Completeness]** Run the matching builder agent for missing_claim. — _Missing claim requirements (137)_
9. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_
10. **[Relationship Quality]** Add has_imaging_finding relationship via relationship-builder agent. — _Missing clinical edge: has_imaging_finding_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 12
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

