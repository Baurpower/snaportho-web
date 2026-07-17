# Ontology Compiler — Carpal Tunnel Syndrome

Generated: 2026-07-09T14:21:18.862Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 93 |
| Relationships | 124 |
| Claims (draft) | 8 |
| Decision points (draft) | 8 |
| Ontology gaps | 25 |
| Work items | 10 |
| Proposals reviewed | 233 |
| Auto-approved | 191 (82%) |
| Human review queue | 42 (18%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 93 entities for Carpal Tunnel Syndrome.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 25 gaps across 5 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 10 work items for 10 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 10/10 agents; 233 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 93 entities, 123 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 82% auto-approved; 18% escalated.
- **Stage 8 — Human Review Packet** (completed): 42 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Clinical Entity Builder
- Claim Builder
- Metadata Builder
- Asset Linker
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Hand & Wrist Anatomy Hub missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Scapholunate Ligament missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Lunotriquetral Ligament missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: TFCC missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Thumb UCL missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Volar Plate missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Collateral Ligaments missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Carpal Tunnel missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Guyon Canal missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_entity: Carpal Tunnel Syndrome neighborhood has 0/1 classification_system entities. _(rule: condition.classification.system, reviewer: curator)_
- **[high]** missing_entity: Carpal Tunnel Syndrome neighborhood has 0/1 imaging_finding entities. _(rule: condition.imaging.finding, reviewer: curator)_
- **[medium]** missing_entity: Carpal Tunnel Syndrome neighborhood has 0/1 complication entities. _(rule: condition.complication, reviewer: none)_

## Publication blockers

- 42 proposals still awaiting human review
- 28 items require attending review
- Insufficient relationship metadata on essential edges
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 14 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 191 |
| SAFE_REVIEW | 14 |
| EXPERT_REVIEW | 28 |
| REJECT | 0 |

## Constraints

- Database modified: **no**
- Auto-published: **no**

## Next command

```bash
npm run kg:pilot:ankle:curate   # run factory curation on proposals
npm run kg:pilot:ankle:review   # export human review queue
```

