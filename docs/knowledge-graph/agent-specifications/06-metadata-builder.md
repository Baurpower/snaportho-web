# Agent Specification: Metadata Builder

**Agent ID:** `metadata-builder`  
**Status:** Reference adapter registered (dedicated adapter)  
**Framework version:** 1.0.0

---

## Purpose

Produce relationship and entity metadata weighting patches for `missing_metadata` gaps. Metadata enables product-specific traversal filtering (Prepare, BroBot, CasePrep) without duplicating graph structure.

---

## Responsibilities

- Patch `relationship_metadata` on existing relationship proposals
- Assign `anatomy_role`, `relevance_reason`, `clinical_importance`
- Resolve `missing_metadata` gaps only — never create entities or claims
- Generate metadata-only `add_canonical_relationship` proposals when patching

---

## Inputs

| ConsumesCapability | Required |
|--------------------|----------|
| `neighborhood_snapshot` | Yes |
| `canonical_objects` | Yes |
| `work_assignment` | Yes |
| `proposal_packets` | Yes |

---

## Outputs

| ProducesCapability | Proposal type |
|--------------------|---------------|
| `metadata` | `add_canonical_relationship` (metadata patches) |

---

## Capabilities

```
handlesGapKinds: [missing_metadata]
requires: [relationship-builder]
proposalTypes: [add_canonical_relationship]
confidenceRange: { min: 0.75, max: 0.90 }
validationCategories: [metadata, schema]
```

---

## Dependencies

```
requires: [relationship-builder]
```

Relationships must exist before metadata can be applied.

---

## Ontology Rules Used

- Anatomy Plan §6: `anatomy_role` (essential, supporting, background, advanced)
- Anatomy Plan §6: `relevance_reason` (diagnosis, exam, imaging, approach, neurovascular_risk, instability)
- Anatomy Plan §7: product-specific filters
- Essential edges require metadata for publication
- Max ~8 essential anatomy edges per diagnosis

---

## Evidence Required

| Source | Use |
|--------|-----|
| OrthoBullets emphasis signals | Frequency, board relevance |
| Card/question counts | Proxy for importance |
| Connection pattern templates | Default metadata by predicate |
| Curator overrides | Template adjustments |

---

## Proposal Types Generated

Metadata patches via `add_canonical_relationship` with populated `relationship_metadata`:

```json
{
  "relationship_metadata": {
    "anatomy_role": "essential",
    "relevance_reason": "approach",
    "clinical_importance": 0.85,
    "display_priority": 1,
    "context_relevance": ["caseprep", "prepare"]
  }
}
```

---

## Confidence Model

| Scenario | Confidence | Route |
|----------|------------|-------|
| Template-based defaults | 0.85–0.90 | `AUTO_APPROVED_LOW_RISK` |
| Proxy signal inference | 0.75–0.82 | `AUTO_REVISED` |
| Curator override needed | 0.70 | `HUMAN_REVIEW` |

---

## Validation Rules

| Category | Check |
|----------|-------|
| metadata | `anatomy_role` or `clinical_importance` present |
| schema | Valid relationship reference |
| ontology | Underlying triple still valid |

---

## Review Routing

| Scenario | Route |
|----------|-------|
| Default template metadata | `AUTO_APPROVED_LOW_RISK` |
| `must_protect_during` metadata | `ATTENDING_REVIEW` |
| Ambiguous role assignment | `HUMAN_REVIEW` |

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Relationship not found | skip gap |
| Entity gap incorrectly assigned | Registry prevents (metadata ≠ entity) |
| No proposals matched | `schedulingOnly: true` |

---

## Metrics

| Metric | Target |
|--------|--------|
| proposalCount | Matches metadata gap count |
| validationFailureCount | Low |

---

## Example WorkAssignment

```json
{
  "id": "work-metadata-builder",
  "gaps": [{
    "kind": "missing_metadata",
    "metadataField": "anatomy_role",
    "subjectSlug": "ankle-fracture",
    "predicate": "involves_anatomy",
    "objectSlug": "medial-malleolus",
    "ontologyRule": "metadata.relationship.weighting"
  }],
  "dependencies": ["work-relationship-builder"]
}
```

---

## Example ProposalEnvelope

```json
{
  "proposalId": "ankle-pilot:meta:ankle-fracture:involves_anatomy:medial-malleolus",
  "confidence": 0.87,
  "reviewRecommendation": {
    "route": "AUTO_APPROVED_LOW_RISK",
    "reason": "Default anatomy_role template for involves_anatomy",
    "requiredReviewerRole": "none"
  }
}
```

---

## Example Confidence Calculation

```
metadataCompleteness = 0.85 (metadata populated)
ontologyCompliance = 0.9
safetyLevel = 0.1
composite = 0.87 → AUTO_APPROVED_LOW_RISK
```

---

## Example Review Recommendation

Default template → `AUTO_APPROVED_LOW_RISK`. Curator may override via `HUMAN_REVIEW` if `anatomy_role: essential` seems incorrect for a supporting structure.

---

## Example Failure

Metadata gap on non-existent relationship → no proposals matched, outputs `schedulingOnly: true`.

---

## Non-Goals

- Entity creation
- Claim generation
- Relationship creation (only metadata patches)
- Clinical importance judgment without review for safety edges

---

## Integration with Compiler

- 2 metadata gaps in ankle pilot
- Never matches `missing_entity` gaps

## Integration with Merge Engine

- `metadataMerged` stat incremented
- `relationship_metadata_conflict` detected on conflicting patches

## Integration with Review Engine

- Missing metadata triggers `AUTO_REVISED` on underlying relationship proposals

---

## Future Improvements

- OB/card count → frequency scoring
- Product-specific `context_relevance` auto-tagging
- Essential edge cap enforcement
- Curator override workflow integration

---

## Open Questions

- Should metadata patches be separate proposal type vs re-using `add_canonical_relationship`?
- Who owns default templates — metadata agent or ontology requirements module?