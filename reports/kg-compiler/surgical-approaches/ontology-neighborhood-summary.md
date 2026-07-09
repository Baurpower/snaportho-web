# Ontology Compiler — Surgical Approaches

Generated: 2026-07-08T21:22:54.599Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 94 |
| Relationships | 1083 |
| Claims (draft) | 65 |
| Decision points (draft) | 5 |
| Ontology gaps | 1 |
| Work items | 6 |
| Proposals reviewed | 1248 |
| Auto-approved | 1178 (94.4%) |
| Human review queue | 70 (5.6%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 94 entities for Surgical Approaches.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 1 gaps across 1 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 6 work items for 6 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 6/6 agents; 1248 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 94 entities, 1083 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 94.4% auto-approved; 5.6% escalated.
- **Stage 8 — Human Review Packet** (completed): 70 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Operative Anatomy Backbone missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_

## Publication blockers

- 70 proposals still awaiting human review
- 70 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 1 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 1178 |
| SAFE_REVIEW | 0 |
| EXPERT_REVIEW | 70 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

