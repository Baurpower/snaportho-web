# Ontology Compiler — Orthopaedic Anatomy

Generated: 2026-07-08T21:20:25.732Z

## Executive summary

| Metric | Value |
|--------|------:|
| Entities | 208 |
| Relationships | 198 |
| Claims (draft) | 10 |
| Decision points (draft) | 3 |
| Ontology gaps | 47 |
| Work items | 7 |
| Proposals reviewed | 420 |
| Auto-approved | 417 (99.3%) |
| Human review queue | 3 (0.7%) |
| Maturity | Level 5 / 7 required |
| Publication ready | **no** |

## Pipeline stages

- **Stage 1 — Neighborhood Resolution** (completed): Resolved 208 entities for Orthopaedic Anatomy.
- **Stage 2 — Ontology Requirement Expansion** (completed): Derived requirements from CKO spec §8–§9 and anatomy ontology plan.
- **Stage 3 — Gap Analysis** (completed): Identified 47 gaps across 2 kinds.
- **Stage 4 — Work Planning** (completed): Scheduled 7 work items for 7 registered agents.
- **Stage 5 — Agent Orchestration** (completed): Executed 7/7 agents; 420 unique proposals; 0 failed.
- **Stage 6 — Merge** (completed): Merged draft: 208 entities, 198 relationships; 0 conflicts.
- **Stage 7 — Intelligent Auto Review** (completed): 99.3% auto-approved; 0.7% escalated.
- **Stage 8 — Human Review Packet** (completed): 3 items in human queue.
- **Stage 9 — Publication Readiness** (completed): Maturity 5/7; ready=false.

## Required agents

- Relationship Builder
- Provenance Builder
- Conflict Resolver
- Quality Scorer
- Review Assistant
- Publication Validator

## Top gaps

- **[high]** missing_relationship: Orthopaedic Anatomy missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Intervertebral Disc missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Spinal Canal missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Conus Medullaris missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Exiting Nerve Root missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Traversing Nerve Root missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Anterior Longitudinal Ligament missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Posterior Longitudinal Ligament missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Ligamentum Flavum missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Vertebral Artery missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Femoral Triangle missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_
- **[high]** missing_relationship: Popliteal Fossa missing outbound part_of (0/1). _(rule: anatomy.pred.hierarchy, reviewer: curator)_

## Publication blockers

- 3 proposals still awaiting human review
- 3 items require attending review
- Claims and DPs are draft-only — publication gate must block verified consumption.
- No approved canonical entities in database yet — proposals remain offline/spec.
- 47 critical/high ontology gaps remain unresolved

## Auto-review distribution

| Category | Count |
|----------|------:|
| AUTO_APPROVE | 417 |
| SAFE_REVIEW | 0 |
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

