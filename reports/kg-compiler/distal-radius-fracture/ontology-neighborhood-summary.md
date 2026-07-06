# Ontology Compiler — Distal Radius Fracture

Generated: 2026-07-05T22:43:07.746Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 18 |
| Relationships | 15 |
| Claims (draft) | 3 |
| Decision points (draft) | 0 |
| Ontology gaps | 19 |
| Work items | 11 |
| Proposals reviewed | 143 |
| Auto-approved | 115 (80.4%) |
| Human review queue | 27 (19.6%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 18 entities from canonical DB for Distal Radius Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 19 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 143 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 18 entities, 109 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 80.4% auto-approved; 19.6% escalated.
- **Stage 8 — Human Review Packet** (completed): 27 items in human queue.
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

- **[high]** missing_entity: Distal Radius Fracture neighborhood has 0/1 classification_system entities. _(rule: condition.classification.system, reviewer: curator)_
- **[high]** missing_relationship: Distal Radius Fracture missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_relationship: Distal Radius Fracture missing outbound has_classification (0/1). _(rule: condition.pred.has_classification, reviewer: clinical_expert)_
- **[high]** missing_relationship: Distal Radius Fracture missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[high]** missing_relationship: Distal Radius Fracture missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_claim: Distal Radius Fracture has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_
- **[medium]** missing_claim: Distal Radius Fracture missing claim type: fact. _(rule: condition.claims.l1.fact, reviewer: none)_
- **[medium]** missing_claim: Distal Radius Fracture missing claim type: board_trap. _(rule: condition.claims.l1.board_trap, reviewer: none)_
- **[medium]** missing_claim: Distal Radius Fracture missing claim type: imaging_point. _(rule: condition.claims.l1.imaging_point, reviewer: none)_
- **[medium]** missing_claim: Distal Radius Fracture missing claim type: cognitive_trap. _(rule: condition.claims.l1.cognitive_trap, reviewer: none)_
- **[critical]** missing_decision_point: Distal Radius Fracture has 0/1 decision points. _(rule: condition.dp.management, reviewer: attending)_
- **[critical]** missing_decision_point: Distal Radius Fracture missing decision point pattern: operative_indication. _(rule: condition.dp.management.operative_indication, reviewer: attending)_

## Publication blockers

- 28 proposals still awaiting human review
- 20 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 11 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 115 |
| SAFE_REVIEW | 8 |
| EXPERT_REVIEW | 20 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

