# Ontology Compiler — Implant Fixation Principles

Generated: 2026-07-16T02:41:49.409Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 9 |
| Relationships | 10 |
| Claims (draft) | 2 |
| Decision points (draft) | 0 |
| Ontology gaps | 19 |
| Work items | 9 |
| Proposals reviewed | 89 |
| Auto-approved | 81 (91%) |
| Human review queue | 8 (9%) |
| Maturity | Level 5 / 8 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 9 entities from canonical DB for Implant Fixation Principles.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 19 gaps across 4 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 9 work items for 9 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 9/9 agents; 89 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 66 entities, 10 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 91% auto-approved; 9% escalated.
- **Stage 8 — Human Review Packet** (completed): 8 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/8; ready=false.

## Required agents

- Relationship Builder
- Claim Builder
- Clinical Entity Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Adult Reconstruction Anatomy Hub missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[medium]** missing_relationship: Arthroplasty Implant Concepts Hub missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_relationship: Implant Fixation Principles missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Implant Fixation Principles has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Implant Fixation Principles missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[critical]** missing_entity: Total Hip Arthroplasty neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: Total Hip Arthroplasty missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: Total Hip Arthroplasty missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[critical]** missing_entity: Total Knee Arthroplasty neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_

## Publication blockers

- 8 proposals still awaiting human review
- 7 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 7 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 81 |
| SAFE_REVIEW | 1 |
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

