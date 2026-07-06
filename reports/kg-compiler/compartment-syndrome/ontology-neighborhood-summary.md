# Ontology Compiler — Compartment Syndrome

Generated: 2026-07-05T21:07:49.560Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 14 |
| Relationships | 20 |
| Claims (draft) | 1 |
| Decision points (draft) | 0 |
| Ontology gaps | 26 |
| Work items | 11 |
| Proposals reviewed | 55 |
| Auto-approved | 38 (69.1%) |
| Human review queue | 16 (30.9%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 14 entities from canonical DB for Compartment Syndrome.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 26 gaps across 6 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 11 work items for 11 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 11/11 agents; 55 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 14 entities, 22 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 69.1% auto-approved; 30.9% escalated.
- **Stage 8 — Human Review Packet** (completed): 16 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Metadata Builder
- Claim Builder
- Clinical Entity Builder
- Decision Point Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Leg Fasciotomy missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_metadata: 4 context_relevance gaps on Leg Fasciotomy involves_anatomy/at_risk_structure edges. _(rule: procedure.meta.context, reviewer: none)_
- **[medium]** missing_claim: Perfusion Pressure Concept has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Perfusion Pressure Concept missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Perfusion Pressure Concept missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[high]** missing_entity: Compartment Syndrome neighborhood has 0/1 classification_system entities. _(rule: condition.classification.system, reviewer: curator)_
- **[high]** missing_entity: Compartment Syndrome neighborhood has 0/1 imaging_finding entities. _(rule: condition.imaging.finding, reviewer: curator)_
- **[critical]** missing_relationship: Compartment Syndrome missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: Compartment Syndrome missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_relationship: Compartment Syndrome missing outbound has_classification (0/1). _(rule: condition.pred.has_classification, reviewer: clinical_expert)_
- **[high]** missing_relationship: Compartment Syndrome missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[critical]** missing_relationship: Compartment Syndrome missing outbound has_imaging_finding (0/1). _(rule: condition.pred.has_imaging_finding, reviewer: clinical_expert)_

## Publication blockers

- 17 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 14 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 38 |
| SAFE_REVIEW | 8 |
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

