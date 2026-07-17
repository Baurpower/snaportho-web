# POSTOPERATIVE PROTOCOLS — Knowledge Factory Audit

Generated: 2026-07-09T04:28:51.342Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **78** |
| Ontology Completeness | 42 |
| Evidence Quality | 85 |
| Graph Integrity | 85 |
| Shared Knowledge Reuse | 100 |
| Relationship Quality | 34 |
| Claim Quality | 84 |
| Decision Points | 69 |
| Metadata Quality | 90 |
| Provenance Quality | 96 |
| Review Calibration | 96 |
| Agent Performance | 92 |
| Compiler Quality | 88 |
| Educational Quality | 76 |
| Cross-Neighborhood Consistency | 100 |
| Publication Readiness | 20 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 31 proposals still awaiting human review
- 31 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 12 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 8 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-1, gap-rel-2, gap-entity-neighbor-4
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Only 0 anatomy structures (minimum 3 required)

- **Evidence:** Entity slugs: 
- **Reason:** Condition neighborhoods require regional anatomy per condition.anatomy.min_structures.
- **Impact:** -15
- **Fix:** Add essential regional anatomy via anatomy builder or shared anatomy reuse.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/94 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] 64 invalid relationship triples per ontology registry

- **Evidence:** 64/64 relationships fail validateRelationshipTriple
- **Reason:** Invalid predicates or entity type pairings violate the relationship registry.
- **Impact:** -15
- **Fix:** Correct subject/object entity types or choose valid predicates.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from postoperative-protocols
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from postoperative-protocols
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 12 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [critical] Total Hip Arthroplasty neighborhood has 0/1 anatomy_structure entities.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _8 critical ontology gaps remain_
2. **[Ontology Completeness]** Add essential regional anatomy via anatomy builder or shared anatomy reuse. — _Only 0 anatomy structures (minimum 3 required)_
3. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
4. **[Graph Integrity]** Correct subject/object entity types or choose valid predicates. — _64 invalid relationship triples per ontology registry_
5. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
6. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
7. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
8. **[Publication Readiness]** [critical] Total Hip Arthroplasty neighborhood has 0/1 anatomy_structure entities. — _12 critical/high ontology gaps remain unresolved_
9. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _4 high-priority ontology gaps_
10. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (12)_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 12
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

