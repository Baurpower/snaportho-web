# ANKLE FRACTURE — Knowledge Factory Audit

Generated: 2026-07-16T03:52:51.974Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **87** |
| Ontology Completeness | 54 |
| Evidence Quality | 85 |
| Graph Integrity | 96 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 92 |
| Claim Quality | 84 |
| Decision Points | 77 |
| Metadata Quality | 90 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 84 |
| Educational Quality | 92 |
| Cross-Neighborhood Consistency | 100 |
| Publication Readiness | 45 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 22 proposals still awaiting human review
- 16 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 10 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 3 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-dp-10, gap-dp-pattern-11, gap-dp-pattern-12
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/58 proposals have evidence_refs
- **Reason:** Every proposal should cite supporting evidence per factory contract.
- **Impact:** -15
- **Fix:** Ensure claim/relationship builders attach evidence_refs from the evidence packet.

### [CRITICAL] Missing decision point pattern: emergency_escalation

- **Evidence:** 0 decision points with pattern emergency_escalation
- **Reason:** Fracture neighborhoods require branching operative vs nonoperative pathways.
- **Impact:** -15
- **Fix:** Add emergency_escalation decision point with attending-gated review.

### [CRITICAL] 10 critical/high ontology gaps remain unresolved

- **Evidence:** publication-readiness.json blockers
- **Reason:** Publication gate identified blocking condition.
- **Impact:** -15
- **Fix:** [high] Ankle ORIF missing outbound at_risk_structure (0/1).

### [HIGH] 7 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_relationship, missing_claim
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

### [HIGH] Missing relationship requirements (9)

- **Evidence:** 9 gaps of kind missing_relationship
- **Reason:** Ontology contract requires complete relationship coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_relationship.

### [HIGH] Missing claim requirements (9)

- **Evidence:** 9 gaps of kind missing_claim
- **Reason:** Ontology contract requires complete claim coverage.
- **Impact:** -8
- **Fix:** Run the matching builder agent for missing_claim.

### [HIGH] 8 high-risk relationships lack approved review status

- **Evidence:** Predicates: at_risk_structure, treated_by, uses_fixation, explains_instability, indicates_treatment
- **Reason:** High-risk predicates require human review before publication.
- **Impact:** -8
- **Fix:** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _3 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
4. **[Publication Readiness]** [high] Ankle ORIF missing outbound at_risk_structure (0/1). — _10 critical/high ontology gaps remain unresolved_
5. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _7 high-priority ontology gaps_
6. **[Ontology Completeness]** Run the matching builder agent for missing_relationship. — _Missing relationship requirements (9)_
7. **[Ontology Completeness]** Run the matching builder agent for missing_claim. — _Missing claim requirements (9)_
8. **[Relationship Quality]** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review. — _8 high-risk relationships lack approved review status_
9. **[Claim Quality]** Route claims through human review queue before publication. — _All claims remain generated_draft_
10. **[Claim Quality]** Attach evidence_refs from evidence packet to each claim proposal. — _Insufficient evidence support on claim proposals_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 12
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

