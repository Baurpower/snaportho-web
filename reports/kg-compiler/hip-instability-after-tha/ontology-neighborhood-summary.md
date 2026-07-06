# Ontology Compiler — Hip Instability After THA

Generated: 2026-07-05T22:55:55.498Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 3 |
| Relationships | 1 |
| Claims (draft) | 2 |
| Decision points (draft) | 0 |
| Ontology gaps | 27 |
| Work items | 11 |
| Proposals reviewed | 86 |
| Auto-approved | 76 (88.4%) |
| Human review queue | 8 (11.6%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 3 entities from canonical DB for Hip Instability After THA.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 27 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 86 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 64 entities, 7 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 88.4% auto-approved; 11.6% escalated.
- **Stage 8 — Human Review Packet** (completed): 8 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Claim Builder
- Clinical Entity Builder
- Decision Point Builder
- Metadata Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[medium]** missing_relationship: Hip Center of Rotation missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Hip Center of Rotation has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Hip Center of Rotation missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Hip Center of Rotation missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[critical]** missing_entity: Hip Instability After THA neighborhood has 0/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[high]** missing_entity: Hip Instability After THA neighborhood has 0/1 classification_system entities. _(rule: condition.classification.system, reviewer: curator)_
- **[medium]** missing_entity: Hip Instability After THA neighborhood has 0/1 complication entities. _(rule: condition.complication, reviewer: none)_
- **[critical]** missing_relationship: Hip Instability After THA missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: Hip Instability After THA missing outbound involves_anatomy (0/1). _(rule: condition.pred.involves_anatomy, reviewer: curator)_
- **[high]** missing_relationship: Hip Instability After THA missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_relationship: Hip Instability After THA missing outbound has_classification (0/1). _(rule: condition.pred.has_classification, reviewer: clinical_expert)_
- **[high]** missing_relationship: Hip Instability After THA missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_

## Publication blockers

- 10 proposals still awaiting human review
- 5 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 13 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 76 |
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

