# Ontology Compiler — Trauma Fundamentals

Generated: 2026-07-08T21:19:54.026Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 44 |
| Relationships | 44 |
| Claims (draft) | 18 |
| Decision points (draft) | 11 |
| Ontology gaps | 35 |
| Work items | 8 |
| Proposals reviewed | 118 |
| Auto-approved | 74 (62.7%) |
| Human review queue | 41 (37.3%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 44 entities for Trauma Fundamentals.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 35 gaps across 3 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 8 work items for 8 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 8/8 agents; 118 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 44 entities, 44 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 62.7% auto-approved; 37.3% escalated.
- **Stage 8 — Human Review Packet** (completed): 41 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Clinical Entity Builder
- Relationship Builder
- Claim Builder
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_entity: Gustilo-Anderson Classification neighborhood has 0/2 classification_grade entities. _(rule: classification.grades, reviewer: curator)_
- **[high]** missing_relationship: Open Fracture Irrigation and Debridement missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_entity: Emergent Fasciotomy neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: Emergent Fasciotomy missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: Emergent Fasciotomy missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[high]** missing_relationship: Closed Reduction missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_entity: Splint Immobilization neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: Splint Immobilization missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: Splint Immobilization missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_relationship: Fracture Stability missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Fracture Stability has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Fracture Stability missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_

## Publication blockers

- 44 proposals still awaiting human review
- 30 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 9 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 74 |
| SAFE_REVIEW | 14 |
| EXPERT_REVIEW | 30 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

