# Ontology Compiler — Patellofemoral Arthroplasty

Generated: 2026-07-16T02:53:50.268Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 7 |
| Relationships | 9 |
| Claims (draft) | 6 |
| Decision points (draft) | 0 |
| Ontology gaps | 17 |
| Work items | 9 |
| Proposals reviewed | 83 |
| Auto-approved | 75 (90.4%) |
| Human review queue | 5 (9.6%) |
| Maturity | Level 5 / 6 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 7 entities from canonical DB for Patellofemoral Arthroplasty.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 17 gaps across 4 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 9 work items for 9 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 9/9 agents; 83 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 63 entities, 9 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 90.4% auto-approved; 9.6% escalated.
- **Stage 8 — Human Review Packet** (completed): 5 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/6; ready=false.

## Required agents

- Relationship Builder
- Claim Builder
- Metadata Builder
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
- **[high]** missing_relationship: Patella missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Patellofemoral Arthroplasty missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_metadata: 2 context_relevance gaps on Patellofemoral Arthroplasty involves_anatomy/at_risk_structure edges. _(rule: procedure.meta.context, reviewer: none)_
- **[medium]** missing_relationship: Patellofemoral Tracking missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Patellofemoral Tracking has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Patellofemoral Tracking missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Patellofemoral Tracking missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_

## Publication blockers

- 8 proposals still awaiting human review
- 3 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 3 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 75 |
| SAFE_REVIEW | 5 |
| EXPERT_REVIEW | 3 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

