# ADVERSE LOCAL TISSUE REACTION (METAL REACTION) — Knowledge Factory Audit

Generated: 2026-07-16T03:33:40.819Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **78** |
| Ontology Completeness | 39 |
| Evidence Quality | 85 |
| Graph Integrity | 88 |
| Shared Knowledge Reuse | 100 |
| Relationship Quality | 46 |
| Claim Quality | 76 |
| Decision Points | 85 |
| Metadata Quality | 86 |
| Provenance Quality | 96 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 86 |
| Educational Quality | 72 |
| Cross-Neighborhood Consistency | 100 |
| Publication Readiness | 58 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 10 proposals still awaiting human review
- 7 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- 5 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 2 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-15, gap-rel-16
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Only 1 anatomy structures (minimum 3 required)

- **Evidence:** Entity slugs: adult-reconstruction-anatomy-hub
- **Reason:** Condition neighborhoods require regional anatomy per condition.anatomy.min_structures.
- **Impact:** -15
- **Fix:** Add essential regional anatomy via anatomy builder or shared anatomy reuse.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/16 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from adverse-local-tissue-reaction
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from adverse-local-tissue-reaction
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] No decision points in neighborhood

- **Evidence:** merged draft decisionPointCount = 0
- **Reason:** Decision points support clinical reasoning and operative safety pathways.
- **Impact:** -15
- **Fix:** Run decision-point-builder for operative_indication and nonoperative_eligible patterns.

### [CRITICAL] 5 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [high] Adult Reconstruction Anatomy Hub missing outbound part_of (0/1).

### [HIGH] Missing relationship requirements (9)

- **Evidence:** 9 gaps of kind missing_relationship
- **Reason:** Ontology contract requires complete relationship coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_relationship.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _2 critical ontology gaps remain_
2. **[Ontology Completeness]** Add essential regional anatomy via anatomy builder or shared anatomy reuse. — _Only 1 anatomy structures (minimum 3 required)_
3. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
4. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
5. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
6. **[Decision Points]** Run decision-point-builder for operative_indication and nonoperative_eligible patterns. — _No decision points in neighborhood_
7. **[Publication Readiness]** [high] Adult Reconstruction Anatomy Hub missing outbound part_of (0/1). — _5 critical/high ontology gaps remain unresolved_
8. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (9)_
9. **[Ontology Completeness]** Run the matching builder agent for missing_claim. — _Missing claim requirements (10)_
10. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_

## Data Source

- Neighborhood: database
- Reports loaded: 15
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

