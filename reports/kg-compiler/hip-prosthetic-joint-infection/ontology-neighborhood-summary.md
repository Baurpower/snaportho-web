# Ontology Compiler — Hip Prosthetic Joint Infection

Generated: 2026-07-05T22:51:16.380Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 2 |
| Relationships | 0 |
| Claims (draft) | 0 |
| Decision points (draft) | 0 |
| Ontology gaps | 11 |
| Work items | 9 |
| Proposals reviewed | 84 |
| Auto-approved | 75 (89.3%) |
| Human review queue | 6 (10.7%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 2 entities from canonical DB for Hip Prosthetic Joint Infection.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 11 gaps across 4 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 9 work items for 9 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 9/9 agents; 84 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 62 entities, 8 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 89.3% auto-approved; 10.7% escalated.
- **Stage 8 — Human Review Packet** (completed): 6 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

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

- **[medium]** missing_relationship: Biofilm Concept missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Biofilm Concept has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Biofilm Concept missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Biofilm Concept missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[critical]** missing_entity: Hip Irrigation and Debridement neighborhood has 0/1 anatomy_structure entities. _(rule: procedure.anatomy, reviewer: clinical_expert)_
- **[critical]** missing_relationship: Hip Irrigation and Debridement missing outbound involves_anatomy (0/1). _(rule: procedure.pred.involves_anatomy, reviewer: clinical_expert)_
- **[high]** missing_relationship: Hip Irrigation and Debridement missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_asset_link: 8 Anki mappings exist but no card link proposals in neighborhood. _(rule: neighborhood.assets.cards, reviewer: curator)_
- **[medium]** missing_asset_link: 42 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_
- **[medium]** missing_claim: Biomechanics concept Biofilm Concept has no teaching claim (e.g., mortise instability). _(rule: biomechanics.claims, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Hip Irrigation and Debridement missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_

## Publication blockers

- 9 proposals still awaiting human review
- 4 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 3 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 75 |
| SAFE_REVIEW | 5 |
| EXPERT_REVIEW | 4 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

