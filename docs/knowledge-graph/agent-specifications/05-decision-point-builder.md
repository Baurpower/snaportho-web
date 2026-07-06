# Agent Specification: Decision Point Builder

**Agent ID:** `decision-point-builder`  
**Status:** Reference adapter registered (scheduling-only stub)  
**Framework version:** 1.0.0

---

## Purpose

Produce `propose_decision_point` proposals for clinical reasoning gaps. Decision points decide; claims teach. All decision points require attending review before publication.

---

## Responsibilities

- Create decision points for `missing_decision_point` gaps
- Assign `pattern_type`, `trigger`, `action`, `urgency`, `safety_criticality`
- Set `requires_attending_review: true` on all proposals
- Always emit `content_source: generated_draft`, `verified: false`
- Never auto-approve

---

## Inputs

| ConsumesCapability | Required |
|--------------------|----------|
| `neighborhood_snapshot` | Yes |
| `canonical_objects` | Yes |
| `work_assignment` | Yes |

---

## Outputs

| ProducesCapability | Proposal type |
|--------------------|---------------|
| `decision_points` | `propose_decision_point` |

---

## Capabilities

```
handlesGapKinds: [missing_decision_point]
requires: [relationship-builder]
proposalTypes: [propose_decision_point]
confidenceRange: { min: 0.60, max: 0.80 }
validationCategories: [safety, publication, schema]
```

---

## Dependencies

```
requires: [relationship-builder]
```

---

## Ontology Rules Used

- CKO §9 fracture pattern: ≥1 decision point required
- CKO §9 procedure pattern: ≥3 decision points
- CKO §9 spine emergency: ≥2 emergency DPs
- Decision point patterns: operative_vs_nonop, emergency_call, imaging_decision, fixation_choice
- `changes_management` deferred as edge — use DPs instead

---

## Evidence Required

| Source | Use |
|--------|-----|
| Static Prepare management pathways | DP templates |
| Expert clinical scripts | Highest priority |
| Rule templates | Pattern-based generation |
| LLM | Proposal only |

---

## Proposal Types Generated

### `propose_decision_point`

| Field | Value |
|-------|-------|
| `metadata.pattern_type` | From gap `decisionPointPattern` |
| `metadata.trigger` | Clinical trigger condition |
| `metadata.action` | Recommended action |
| `metadata.urgency` | routine, urgent, emergency |
| `metadata.safety_criticality` | low, medium, high |
| `metadata.requires_attending_review` | `true` (always) |
| `metadata.subject_entity_slug` | Anchor entity |
| `metadata.content_source` | `generated_draft` |
| `metadata.verified` | `false` |

---

## Confidence Model

| Dimension | Value | Rule |
|-----------|-------|------|
| safetyLevel | 0.85 | `decision_point_safety_weight` |
| confidence | 0.60–0.80 | Capped by safety |
| route | Always `ATTENDING_REVIEW` | Hard rule |

---

## Validation Rules

| Category | Check |
|----------|-------|
| safety | `DP_ATTENDING_FLAG` (info) |
| publication | `DRAFT_LEAK` if verified |
| schema | Fingerprint, trigger, action present |

---

## Review Routing

**All decision points → `ATTENDING_REVIEW`**

No exceptions. `attendingGatedProposalTypes` includes `propose_decision_point`.

| Urgency | Additional requirement |
|---------|----------------------|
| emergency | Attending + safety reviewer |
| high safety_criticality | Attending sign-off before L4 maturity |

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Missing anchor entity | blocked |
| Draft leak | critical, blocked |
| Pattern not recognized | HUMAN_REVIEW fallback |

---

## Metrics

| Metric | Expected |
|--------|----------|
| escalationCount | 100% of proposals |
| acceptanceRate | 0 (never auto-approved) |

---

## Example WorkAssignment

```json
{
  "id": "work-decision-point-builder",
  "gaps": [{
    "kind": "missing_decision_point",
    "decisionPointPattern": "operative_vs_nonop",
    "anchorEntitySlug": "ankle-fracture",
    "ontologyRule": "decision_point.operative",
    "priority": "high",
    "requiredReviewer": "attending"
  }]
}
```

---

## Example ProposalEnvelope

```json
{
  "proposalId": "ankle-pilot:dp:ankle-fracture:operative_vs_nonop",
  "target": { "objectType": "propose_decision_point", "label": "Operative vs non-operative" },
  "confidence": 0.68,
  "reviewRecommendation": {
    "route": "ATTENDING_REVIEW",
    "safetyScore": 0.85,
    "reason": "Decision point requires attending review gate",
    "requiredReviewerRole": "attending"
  },
  "publicationEligible": false
}
```

---

## Example Confidence Calculation

```
safetyLevel = 0.85 (decision_point_safety_weight)
evidenceQuality = 0.7
composite = 0.68 → ATTENDING_REVIEW (mandatory)
```

---

## Example Review Recommendation

Always: route `ATTENDING_REVIEW`, requiredReviewerRole `attending`, publicationEligible `false`.

---

## Example Failure

Attending review attempted auto-approve → safety framework blocks; route remains `ATTENDING_REVIEW`.

---

## Non-Goals

- Auto-approving any decision point
- Emergency pathway activation without attending sign-off
- Converting DPs to relationship edges
- Database writes

---

## Integration with Compiler

- 3 DP gaps in ankle pilot
- `requiredReviewer: attending` on gap rollup

## Integration with Merge Engine

- DPs merged by `draftId`

## Integration with Review Engine

- `decision_point_requires_attending` curator rule
- Category always `EXPERT_REVIEW`

---

## Future Improvements

- Pattern template library per connection pattern
- Emergency DP detection and prioritization
- Safety criticality auto-classification
- Integration with CasePrep call pathways

---

## Open Questions

- Should emergency DPs block all other agent work until attending review completes?
- How to version decision points when clinical guidelines change?