# Ontology Compiler — Osteochondral Lesion of the Talus

Generated: 2026-07-05T23:23:00.718Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 6 |
| Relationships | 0 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 8 |
| Work items | 8 |
| Proposals reviewed | 96 |
| Auto-approved | 80 (83.3%) |
| Human review queue | 15 (16.7%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 6 entities from canonical DB for Osteochondral Lesion of the Talus.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 8 gaps across 3 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 8 work items for 8 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 8/8 agents; 96 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 43 entities, 43 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 83.3% auto-approved; 16.7% escalated.
- **Stage 8 — Human Review Packet** (completed): 15 items in human queue.
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

- **[high]** missing_entity: Osteochondral Lesion of the Talus Classification neighborhood has 0/2 classification_grade entities. _(rule: classification.grades, reviewer: curator)_
- **[high]** missing_relationship: Osteochondral Lesion of the Talus Classification missing inbound has_classification (0/1). _(rule: classification.pred.has_classification_inbound, reviewer: curator)_
- **[critical]** missing_entity: Osteochondral Lesion of the Talus Reconstruction neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: Osteochondral Lesion of the Talus Reconstruction missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: Osteochondral Lesion of the Talus Reconstruction missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_asset_link: 4 Anki mappings exist but no card link proposals in neighborhood. _(rule: neighborhood.assets.cards, reviewer: curator)_
- **[medium]** missing_asset_link: 12 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_
- **[medium]** missing_relationship: Procedure Osteochondral Lesion of the Talus Reconstruction missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_

## Publication blockers

- 16 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 5 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 80 |
| SAFE_REVIEW | 7 |
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

