# ACHILLES TENDON RUPTURE — Knowledge Factory Audit

Generated: 2026-07-05T23:23:33.768Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **83** |
| Ontology Completeness | 54 |
| Evidence Quality | 85 |
| Graph Integrity | 69 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 65 |
| Claim Quality | 84 |
| Decision Points | 69 |
| Metadata Quality | 92 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 84 |
| Educational Quality | 98 |
| Cross-Neighborhood Consistency | 96 |
| Publication Readiness | 17 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 25 proposals still awaiting human review
- 11 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 15 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 7 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-1, gap-rel-2, gap-entity-neighbor-4
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/33 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] 2 dangling edges reference missing entities

- **Evidence:** femoral-condyles -[part_of]-> sports-knee-anatomy-hub; labrum -[part_of]-> sports-shoulder-anatomy-hub
- **Reason:** Relationships must resolve to entities in the neighborhood graph.
- **Impact:** -15
- **Fix:** Create missing entities or remove invalid relationship proposals.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from achilles-tendon-rupture
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 15 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [critical] Achilles Tendon Rupture Reconstruction neighborhood has 0/1 anatomy_structure entities.

### [HIGH] 8 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship, missing_claim, missing_entity
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

### [HIGH] Missing relationship requirements (9)

- **Evidence:** 9 gaps of kind missing_relationship
- **Reason:** Ontology contract requires complete relationship coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_relationship.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _7 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Graph Integrity]** Create missing entities or remove invalid relationship proposals. — _2 dangling edges reference missing entities_
4. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
5. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
6. **[Publication Readiness]** [critical] Achilles Tendon Rupture Reconstruction neighborhood has 0/1 anatomy_structure entities. — _15 critical/high ontology gaps remain unresolved_
7. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _8 high-priority ontology gaps_
8. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (9)_
9. **[Graph Integrity]** Add inbound or outbound clinical/anatomy edges, or merge duplicates. — _3 orphan entities with no relationships_
10. **[Graph Integrity]** Add involves_anatomy, injured_in, or part_of edges from condition/procedure anchors. — _3 disconnected anatomy structures_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 13
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

