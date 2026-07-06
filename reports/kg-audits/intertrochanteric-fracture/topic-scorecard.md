# INTERTROCHANTERIC FRACTURE — Knowledge Factory Audit

Generated: 2026-07-05T22:23:10.237Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **84** |
| Ontology Completeness | 48 |
| Evidence Quality | 85 |
| Graph Integrity | 92 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 69 |
| Claim Quality | 84 |
| Decision Points | 69 |
| Metadata Quality | 92 |
| Provenance Quality | 100 |
| Review Calibration | 96 |
| Agent Performance | 92 |
| Compiler Quality | 84 |
| Educational Quality | 96 |
| Cross-Neighborhood Consistency | 92 |
| Publication Readiness | 30 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 20 proposals still awaiting human review
- 16 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 13 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 6 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-1, gap-rel-3, gap-rel-6
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/51 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from intertrochanteric-fracture
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 13 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [critical] Intertrochanteric Fracture neighborhood has 0/3 anatomy_structure entities.

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

### [HIGH] 1 merge conflicts detected

- **Evidence:** conflict-report.json: Conflicting DP pattern intertrochanteric-fracture|operative_indication: dp-it-cephalomedullary-unstable vs dp-it-shs-stable
- **Reason:** Unresolved merge conflicts indicate inconsistent agent outputs.
- **Impact:** -8
- **Fix:** Run conflict-resolver agent and reconcile metadata/text conflicts.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _6 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
4. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
5. **[Publication Readiness]** [critical] Intertrochanteric Fracture neighborhood has 0/3 anatomy_structure entities. — _13 critical/high ontology gaps remain unresolved_
6. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _7 high-priority ontology gaps_
7. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_
8. **[Graph Integrity]** Run conflict-resolver agent and reconcile metadata/text conflicts. — _1 merge conflicts detected_
9. **[Relationship Quality]** Add at_risk_structure relationship via relationship-builder agent. — _Missing clinical edge: at_risk_structure_
10. **[Relationship Quality]** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review. — _5 high-risk relationships lack approved review status_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 12
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

