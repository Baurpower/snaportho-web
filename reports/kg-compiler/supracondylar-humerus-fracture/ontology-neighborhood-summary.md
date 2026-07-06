# Ontology Compiler — Supracondylar Humerus Fracture

Generated: 2026-07-05T21:58:33.991Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 27 |
| Relationships | 33 |
| Claims (draft) | 4 |
| Decision points (draft) | 0 |
| Ontology gaps | 18 |
| Work items | 11 |
| Proposals reviewed | 86 |
| Auto-approved | 64 (74.4%) |
| Human review queue | 17 (25.6%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 27 entities from canonical DB for Supracondylar Humerus Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 18 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 86 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 28 entities, 41 relationships; 1 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 74.4% auto-approved; 25.6% escalated.
- **Stage 8 — Human Review Packet** (completed): 17 items in human queue.
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

- **[high]** missing_entity: Gartland Classification neighborhood has 0/2 classification_grade entities. _(rule: classification.grades, reviewer: curator)_
- **[high]** missing_relationship: Upper Extremity Trauma Anatomy Hub missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Supracondylar Humerus Fracture missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[high]** missing_relationship: Supracondylar Humerus Fracture missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[high]** missing_relationship: Supracondylar Humerus Fracture missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_claim: Supracondylar Humerus Fracture has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_
- **[medium]** missing_claim: Supracondylar Humerus Fracture missing claim type: fact. _(rule: condition.claims.l1.fact, reviewer: none)_
- **[medium]** missing_claim: Supracondylar Humerus Fracture missing claim type: board_trap. _(rule: condition.claims.l1.board_trap, reviewer: none)_
- **[medium]** missing_claim: Supracondylar Humerus Fracture missing claim type: imaging_point. _(rule: condition.claims.l1.imaging_point, reviewer: none)_
- **[medium]** missing_claim: Supracondylar Humerus Fracture missing claim type: cognitive_trap. _(rule: condition.claims.l1.cognitive_trap, reviewer: none)_
- **[critical]** missing_decision_point: Supracondylar Humerus Fracture has 0/1 decision points. _(rule: condition.dp.management, reviewer: attending)_
- **[critical]** missing_decision_point: Supracondylar Humerus Fracture missing decision point pattern: operative_indication. _(rule: condition.dp.management.operative_indication, reviewer: attending)_

## Publication blockers

- 22 proposals still awaiting human review
- 14 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 10 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 64 |
| SAFE_REVIEW | 8 |
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

