# TIBIAL SHAFT FRACTURE — Knowledge Factory Audit

Generated: 2026-07-16T02:19:32.052Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **83** |
| Ontology Completeness | 46 |
| Evidence Quality | 85 |
| Graph Integrity | 100 |
| Shared Knowledge Reuse | 100 |
| Relationship Quality | 69 |
| Claim Quality | 84 |
| Decision Points | 85 |
| Metadata Quality | 86 |
| Provenance Quality | 96 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 84 |
| Educational Quality | 76 |
| Cross-Neighborhood Consistency | 100 |
| Publication Readiness | 40 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 18 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 12 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 4 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-rel-9, gap-dp-17, gap-dp-pattern-18
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/36 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from tibial-shaft-fracture
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] No decision points in neighborhood

- **Evidence:** merged draft decisionPointCount = 0
- **Reason:** Decision points support clinical reasoning and operative safety pathways.
- **Impact:** -15
- **Fix:** Run decision-point-builder for operative_indication and nonoperative_eligible patterns.

### [CRITICAL] 12 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [high] Tibia Leg Anatomy Hub missing outbound part_of (0/1).

### [HIGH] 8 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship, missing_entity, missing_claim, missing_metadata
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

### [HIGH] Missing claim requirements (9)

- **Evidence:** 9 gaps of kind missing_claim
- **Reason:** Ontology contract requires complete claim coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_claim.

### [HIGH] No classification system present

- **Evidence:** 0 classification entities in merged draft
- **Reason:** Fracture diagnoses require classification when one exists clinically.
- **Impact:** -8
- **Fix:** Link has_classification and has_grade edges to a classification system.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _4 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
4. **[Decision Points]** Run decision-point-builder for operative_indication and nonoperative_eligible patterns. — _No decision points in neighborhood_
5. **[Publication Readiness]** [high] Tibia Leg Anatomy Hub missing outbound part_of (0/1). — _12 critical/high ontology gaps remain unresolved_
6. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _8 high-priority ontology gaps_
7. **[Ontology Completeness]** Run the matching builder agent for missing_claim. — _Missing claim requirements (9)_
8. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_
9. **[Relationship Quality]** Add at_risk_structure relationship via relationship-builder agent. — _Missing clinical edge: at_risk_structure_
10. **[Relationship Quality]** Add treated_by relationship via relationship-builder agent. — _Missing clinical edge: treated_by_

## Data Source

- Neighborhood: database
- Reports loaded: 14
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

