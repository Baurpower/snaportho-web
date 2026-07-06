# Ontology Compiler — AC Joint Separation

Generated: 2026-07-05T23:00:02.215Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 7 |
| Relationships | 3 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 23 |
| Work items | 11 |
| Proposals reviewed | 97 |
| Auto-approved | 81 (83.5%) |
| Human review queue | 15 (16.5%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 7 entities from canonical DB for AC Joint Separation.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 23 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 97 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 45 entities, 42 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 83.5% auto-approved; 16.5% escalated.
- **Stage 8 — Human Review Packet** (completed): 15 items in human queue.
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

- **[critical]** missing_entity: AC Joint Separation neighborhood has 0/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[critical]** missing_relationship: AC Joint Separation missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: AC Joint Separation missing outbound involves_anatomy (0/1). _(rule: condition.pred.involves_anatomy, reviewer: curator)_
- **[high]** missing_relationship: AC Joint Separation missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[high]** missing_relationship: AC Joint Separation missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[high]** missing_relationship: AC Joint Separation missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_relationship: AC Joint Separation missing inbound prerequisite_for (0/1). _(rule: condition.pred.prerequisite_for_inbound, reviewer: curator)_
- **[high]** missing_claim: AC Joint Separation has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_
- **[medium]** missing_claim: AC Joint Separation missing claim type: fact. _(rule: condition.claims.l1.fact, reviewer: none)_
- **[medium]** missing_claim: AC Joint Separation missing claim type: board_trap. _(rule: condition.claims.l1.board_trap, reviewer: none)_
- **[medium]** missing_claim: AC Joint Separation missing claim type: imaging_point. _(rule: condition.claims.l1.imaging_point, reviewer: none)_
- **[medium]** missing_claim: AC Joint Separation missing claim type: cognitive_trap. _(rule: condition.claims.l1.cognitive_trap, reviewer: none)_

## Publication blockers

- 16 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 15 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 81 |
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

