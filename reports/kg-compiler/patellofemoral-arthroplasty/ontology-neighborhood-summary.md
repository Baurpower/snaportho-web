# Ontology Compiler — Patellofemoral Arthroplasty

Generated: 2026-07-05T23:18:36.891Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 2 |
| Relationships | 0 |
| Claims (draft) | 2 |
| Decision points (draft) | 0 |
| Ontology gaps | 11 |
| Work items | 9 |
| Proposals reviewed | 83 |
| Auto-approved | 75 (90.4%) |
| Human review queue | 5 (9.6%) |
| Maturity | Level 5 / 6 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 2 entities from canonical DB for Patellofemoral Arthroplasty.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 11 gaps across 4 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 9 work items for 9 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 9/9 agents; 83 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 63 entities, 6 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 90.4% auto-approved; 9.6% escalated.
- **Stage 8 — Human Review Packet** (completed): 5 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/6; ready=false.

## Required agents

- Clinical Entity Builder
- Relationship Builder
- Claim Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[critical]** missing_entity: Patellofemoral Arthroplasty neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: Patellofemoral Arthroplasty missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: Patellofemoral Arthroplasty missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_relationship: Patellofemoral Tracking missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Patellofemoral Tracking has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Patellofemoral Tracking missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Patellofemoral Tracking missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_asset_link: 3 Anki mappings exist but no card link proposals in neighborhood. _(rule: neighborhood.assets.cards, reviewer: curator)_
- **[medium]** missing_asset_link: 12 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_
- **[medium]** missing_claim: Biomechanics concept Patellofemoral Tracking has no teaching claim (e.g., mortise instability). _(rule: biomechanics.claims, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Patellofemoral Arthroplasty missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_

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

