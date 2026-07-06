# Ontology Compiler — Ankle Fracture

Generated: 2026-07-05T21:09:23.371Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 19 |
| Relationships | 21 |
| Claims (draft) | 1 |
| Decision points (draft) | 0 |
| Ontology gaps | 25 |
| Work items | 10 |
| Proposals reviewed | 67 |
| Auto-approved | 45 (67.2%) |
| Human review queue | 19 (32.8%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 19 entities from canonical DB for Ankle Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 25 gaps across 5 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 10 work items for 10 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 10/10 agents; 67 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 19 entities, 29 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 67.2% auto-approved; 32.8% escalated.
- **Stage 8 — Human Review Packet** (completed): 19 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Metadata Builder
- Claim Builder
- Decision Point Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Ankle ORIF missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_metadata: 1 context_relevance gaps on Ankle ORIF involves_anatomy/at_risk_structure edges. _(rule: procedure.meta.context, reviewer: none)_
- **[high]** missing_relationship: Ankle Fracture missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[high]** missing_relationship: Ankle Fracture missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_claim: Ankle Fracture has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_
- **[medium]** missing_claim: Ankle Fracture missing claim type: fact. _(rule: condition.claims.l1.fact, reviewer: none)_
- **[medium]** missing_claim: Ankle Fracture missing claim type: board_trap. _(rule: condition.claims.l1.board_trap, reviewer: none)_
- **[medium]** missing_claim: Ankle Fracture missing claim type: imaging_point. _(rule: condition.claims.l1.imaging_point, reviewer: none)_
- **[medium]** missing_claim: Ankle Fracture missing claim type: cognitive_trap. _(rule: condition.claims.l1.cognitive_trap, reviewer: none)_
- **[critical]** missing_decision_point: Ankle Fracture has 0/1 decision points. _(rule: condition.dp.management, reviewer: attending)_
- **[critical]** missing_decision_point: Ankle Fracture missing decision point pattern: operative_indication. _(rule: condition.dp.management.operative_indication, reviewer: attending)_
- **[critical]** missing_decision_point: Ankle Fracture missing decision point pattern: nonoperative_eligible. _(rule: condition.dp.management.nonoperative_eligible, reviewer: attending)_

## Publication blockers

- 22 proposals still awaiting human review
- 16 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 10 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 45 |
| SAFE_REVIEW | 6 |
| EXPERT_REVIEW | 16 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

