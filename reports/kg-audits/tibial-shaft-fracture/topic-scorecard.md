# TIBIAL SHAFT FRACTURE — Knowledge Factory Audit

Generated: 2026-07-05T22:23:10.234Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **87** |
| Ontology Completeness | 80 |
| Evidence Quality | 85 |
| Graph Integrity | 100 |
| Shared Knowledge Reuse | 100 |
| Relationship Quality | 69 |
| Claim Quality | 84 |
| Decision Points | 77 |
| Metadata Quality | 90 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 90 |
| Educational Quality | 84 |
| Cross-Neighborhood Consistency | 92 |
| Publication Readiness | 60 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 17 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 2 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/43 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from tibial-shaft-fracture
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 2 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [high] Tibia Leg Anatomy Hub missing outbound part_of (0/1).

### [HIGH] No classification system present

- **Evidence:** 0 classification entities in merged draft
- **Reason:** Fracture diagnoses require classification when one exists clinically.
- **Impact:** -8
- **Fix:** Link has_classification and has_grade edges to a classification system.

### [HIGH] Missing clinical edge: at_risk_structure

- **Evidence:** 0 outbound at_risk_structure edges from tibial-shaft-fracture
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -8
- **Fix:** Add at_risk_structure relationship via relationship-builder agent.

### [HIGH] 3 high-risk relationships lack approved review status

- **Evidence:** Predicates: indicates_treatment, treated_by, uses_fixation
- **Reason:** High-risk predicates require human review before publication.
- **Impact:** -8
- **Fix:** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review.

### [HIGH] All claims remain generated_draft

- **Evidence:** 15/15 claims are unreviewed drafts
- **Reason:** Draft claims cannot be consumed as verified educational content.
- **Impact:** -8
- **Fix:** Route claims through human review queue before publication.

## Prioritized Recommendations

1. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
2. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
3. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
4. **[Publication Readiness]** [high] Tibia Leg Anatomy Hub missing outbound part_of (0/1). — _2 critical/high ontology gaps remain unresolved_
5. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_
6. **[Relationship Quality]** Add at_risk_structure relationship via relationship-builder agent. — _Missing clinical edge: at_risk_structure_
7. **[Relationship Quality]** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review. — _3 high-risk relationships lack approved review status_
8. **[Claim Quality]** Route claims through human review queue before publication. — _All claims remain generated_draft_
9. **[Claim Quality]** Attach evidence_refs from evidence packet to each claim proposal. — _Insufficient evidence support on claim proposals_
10. **[Decision Points]** Add emergency_escalation decision point for compartment syndrome, open fracture, etc. — _No emergent/high-safety decision pathways_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 12
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

