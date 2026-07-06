# Agent Specification: Asset Linker

**Agent ID:** `asset-linker`  
**Status:** Reference adapter registered (scheduling-only stub)  
**Framework version:** 1.0.0

---

## Purpose

Link Anki cards and OrthoBullets questions to canonical entities via `retarget_card_to_entity` and `retarget_question_to_entity` proposals.

---

## Responsibilities

- Resolve `missing_asset_link` gaps
- Map card/question IDs to canonical entity slugs
- Populate provenance with source asset IDs
- Never create entities or educational content

---

## Inputs

| ConsumesCapability | Required |
|--------------------|----------|
| `neighborhood_snapshot` | Yes |
| `canonical_objects` | Yes |
| `evidence_packets` | Yes |
| `work_assignment` | Yes |

---

## Outputs

| ProducesCapability | Proposal types |
|--------------------|----------------|
| `asset_links` | `retarget_card_to_entity`, `retarget_question_to_entity` |

---

## Capabilities

```
handlesGapKinds: [missing_asset_link]
requires: [clinical-entity-builder]
proposalTypes: [retarget_card_to_entity, retarget_question_to_entity]
confidenceRange: { min: 0.70, max: 0.90 }
validationCategories: [provenance, schema]
```

---

## Dependencies

```
requires: [clinical-entity-builder]
```

Target entities must exist before asset linking.

---

## Ontology Rules Used

- CKO §8 asset dimension: questions/cards linked (lowest early priority)
- Vision Blueprint: `supported_by_card` relationship pattern
- OITE readiness: L3+ with asset links for board traps
- Asset dimension is lowest maturity priority but required for L7

---

## Evidence Required

| Source | Use |
|--------|-----|
| Anki card mappings | Card ID → entity slug |
| OrthoBullets question mappings | Question ID → entity slug |
| Evidence packets | Card/question clusters per topic |
| Curriculum node bridges | Cross-reference signals |

---

## Proposal Types Generated

### `retarget_card_to_entity`

| Field | Value |
|-------|-------|
| `source_signal_type` | `anki_card` |
| `source_signal_ids` | Card IDs |
| `proposed_existing_entity_id` or `metadata.slug` | Target entity |
| `supporting_card_count` | ≥ 1 |

### `retarget_question_to_entity`

| Field | Value |
|-------|-------|
| `source_signal_type` | `orthobullets_question` |
| `source_signal_ids` | Question IDs |
| Target entity reference | Slug or ID |

---

## Confidence Model

| Signal | Confidence |
|--------|------------|
| Direct OB mapping | 0.85–0.90 |
| Card cluster match | 0.75–0.85 |
| Inferred mapping | 0.70–0.75 |

Route: `AUTO_APPROVED_LOW_RISK` for deterministic mappings; `HUMAN_REVIEW` for inferred.

---

## Validation Rules

| Category | Check |
|----------|-------|
| provenance | Source IDs present |
| schema | Target entity exists in neighborhood |
| ontology | Valid entity slug reference |

---

## Review Routing

| Scenario | Route |
|----------|-------|
| Deterministic pilot mapping | `AUTO_APPROVED_LOW_RISK` |
| Inferred card→entity | `HUMAN_REVIEW` |
| Ambiguous multi-entity match | `CONFLICTED` |

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Target entity missing | blocked |
| Card already linked elsewhere | `CONFLICTED`, escalate |
| No evidence packets | `MISSING_INPUT` |

---

## Metrics

| Metric | Target |
|--------|--------|
| proposalCount | 2 per ankle pilot (card + question gaps) |
| acceptanceRate | > 0.7 |

---

## Example WorkAssignment

```json
{
  "id": "work-asset-linker",
  "gaps": [{
    "kind": "missing_asset_link",
    "anchorEntitySlug": "ankle-fracture",
    "ontologyRule": "asset.anki_card.link",
    "priority": "low"
  }],
  "dependencies": ["work-clinical-entity-builder"]
}
```

---

## Example ProposalEnvelope

```json
{
  "proposalId": "ankle-pilot:retarget_card:12345:ankle-fracture",
  "target": { "objectType": "retarget_card_to_entity", "label": "Card 12345 → ankle-fracture" },
  "confidence": 0.88,
  "reviewRecommendation": {
    "route": "AUTO_APPROVED_LOW_RISK",
    "evidenceScore": 0.85,
    "requiredReviewerRole": "none"
  }
}
```

---

## Example Confidence Calculation

```
evidenceQuality = 0.85 (direct mapping)
sourceAgreement = 1.0
composite = 0.88 → AUTO_APPROVED_LOW_RISK
```

---

## Example Review Recommendation

Inferred mapping with 2 candidate entities → `CONFLICTED`, conflictRisk 0.6.

---

## Example Failure

```json
{
  "status": "failed",
  "errors": [{ "code": "MISSING_INPUT", "reason": "Required input not provided: evidence_packets" }]
}
```

---

## Non-Goals

- Creating Anki cards or OB questions
- Educational claim generation from card text
- Entity creation
- Asset content modification

---

## Integration with Compiler

- 2 asset link gaps in ankle pilot
- Low priority (maturity L7 concern)

## Integration with Merge Engine

- Asset counts in `NeighborhoodSnapshot.assets`

## Integration with Review Engine

- Low safety risk; typically auto-approved

---

## Future Improvements

- Fuzzy card→entity matching with confidence thresholds
- Batch retargeting from curriculum node bridges
- Orphan card detection (cards linked to non-existent entities)

---

## Open Questions

- Should asset links create `supported_by_card` relationships in addition to retarget proposals?
- How to handle cards mapped to multiple entities (primary vs secondary)?