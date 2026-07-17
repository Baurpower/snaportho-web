# PROXIMAL HUMERUS FRACTURE — Knowledge Factory Audit

Generated: 2026-07-16T03:40:16.722Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **83** |
| Ontology Completeness | 53 |
| Evidence Quality | 85 |
| Graph Integrity | 88 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 84 |
| Claim Quality | 85 |
| Decision Points | 85 |
| Metadata Quality | 88 |
| Provenance Quality | 96 |
| Review Calibration | 92 |
| Agent Performance | 92 |
| Compiler Quality | 82 |
| Educational Quality | 72 |
| Cross-Neighborhood Consistency | 100 |
| Publication Readiness | 15 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 19 proposals still awaiting human review
- 13 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- 18 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 9 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-1, gap-rel-2, gap-dp-13
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/63 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

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

### [CRITICAL] 18 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [critical] Proximal Humerus Fracture neighborhood has 0/3 anatomy_structure entities.

### [HIGH] 9 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship, missing_claim, missing_entity
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

### [HIGH] Missing relationship requirements (12)

- **Evidence:** 12 gaps of kind missing_relationship
- **Reason:** Ontology contract requires complete relationship coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_relationship.

### [HIGH] 1 merge conflicts detected

- **Evidence:** conflict-report.json: Conflicting DP pattern proximal-humerus-fracture|operative_indication: dp-ph-hemiarthroplasty vs dp-ph-operative-orif
- **Reason:** Unresolved merge conflicts indicate inconsistent agent outputs.
- **Impact:** -8
- **Fix:** Run conflict-resolver agent and reconcile metadata/text conflicts.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _9 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Claim Quality]** Run claim-builder agent to generate evidence-backed atomic claims. — _No educational claims in neighborhood_
4. **[Decision Points]** Run decision-point-builder for operative_indication and nonoperative_eligible patterns. — _No decision points in neighborhood_
5. **[Publication Readiness]** [critical] Proximal Humerus Fracture neighborhood has 0/3 anatomy_structure entities. — _18 critical/high ontology gaps remain unresolved_
6. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _9 high-priority ontology gaps_
7. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (12)_
8. **[Graph Integrity]** Run conflict-resolver agent and reconcile metadata/text conflicts. — _1 merge conflicts detected_
9. **[Relationship Quality]** Add at_risk_structure relationship via relationship-builder agent. — _Missing clinical edge: at_risk_structure_
10. **[Relationship Quality]** Add treated_by relationship via relationship-builder agent. — _Missing clinical edge: treated_by_

## Data Source

- Neighborhood: database
- Reports loaded: 15
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

