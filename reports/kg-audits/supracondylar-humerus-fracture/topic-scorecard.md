# SUPRACONDYLAR HUMERUS FRACTURE — Knowledge Factory Audit

Generated: 2026-07-05T22:23:10.244Z
Auditor: KF-018 v1.0.0

## Overall

| Metric | Score |
|--------|------:|
| **Overall** | **87** |
| Ontology Completeness | 58 |
| Evidence Quality | 85 |
| Graph Integrity | 92 |
| Shared Knowledge Reuse | 98 |
| Relationship Quality | 92 |
| Claim Quality | 84 |
| Decision Points | 77 |
| Metadata Quality | 92 |
| Provenance Quality | 100 |
| Review Calibration | 100 |
| Agent Performance | 92 |
| Compiler Quality | 85 |
| Educational Quality | 92 |
| Cross-Neighborhood Consistency | 92 |
| Publication Readiness | 45 |
| Publication | Blocked |

## Publication

- Status: **NOT_READY**
- Maturity: 5 / 7

### Blockers

- 22 proposals still awaiting human review
- 14 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 10 critical/high ontology gaps remain unresolved

## Top Findings

### [CRITICAL] 3 critical ontology gaps remain

- **Evidence:** ontology-gap-report.json: gap-dp-11, gap-dp-pattern-12, gap-dp-pattern-13
- **Reason:** Required entities, relationships, claims, or decision points are missing per CKO §8–§9.
- **Impact:** -15
- **Fix:** Resolve critical gaps via assigned factory agents before publication review.

### [CRITICAL] Low evidence coverage (0% of proposals cite evidence)

- **Evidence:** 0/78 proposals have evidence_refs
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
- **Fix:** [high] Gartland Classification neighborhood has 0/2 classification_grade entities.

### [HIGH] 7 high-priority ontology gaps

- **Evidence:** Gap kinds: missing_entity, missing_relationship, missing_claim
- **Reason:** High-priority gaps block maturity level advancement.
- **Impact:** -12
- **Fix:** Schedule gap-resolution work items from ontology-work-plan.json.

### [HIGH] 1 merge conflicts detected

- **Evidence:** conflict-report.json: Conflicting DP pattern supracondylar-humerus-fracture|operative_indication: dp-sc-pulseless-vascular vs dp-sc-urgent-pinning
- **Reason:** Unresolved merge conflicts indicate inconsistent agent outputs.
- **Impact:** -8
- **Fix:** Run conflict-resolver agent and reconcile metadata/text conflicts.

### [HIGH] 7 high-risk relationships lack approved review status

- **Evidence:** Predicates: indicates_treatment, at_risk_structure, treated_by
- **Reason:** High-risk predicates require human review before publication.
- **Impact:** -8
- **Fix:** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review.

### [HIGH] All claims remain generated_draft

- **Evidence:** 16/16 claims are unreviewed drafts
- **Reason:** Draft claims cannot be consumed as verified educational content.
- **Impact:** -8
- **Fix:** Route claims through human review queue before publication.

## Prioritized Recommendations

1. **[Ontology Completeness]** Resolve critical gaps via assigned factory agents before publication review. — _3 critical ontology gaps remain_
2. **[Evidence Quality]** Ensure claim/relationship builders attach evidence_refs from the evidence packet. — _Low evidence coverage (0% of proposals cite evidence)_
3. **[Decision Points]** Add emergency_escalation decision point with attending-gated review. — _Missing decision point pattern: emergency_escalation_
4. **[Publication Readiness]** [high] Gartland Classification neighborhood has 0/2 classification_grade entities. — _10 critical/high ontology gaps remain unresolved_
5. **[Ontology Completeness]** Schedule gap-resolution work items from ontology-work-plan.json. — _7 high-priority ontology gaps_
6. **[Graph Integrity]** Run conflict-resolver agent and reconcile metadata/text conflicts. — _1 merge conflicts detected_
7. **[Relationship Quality]** Route at_risk_structure, treated_by, and indicates_treatment edges to attending review. — _7 high-risk relationships lack approved review status_
8. **[Claim Quality]** Route claims through human review queue before publication. — _All claims remain generated_draft_
9. **[Claim Quality]** Attach evidence_refs from evidence packet to each claim proposal. — _Insufficient evidence support on claim proposals_
10. **[Decision Points]** Add nonoperative_eligible decision point with attending-gated review. — _Missing decision point pattern: nonoperative_eligible_

## Data Source

- Neighborhood: merged_draft
- Reports loaded: 12
- Reports missing: none

## Constraints

- Database modified: **no**
- Content generated: **no**
- Auto-approved: **no**

