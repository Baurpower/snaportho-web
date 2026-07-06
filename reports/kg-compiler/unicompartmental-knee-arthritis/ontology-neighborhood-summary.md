# Ontology Compiler — Unicompartmental Knee Arthritis

Generated: 2026-07-05T23:20:51.699Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 1 |
| Relationships | 0 |
| Claims (draft) | 2 |
| Decision points (draft) | 0 |
| Ontology gaps | 23 |
| Work items | 10 |
| Proposals reviewed | 85 |
| Auto-approved | 72 (84.7%) |
| Human review queue | 13 (15.3%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 1 entities from canonical DB for Unicompartmental Knee Arthritis.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 23 gaps across 5 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 10 work items for 10 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 10/10 agents; 85 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 64 entities, 7 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 84.7% auto-approved; 15.3% escalated.
- **Stage 8 — Human Review Packet** (completed): 13 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Clinical Entity Builder
- Relationship Builder
- Claim Builder
- Decision Point Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[critical]** missing_entity: Unicompartmental Knee Arthritis neighborhood has 0/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[high]** missing_entity: Unicompartmental Knee Arthritis neighborhood has 0/1 classification_system entities. _(rule: condition.classification.system, reviewer: curator)_
- **[high]** missing_entity: Unicompartmental Knee Arthritis neighborhood has 0/1 imaging_finding entities. _(rule: condition.imaging.finding, reviewer: curator)_
- **[medium]** missing_entity: Unicompartmental Knee Arthritis neighborhood has 0/1 complication entities. _(rule: condition.complication, reviewer: none)_
- **[critical]** missing_relationship: Unicompartmental Knee Arthritis missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: Unicompartmental Knee Arthritis missing outbound involves_anatomy (0/1). _(rule: condition.pred.involves_anatomy, reviewer: curator)_
- **[high]** missing_relationship: Unicompartmental Knee Arthritis missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_relationship: Unicompartmental Knee Arthritis missing outbound has_classification (0/1). _(rule: condition.pred.has_classification, reviewer: clinical_expert)_
- **[high]** missing_relationship: Unicompartmental Knee Arthritis missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[critical]** missing_relationship: Unicompartmental Knee Arthritis missing outbound has_imaging_finding (0/1). _(rule: condition.pred.has_imaging_finding, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Unicompartmental Knee Arthritis missing outbound has_complication (0/1). _(rule: condition.pred.has_complication, reviewer: none)_
- **[high]** missing_relationship: Unicompartmental Knee Arthritis missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_

## Publication blockers

- 13 proposals still awaiting human review
- 11 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 15 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 72 |
| SAFE_REVIEW | 2 |
| EXPERT_REVIEW | 11 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

