# FEMORAL NECK FRACTURE — Knowledge Factory Audit

Generated: 2026-07-05T22:23:10.235Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **84** |
| Ontology Completeness | 38 |
| Evidence Quality | 85 |
| Graph Integrity | 77 |
| Shared Knowledge Reuse | 100 |
| Relationship Quality | 92 |
| Claim Quality | 84 |
| Decision Points | 77 |
| Metadata Quality | 90 |
| Provenance Quality | 100 |
| Review Calibration | 92 |
| Agent Performance | 92 |
| Compiler Quality | 80 |
| Educational Quality | 96 |
| Cross-Neighborhood Consistency | 92 |
| Publication Readiness | 7 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 21 proposals still awaiting human review
- 12 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 18 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 9 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-entity-neighbor-1, gap-rel-2, gap-dp-13
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Only 0 anatomy structures (minimum 3 required)

- **Evidence:** Entity slugs: 
- **Reason:** Condition neighborhoods require regional anatomy per condition.anatomy.min_structures.
- **Impact:** -15
- **Fix:** Add essential regional anatomy via anatomy builder or shared anatomy reuse.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/34 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] 8 dangling edges reference missing entities

- **Evidence:** femoral-neck-fracture -[at_risk_structure]-> medial-femoral-circumflex-artery; femoral-neck-fracture -[injured_in]-> femoral-neck; femoral-neck-fracture -[involves_anatomy]-> calcar
- **Reason:** Relationships must resolve to entities in the neighborhood graph.
- **Impact:** -15
- **Fix:** Create missing entities or remove invalid relationship proposals.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 18 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [critical] Femoral Neck Fracture neighborhood has 0/3 anatomy_structure entities.

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

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _9 critical ontology gaps remain_
2. **[Ontology Completeness]** Add essential regional anatomy via anatomy builder or shared anatomy reuse. — _Only 0 anatomy structures (minimum 3 required)_
3. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
4. **[Graph Integrity]** Create missing entities or remove invalid relationship proposals. — _8 dangling edges reference missing entities_
5. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
6. **[Publication Readiness]** [critical] Femoral Neck Fracture neighborhood has 0/3 anatomy_structure entities. — _18 critical/high ontology gaps remain unresolved_
7. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _9 high-priority ontology gaps_
8. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (12)_
9. **[Graph Integrity]** Run conflict-resolver agent and reconcile metadata/text conflicts. — _1 merge conflicts detected_
10. **[Relationship Quality]** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review. — _5 high-risk relationships lack approved review status_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 12
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

