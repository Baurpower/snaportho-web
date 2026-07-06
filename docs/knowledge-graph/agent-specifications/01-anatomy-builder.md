# Agent Specification: Anatomy Builder

**Agent ID:** `anatomy-builder`  
**Status:** Reference adapter registered (scheduling-only stub)  
**Framework version:** 1.0.0

---

## Purpose

Produce `anatomy_structure` canonical entities required by the anatomy ontology plan and connection patterns. Anatomy Builder is the first agent in the anatomy-first regional pilot sequence (Phases A–B).

---

## Responsibilities

- Create `anatomy_structure` entities from `missing_entity` gaps with `anatomy.` ontology rules
- Assign `anatomy_kind`, `hierarchy_level`, and regional metadata
- Never create clinical entities (conditions, procedures)
- Never create relationships (Relationship Builder handles edges)
- Never auto-verify entities

---

## Inputs

| ConsumesCapability | Required | Source |
|--------------------|----------|--------|
| `neighborhood_snapshot` | Yes | Compiler Stage 1 |
| `ontology_requirements` | Yes | CKO spec §8 entity shapes |
| `work_assignment` | Yes | Work Planner |

---

## Outputs

| ProducesCapability | Proposal type |
|--------------------|---------------|
| `entities` | `create_canonical_entity` |

---

## Capabilities

```
handlesGapKinds: [missing_entity]
handlesEntityTypes: [anatomy_structure]
handlesOntologyRulePrefixes: [anatomy.]
isGenericFallback: false
proposalTypes: [create_canonical_entity]
confidenceRange: { min: 0.85, max: 0.95 }
validationCategories: [ontology, metadata, duplicate]
```

---

## Dependencies

```
requires: []
```

No upstream agents. Runs in parallel with Clinical Entity Builder.

---

## Ontology Rules Used

- Anatomy Ontology Plan §2: `anatomy_structure` entity type
- Anatomy Ontology Plan §3: `anatomy_kind` values (bone, joint, nerve, compartment, ligament, etc.)
- Anatomy Ontology Plan §4: hierarchy levels (region → subregion → structure → substructure)
- CKO §9 anatomy shape: hub connectivity over decision points
- Prefix filter: only gaps with `ontologyRule` starting with `anatomy.`

---

## Evidence Required

| Source | Use |
|--------|-----|
| OrthoBullets anatomy sections | Entity labels, hierarchy |
| Anki anatomy cards | Supporting card count |
| Anatomy ontology plan inventory | Phase A structure list |
| Expert-reviewed canonical | Highest priority on conflict |

Minimum: `evidence_summary` + at least one `source_signal_id`.

---

## Proposal Types Generated

### `create_canonical_entity`

| Field | Value |
|-------|-------|
| `proposed_entity_type` | `anatomy_structure` |
| `proposed_entity_label` | From evidence or gap reason |
| `metadata.slug` | Kebab-case slug |
| `metadata.anatomy_kind` | From ontology plan |
| `metadata.hierarchy_level` | region / subregion / structure / substructure |
| `metadata.pilot` | Pilot key |
| `review_status` | `generated` |

---

## Confidence Model

| Dimension | Typical value | Rule |
|-----------|---------------|------|
| ontologyCompliance | 0.98 | `spec_backed_entity` when pilot-backed |
| evidenceQuality | 0.7–0.9 | Based on card/source count |
| safetyLevel | 0.1 | Anatomy entities are low safety risk |
| metadataCompleteness | 0.85 | When slug + anatomy_kind present |

Expected route: `AUTO_APPROVED_LOW_RISK` for spec-backed inventory entities.

---

## Validation Rules

| Category | Check |
|----------|-------|
| schema | Fingerprint, label present |
| ontology | Valid `anatomy_structure` type |
| metadata | `anatomy_kind` present (warning if missing) |
| duplicate | No slug collision in batch |
| provenance | Evidence summary present |

---

## Review Routing

