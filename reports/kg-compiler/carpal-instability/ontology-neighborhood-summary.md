# Ontology Compiler — Carpal Instability

Generated: 2026-07-05T23:34:38.858Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 3 |
| Relationships | 0 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 4 |
| Work items | 8 |
| Proposals reviewed | 177 |
| Auto-approved | 166 (93.8%) |
| Human review queue | 11 (6.2%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 3 entities from canonical DB for Carpal Instability.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 4 gaps across 3 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 8 work items for 8 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 8/8 agents; 177 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 74 entities, 94 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 93.8% auto-approved; 6.2% escalated.
- **Stage 8 — Human Review Packet** (completed): 11 items in human queue.
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

- **[high]** missing_entity: Carpal Instability Classification neighborhood has 0/2 classification_grade entities. _(rule: classification.grades, reviewer: curator)_
- **[high]** missing_relationship: Carpal Instability Classification missing inbound has_classification (0/1). _(rule: classification.pred.has_classification_inbound, reviewer: curator)_
- **[medium]** missing_asset_link: 3 Anki mappings exist but no card link proposals in neighborhood. _(rule: neighborhood.assets.cards, reviewer: curator)_
- **[medium]** missing_asset_link: 24 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_

## Publication blockers

- 11 proposals still awaiting human review
- 4 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 2 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 166 |
| SAFE_REVIEW | 7 |
| EXPERT_REVIEW | 4 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

