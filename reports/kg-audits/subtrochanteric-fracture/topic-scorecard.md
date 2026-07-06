# SUBTROCHANTERIC FRACTURE — Knowledge Factory Audit

Generated: 2026-07-05T22:23:10.238Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **85** |
| Ontology Completeness | 55 |
| Evidence Quality | 85 |
| Graph Integrity | 92 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 84 |
| Claim Quality | 84 |
| Decision Points | 77 |
| Metadata Quality | 92 |
| Provenance Quality | 96 |
| Review Calibration | 92 |
| Agent Performance | 92 |
| Compiler Quality | 82 |
| Educational Quality | 92 |
| Cross-Neighborhood Consistency | 92 |
| Publication Readiness | 27 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 19 proposals still awaiting human review
- 11 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 13 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 5 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-1, gap-rel-2, gap-dp-16
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/27 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 13 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [critical] Subtrochanteric Plate Osteosynthesis neighborhood has 0/1 anatomy_structure entities.

### [HIGH] 8 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship, missing_entity, missing_claim
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

### [HIGH] Missing relationship requirements (9)

- **Evidence:** 9 gaps of kind missing_relationship
- **Reason:** Ontology contract requires complete relationship coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_relationship.

### [HIGH] 1 merge conflicts detected

- **Evidence:** conflict-report.json: Conflicting DP pattern subtrochanteric-fracture|operative_indication: dp-st-atypical-workup vs dp-st-cephalomedullary-nail
- **Reason:** Unresolved merge conflicts indicate inconsistent agent outputs.
- **Impact:** -8
- **Fix:** Run conflict-resolver agent and reconcile metadata/text conflicts.

### [HIGH] Missing clinical edge: at_risk_structure

- **Evidence:** 0 outbound at_risk_structure edges from subtrochanteric-fracture
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -8
- **Fix:** Add at_risk_structure relationship via relationship-builder agent.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _5 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
4. **[Publication Readiness]** [critical] Subtrochanteric Plate Osteosynthesis neighborhood has 0/1 anatomy_structure entities. — _13 critical/high ontology gaps remain unresolved_
5. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _8 high-priority ontology gaps_
6. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (9)_
7. **[Graph Integrity]** Run conflict-resolver agent and reconcile metadata/text conflicts. — _1 merge conflicts detected_
8. **[Relationship Quality]** Add at_risk_structure relationship via relationship-builder agent. — _Missing clinical edge: at_risk_structure_
9. **[Relationship Quality]** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review. — _4 high-risk relationships lack approved review status_
10. **[Claim Quality]** Route claims through human review queue before publication. — _All claims remain generated_draft_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 12
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

