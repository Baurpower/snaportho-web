# Ontology Compiler — Knee Osteoarthritis

Generated: 2026-07-05T23:02:35.989Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 2 |
| Relationships | 0 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 7 |
| Work items | 8 |
| Proposals reviewed | 87 |
| Auto-approved | 77 (88.5%) |
| Human review queue | 10 (11.5%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 2 entities from canonical DB for Knee Osteoarthritis.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 7 gaps across 3 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 8 work items for 8 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 8/8 agents; 87 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 65 entities, 8 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 88.5% auto-approved; 11.5% escalated.
- **Stage 8 — Human Review Packet** (completed): 10 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Claim Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[medium]** missing_relationship: Knee Mechanical Axis missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Knee Mechanical Axis has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Knee Mechanical Axis missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Knee Mechanical Axis missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_asset_link: 16 Anki mappings exist but no card link proposals in neighborhood. _(rule: neighborhood.assets.cards, reviewer: curator)_
- **[medium]** missing_asset_link: 68 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_
- **[medium]** missing_claim: Biomechanics concept Knee Mechanical Axis has no teaching claim (e.g., mortise instability). _(rule: biomechanics.claims, reviewer: clinical_expert)_

## Publication blockers

- 10 proposals still awaiting human review
- 9 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 77 |
| SAFE_REVIEW | 1 |
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

