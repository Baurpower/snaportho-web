# Ontology Compiler — Implant Fixation Principles

Generated: 2026-07-05T23:29:15.210Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 3 |
| Relationships | 0 |
| Claims (draft) | 2 |
| Decision points (draft) | 0 |
| Ontology gaps | 15 |
| Work items | 8 |
| Proposals reviewed | 91 |
| Auto-approved | 83 (91.2%) |
| Human review queue | 8 (8.8%) |
| Maturity | Level 5 / 8 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 3 entities from canonical DB for Implant Fixation Principles.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 15 gaps across 3 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 8 work items for 8 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 8/8 agents; 91 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 66 entities, 9 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 91.2% auto-approved; 8.8% escalated.
- **Stage 8 — Human Review Packet** (completed): 8 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/8; ready=false.

## Required agents

- Relationship Builder
- Claim Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[medium]** missing_relationship: Implant Fixation Principles missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Implant Fixation Principles has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Implant Fixation Principles missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_relationship: Primary Stability missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Primary Stability has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Primary Stability missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Primary Stability missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_relationship: Bone Ingrowth missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Bone Ingrowth has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Bone Ingrowth missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Bone Ingrowth missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_asset_link: 10 Anki mappings exist but no card link proposals in neighborhood. _(rule: neighborhood.assets.cards, reviewer: curator)_

## Publication blockers

- 8 proposals still awaiting human review
- 7 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 83 |
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

