# Ontology Compiler — Bone Loss in Revision Arthroplasty

Generated: 2026-07-05T23:26:40.652Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 3 |
| Relationships | 2 |
| Claims (draft) | 2 |
| Decision points (draft) | 0 |
| Ontology gaps | 23 |
| Work items | 10 |
| Proposals reviewed | 87 |
| Auto-approved | 75 (86.2%) |
| Human review queue | 8 (13.8%) |
| Maturity | Level 5 / 8 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 3 entities from canonical DB for Bone Loss in Revision Arthroplasty.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 23 gaps across 5 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 10 work items for 10 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 10/10 agents; 87 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 66 entities, 7 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 86.2% auto-approved; 13.8% escalated.
- **Stage 8 — Human Review Packet** (completed): 8 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/8; ready=false.

## Required agents

- Clinical Entity Builder
- Relationship Builder
- Claim Builder
- Decision Point Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_entity: Paprosky Classification neighborhood has 0/2 classification_grade entities. _(rule: classification.grades, reviewer: curator)_
- **[critical]** missing_entity: Bone Loss in Revision Arthroplasty neighborhood has 0/3 anatomy_structure entities. _(rule: condition.anatomy.min_structures, reviewer: clinical_expert)_
- **[high]** missing_entity: Bone Loss in Revision Arthroplasty neighborhood has 0/1 imaging_finding entities. _(rule: condition.imaging.finding, reviewer: curator)_
- **[medium]** missing_entity: Bone Loss in Revision Arthroplasty neighborhood has 0/1 complication entities. _(rule: condition.complication, reviewer: none)_
- **[critical]** missing_relationship: Bone Loss in Revision Arthroplasty missing outbound injured_in (0/1). _(rule: condition.pred.injured_in, reviewer: clinical_expert)_
- **[high]** missing_relationship: Bone Loss in Revision Arthroplasty missing outbound involves_anatomy (0/1). _(rule: condition.pred.involves_anatomy, reviewer: curator)_
- **[high]** missing_relationship: Bone Loss in Revision Arthroplasty missing outbound at_risk_structure (0/1). _(rule: condition.pred.at_risk_structure, reviewer: attending)_
- **[high]** missing_relationship: Bone Loss in Revision Arthroplasty missing outbound has_grade (0/1). _(rule: condition.pred.has_grade, reviewer: curator)_
- **[critical]** missing_relationship: Bone Loss in Revision Arthroplasty missing outbound has_imaging_finding (0/1). _(rule: condition.pred.has_imaging_finding, reviewer: clinical_expert)_
- **[medium]** missing_relationship: Bone Loss in Revision Arthroplasty missing outbound has_complication (0/1). _(rule: condition.pred.has_complication, reviewer: none)_
- **[high]** missing_relationship: Bone Loss in Revision Arthroplasty missing outbound treated_by (0/1). _(rule: condition.pred.treated_by, reviewer: curator)_
- **[high]** missing_relationship: Bone Loss in Revision Arthroplasty missing inbound prerequisite_for (0/1). _(rule: condition.pred.prerequisite_for_inbound, reviewer: curator)_

## Publication blockers

- 12 proposals still awaiting human review
- 5 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 15 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 75 |
| SAFE_REVIEW | 7 |
| EXPERT_REVIEW | 5 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

