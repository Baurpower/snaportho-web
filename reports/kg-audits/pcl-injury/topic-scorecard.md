# PCL INJURY — Knowledge Factory Audit

Generated: 2026-07-05T23:23:33.740Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **84** |
| Ontology Completeness | 54 |
| Evidence Quality | 85 |
| Graph Integrity | 84 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 65 |
| Claim Quality | 84 |
| Decision Points | 69 |
| Metadata Quality | 92 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 85 |
| Educational Quality | 94 |
| Cross-Neighborhood Consistency | 96 |
| Publication Readiness | 25 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 15 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 15 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 7 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-1, gap-rel-2, gap-dp-13
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/31 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from pcl-injury
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
- **Fix:** [critical] PCL Injury neighborhood has 0/3 anatomy_structure entities.

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

### [HIGH] 3 orphan entities with no relationships

- **Evidence:** Slugs: common-peroneal-nerve, distal-femur, lower-extremity-trauma-anatomy-hub
- **Reason:** Orphan entities cannot be traversed by products and indicate incomplete graph wiring.
- **Impact:** -8
- **Fix:** Add inbound or outbound clinical/anatomy edges, or merge duplicates.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _7 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
4. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
5. **[Publication Readiness]** [critical] PCL Injury neighborhood has 0/3 anatomy_structure entities. — _15 critical/high ontology gaps remain unresolved_
6. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _8 high-priority ontology gaps_
7. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (9)_
8. **[Graph Integrity]** Add inbound or outbound clinical/anatomy edges, or merge duplicates. — _3 orphan entities with no relationships_
9. **[Graph Integrity]** Add involves_anatomy, injured_in, or part_of edges from condition/procedure anchors. — _3 disconnected anatomy structures_
10. **[Relationship Quality]** Add at_risk_structure relationship via relationship-builder agent. — _Missing clinical edge: at_risk_structure_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 13
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

