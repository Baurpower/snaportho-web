# Agent Specification: Clinical Entity Builder

**Agent ID:** `clinical-entity-builder`  
**Status:** Reference adapter registered (scheduling-only stub; generic fallback)  
**Framework version:** 1.0.0

---

## Purpose

Produce clinical canonical entities (conditions, procedures, classifications, imaging findings, complications, fixation methods, biomechanics concepts) from `missing_entity` gaps. Serves as the **generic fallback** when no specialized entity agent matches.

---

## Responsibilities

- Create clinical entities for any `missing_entity` gap not handled by Anatomy Builder
- Assign correct `CanonicalEntityType` and `clinical_kind` where applicable
- Respect connection pattern entity requirements from CKO §9
- Never create anatomy entities (Anatomy Builder handles those)
- Never auto-verify entities

---

## Inputs

| ConsumesCapability | Required |
|--------------------|----------|
| `neighborhood_snapshot` | Yes |
| `ontology_requirements` | Yes |
| `work_assignment` | Yes |

---

## Outputs

| ProducesCapability | Proposal type |
|--------------------|---------------|
| `entities` | `create_canonical_entity` |

---

## Capabilities

```
handlesGapKinds: [missing_entity]
isGenericFallback: true
proposalTypes: [create_canonical_entity]
confidenceRange: { min: 0.80, max: 0.95 }
validationCategories: [ontology, schema, duplicate]
```

**No** `handlesEntityTypes` or `handlesOntologyRulePrefixes` — matches any non-anatomy entity gap.

---

## Dependencies

```
requires: []
```

Runs in parallel with Anatomy Builder.

---

## Ontology Rules Used

- CKO §9 connection patterns: fracture, procedure, classification, imaging, complication shapes
- Vision Blueprint entity types: `condition`, `procedure`, `classification_system`, `classification_grade`, `imaging_finding`, `complication`, `fixation_method`, `biomechanics_concept`
- `condition.clinical_kind`: fracture, infection, syndrome, etc.
- Classifications must be entities (not string attributes) for `indicates_treatment` traversal

---

## Evidence Required

| Source | Use |
|--------|-----|
| OrthoBullets topic pages | Entity labels, classifications |
| Static Prepare content | Condition/procedure names |
| Anki cards | Supporting evidence counts |
| Pilot spec (`kg-ankle-pilot-spec.ts`) | Pre-defined entity inventory |

---

## Proposal Types Generated

### `create_canonical_entity`

| Field | Value |
|-------|-------|
| `proposed_entity_type` | From gap `entityType` or inference |
| `proposed_entity_label` | From evidence |
| `metadata.slug` | Kebab-case |
| `metadata.clinical_kind` | For conditions |
| `metadata.pilot` | Pilot key |
| `review_status` | `generated` |

---

## Confidence Model

| Scenario | Confidence | Route |
|----------|------------|-------|
| Pilot spec entity | 0.92+ | `AUTO_APPROVED_LOW_RISK` |
| OB-backed entity | 0.80–0.88 | `AUTO_APPROVED_LOW_RISK` or `HUMAN_REVIEW` |
| LLM-extracted entity | 0.65–0.75 | `HUMAN_REVIEW` |

---

## Validation Rules

| Category | Check |
|----------|-------|
| schema | Fingerprint, label, entity type |
| ontology | Valid entity type from registry |
| duplicate | No slug/label collision |
| provenance | Evidence present (warning) |

---

## Review Routing

| Scenario | Route |
|----------|-------|
| Spec-backed condition/procedure | `AUTO_APPROVED_LOW_RISK` |
| Classification system entity | `AUTO_APPROVED_LOW_RISK` |
| Novel LLM entity | `HUMAN_REVIEW` |
| Ambiguous type | `HUMAN_REVIEW` |

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Anatomy gap incorrectly assigned | Registry bug — should not occur |
| Invalid entity type | `ONTOLOGY_VIOLATION`, escalate |
| Duplicate slug | `DUPLICATE_FINGERPRINT`, skip |

---

## Metrics

| Metric | Target |
|--------|--------|
| acceptanceRate | > 0.7 |
| proposalCount | Matches gap count |

---

## Example WorkAssignment

```json
{
  "id": "work-clinical-entity-builder",
  "assignedAgentId": "clinical-entity-builder",
  "gaps": [{
    "kind": "missing_entity",
    "entityType": "classification_grade",
    "ontologyRule": "classification.grade.entity",
    "entitySlug": "weber-b",
    "priority": "high"
  }]
}
```

---

## Example ProposalEnvelope

```json
{
  "proposalId": "ankle-pilot:create_entity:weber-b",
  "target": { "objectType": "create_canonical_entity", "label": "Weber B", "slug": "weber-b" },
  "confidence": 0.93,
  "reviewRecommendation": {
    "route": "AUTO_APPROVED_LOW_RISK",
    "reason": "Spec-backed classification grade entity",
    "requiredReviewerRole": "none"
  }
}
```

---

## Example Confidence Calculation

```
ontologyCompliance = 0.98 (spec_backed_entity)
evidenceQuality = 0.75
safetyLevel = 0.1
composite = 0.88 → AUTO_APPROVED_LOW_RISK
```

---

## Example Review Recommendation

Route: `AUTO_APPROVED_LOW_RISK` — deterministic entity from pilot spec, no safety concern.

---

## Example Failure

Entity type `invalid_type` proposed → `ONTOLOGY_VIOLATION`, status `partial`.

---

## Non-Goals

- Anatomy entities
- Relationships, claims, decision points
- Entity merge/split (Duplicate Detector)
- Database writes

---

## Integration with Compiler

- Generic fallback: matches when Anatomy Builder rejects (wrong prefix/type)
- Specificity score = 1 (lowest among kind-matched agents)

## Integration with Merge Engine

- Entities merged by slug into draft

## Integration with Review Engine

- `AUTO_ENTITY_TYPES` set includes all clinical types for auto-approve eligibility

---

## Future Improvements

- Specialized sub-agents per entity type (condition-builder, procedure-builder) with higher specificity
- LLM type inference with confidence thresholds
- Identity resolution integration (match existing entities before creating)

---

## Open Questions

- Should generic fallback be split into per-entity-type agents before scaling beyond ankle pilot?
- How to handle entity type ambiguity (fracture vs condition) — agent proposes both or escalates?