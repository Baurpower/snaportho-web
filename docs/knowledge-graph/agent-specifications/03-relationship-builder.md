# Agent Specification: Relationship Builder

**Agent ID:** `relationship-builder`  
**Status:** Reference adapter registered (filters existing proposals)  
**Framework version:** 1.0.0

---

## Purpose

Produce ontology-valid `add_canonical_relationship` proposals that satisfy connection pattern requirements. Relationship Builder is the central graph construction agent — relationships are the core product primitive.

---

## Responsibilities

- Create canonical relationships for `missing_relationship` gaps
- Validate all triples against the relationship registry
- Apply predicate discipline (specific over `involves_anatomy` catch-all)
- Include subject/object slugs and entity types in metadata
- Never auto-approve high-risk predicates

---

## Inputs

| ConsumesCapability | Required |
|--------------------|----------|
| `neighborhood_snapshot` | Yes |
| `work_assignment` | Yes |
| `proposal_packets` | Yes |
| `canonical_objects` | Yes |

---

## Outputs

| ProducesCapability | Proposal type |
|--------------------|---------------|
| `relationships` | `add_canonical_relationship` |

---

## Capabilities

```
handlesGapKinds: [missing_relationship]
requires: [clinical-entity-builder, anatomy-builder]
proposalTypes: [add_canonical_relationship]
confidenceRange: { min: 0.80, max: 0.98 }
autoApprovalPatterns: [part_of, contains, articulates_with, inserts_on, prerequisite_for,
  has_classification, has_grade, has_imaging_finding, has_complication, injured_in, involves_anatomy]
escalationPatterns: [at_risk_structure, indicates_treatment, must_protect_during, treated_by,
  uses_fixation, explains_instability]
validationCategories: [ontology, relationship, metadata, duplicate, provenance]
```

---

## Dependencies

```
requires: [clinical-entity-builder, anatomy-builder]
```

Both entity types must exist in neighborhood before relationship creation.

---

## Ontology Rules Used

- Relationship registry type constraints per predicate
- Phase 1 predicates from Vision Blueprint
- Anatomy Plan §5: clinical→anatomy predicates
- CKO §9 connection patterns: required edge sets per topic shape
- Predicate discipline: prefer `injured_in` over `involves_anatomy`

---

## Evidence Required

| Source | Use |
|--------|-----|
| Pilot spec relationships | Pre-defined edges |
| OrthoBullets topic structure | Clinical-anatomy links |
| Anki cards | Supporting counts |
| Connection pattern requirements | Required predicates |

---

## Proposal Types Generated

### `add_canonical_relationship`

| Field | Value |
|-------|-------|
| `proposed_predicate` | From gap or ontology rule |
| `metadata.subject_slug` | Subject entity slug |
| `metadata.object_slug` | Object entity slug |
| `metadata.subject_entity_type` | For triple validation |
| `metadata.object_entity_type` | For triple validation |
| `metadata.relationship_metadata` | Weighting (may be incomplete initially) |
| `review_status` | `generated` |

---

## Confidence Model

| Predicate class | safetyLevel | Typical route |
|-----------------|-------------|---------------|
| Low-risk (part_of, has_grade) | 0.1 | `AUTO_APPROVED_LOW_RISK` |
| Medium (involves_anatomy) | 0.1–0.3 | `AUTO_APPROVED_LOW_RISK` |
| High-risk (indicates_treatment) | 0.75 | `ATTENDING_REVIEW` |
| Missing metadata | completeness 0.5 | `AUTO_REVISED` |

---

## Validation Rules

| Category | Check |
|----------|-------|
| ontology | `validateRelationshipTriple()` must pass |
| relationship | Predicate present, slugs valid |
| metadata | `relationship_metadata` warning if missing |
| provenance | Evidence summary |

---

## Review Routing

| Predicate | Route |
|-----------|-------|
| `part_of`, `has_grade`, `injured_in` | `AUTO_APPROVED_LOW_RISK` |
| `indicates_treatment`, `at_risk_structure` | `ATTENDING_REVIEW` |
| Unknown predicate | `HUMAN_REVIEW` |
| Invalid triple | `REJECT` |

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Subject/object entity missing | blocked — dependency failure |
| Invalid triple | `ONTOLOGY_VIOLATION`, escalate |
| No proposals matched (stub) | `schedulingOnly: true` in outputs |

---

## Metrics

| Metric | Target |
|--------|--------|
| acceptanceRate | > 0.6 (mix of auto + attending) |
| escalationCount | Proportional to high-risk predicate count |

---

## Example WorkAssignment

```json
{
  "id": "work-relationship-builder",
  "assignedAgentId": "relationship-builder",
  "gapIds": ["gap-rel-1", "gap-grade-link-22"],
  "gaps": [{
    "kind": "missing_relationship",
    "predicate": "has_grade",
    "subjectSlug": "ankle-fracture",
    "objectSlug": "weber-b",
    "ontologyRule": "classification.grade.link_all",
    "priority": "high"
  }],
  "dependencies": ["work-anatomy-builder", "work-clinical-entity-builder"]
}
```

---

## Example ProposalEnvelope

```json
{
  "proposalId": "ankle-pilot:rel:ankle-fracture:has_grade:weber-b",
  "target": {
    "objectType": "add_canonical_relationship",
    "label": "ankle-fracture → has_grade → weber-b",
    "predicate": "has_grade"
  },
  "confidence": 0.91,
  "reviewRecommendation": {
    "route": "AUTO_APPROVED_LOW_RISK",
    "safetyScore": 0.1,
    "ontologyComplianceScore": 0.9,
    "reason": "Deterministic clinical predicate has_grade",
    "requiredReviewerRole": "none"
  }
}
```

---

## Example Confidence Calculation

```
relationshipValidity = 0.95 (valid triple)
safetyLevel = 0.1 (has_grade is low-risk)
evidenceQuality = 0.7
composite = 0.91 → AUTO_APPROVED_LOW_RISK
```

---

## Example Review Recommendation

High-risk example: `indicates_treatment` → `ATTENDING_REVIEW`, safetyScore 0.75, requiredReviewerRole `attending`.

---

## Example Failure

```json
{
  "status": "partial",
  "validation": {
    "issues": [{
      "code": "ONTOLOGY_VIOLATION",
      "message": "Predicate treated_by not allowed between anatomy_structure and condition",
      "severity": "error"
    }]
  }
}
```

---

## Non-Goals

- Entity creation
- Metadata weighting patches (Metadata Builder)
- Claim or decision point generation
- Relationship deletion or modification of existing canonical edges

---

## Integration with Compiler

- Highest-volume gap agent in ankle pilot (9 relationship gaps)
- Exact match on `missing_relationship` gap kind

## Integration with Merge Engine

- Relationships merged by `subjectSlug|predicate|objectSlug` key
- Conflicts detected as `relationship_metadata_conflict`

## Integration with Review Engine

- `AUTO_APPROVE_PREDICATES` set determines auto-review category
- Curator `deterministic_clinical_or_anatomy_predicate` rule

---

## Future Improvements

- Anatomy-first inference (suggest `injured_in` over `involves_anatomy`)
- Essential edge cap enforcement (3–8 per diagnosis)
- Batch relationship generation from connection pattern templates
- Relationship metadata pre-population with default templates

---

## Open Questions

- Should Relationship Builder populate default `relationship_metadata` or defer entirely to Metadata Builder?
- How to handle proposed relationships where one endpoint is not yet in neighborhood (staging proposal vs blocked)?