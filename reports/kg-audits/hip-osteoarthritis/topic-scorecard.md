# HIP OSTEOARTHRITIS — Knowledge Factory Audit

Generated: 2026-07-05T23:32:00.822Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **78** |
| Ontology Completeness | 46 |
| Evidence Quality | 85 |
| Graph Integrity | 61 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 34 |
| Claim Quality | 84 |
| Decision Points | 69 |
| Metadata Quality | 90 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 72 |
| Educational Quality | 94 |
| Cross-Neighborhood Consistency | 96 |
| Publication Readiness | 0 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 12 proposals still awaiting human review
- 11 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 33 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 18 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-1, gap-rel-2, gap-entity-neighbor-8
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/46 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] 30 dangling edges reference missing entities

- **Evidence:** acetabulum -[part_of]-> pelvis; adult-reconstruction-anatomy-hub -[prerequisite_for]-> hip-osteoarthritis; collateral-ligaments -[part_of]-> adult-reconstruction-anatomy-hub
- **Reason:** Relationships must resolve to entities in the neighborhood graph.
- **Impact:** -15
- **Fix:** Create missing entities or remove invalid relationship proposals.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from hip-osteoarthritis
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from hip-osteoarthritis
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 33 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [critical] Revision Arthroplasty neighborhood has 0/1 anatomy_structure entities.

### [HIGH] 15 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship, missing_entity, missing_claim
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _18 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Graph Integrity]** Create missing entities or remove invalid relationship proposals. — _30 dangling edges reference missing entities_
4. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
5. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
6. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
7. **[Publication Readiness]** [critical] Revision Arthroplasty neighborhood has 0/1 anatomy_structure entities. — _33 critical/high ontology gaps remain unresolved_
8. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _15 high-priority ontology gaps_
9. **[Ontology Completeness]** Run the matching builder agent for missing_entity. — _Missing entity requirements (10)_
10. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (29)_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 13
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

