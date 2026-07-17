# Ontology Compiler — Complications

Generated: 2026-07-09T04:17:27.151Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 122 |
| Relationships | 197 |
| Claims (draft) | 24 |
| Decision points (draft) | 18 |
| Ontology gaps | 10 |
| Work items | 6 |
| Proposals reviewed | 362 |
| Auto-approved | 291 (80.4%) |
| Human review queue | 67 (19.6%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 122 entities for Complications.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 10 gaps across 1 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 6 work items for 6 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 6/6 agents; 362 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 122 entities, 197 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 80.4% auto-approved; 19.6% escalated.
- **Stage 8 — Human Review Packet** (completed): 67 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[medium]** missing_relationship: Procedure Total Hip Arthroplasty missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Total Knee Arthroplasty missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Emergent Fasciotomy missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Open Fracture Irrigation and Debridement missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Revision Total Hip Arthroplasty missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Revision Total Knee Arthroplasty missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Implant Removal missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Revision Internal Fixation missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Irrigation and Debridement missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Two-Stage Revision Arthroplasty missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_

## Publication blockers

- 71 proposals still awaiting human review
- 53 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 291 |
| SAFE_REVIEW | 18 |
| EXPERT_REVIEW | 53 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

