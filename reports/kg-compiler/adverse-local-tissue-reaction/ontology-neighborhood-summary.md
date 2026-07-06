# Ontology Compiler — Adverse Local Tissue Reaction (Metal Reaction)

Generated: 2026-07-05T23:00:26.088Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 2 |
| Relationships | 0 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 7 |
| Work items | 8 |
| Proposals reviewed | 88 |
| Auto-approved | 79 (89.8%) |
| Human review queue | 9 (10.2%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 2 entities from canonical DB for Adverse Local Tissue Reaction (Metal Reaction).
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 7 gaps across 3 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 8 work items for 8 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 8/8 agents; 88 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 65 entities, 7 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 89.8% auto-approved; 10.2% escalated.
- **Stage 8 — Human Review Packet** (completed): 9 items in human queue.
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

- **[medium]** missing_relationship: Metal Ion Elevation missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Metal Ion Elevation has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Metal Ion Elevation missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Metal Ion Elevation missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_asset_link: 3 Anki mappings exist but no card link proposals in neighborhood. _(rule: neighborhood.assets.cards, reviewer: curator)_
- **[medium]** missing_asset_link: 14 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_
- **[medium]** missing_claim: Biomechanics concept Metal Ion Elevation has no teaching claim (e.g., mortise instability). _(rule: biomechanics.claims, reviewer: clinical_expert)_

## Publication blockers

- 9 proposals still awaiting human review
- 6 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 79 |
| SAFE_REVIEW | 3 |
| EXPERT_REVIEW | 6 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

