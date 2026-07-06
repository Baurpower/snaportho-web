# Ontology Compiler — Acetabular Fracture

Generated: 2026-07-05T22:33:19.279Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 26 |
| Relationships | 31 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 19 |
| Work items | 11 |
| Proposals reviewed | 101 |
| Auto-approved | 84 (83.2%) |
| Human review queue | 13 (16.8%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 26 entities from canonical DB for Acetabular Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 19 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 101 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 37 entities, 48 relationships; 1 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 83.2% auto-approved; 16.8% escalated.
- **Stage 8 — Human Review Packet** (completed): 13 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Claim Builder
- Decision Point Builder
- Metadata Builder
- Clinical Entity Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Lower Extremity Trauma Anatomy Hub missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Acetabular Fracture missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[high]** missing_relationship: Acetabular Fracture missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[high]** missing_relationship: Acetabular Fracture missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_claim: Acetabular Fracture has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_
- **[medium]** missing_claim: Acetabular Fracture missing claim type: fact. _(rule: condition.claims.l1.fact, reviewer: none)_
- **[medium]** missing_claim: Acetabular Fracture missing claim type: board_trap. _(rule: condition.claims.l1.board_trap, reviewer: none)_
- **[medium]** missing_claim: Acetabular Fracture missing claim type: imaging_point. _(rule: condition.claims.l1.imaging_point, reviewer: none)_
- **[medium]** missing_claim: Acetabular Fracture missing claim type: cognitive_trap. _(rule: condition.claims.l1.cognitive_trap, reviewer: none)_
- **[critical]** missing_decision_point: Acetabular Fracture has 0/1 decision points. _(rule: condition.dp.management, reviewer: attending)_
- **[critical]** missing_decision_point: Acetabular Fracture missing decision point pattern: operative_indication. _(rule: condition.dp.management.operative_indication, reviewer: attending)_
- **[critical]** missing_decision_point: Acetabular Fracture missing decision point pattern: nonoperative_eligible. _(rule: condition.dp.management.nonoperative_eligible, reviewer: attending)_

## Publication blockers

- 17 proposals still awaiting human review
- 10 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 10 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 84 |
| SAFE_REVIEW | 7 |
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

