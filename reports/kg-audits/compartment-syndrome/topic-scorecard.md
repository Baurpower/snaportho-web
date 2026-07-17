# COMPARTMENT SYNDROME — Knowledge Factory Audit

Generated: 2026-07-16T03:37:03.978Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **80** |
| Ontology Completeness | 44 |
| Evidence Quality | 85 |
| Graph Integrity | 96 |
| Shared Knowledge Reuse | 100 |
| Relationship Quality | 46 |
| Claim Quality | 85 |
| Decision Points | 85 |
| Metadata Quality | 86 |
| Provenance Quality | 96 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 85 |
| Educational Quality | 72 |
| Cross-Neighborhood Consistency | 100 |
| Publication Readiness | 38 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 17 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- 14 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 6 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-rel-8, gap-rel-10, gap-rel-12
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/35 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing clinical edge: injured_in

- **Evidence:** 0 outbound injured_in edges from compartment-syndrome
- **Reason:** Core diagnosis neighborhoods require standard clinical relationship patterns.
- **Impact:** -15
- **Fix:** Add injured_in relationship via relationship-builder agent.

### [CRITICAL] Missing clinical edge: has_classification

- **Evidence:** 0 outbound has_classification edges from compartment-syndrome
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

### [CRITICAL] 14 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [high] Leg Fasciotomy missing outbound at_risk_structure (0/1).

### [HIGH] 8 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship, missing_entity, missing_claim
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _6 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Relationship Quality]** Add injured_in relationship via relationship-builder agent. — _Missing clinical edge: injured_in_
4. **[Relationship Quality]** Add has_classification relationship via relationship-builder agent. — _Missing clinical edge: has_classification_
5. **[Claim Quality]** Run claim-builder agent to generate evidence-backed atomic claims. — _No educational claims in neighborhood_
6. **[Decision Points]** Run decision-point-builder for operative_indication and nonoperative_eligible patterns. — _No decision points in neighborhood_
7. **[Publication Readiness]** [high] Leg Fasciotomy missing outbound at_risk_structure (0/1). — _14 critical/high ontology gaps remain unresolved_
8. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _8 high-priority ontology gaps_
9. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (9)_
10. **[Ontology Completeness]** Run the matching builder agent for missing_claim. — _Missing claim requirements (9)_

## Data Source

- Neighborhood: database
- Reports loaded: 15
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

