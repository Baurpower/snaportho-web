# Ontology Compiler — Aseptic Loosening of TKA

Generated: 2026-07-16T02:33:03.960Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 7 |
| Relationships | 7 |
| Claims (draft) | 2 |
| Decision points (draft) | 0 |
| Ontology gaps | 30 |
| Work items | 11 |
| Proposals reviewed | 86 |
| Auto-approved | 75 (87.2%) |
| Human review queue | 11 (12.8%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 7 entities from canonical DB for Aseptic Loosening of TKA.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 30 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 86 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 64 entities, 7 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 87.2% auto-approved; 12.8% escalated.
- **Stage 8 — Human Review Packet** (completed): 11 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Clinical Entity Builder
- Claim Builder
- Decision Point Builder
- Metadata Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Adult Reconstruction Anatomy Hub missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[critical]** missing_entity: Aseptic Loosening of TKA neighborhood has 1/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[high]** missing_entity: Aseptic Loosening of TKA neighborhood has 0/1 classification_system entities. _(rule: condition.classification.system, reviewer: curator)_
- **[medium]** missing_entity: Aseptic Loosening of TKA neighborhood has 0/1 complication entities. _(rule: condition.complication, reviewer: none)_
- **[critical]** missing_relationship: Aseptic Loosening of TKA missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: Aseptic Loosening of TKA missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_relationship: Aseptic Loosening of TKA missing outbound has_classification (0/1). _(rule: condition.pred.has_classification, reviewer: clinical_expert)_
- **[high]** missing_relationship: Aseptic Loosening of TKA missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[medium]** missing_relationship: Aseptic Loosening of TKA missing outbound has_complication (0/1). _(rule: condition.pred.has_complication, reviewer: none)_
- **[high]** missing_relationship: Aseptic Loosening of TKA missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_claim: Aseptic Loosening of TKA has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_
- **[medium]** missing_claim: Aseptic Loosening of TKA missing claim type: fact. _(rule: condition.claims.l1.fact, reviewer: none)_

## Publication blockers

- 11 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 15 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 75 |
| SAFE_REVIEW | 2 |
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

