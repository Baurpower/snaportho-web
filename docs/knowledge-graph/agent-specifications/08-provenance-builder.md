# Agent Specification: Provenance Builder

**Agent ID:** `provenance-builder`  
**Status:** Reference adapter registered (scheduling-only stub)  
**Framework version:** 1.0.0

---

## Purpose

Attach provenance records to proposals and canonical objects for `missing_provenance` gaps. Ensures every published object has traceable source evidence.

---

## Responsibilities

- Create `add_provenance_record` proposals
- Link source signals (cards, questions, OB nodes, expert reviews) to canonical objects
- Populate `evidence_summary` and `source_signal_ids` on related proposals
- Never modify clinical content

---

## Inputs

| ConsumesCapability | Required |
|--------------------|----------|
| `proposal_packets` | Yes |
| `work_assignment` | Yes |

---

## Outputs

| ProducesCapability | Proposal type |
|--------------------|---------------|
| `provenance` | `add_provenance_record` |

---

## Capabilities

```
handlesGapKinds: [missing_provenance]
requires: []
proposalTypes: [add_provenance_record]
confidenceRange: { min: 0.85, max: 0.95 }
validationCategories: [provenance, schema]
```

---

## Dependencies

```
requires: []
```

Independent — can run in parallel with other agents.

---

## Ontology Rules Used

- CKO §2: provenance as governance dimension
- Source hierarchy: expert > Prepare > Anki > OB > LLM
- Every L1 claim requires provenance for L3+ maturity
- `provenanceAttached` tracked in merge stats

---

## Evidence Required

| Source | Use |
|--------|-----|
| Existing proposal source_signal_ids | Primary provenance |
| Evidence packets | Supplementary sources |
| Expert review records | Highest priority attribution |

---

## Proposal Types Generated

### `add_provenance_record`

| Field | Value |
|-------|-------|
| `source_signal_type` | Source classification |
| `source_signal_ids` | Referenced IDs |
| `evidence_summary` | Human-readable summary |
| `metadata.target_fingerprint` | Proposal or entity being attributed |

---

## Confidence Model

| Scenario | Confidence |
|----------|------------|
| Direct source ID match | 0.90–0.95 |
| Inferred from packet | 0.85–0.88 |

Route: typically `AUTO_APPROVED_LOW_RISK`.

---

## Validation Rules

| Category | Check |
|----------|-------|
| provenance | Source IDs and summary present |
| schema | Target fingerprint valid |

---

## Review Routing

| Scenario | Route |
|----------|-------|
| Deterministic source link | `AUTO_APPROVED_LOW_RISK` |
| Conflicting source attribution | `HUMAN_REVIEW` |

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Target proposal not found | skip |
| No source signals | `MISSING_PROVENANCE` warning on target |

---

## Metrics

| Metric | Target |
|--------|--------|
| acceptanceRate | > 0.9 |
| executionTimeMs | Low (metadata-only) |

---

## Example WorkAssignment

```json
{
  "id": "work-provenance-builder",
  "gaps": [{
    "kind": "missing_provenance",
    "anchorEntitySlug": "ankle-fracture",
    "ontologyRule": "provenance.entity.required",
    "priority": "medium"
  }]
}
```

---

## Example ProposalEnvelope

```json
{
  "proposalId": "ankle-pilot:provenance:ankle-fracture:ob-node-123",
  "target": { "objectType": "add_provenance_record", "label": "OB node 123 → ankle-fracture" },
  "confidence": 0.93,
  "reviewRecommendation": { "route": "AUTO_APPROVED_LOW_RISK", "requiredReviewerRole": "none" }
}
```

---

## Example Confidence Calculation

```
evidenceQuality = 0.9
sourceAgreement = 1.0
composite = 0.93
```

---

## Example Review Recommendation

Standard: `AUTO_APPROVED_LOW_RISK` — provenance is administrative, not clinical.

---

## Example Failure

No `proposal_packets` input → `status: failed`, `MISSING_INPUT`.

---

## Non-Goals

- Clinical content generation
- Source content extraction (upstream intake agents)
- Provenance for draft-only objects at L0–L1

---

## Integration with Compiler

- Provenance gaps from gap analyzer neighborhood-level checks

## Integration with Merge Engine

- `provenanceAttached` stat in merge stats

## Integration with Review Engine

- Missing provenance on other proposals triggers validation warnings

---

## Future Improvements

- Provenance chain visualization
- Source conflict resolution when multiple sources disagree
- Staleness tracking (12/24 month review cycles)

---

## Open Questions

- Should provenance be a separate canonical table object or proposal-only in v1?
- How to provenance-track LLM-generated content distinctly from human-authored?