# ASEPTIC LOOSENING OF TKA — Knowledge Factory Audit

Generated: 2026-07-16T03:33:39.556Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **78** |
| Ontology Completeness | 27 |
| Evidence Quality | 85 |
| Graph Integrity | 100 |
| Shared Knowledge Reuse | 100 |
| Relationship Quality | 42 |
| Claim Quality | 76 |
| Decision Points | 85 |
| Metadata Quality | 86 |
| Provenance Quality | 96 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 83 |
| Educational Quality | 72 |
| Cross-Neighborhood Consistency | 100 |
| Publication Readiness | 28 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 11 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- 15 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 8 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-2, gap-rel-5, gap-rel-7
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Only 1 anatomy structures (minimum 3 required)

- **Evidence:** Entity slugs: adult-reconstruction-anatomy-hub
- **Reason:** Condition neighborhoods require regional anatomy per condition.anatomy.min_structures.
- **Impact:** -15
- **Fix:** Add essential regional anatomy via anatomy builder or shared anatomy reuse.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/14 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from aseptic-loosening-tka
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from aseptic-loosening-tka
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] No decision points in neighborhood

- **Evidence:** merged draft decisionPointCount = 0
- **Reason:** Decision points support clinical reasoning and operative safety pathways.
- **Impact:** -15
- **Fix:** Run decision-point-builder for operative_indication and nonoperative_eligible patterns.

### [CRITICAL] 15 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [high] Adult Reconstruction Anatomy Hub missing outbound part_of (0/1).

### [HIGH] 7 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship, missing_entity, missing_claim
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _8 critical ontology gaps remain_
2. **[Ontology Completeness]** Add essential regional anatomy via anatomy builder or shared anatomy reuse. — _Only 1 anatomy structures (minimum 3 required)_
3. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
4. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
5. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
6. **[Decision Points]** Run decision-point-builder for operative_indication and nonoperative_eligible patterns. — _No decision points in neighborhood_
7. **[Publication Readiness]** [high] Adult Reconstruction Anatomy Hub missing outbound part_of (0/1). — _15 critical/high ontology gaps remain unresolved_
8. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _7 high-priority ontology gaps_
9. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (11)_
10. **[Ontology Completeness]** Run the matching builder agent for missing_claim. — _Missing claim requirements (9)_

## Data Source

- Neighborhood: database
- Reports loaded: 15
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

