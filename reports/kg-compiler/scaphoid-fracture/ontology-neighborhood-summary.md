# Ontology Compiler — Scaphoid Fracture

Generated: 2026-07-05T23:11:03.589Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 7 |
| Relationships | 2 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 26 |
| Work items | 11 |
| Proposals reviewed | 177 |
| Auto-approved | 163 (92.1%) |
| Human review queue | 14 (7.9%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 7 entities from canonical DB for Scaphoid Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 26 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 177 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 72 entities, 95 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 92.1% auto-approved; 7.9% escalated.
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

- **[high]** missing_entity: Scaphoid Fracture Classification neighborhood has 0/2 classification_grade entities. _(rule: classification.grades, reviewer: curator)_
- **[high]** missing_relationship: Scaphoid Fracture Classification missing inbound has_classification (0/1). _(rule: classification.pred.has_classification_inbound, reviewer: curator)_
- **[critical]** missing_entity: Scaphoid Fracture neighborhood has 0/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[high]** missing_entity: Scaphoid Fracture neighborhood has 0/1 classification_system entities. _(rule: condition.classification.system, reviewer: curator)_
- **[critical]** missing_relationship: Scaphoid Fracture missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: Scaphoid Fracture missing outbound involves_anatomy (0/1). _(rule: condition.pred.involves_anatomy, reviewer: curator)_
- **[high]** missing_relationship: Scaphoid Fracture missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_relationship: Scaphoid Fracture missing outbound has_classification (0/1). _(rule: condition.pred.has_classification, reviewer: clinical_expert)_
- **[high]** missing_relationship: Scaphoid Fracture missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[high]** missing_relationship: Scaphoid Fracture missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_relationship: Scaphoid Fracture missing inbound prerequisite_for (0/1). _(rule: condition.pred.prerequisite_for_inbound, reviewer: curator)_
- **[high]** missing_claim: Scaphoid Fracture has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_

## Publication blockers

- 14 proposals still awaiting human review
- 7 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 18 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 163 |
| SAFE_REVIEW | 7 |
| EXPERT_REVIEW | 7 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

