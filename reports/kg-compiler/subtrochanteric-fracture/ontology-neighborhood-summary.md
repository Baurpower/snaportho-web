# Ontology Compiler — Subtrochanteric Fracture

Generated: 2026-07-05T21:38:14.701Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 17 |
| Relationships | 20 |
| Claims (draft) | 3 |
| Decision points (draft) | 0 |
| Ontology gaps | 23 |
| Work items | 11 |
| Proposals reviewed | 35 |
| Auto-approved | 16 (45.7%) |
| Human review queue | 14 (54.3%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 17 entities from canonical DB for Subtrochanteric Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 23 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 35 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 17 entities, 24 relationships; 1 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 45.7% auto-approved; 54.3% escalated.
- **Stage 8 — Human Review Packet** (completed): 14 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Clinical Entity Builder
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

- **[critical]** missing_entity: Subtrochanteric Plate Osteosynthesis neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: Subtrochanteric Plate Osteosynthesis missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: Subtrochanteric Plate Osteosynthesis missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[high]** missing_relationship: Proximal Femur Anatomy Hub missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Cephalomedullary Nailing missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_metadata: 2 context_relevance gaps on Cephalomedullary Nailing involves_anatomy/at_risk_structure edges. _(rule: procedure.meta.context, reviewer: none)_
- **[high]** missing_entity: Seinsheimer Classification neighborhood has 0/2 classification_grade entities. _(rule: classification.grades, reviewer: curator)_
- **[high]** missing_relationship: Subtrochanteric Fracture missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[high]** missing_relationship: Subtrochanteric Fracture missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[high]** missing_relationship: Subtrochanteric Fracture missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_claim: Subtrochanteric Fracture has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_
- **[medium]** missing_claim: Subtrochanteric Fracture missing claim type: fact. _(rule: condition.claims.l1.fact, reviewer: none)_

## Publication blockers

- 19 proposals still awaiting human review
- 11 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 13 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 16 |
| SAFE_REVIEW | 8 |
| EXPERT_REVIEW | 11 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

