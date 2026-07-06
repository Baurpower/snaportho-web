# PATELLAR INSTABILITY — Knowledge Factory Audit

Generated: 2026-07-05T23:23:33.746Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **85** |
| Ontology Completeness | 73 |
| Evidence Quality | 85 |
| Graph Integrity | 73 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 65 |
| Claim Quality | 84 |
| Decision Points | 69 |
| Metadata Quality | 92 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 91 |
| Educational Quality | 94 |
| Cross-Neighborhood Consistency | 96 |
| Publication Readiness | 50 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 15 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 5 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 2 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-3, gap-rel-4
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/32 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] 5 dangling edges reference missing entities

- **Evidence:** femoral-condyles -[part_of]-> sports-knee-anatomy-hub; patella -[part_of]-> extensor-mechanism; patellar-instability -[involves_anatomy]-> extensor-mechanism
- **Reason:** Relationships must resolve to entities in the neighborhood graph.
- **Impact:** -15
- **Fix:** Create missing entities or remove invalid relationship proposals.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from patellar-instability
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 5 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [high] Patellar Instability Classification neighborhood has 0/2 classification_grade entities.

### [HIGH] 1 disconnected anatomy structures

- **Evidence:** Disconnected: lower-extremity-trauma-anatomy-hub
- **Reason:** Anatomy must connect to the condition graph for educational traversal.
- **Impact:** -8
- **Fix:** Add involves_anatomy, injured_in, or part_of edges from condition/procedure anchors.

### [HIGH] Missing clinical edge: at_risk_structure

- **Evidence:** 0 outbound at_risk_structure edges from patellar-instability
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -8
- **Fix:** Add at_risk_structure relationship via relationship-builder agent.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _2 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Graph Integrity]** Create missing entities or remove invalid relationship proposals. — _5 dangling edges reference missing entities_
4. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
5. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
6. **[Publication Readiness]** [high] Patellar Instability Classification neighborhood has 0/2 classification_grade entities. — _5 critical/high ontology gaps remain unresolved_
7. **[Graph Integrity]** Add involves_anatomy, injured_in, or part_of edges from condition/procedure anchors. — _1 disconnected anatomy structures_
8. **[Relationship Quality]** Add at_risk_structure relationship via relationship-builder agent. — _Missing clinical edge: at_risk_structure_
9. **[Relationship Quality]** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review. — _3 high-risk relationships lack approved review status_
10. **[Claim Quality]** Route claims through human review queue before publication. — _All claims remain generated_draft_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 13
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

