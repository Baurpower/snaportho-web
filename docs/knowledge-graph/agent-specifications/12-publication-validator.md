# Agent Specification: Publication Validator

**Agent ID:** `publication-validator`  
**Status:** Reference adapter registered (wraps publication-validator)  
**Framework version:** 1.0.0

---

## Purpose

Evaluate neighborhood maturity, publication blockers, and product readiness gates. Final agent in the pipeline before human-approved canonical apply.

---

## Responsibilities

- Assess maturity level (L0–L7) against target
- Identify publication blockers
- Compute per-dimension scores (clinical, relationship, educational, reasoning, anatomical, review, graph, asset)
- Report product readiness (Prepare, BroBot, CasePrep)
- Never auto-publish or modify database

---

## Inputs

| ConsumesCapability | Required |
|--------------------|----------|
| `auto_review_report` | Yes |
| `gap_report` | Yes |
| `proposal_packets` | Yes |
| `work_assignment` | Yes |

---

## Outputs

| ProducesCapability | Output |
|--------------------|--------|
| `publication_report` | `PublicationReadinessResult` in `outputs` |

No proposals generated.

---

## Capabilities

```
handlesGapKinds: []
requires: [review-assistant]
proposalTypes: []
confidenceRange: { min: 0.95, max: 0.99 }
validationCategories: [publication, safety]
```

Work type: `publication_validation`.

---

## Dependencies

```
requires: [review-assistant]
```

---

## Ontology Rules Used

- CKO §12 maturity model (L0–L7)
- Factory build plan publication blockers
- Product readiness gates:
  - BroBot: L2+ (no draft claims in neighbor)
  - Prepare display: L5+
  - Prepare call emergency: L4+ DPs + L6 safety
  - CasePrep: L4+ DPs + `must_protect_during`
  - OITE: L3+ board traps + asset links
  - Production: L7

---

## Evidence Required

Uses auto-review decisions, gap report, and proposal validation — no new evidence.

---

## Proposal Types Generated

None.

---

## Confidence Model

Publication Validator confidence reflects assessment certainty, not clinical confidence:

| Assessment | Confidence |
|------------|------------|
| Clear blockers present | 0.98–0.99 |
| Borderline maturity | 0.95–0.97 |

---

## Validation Rules

| Rule | Check |
|------|-------|
| `no_auto_publish` | ready=false always in compile pass |
| `draft_leak_blocked` | No verified drafts in batch |

---

## Review Routing

Publication Validator does not route proposals. It reports:

| Field | Meaning |
|-------|---------|
| `ready` | Publication ready (always false in pilot) |
| `blockers[]` | Hard blockers |
| `remainingWork[]` | Work needed to reach target |
| `effortBand` | low / medium / high |

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Missing auto-review | Re-run `runAutoReview()` (current impl) |
| Critical gaps remain | `ready: false`, blockers populated |

---

## Metrics

| Metric | Description |
|--------|-------------|
| `currentLevel` | Assessed maturity |
| `blockerCount` | Blocker count |
| `dimensionScores` | Per-dimension maturity |

---

## Example WorkAssignment

```json
{
  "id": "work-publication-validator",
  "type": "publication_validation",
  "priority": 95,
  "dependencies": ["work-review-assistant"],
  "validationRules": ["no_auto_publish", "draft_leak_blocked"]
}
```

---

## Example ProposalEnvelope

Publication Validator does not emit envelopes. Example output:

```json
{
  "outputs": {
    "publicationReadiness": {
      "currentLevel": 5,
      "requiredLevel": 7,
      "ready": false,
      "blockers": [
        "16 proposals pending human/attending review",
        "Factory quality maturity below target (6 < 7)",
        "Human review burden 27.6% exceeds pilot threshold"
      ],
      "dimensionScores": {
        "clinical": 0.85,
        "relationship": 0.80,
        "educational": 0.65,
        "reasoning": 0.55,
        "anatomical": 0.90,
        "review": 0.45,
        "graph": 0.75,
        "asset": 0.30
      },
      "productReadiness": {
        "traversalSmokeTest": false,
        "prepareReady": false,
        "brobotReady": false
      }
    }
  }
}
```

---

## Example Confidence Calculation

Not applicable (no proposals). Assessment confidence: 0.98 (deterministic blocker detection).

---

## Example Review Recommendation

Not applicable. Publication Validator consumes review recommendations; it does not produce them.

---

## Example Failure

```json
{
  "status": "completed",
  "outputs": { "ready": false, "blockers": ["Critical gaps remaining: 3"] }
}
```

---

## Non-Goals

- Auto-publishing neighborhoods
- Applying approved proposals to database
- Clinical verification
- Overriding review routes

---

## Integration with Compiler

- Stage 9: Publication Readiness
- Produces `ontology-publication-readiness.json`
- `constraints.autoPublished: false` always

## Integration with Merge Engine

- Uses merge stats indirectly via maturity assessment

## Integration with Review Engine

- Consumes `AutoReviewReport` for human review burden
- `humanReviewPercent > 5%` tracked but not hard blocker in pilot

---

## Future Improvements

- Per-product readiness dashboards
- Staleness detection (12/24 month review cycles)
- Publication dry-run with traversal smoke tests
- Monitoring integration for L7 production topics

---

## Open Questions

- Should `humanReviewPercent` become a hard blocker at a threshold?
- How to assess maturity when DB-backed vs spec-only snapshots differ?
- Who authorizes L6→L7 promotion — attending only or publication reviewer?