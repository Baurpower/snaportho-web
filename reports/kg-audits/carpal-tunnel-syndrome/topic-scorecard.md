# CARPAL TUNNEL SYNDROME — Knowledge Factory Audit

Generated: 2026-07-16T03:33:40.502Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **79** |
| Ontology Completeness | 46 |
| Evidence Quality | 85 |
| Graph Integrity | 84 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 49 |
| Claim Quality | 85 |
| Decision Points | 85 |
| Metadata Quality | 88 |
| Provenance Quality | 96 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 80 |
| Educational Quality | 72 |
| Cross-Neighborhood Consistency | 100 |
| Publication Readiness | 35 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 42 proposals still awaiting human review
- 28 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- 20 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 5 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-rel-14, gap-rel-16, gap-dp-23
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/207 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from carpal-tunnel-syndrome
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add has_classification relationship via relationship-builder agent.

### [CRITICAL] No educational claims in neighborhood

- **Evidence:** merged draft claimCount = 0
- **Reason:** Claims are the primary educational content layer for products.
- **Impact:** -15
- **Fix:** Run claim-builder agent to generate evidence-backed atomic claims.

### [CRITICAL] No decision points in neighborhood

- **Evidence:** merged draft decisionPointCount = 0
- **Reason:** Decision points support clinical reasoning and operative safety pathways.
- **Impact:** -15
- **Fix:** Run decision-point-builder for operative_indication and nonoperative_eligible patterns.

### [CRITICAL] 20 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [high] Collateral Ligaments missing outbound part_of (0/1).

### [HIGH] 15 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship, missing_entity, missing_claim, missing_metadata
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

### [HIGH] Missing relationship requirements (16)

- **Evidence:** 16 gaps of kind missing_relationship
- **Reason:** Ontology contract requires complete relationship coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_relationship.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _5 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
4. **[Claim Quality]** Run claim-builder agent to generate evidence-backed atomic claims. — _No educational claims in neighborhood_
5. **[Decision Points]** Run decision-point-builder for operative_indication and nonoperative_eligible patterns. — _No decision points in neighborhood_
6. **[Publication Readiness]** [high] Collateral Ligaments missing outbound part_of (0/1). — _20 critical/high ontology gaps remain unresolved_
7. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _15 high-priority ontology gaps_
8. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (16)_
9. **[Ontology Completeness]** Link has_classification and has_grade edges to a classification system. — _No classification system present_
10. **[Graph Integrity]** Add inbound or outbound clinical/anatomy edges, or merge duplicates. — _9 orphan entities with no relationships_

## Data Source

- Neighborhood: database
- Reports loaded: 15
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

