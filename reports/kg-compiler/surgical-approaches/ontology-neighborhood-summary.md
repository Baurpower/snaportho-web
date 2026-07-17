# Ontology Compiler — Surgical Approaches

Generated: 2026-07-09T04:26:52.476Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 183 |
| Relationships | 927 |
| Claims (draft) | 28 |
| Decision points (draft) | 16 |
| Ontology gaps | 1 |
| Work items | 6 |
| Proposals reviewed | 1155 |
| Auto-approved | 1111 (96.2%) |
| Human review queue | 44 (3.8%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 183 entities for Surgical Approaches.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 1 gaps across 1 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 6 work items for 6 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 6/6 agents; 1155 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 183 entities, 927 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 96.2% auto-approved; 3.8% escalated.
- **Stage 8 — Human Review Packet** (completed): 44 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Orthopaedic Anatomy missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_

## Publication blockers

- 44 proposals still awaiting human review
- 44 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 1 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 1111 |
| SAFE_REVIEW | 0 |
| EXPERT_REVIEW | 44 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

