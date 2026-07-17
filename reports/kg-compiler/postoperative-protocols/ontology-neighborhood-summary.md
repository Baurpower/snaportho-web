# Ontology Compiler — Postoperative Protocols

Generated: 2026-07-09T04:28:59.800Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 62 |
| Relationships | 16 |
| Claims (draft) | 21 |
| Decision points (draft) | 10 |
| Ontology gaps | 16 |
| Work items | 7 |
| Proposals reviewed | 110 |
| Auto-approved | 79 (71.8%) |
| Human review queue | 31 (28.2%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 62 entities for Postoperative Protocols.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 16 gaps across 2 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 7 work items for 7 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 7/7 agents; 110 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 62 entities, 16 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 71.8% auto-approved; 28.2% escalated.
- **Stage 8 — Human Review Packet** (completed): 31 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Clinical Entity Builder
- Relationship Builder
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[critical]** missing_entity: Total Hip Arthroplasty neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: Total Hip Arthroplasty missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: Total Hip Arthroplasty missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_entity: Total Knee Arthroplasty neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: Total Knee Arthroplasty missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: Total Knee Arthroplasty missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_entity: ACL Reconstruction neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: ACL Reconstruction missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: ACL Reconstruction missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_entity: Rotator Cuff Repair neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: Rotator Cuff Repair missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: Rotator Cuff Repair missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_

## Publication blockers

- 31 proposals still awaiting human review
- 31 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 12 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 79 |
| SAFE_REVIEW | 0 |
| EXPERT_REVIEW | 31 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

