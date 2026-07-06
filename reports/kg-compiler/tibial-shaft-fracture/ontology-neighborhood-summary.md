# Ontology Compiler — Tibial Shaft Fracture

Generated: 2026-07-05T21:24:25.513Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 10 |
| Relationships | 4 |
| Claims (draft) | 2 |
| Decision points (draft) | 0 |
| Ontology gaps | 11 |
| Work items | 9 |
| Proposals reviewed | 51 |
| Auto-approved | 34 (66.7%) |
| Human review queue | 11 (33.3%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 10 entities from canonical DB for Tibial Shaft Fracture.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 11 gaps across 4 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 9 work items for 9 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 9/9 agents; 51 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 13 entities, 20 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 66.7% auto-approved; 33.3% escalated.
- **Stage 8 — Human Review Packet** (completed): 11 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Metadata Builder
- Claim Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Tibia Leg Anatomy Hub missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Tibial IM Nailing missing outbound at_risk_structure (0/1). _(rule: procedure.pred.at_risk_structure, reviewer: attending)_
- **[medium]** missing_metadata: 1 context_relevance gaps on Tibial IM Nailing involves_anatomy/at_risk_structure edges. _(rule: procedure.meta.context, reviewer: none)_
- **[medium]** missing_relationship: Tibial Blood Supply missing inbound involves_anatomy (0/1). _(rule: biomechanics.inbound, reviewer: none)_
- **[medium]** missing_claim: Tibial Blood Supply has 0/1 L1 claims. _(rule: biomechanics.claims, reviewer: none)_
- **[medium]** missing_claim: Tibial Blood Supply missing claim type: fact. _(rule: biomechanics.claims.fact, reviewer: none)_
- **[medium]** missing_claim: Tibial Blood Supply missing claim type: anatomy_pearl. _(rule: biomechanics.claims.anatomy_pearl, reviewer: none)_
- **[medium]** missing_asset_link: 10 Anki mappings exist but no card link proposals in neighborhood. _(rule: neighborhood.assets.cards, reviewer: curator)_
- **[medium]** missing_asset_link: 63 question mappings exist but no question link proposals. _(rule: neighborhood.assets.questions, reviewer: curator)_
- **[medium]** missing_claim: Biomechanics concept Tibial Blood Supply has no teaching claim (e.g., mortise instability). _(rule: biomechanics.claims, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Procedure Tibial IM Nailing missing uses_approach edge. _(rule: procedure.pred.uses_approach, reviewer: clinical_expert)_

## Publication blockers

- 17 proposals still awaiting human review
- 9 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 2 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 34 |
| SAFE_REVIEW | 8 |
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

