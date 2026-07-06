# DISTAL RADIUS FRACTURE — Knowledge Factory Audit

Generated: 2026-07-05T22:23:10.231Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **85** |
| Ontology Completeness | 49 |
| Evidence Quality | 85 |
| Graph Integrity | 100 |
| Shared Knowledge Reuse | 100 |
| Relationship Quality | 77 |
| Claim Quality | 84 |
| Decision Points | 77 |
| Metadata Quality | 90 |
| Provenance Quality | 100 |
| Review Calibration | 92 |
| Agent Performance | 92 |
| Compiler Quality | 85 |
| Educational Quality | 92 |
| Cross-Neighborhood Consistency | 92 |
| Publication Readiness | 32 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 24 proposals still awaiting human review
- 20 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 11 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 4 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-rel-3, gap-dp-11, gap-dp-pattern-12
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/47 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from distal-radius-fracture
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 11 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [high] Distal Radius Fracture neighborhood has 0/1 classification_system entities.

### [HIGH] 7 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_entity, missing_relationship, missing_claim
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

### [HIGH] No classification system present

- **Evidence:** 0 classification entities in merged draft
- **Reason:** Fracture diagnoses require classification when one exists clinically.
- **Impact:** -8
- **Fix:** Link has_classification and has_grade edges to a classification system.

### [HIGH] 7 high-risk relationships lack approved review status

- **Evidence:** Predicates: at_risk_structure, treated_by, uses_fixation, indicates_treatment, explains_instability
- **Reason:** High-risk predicates require human review before publication.
- **Impact:** -8
- **Fix:** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _4 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
4. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
5. **[Publication Readiness]** [high] Distal Radius Fracture neighborhood has 0/1 classification_system entities. — _11 critical/high ontology gaps remain unresolved_
6. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _7 high-priority ontology gaps_
7. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_
8. **[Relationship Quality]** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review. — _7 high-risk relationships lack approved review status_
9. **[Claim Quality]** Route claims through human review queue before publication. — _All claims remain generated_draft_
10. **[Claim Quality]** Attach evidence_refs from evidence packet to each claim proposal. — _Insufficient evidence support on claim proposals_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 12
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