| Scenario | Route |
|----------|-------|
| Spec-backed inventory entity | `AUTO_APPROVED_LOW_RISK` |
| Novel entity from LLM extraction | `HUMAN_REVIEW` |
| Slug collision | `CONFLICTED` or `HUMAN_REVIEW` |

---

## Failure Modes

| Failure | Code | Recovery |
|---------|------|----------|
| Missing neighborhood | `MISSING_INPUT` | blocked |
| Unknown anatomy_kind | `ONTOLOGY_VIOLATION` | escalate |
| Duplicate slug | `DUPLICATE_FINGERPRINT` | skip |
| No evidence | `MISSING_PROVENANCE` | retry |

---

## Metrics

| Metric | Target |
|--------|--------|
| acceptanceRate | > 0.8 (inventory entities) |
| escalationCount | Low |
| executionTimeMs | < 5000 per assignment |

---

## Example WorkAssignment

```json
{
  "id": "work-anatomy-builder",
  "type": "gap_resolution",
  "assignedAgentId": "anatomy-builder",
  "gapIds": ["gap-entity-neighbor-7"],
  "gaps": [{
    "id": "gap-entity-neighbor-7",
    "kind": "missing_entity",
    "entityType": "anatomy_structure",
    "ontologyRule": "anatomy.neighbor.required",
    "entitySlug": "posterior-malleolus",
    "priority": "high",
    "confidence": 0.95,
    "requiredReviewer": "none"
  }],
  "dependencies": [],
  "estimatedConfidence": 0.95
}
```

---

## Example ProposalEnvelope

```json
{
  "schemaVersion": "1.0.0",
  "proposalId": "ankle-pilot:create_entity:posterior-malleolus",
  "target": {
    "objectType": "create_canonical_entity",
    "label": "Posterior Malleolus",
    "slug": "posterior-malleolus"
  },
  "confidence": 0.92,
  "reviewRecommendation": {
    "route": "AUTO_APPROVED_LOW_RISK",
    "confidence": 0.92,
    "safetyScore": 0.1,
    "evidenceScore": 0.8,
    "ontologyComplianceScore": 0.98,
    "duplicateRisk": 0.05,
    "conflictRisk": 0.0,
    "reason": "Spec-backed anatomy inventory entity",
    "requiredReviewerRole": "none"
  },
  "publicationEligible": true
}
```

---

## Example Confidence Calculation

```
evidenceQuality = 0.8 (cards present)
ontologyCompliance = 0.98 (spec_backed_entity)
safetyLevel = 0.1
metadataCompleteness = 0.85 (slug + anatomy_kind)
composite = 0.92 → AUTO_APPROVED_LOW_RISK
```

---

## Example Failure

```json
{
  "status": "failed",
  "errors": [{
    "code": "MISSING_INPUT",
    "reason": "Required input not provided: ontology_requirements",
    "severity": "error",
    "recoverability": "blocked"
  }]
}
```

---

## Non-Goals

- Creating clinical entities (conditions, procedures)
- Creating relationships
- Generating anatomy claims (Claim Builder)
- Applying entities to database
- Clinical verification of anatomy nomenclature

---

## Integration with Compiler

- Matched by `anatomy.` prefix + `anatomy_structure` entity type
- Work item created in Stage 4; execution in Stage 5 (planned)
- Listed in `agent-assignment-plan.json`

## Integration with Merge Engine

- `create_canonical_entity` proposals merged into `MergedNeighborhoodDraft.entities`
- Matched by `metadata.slug`

## Integration with Review Engine

- Spec-backed entities auto-approved via `spec_backed_entity_create` rule
- Envelope `reviewRecommendation` aligned with curator

---

## Future Improvements

- Full evidence extraction from OrthoBullets anatomy sections
- LLM-assisted label normalization with human review gate
- Regional hub detection (ankle ring, lumbar canal)
- Overlinking guard integration (max essential edges per diagnosis)
- Hierarchy validation against anatomy plan Phase A inventory

---

## Open Questions

- Should anatomy entities from LLM extraction ever auto-approve, or always `HUMAN_REVIEW`?
- Granularity disputes (structure vs substructure) — agent proposes or escalates?