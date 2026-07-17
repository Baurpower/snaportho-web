# Ontology Compiler — Periprosthetic Femur Fracture

Generated: 2026-07-16T02:54:04.822Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 8 |
| Relationships | 9 |
| Claims (draft) | 2 |
| Decision points (draft) | 0 |
| Ontology gaps | 31 |
| Work items | 10 |
| Proposals reviewed | 86 |
| Auto-approved | 75 (87.2%) |
| Human review queue | 9 (12.8%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 8 entities from canonical DB for Periprosthetic Femur Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 31 gaps across 5 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 10 work items for 10 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 10/10 agents; 86 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 63 entities, 9 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 87.2% auto-approved; 12.8% escalated.
- **Stage 8 — Human Review Packet** (completed): 9 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Claim Builder
- Clinical Entity Builder
- Decision Point Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Adult Reconstruction Anatomy Hub missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Femoral Diaphysis missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[medium]** missing_relationship: Arthroplasty Implant Concepts Hub missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[critical]** missing_entity: Periprosthetic Femur Fracture neighborhood has 2/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[high]** missing_entity: Periprosthetic Femur Fracture neighborhood has 0/1 imaging_finding entities. _(rule: condition.imaging.finding, reviewer: curator)_
- **[medium]** missing_entity: Periprosthetic Femur Fracture neighborhood has 0/1 complication entities. _(rule: condition.complication, reviewer: none)_
- **[critical]** missing_relationship: Periprosthetic Femur Fracture missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: Periprosthetic Femur Fracture missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[high]** missing_relationship: Periprosthetic Femur Fracture missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_

## Publication blockers

- 11 proposals still awaiting human review
- 5 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 17 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 75 |
| SAFE_REVIEW | 6 |
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

