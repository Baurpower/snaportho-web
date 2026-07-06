# Ontology Compiler — Ulnar Styloid Fracture

Generated: 2026-07-05T22:50:59.845Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 2 |
| Relationships | 0 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 1 |
| Work items | 6 |
| Proposals reviewed | 172 |
| Auto-approved | 161 (93.6%) |
| Human review queue | 11 (6.4%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 2 entities from canonical DB for Ulnar Styloid Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 1 gaps across 1 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 6 work items for 6 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 6/6 agents; 172 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 71 entities, 91 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 93.6% auto-approved; 6.4% escalated.
- **Stage 8 — Human Review Packet** (completed): 11 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[medium]** missing_asset_link: 8 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_

## Publication blockers

- 11 proposals still awaiting human review
- 5 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 161 |
| SAFE_REVIEW | 6 |
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

