# Ontology Compiler — Implants & Instruments

Generated: 2026-07-09T04:25:10.953Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 153 |
| Relationships | 220 |
| Claims (draft) | 22 |
| Decision points (draft) | 15 |
| Ontology gaps | 117 |
| Work items | 7 |
| Proposals reviewed | 411 |
| Auto-approved | 346 (84.2%) |
| Human review queue | 63 (15.8%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 153 entities for Implants & Instruments.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 117 gaps across 2 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 7 work items for 7 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 7/7 agents; 411 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 153 entities, 220 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 84.2% auto-approved; 15.8% escalated.
- **Stage 8 — Human Review Packet** (completed): 63 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Claim Builder
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[medium]** missing_relationship: Compression Fixation missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Compression Fixation has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Compression Fixation missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Compression Fixation missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_relationship: Neutralization Fixation missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Neutralization Fixation has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Neutralization Fixation missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Neutralization Fixation missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_relationship: Buttress Fixation missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Buttress Fixation has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Buttress Fixation missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Buttress Fixation missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_

## Publication blockers

- 65 proposals still awaiting human review
- 35 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 346 |
| SAFE_REVIEW | 30 |
| EXPERT_REVIEW | 35 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

