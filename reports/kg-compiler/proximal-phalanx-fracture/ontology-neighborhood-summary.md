# Ontology Compiler — Proximal Phalanx Fracture

Generated: 2026-07-06T00:10:41.570Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 5 |
| Relationships | 1 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 21 |
| Work items | 11 |
| Proposals reviewed | 172 |
| Auto-approved | 162 (94.2%) |
| Human review queue | 10 (5.8%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 5 entities from canonical DB for Proximal Phalanx Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 21 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 172 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 72 entities, 90 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 94.2% auto-approved; 5.8% escalated.
- **Stage 8 — Human Review Packet** (completed): 10 items in human queue.
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

- **[critical]** missing_entity: Proximal Phalanx Fracture neighborhood has 0/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[high]** missing_entity: Proximal Phalanx Fracture neighborhood has 0/1 classification_system entities. _(rule: condition.classification.system, reviewer: curator)_
- **[medium]** missing_entity: Proximal Phalanx Fracture neighborhood has 0/1 complication entities. _(rule: condition.complication, reviewer: none)_
- **[critical]** missing_relationship: Proximal Phalanx Fracture missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: Proximal Phalanx Fracture missing outbound involves_anatomy (0/1). _(rule: condition.pred.involves_anatomy, reviewer: curator)_
- **[high]** missing_relationship: Proximal Phalanx Fracture missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_relationship: Proximal Phalanx Fracture missing outbound has_classification (0/1). _(rule: condition.pred.has_classification, reviewer: clinical_expert)_
- **[high]** missing_relationship: Proximal Phalanx Fracture missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[medium]** missing_relationship: Proximal Phalanx Fracture missing outbound has_complication (0/1). _(rule: condition.pred.has_complication, reviewer: none)_
- **[high]** missing_relationship: Proximal Phalanx Fracture missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_relationship: Proximal Phalanx Fracture missing inbound prerequisite_for (0/1). _(rule: condition.pred.prerequisite_for_inbound, reviewer: curator)_
- **[high]** missing_claim: Proximal Phalanx Fracture has 0/3 L1 claims. _(rule: condition.claims.l1, reviewer: curator)_

## Publication blockers

- 10 proposals still awaiting human review
- 5 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 13 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 162 |
| SAFE_REVIEW | 5 |
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

