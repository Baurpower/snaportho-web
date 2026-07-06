# Ontology Compiler — SL Ligament Injury

Generated: 2026-07-05T23:39:10.172Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 2 |
| Relationships | 0 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 5 |
| Work items | 8 |
| Proposals reviewed | 176 |
| Auto-approved | 163 (92.6%) |
| Human review queue | 13 (7.4%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 2 entities from canonical DB for SL Ligament Injury.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 5 gaps across 3 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 8 work items for 8 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 8/8 agents; 176 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 73 entities, 93 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 92.6% auto-approved; 7.4% escalated.
- **Stage 8 — Human Review Packet** (completed): 13 items in human queue.
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

- **[critical]** missing_entity: SL Ligament Injury Operative Treatment neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: SL Ligament Injury Operative Treatment missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: SL Ligament Injury Operative Treatment missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_asset_link: 16 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_
- **[medium]** missing_relationship: Procedure SL Ligament Injury Operative Treatment missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_

## Publication blockers

- 13 proposals still awaiting human review
- 7 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 3 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 163 |
| SAFE_REVIEW | 6 |
| EXPERT_REVIEW | 7 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

