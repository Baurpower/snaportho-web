# Ontology Compiler — LT Ligament Injury

Generated: 2026-07-05T23:44:39.912Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 1 |
| Relationships | 0 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 1 |
| Work items | 6 |
| Proposals reviewed | 174 |
| Auto-approved | 164 (94.3%) |
| Human review queue | 10 (5.7%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 1 entities from canonical DB for LT Ligament Injury.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 1 gaps across 1 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 6 work items for 6 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 6/6 agents; 174 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 72 entities, 93 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 94.3% auto-approved; 5.7% escalated.
- **Stage 8 — Human Review Packet** (completed): 10 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[medium]** missing_asset_link: 12 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_

## Publication blockers

- 10 proposals still awaiting human review
- 4 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 164 |
| SAFE_REVIEW | 6 |
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

