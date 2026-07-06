# Ontology Compiler — Femoral Shaft Fracture

Generated: 2026-07-05T22:35:44.006Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 6 |
| Relationships | 3 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 24 |
| Work items | 11 |
| Proposals reviewed | 100 |
| Auto-approved | 82 (82%) |
| Human review queue | 18 (18%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 6 entities from canonical DB for Femoral Shaft Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 24 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 100 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 38 entities, 46 relationships; 1 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 82% auto-approved; 18% escalated.
- **Stage 8 — Human Review Packet** (completed): 18 items in human queue.
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

- **[critical]** missing_entity: Femoral Shaft Fracture neighborhood has 0/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[high]** missing_entity: Femoral Shaft Fracture neighborhood has 0/1 classification_system entities. _(rule: condition.classification.system, reviewer: curator)_
- **[critical]** missing_relationship: Femoral Shaft Fracture missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: Femoral Shaft Fracture missing outbound involves_anatomy (0/1). _(rule: condition.pred.involves_anatomy, reviewer: curator)_
- **[high]** missing_relationship: Femoral Shaft Fracture missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_relationship: Femoral Shaft Fracture missing outbound has_classification (0/1). _(rule: condition.pred.has_classification, reviewer: clinical_expert)_
- **[high]** missing_relationship: Femoral Shaft Fracture missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[high]** missing_relationship: Femoral Shaft Fracture missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_relationship: Femoral Shaft Fracture missing inbound prerequisite_for (0/1). _(rule: condition.pred.prerequisite_for_inbound, reviewer: curator)_
- **[high]** missing_claim: Femoral Shaft Fracture has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_
- **[medium]** missing_claim: Femoral Shaft Fracture missing claim type: fact. _(rule: condition.claims.l1.fact, reviewer: none)_
- **[medium]** missing_claim: Femoral Shaft Fracture missing claim type: board_trap. _(rule: condition.claims.l1.board_trap, reviewer: none)_

## Publication blockers

- 18 proposals still awaiting human review
- 14 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 16 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 82 |
| SAFE_REVIEW | 4 |
| EXPERT_REVIEW | 14 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

