# Ontology Compiler — Femoral Neck Fracture (Adult Recon Perspective)

Generated: 2026-07-05T22:46:59.363Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 24 |
| Relationships | 3 |
| Claims (draft) | 2 |
| Decision points (draft) | 0 |
| Ontology gaps | 38 |
| Work items | 10 |
| Proposals reviewed | 78 |
| Auto-approved | 63 (80.8%) |
| Human review queue | 15 (19.2%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 24 entities from canonical DB for Femoral Neck Fracture (Adult Recon Perspective).
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 38 gaps across 5 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 10 work items for 10 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 10/10 agents; 78 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 55 entities, 8 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 80.8% auto-approved; 19.2% escalated.
- **Stage 8 — Human Review Packet** (completed): 15 items in human queue.
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

- **[high]** missing_relationship: Patellar Tendon missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Gluteus Minimus missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Femoral Nerve missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Femur missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[medium]** missing_relationship: Arthroplasty Implant Concepts Hub missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[high]** missing_relationship: Proximal Femur missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Hip Capsule missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[critical]** missing_entity: Femoral Neck Fracture (Adult Recon) neighborhood has 1/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[high]** missing_entity: Femoral Neck Fracture (Adult Recon) neighborhood has 0/1 classification_system entities. _(rule: condition.classification.system, reviewer: curator)_

## Publication blockers

- 15 proposals still awaiting human review
- 13 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 25 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 63 |
| SAFE_REVIEW | 2 |
| EXPERT_REVIEW | 13 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

