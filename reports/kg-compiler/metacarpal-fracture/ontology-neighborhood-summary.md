# Ontology Compiler — Metacarpal Fracture

Generated: 2026-07-05T23:48:45.275Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 7 |
| Relationships | 1 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 22 |
| Work items | 11 |
| Proposals reviewed | 180 |
| Auto-approved | 168 (93.3%) |
| Human review queue | 12 (6.7%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 7 entities from canonical DB for Metacarpal Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 22 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 180 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 74 entities, 96 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 93.3% auto-approved; 6.7% escalated.
- **Stage 8 — Human Review Packet** (completed): 12 items in human queue.
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

- **[critical]** missing_entity: Metacarpal Fracture neighborhood has 0/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[high]** missing_entity: Metacarpal Fracture neighborhood has 0/1 classification_system entities. _(rule: condition.classification.system, reviewer: curator)_
- **[medium]** missing_entity: Metacarpal Fracture neighborhood has 0/1 complication entities. _(rule: condition.complication, reviewer: none)_
- **[critical]** missing_relationship: Metacarpal Fracture missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: Metacarpal Fracture missing outbound involves_anatomy (0/1). _(rule: condition.pred.involves_anatomy, reviewer: curator)_
- **[high]** missing_relationship: Metacarpal Fracture missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_relationship: Metacarpal Fracture missing outbound has_classification (0/1). _(rule: condition.pred.has_classification, reviewer: clinical_expert)_
- **[high]** missing_relationship: Metacarpal Fracture missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[medium]** missing_relationship: Metacarpal Fracture missing outbound has_complication (0/1). _(rule: condition.pred.has_complication, reviewer: none)_
- **[high]** missing_relationship: Metacarpal Fracture missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_relationship: Metacarpal Fracture missing inbound prerequisite_for (0/1). _(rule: condition.pred.prerequisite_for_inbound, reviewer: curator)_
- **[high]** missing_claim: Metacarpal Fracture has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_

## Publication blockers

- 12 proposals still awaiting human review
- 5 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 13 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 168 |
| SAFE_REVIEW | 7 |
| EXPERT_REVIEW | 5 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

