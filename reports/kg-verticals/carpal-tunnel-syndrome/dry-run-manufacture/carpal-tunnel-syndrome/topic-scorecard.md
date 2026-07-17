# CARPAL TUNNEL SYNDROME — Knowledge Factory Audit

Generated: 2026-07-09T14:21:25.677Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **87** |
| Ontology Completeness | 84 |
| Evidence Quality | 85 |
| Graph Integrity | 84 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 57 |
| Claim Quality | 84 |
| Decision Points | 85 |
| Metadata Quality | 88 |
| Provenance Quality | 100 |
| Review Calibration | 92 |
| Agent Performance | 92 |
| Compiler Quality | 84 |
| Educational Quality | 94 |
| Cross-Neighborhood Consistency | 100 |
| Publication Readiness | 0 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 0 / 7

### Blockers

- Publication readiness report missing

## Top Findings

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/234 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from carpal-tunnel-syndrome
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] No publication readiness report

- **Evidence:** publication-readiness.json missing
- **Reason:** Cannot determine publication eligibility without compiler publication gate.
- **Impact:** -15
- **Fix:** Run compiler publication-validator stage.

### [HIGH] No compiler gap report available

- **Evidence:** ontology-gap-report.json missing from reports/kg-compiler
- **Reason:** Auditor cannot verify ontology completeness without compiler gap analysis.
- **Impact:** -8
- **Fix:** Run npm run kg:compile -- --topic <topic> to generate gap report.

### [HIGH] No classification system present

- **Evidence:** 0 classification entities in merged draft
- **Reason:** Fracture diagnoses require classification when one exists clinically.
- **Impact:** -8
- **Fix:** Link has_classification and has_grade edges to a classification system.

### [HIGH] 3 orphan entities with no relationships

- **Evidence:** Slugs: collateral-ligaments, abductor-pollicis-brevis, carpal-tunnel-release-postoperative-protocol
- **Reason:** Orphan entities cannot be traversed by products and indicate incomplete graph wiring.
- **Impact:** -8
- **Fix:** Add inbound or outbound clinical/anatomy edges, or merge duplicates.

### [HIGH] 2 disconnected anatomy structures

- **Evidence:** Disconnected: collateral-ligaments, abductor-pollicis-brevis
- **Reason:** Anatomy must connect to the condition graph for educational traversal.
- **Impact:** -8
- **Fix:** Add involves_anatomy, injured_in, or part_of edges from condition/procedure anchors.

## Prioritized Recommendations

1. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
2. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
3. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
4. **[Publication Readiness]** Run compiler publication-validator stage. — _No publication readiness report_
5. **[Ontology Completeness]** Run npm run kg:compile -- --topic <topic> to generate gap report. — _No compiler gap report available_
6. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_
7. **[Graph Integrity]** Add inbound or outbound clinical/anatomy edges, or merge duplicates. — _3 orphan entities with no relationships_
8. **[Graph Integrity]** Add involves_anatomy, injured_in, or part_of edges from condition/procedure anchors. — _2 disconnected anatomy structures_
9. **[Relationship Quality]** Add has_imaging_finding relationship via relationship-builder agent. — _Missing clinical edge: has_imaging_finding_
10. **[Relationship Quality]** Add has_complication relationship via relationship-builder agent. — _Missing clinical edge: has_complication_

## Data Source

- Neighborhood: compiler_snapshot
- Reports loaded: 1
- Reports missing: ontology-compiler-plan.json, ontology-gap-report.json, ontology-work-plan.json, agent-execution-report.json, merged-neighborhood-draft.json, publication-readiness.json, ontology-publication-readiness.json, ontology-auto-review.json, ontology-human-review-queue.json, conflict-report.json, agent-assignment-plan.json, ontology-neighborhood-plan.json

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

