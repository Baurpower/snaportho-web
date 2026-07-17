# Ontology Compiler — Imaging & Radiographic Measurements

Generated: 2026-07-09T04:14:30.109Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 108 |
| Relationships | 192 |
| Claims (draft) | 28 |
| Decision points (draft) | 15 |
| Ontology gaps | 184 |
| Work items | 7 |
| Proposals reviewed | 344 |
| Auto-approved | 277 (80.5%) |
| Human review queue | 66 (19.5%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 108 entities for Imaging & Radiographic Measurements.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 184 gaps across 2 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 7 work items for 7 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 7/7 agents; 344 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 108 entities, 192 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 80.5% auto-approved; 19.5% escalated.
- **Stage 8 — Human Review Packet** (completed): 66 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Claim Builder
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[medium]** missing_relationship: Böhler Angle missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Böhler Angle missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Böhler Angle missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_relationship: Gissane Angle missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Gissane Angle has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Gissane Angle missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Gissane Angle missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_relationship: Baumann Angle missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Baumann Angle has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Baumann Angle missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Baumann Angle missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_relationship: Anterior Humeral Line missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_

## Publication blockers

- 67 proposals still awaiting human review
- 49 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 4 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 277 |
| SAFE_REVIEW | 18 |
| EXPERT_REVIEW | 49 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

