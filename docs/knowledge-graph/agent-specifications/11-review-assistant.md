# Agent Specification: Review Assistant

**Agent ID:** `review-assistant`  
**Status:** Reference adapter registered (wraps Review Engine)  
**Framework version:** 1.0.0

---

## Purpose

Run explainable auto-review on all proposals and produce review routing recommendations. Bridges the Intelligent Curator to the Agent Contract Framework without changing routing behavior.

---

## Responsibilities

- Execute `runAutoReview()` on proposal batches
- Produce `review_report` output with per-proposal decisions
- Wrap proposals as `ProposalEnvelope` with curator-aligned routes
- Never auto-approve attending-gated content
- Never modify proposal clinical content (revisions handled by curator)

---

## Inputs

| ConsumesCapability | Required |
|--------------------|----------|
| `proposal_packets` | Yes |
| `merged_neighborhood_draft` | No (not yet wired) |
| `work_assignment` | Yes |

---

## Outputs

| ProducesCapability | Output |
|--------------------|--------|
| `review_report` | `AutoReviewReport` in `outputs` |

Returns curated proposals as `rawProposals` (with curation metadata stamped).

---

## Capabilities

```
handlesGapKinds: []
requires: []
proposalTypes: []
confidenceRange: { min: 0.90, max: 0.99 }
validationCategories: [safety, publication, ontology]
```

Work type: `review` (not gap-based).

---

## Dependencies

```
requires: []
```

Depends on all gap-resolution agents completing (via work item dependencies).

---

## Ontology Rules Used

- All review routing rules from `06-review-framework.md`
- Curator `classifyRoute()` rules
- `AUTO_ENTITY_TYPES`, `HUMAN_REVIEW_CLAIM_TYPES`, `LOW_RISK_PREDICATES`

---

## Evidence Required

Reviews existing proposal evidence — does not gather new evidence.

---

## Proposal Types Generated

None. Review Assistant routes existing proposals; it does not create new ones.

---

## Confidence Model

Uses curator `CurationScores` bridged to `ReviewRecommendation`:

| Curator score | Envelope field |
|---------------|----------------|
| `confidence` | `confidence` |
| `evidence` | `evidenceScore` |
| `safety` | `safetyScore` |
| ontology check | `ontologyComplianceScore` |

---

## Validation Rules

| Rule | Check |
|------|-------|
| `explainable_scores` | All scores decomposable |
| `no_opaque_ai_score` | No LLM-only scores in default path |

---

## Review Routing

Review Assistant is the **authoritative router**. It applies all routes from `06-review-framework.md`.

| Output | Description |
|--------|-------------|
| `autoReviewReport.summary` | Category counts |
| `autoReviewReport.humanReviewPercent` | Human review burden |
| `autoReviewReport.decisions[]` | Per-proposal decisions |

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Empty proposal batch | completed, 0 decisions |
| Curator internal error | failed |

---

## Metrics

| Metric | Description |
|--------|-------------|
| escalationCount | All non-auto-approved |
| acceptanceRate | AUTO_APPROVE / total |
| executionTimeMs | Batch review time |

---

## Example WorkAssignment

```json
{
  "id": "work-review-assistant",
  "type": "review",
  "priority": 90,
  "dependencies": ["work-relationship-builder", "work-claim-builder", "work-decision-point-builder"],
  "validationRules": ["explainable_scores", "no_opaque_ai_score"],
  "gapIds": []
}
```

---

## Example ProposalEnvelope

Review Assistant re-wraps existing proposals with curator routes:

```json
{
  "proposalId": "ankle-pilot:rel:ankle-fracture:part_of:tibia",
  "reviewRecommendation": {
    "route": "AUTO_APPROVED_LOW_RISK",
    "confidence": 0.94,
    "safetyScore": 0.1,
    "evidenceScore": 0.82,
    "ontologyComplianceScore": 1.0,
    "duplicateRisk": 0.05,
    "conflictRisk": 0.0,
    "reason": "Composite confidence 0.940 from explainable dimensions",
    "requiredReviewerRole": "none"
  }
}
```

---

## Example Confidence Calculation

Curator scores for relationship proposal:
```
confidence = 0.94, evidence = 0.82, safety = 0.1, completeness = 0.85
→ AUTO_APPROVED_LOW_RISK
```

---

## Example Review Recommendation

Decision point proposal:
```json
{
  "route": "ATTENDING_REVIEW",
  "safetyScore": 0.85,
  "reason": "Rule: decision_point_safety_weight",
  "requiredReviewerRole": "attending"
}
```

---

## Example Failure

```json
{
  "status": "failed",
  "errors": [{ "code": "EXECUTION_ERROR", "reason": "Empty proposal batch with invalid pilot key" }]
}
```

---

## Non-Goals

- Creating proposals
- Human review execution (escalation only)
- Database writes (apply approved proposals)
- LLM-based routing (default path is rule-based)

---

## Integration with Compiler

- Stage 7: Intelligent Auto Review
- Work item depends on all gap-resolution items
- Produces `ontology-auto-review.json`

## Integration with Merge Engine

- Currently reviews pre-merge proposals; future: post-merge review

## Integration with Review Engine

- Review Assistant **is** the Review Engine wrapper
- `reviewProposal()` and `toProposalEnvelope()` exported for external use

---

## Future Improvements

- Post-merge review (on merged draft, not raw proposals)
- LLM enhancement layer (optional, auditable)
- Human review queue prioritization
- Review burden prediction refinement

---

## Open Questions

- Should Review Assistant run twice (pre-merge and post-merge)?
- How to handle proposals that change after AUTO_REVISED revisions?