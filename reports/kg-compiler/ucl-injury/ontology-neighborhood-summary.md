# Ontology Compiler — UCL Injury

Generated: 2026-07-05T23:07:25.519Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 8 |
| Relationships | 3 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 23 |
| Work items | 11 |
| Proposals reviewed | 95 |
| Auto-approved | 80 (84.2%) |
| Human review queue | 14 (15.8%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 8 entities from canonical DB for UCL Injury.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 23 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 95 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 45 entities, 39 relationships; 1 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 84.2% auto-approved; 15.8% escalated.
- **Stage 8 — Human Review Packet** (completed): 14 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Clinical Entity Builder
- Relationship Builder
- Claim Builder
- Decision Point Builder
- Metadata Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[critical]** missing_entity: UCL Injury neighborhood has 0/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[critical]** missing_relationship: UCL Injury missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: UCL Injury missing outbound involves_anatomy (0/1). _(rule: condition.pred.involves_anatomy, reviewer: curator)_
- **[high]** missing_relationship: UCL Injury missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[high]** missing_relationship: UCL Injury missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[high]** missing_relationship: UCL Injury missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_relationship: UCL Injury missing inbound prerequisite_for (0/1). _(rule: condition.pred.prerequisite_for_inbound, reviewer: curator)_
- **[high]** missing_claim: UCL Injury has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_
- **[medium]** missing_claim: UCL Injury missing claim type: fact. _(rule: condition.claims.l1.fact, reviewer: none)_
- **[medium]** missing_claim: UCL Injury missing claim type: board_trap. _(rule: condition.claims.l1.board_trap, reviewer: none)_
- **[medium]** missing_claim: UCL Injury missing claim type: imaging_point. _(rule: condition.claims.l1.imaging_point, reviewer: none)_
- **[medium]** missing_claim: UCL Injury missing claim type: cognitive_trap. _(rule: condition.claims.l1.cognitive_trap, reviewer: none)_

## Publication blockers

- 15 proposals still awaiting human review
- 10 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 15 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 80 |
| SAFE_REVIEW | 5 |
| EXPERT_REVIEW | 10 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

