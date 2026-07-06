# FEMORAL NECK FRACTURE (ADULT RECON PERSPECTIVE) — Knowledge Factory Audit

Generated: 2026-07-05T23:32:00.830Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **79** |
| Ontology Completeness | 42 |
| Evidence Quality | 85 |
| Graph Integrity | 84 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 26 |
| Claim Quality | 84 |
| Decision Points | 69 |
| Metadata Quality | 90 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 78 |
| Educational Quality | 90 |
| Cross-Neighborhood Consistency | 96 |
| Publication Readiness | 17 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 15 proposals still awaiting human review
- 13 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 25 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 7 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-11, gap-rel-15, gap-rel-17
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/17 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from femoral-neck-fracture-adult-recon
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from femoral-neck-fracture-adult-recon
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 25 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [high] Patellar Tendon missing outbound part_of (0/1).

### [HIGH] 18 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship, missing_entity, missing_claim
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

### [HIGH] Missing relationship requirements (20)

- **Evidence:** 20 gaps of kind missing_relationship
- **Reason:** Ontology contract requires complete relationship coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_relationship.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _7 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
4. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
5. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
6. **[Publication Readiness]** [high] Patellar Tendon missing outbound part_of (0/1). — _25 critical/high ontology gaps remain unresolved_
7. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _18 high-priority ontology gaps_
8. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (20)_
9. **[Ontology Completeness]** Run the matching builder agent for missing_claim. — _Missing claim requirements (9)_
10. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 13
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

