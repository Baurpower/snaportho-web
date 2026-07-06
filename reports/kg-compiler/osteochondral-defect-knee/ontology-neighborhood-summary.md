# Ontology Compiler — Osteochondral Defect of the Knee

Generated: 2026-07-05T22:51:23.022Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 6 |
| Relationships | 0 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 8 |
| Work items | 8 |
| Proposals reviewed | 91 |
| Auto-approved | 76 (83.5%) |
| Human review queue | 14 (16.5%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 6 entities from canonical DB for Osteochondral Defect of the Knee.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 8 gaps across 3 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 8 work items for 8 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 8/8 agents; 91 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 39 entities, 42 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 83.5% auto-approved; 16.5% escalated.
- **Stage 8 — Human Review Packet** (completed): 14 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Clinical Entity Builder
- Relationship Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_entity: Osteochondral Defect of the Knee Classification neighborhood has 0/2 classification_grade entities. _(rule: classification.grades, reviewer: curator)_
- **[high]** missing_relationship: Osteochondral Defect of the Knee Classification missing inbound has_classification (0/1). _(rule: classification.pred.has_classification_inbound, reviewer: curator)_
- **[critical]** missing_entity: Osteochondral Defect of the Knee Reconstruction neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: Osteochondral Defect of the Knee Reconstruction missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: Osteochondral Defect of the Knee Reconstruction missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_asset_link: 5 Anki mappings exist but no card link proposals in neighborhood. _(rule: neighborhood.assets.cards, reviewer: curator)_
- **[medium]** missing_asset_link: 14 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_
- **[medium]** missing_relationship: Procedure Osteochondral Defect of the Knee Reconstruction missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_

## Publication blockers

- 15 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 5 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 76 |
| SAFE_REVIEW | 6 |
| EXPERT_REVIEW | 9 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

