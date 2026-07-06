# Ontology Compiler — Boxer Fracture

Generated: 2026-07-06T00:01:43.970Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 1 |
| Relationships | 0 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 1 |
| Work items | 6 |
| Proposals reviewed | 166 |
| Auto-approved | 157 (94.6%) |
| Human review queue | 9 (5.4%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 1 entities from canonical DB for Boxer Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 1 gaps across 1 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 6 work items for 6 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 6/6 agents; 166 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 70 entities, 86 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 94.6% auto-approved; 5.4% escalated.
- **Stage 8 — Human Review Packet** (completed): 9 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[medium]** missing_asset_link: 14 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_

## Publication blockers

- 9 proposals still awaiting human review
- 5 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 157 |
| SAFE_REVIEW | 4 |
| EXPERT_REVIEW | 5 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

