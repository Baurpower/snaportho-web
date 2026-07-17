# Ontology Compiler — Adverse Local Tissue Reaction (Metal Reaction)

Generated: 2026-07-16T02:31:42.966Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 8 |
| Relationships | 12 |
| Claims (draft) | 4 |
| Decision points (draft) | 0 |
| Ontology gaps | 23 |
| Work items | 10 |
| Proposals reviewed | 90 |
| Auto-approved | 80 (88.9%) |
| Human review queue | 10 (11.1%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 8 entities from canonical DB for Adverse Local Tissue Reaction (Metal Reaction).
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 23 gaps across 5 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 10 work items for 10 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 10/10 agents; 90 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 65 entities, 12 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 88.9% auto-approved; 11.1% escalated.
- **Stage 8 — Human Review Packet** (completed): 10 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Metadata Builder
- Claim Builder
- Clinical Entity Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Adult Reconstruction Anatomy Hub missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Adverse Local Tissue Reaction missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_metadata: 1 context_relevance gaps on Adverse Local Tissue Reaction involves_anatomy/at_risk_structure edges. _(rule: procedure.meta.context, reviewer: none)_
- **[medium]** missing_relationship: Bearing Surface Selection missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Bearing Surface Selection has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Bearing Surface Selection missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_relationship: Arthroplasty Implant Concepts Hub missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Arthroplasty Implant Concepts Hub missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_relationship: Metal Ion Elevation missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Metal Ion Elevation has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_

## Publication blockers

- 10 proposals still awaiting human review
- 7 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 5 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 80 |
| SAFE_REVIEW | 3 |
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

