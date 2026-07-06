# Agent Specification: Duplicate Detector

**Agent ID:** `duplicate-detector`  
**Status:** Specified only — **not yet registered**  
**Framework version:** 1.0.0

---

## Purpose

Detect duplicate, mergeable, or splittable entities and claims before they enter the canonical graph. Prevents graph pollution and curriculum duplication.

---

## Responsibilities

- Scan proposal batches and neighborhood for duplicate entities (label, slug, alias collisions)
- Detect mergeable entities (same concept, different slugs)
- Detect splittable entities (one entity covering multiple concepts)
- Emit flag proposals — never modify or delete existing objects
- Report duplicate probability on `ProposalEnvelope`

---

## Inputs

| ConsumesCapability | Required |
|--------------------|----------|
| `neighborhood_snapshot` | Yes |
| `proposal_packets` | Yes |
| `merged_neighborhood_draft` | Yes (when available) |
| `work_assignment` | Yes |

---

## Outputs

| ProducesCapability | Proposal types |
|--------------------|----------------|
| (flags) | `flag_duplicate_entity`, `flag_possible_merge`, `flag_possible_split`, `flag_ambiguous_mapping` |

---

## Capabilities (proposed)

```
handlesGapKinds: []  // operates on batches, not gaps
requires: []
proposalTypes: [flag_duplicate_entity, flag_possible_merge, flag_possible_split, flag_ambiguous_mapping]
confidenceRange: { min: 0.70, max: 0.95 }
validationCategories: [duplicate, schema]
```

**Registration:** Requires new work assignment type or batch-triggered invocation (see Open Questions).

---

## Dependencies

```
requires: []
```

Should run after entity builders, before or after merge (timing TBD).

---

## Ontology Rules Used

- Excellence Roadmap Phase 7: duplication CI (hash compare claim text)
- Anatomy Plan: one nerve hub per nerve (no procedure-local duplicates)
- CKO §11: no orphan/duplicate entities in published neighborhoods
- Source hierarchy for conflict resolution on duplicates

---

## Evidence Required

| Signal | Use |
|--------|-----|
| Label normalization | Fuzzy string match |
| Slug equality | Exact duplicate |
| Alias registry | Cross-alias collision |
| Claim text hash | Content duplication |
| Embedding similarity (future) | Semantic duplicate detection |

---

## Proposal Types Generated

### `flag_duplicate_entity`

Two entities with same label/slug in neighborhood or batch.

### `flag_possible_merge`

Same concept, different representations (e.g. "medial malleolus" vs "medial-malleolus").

### `flag_possible_split`

One entity covering distinct concepts.

### `flag_ambiguous_mapping`

Source signal maps to multiple candidate entities.

---

## Confidence Model

| Detection method | duplicateRisk |
|------------------|---------------|
| Exact slug match | 0.95 |
| Normalized label match | 0.80 |
| Fuzzy match (>0.9) | 0.70 |
| Semantic similarity | 0.60–0.75 |

Route: `HUMAN_REVIEW` for all flags; `REJECT` if exact duplicate in same batch.

---

## Validation Rules

| Category | Check |
|----------|-------|
| duplicate | Fingerprint uniqueness (framework-level) |
| schema | Flag proposals have valid target references |

---

## Review Routing

All flag proposals → `HUMAN_REVIEW` (curator resolves).

Exact batch duplicate → `REJECT` on the duplicate proposal (framework validation).

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| No proposals to scan | `status: completed`, 0 proposals |
| Merge engine unavailable | Skip merged draft checks |

---

## Metrics

| Metric | Description |
|--------|-------------|
| proposalCount | Flags generated |
| duplicateDetectionRate | Flags / entities scanned |
| falsePositiveRate | Requires human feedback loop (future) |

---

## Example WorkAssignment

```json
{
  "id": "work-duplicate-detector",
  "type": "quality_scoring",
  "assignedAgentId": "duplicate-detector",
  "gapIds": [],
  "gaps": [],
  "dependencies": ["work-anatomy-builder", "work-clinical-entity-builder"],
  "validationRules": ["duplicate_valid"]
}
```

---

## Example ProposalEnvelope

```json
{
  "proposalId": "ankle-pilot:flag_dup:medial-malleolus-vs-medial-malleolus-b",
  "target": { "objectType": "flag_duplicate_entity", "label": "medial-malleolus ≈ medial-malleolus-b" },
  "confidence": 0.88,
  "duplicateProbability": 0.92,
  "reviewRecommendation": {
    "route": "HUMAN_REVIEW",
    "duplicateRisk": 0.92,
    "reason": "Normalized label match between two anatomy entities",
    "requiredReviewerRole": "curator"
  }
}
```

---

## Example Confidence Calculation

```
sourceAgreement = 0.9 (consistent signals)
duplicateRisk = 0.92 (high label similarity)
composite = 0.88 → HUMAN_REVIEW
```

---

## Example Review Recommendation

Curator merges entities or rejects duplicate creation proposal.

---

## Example Failure

Scanning empty batch → completed with 0 flags, no error.

---

## Non-Goals

- Auto-merging entities without human approval
- Deleting canonical objects
- Claim text deduplication in curriculum views (separate CI pipeline)
- Relationship duplicate detection (handled by fingerprint + merge key)

---

## Integration with Compiler

- Not yet wired; proposed as post-entity, pre-merge stage
- Would appear in work plan as `quality_scoring` type assignment

## Integration with Merge Engine

- `duplicateEntitiesResolved` stat
- Prevents duplicate slug merges

## Integration with Review Engine

- Elevated `duplicateProbability` on flagged proposals
- `DUPLICATE_FINGERPRINT` validation code

---

## Future Improvements

- Embedding-based semantic dedup
- Cross-pilot duplicate detection
- CI integration for curriculum view text hashing
- Real-time duplicate prevention at entity creation time

---

## Open Questions

1. **Timing:** Pre-merge (on proposals) or post-merge (on draft)? Pre-merge catches earlier; post-merge sees full picture.
2. **Work assignment type:** New `quality_scoring` type or implicit batch hook?
3. **Auto-reject threshold:** Should exact slug duplicates be auto-rejected without human review?
4. **Claim dedup scope:** Within anchor entity only, or cross-neighborhood?