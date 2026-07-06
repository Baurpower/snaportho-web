# Agent Specification: Conflict Resolver

**Agent ID:** `conflict-resolver`  
**Status:** Specified only — **not yet registered**  
**Framework version:** 1.0.0

---

## Purpose

Detect and escalate irreconcilable conflicts between proposals, sources, and merged drafts. Routes conflicts to human resolution via `CONFLICTED` review path.

---

## Responsibilities

- Consume merge engine conflict list and proposal `conflict_count` signals
- Classify conflict severity (informational, resolvable, irreconcilable)
- Escalate irreconcilable conflicts — never auto-resolve safety conflicts
- Emit conflict reports in `outputs` (no new canonical proposals in v1)
- Coordinate with Review Engine for `CONFLICTED` routing

---

## Inputs

| ConsumesCapability | Required |
|--------------------|----------|
| `merged_neighborhood_draft` | Yes |
| `proposal_packets` | Yes |
| `auto_review_report` | Yes |
| `work_assignment` | Yes |

---

## Outputs

| ProducesCapability | Output |
|--------------------|--------|
| `quality_metrics` | Conflict report in `outputs` |

No proposal types in v1 — escalation only. Future versions may emit supersede proposals.

---

## Capabilities (proposed)

```
handlesGapKinds: []
requires: [review-assistant]
proposalTypes: []
confidenceRange: { min: 0.80, max: 0.95 }
validationCategories: [safety, publication]
```

---

## Dependencies

```
requires: [review-assistant]
```

Runs after review to incorporate routing context.

---

## Ontology Rules Used

- Source hierarchy: expert > Prepare > Anki > OB > LLM
- CKO §7: `review_status: conflicted` for unresolved contradictions
- No contradictory approved L1 without explicit exception
- `conflict_count > 0` blocks publication
- Merge engine: `relationship_metadata_conflict` kind

---

## Evidence Required

| Signal | Use |
|--------|-----|
| `proposal.conflict_count` | Per-proposal conflict tally |
| `MergedNeighborhoodDraft.conflicts` | Merge-time conflicts |
| Source hierarchy | Resolution priority |
| Auto-review decisions | Already-routed conflicts |

---

## Proposal Types Generated

None in v1. Future: supersede proposals or conflict resolution patches.

---

## Confidence Model

| Conflict type | conflictRisk |
|---------------|--------------|
| Metadata mismatch (resolvable) | 0.3–0.5 |
| Source disagreement (2+ sources) | 0.6–0.8 |
| Safety conflict (contradictory DPs) | 0.9+ |
| `conflict_count >= 2` | → `CONFLICTED` route |

---

## Validation Rules

| Category | Check |
|----------|-------|
| safety | Safety conflicts never auto-resolved |
| publication | Unresolved conflicts block readiness |

---

## Review Routing

| Conflict severity | Route | Reviewer |
|-------------------|-------|----------|
| Informational | No route change | — |
| Resolvable | `AUTO_REVISED` or `HUMAN_REVIEW` | curator |
| Irreconcilable | `CONFLICTED` | curator → attending if safety |
| Safety-critical | `ATTENDING_REVIEW` | attending |

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Merge draft unavailable | Skip merge conflicts; use proposal signals only |
| Circular conflict | Escalate all parties to `CONFLICTED` |

---

## Metrics

| Metric | Description |
|--------|-------------|
| escalationCount | Conflicts escalated |
| conflictResolutionRate | Resolved / total (requires human feedback) |

---

## Example WorkAssignment

```json
{
  "id": "work-conflict-resolver",
  "type": "quality_scoring",
  "assignedAgentId": "conflict-resolver",
  "dependencies": ["work-review-assistant"],
  "validationRules": ["safety_valid", "publication_valid"]
}
```

---

## Example ProposalEnvelope

Conflict Resolver does not emit envelopes in v1. Instead, it elevates existing envelopes:

```json
{
  "proposalId": "ankle-pilot:claim:mortise-stability:l1:002",
  "reviewRecommendation": {
    "route": "CONFLICTED",
    "conflictRisk": 0.75,
    "reason": "Conflicting evidence signals (3 conflicts)",
    "requiredReviewerRole": "curator"
  }
}
```

---

## Example Confidence Calculation

Not applicable to v1 (no proposals). Conflict report includes severity scores per conflict pair.

---

## Example Review Recommendation

Proposal with `conflict_count: 3` → route overridden to `CONFLICTED`, conflictRisk `max(0.6, duplicateRisk)`.

---

## Example Failure

```json
{
  "status": "completed",
  "outputs": {
    "conflictsDetected": 2,
    "conflictsEscalated": 2,
    "safetyConflicts": 1,
    "resolvableConflicts": 0
  },
  "proposals": []
}
```

---

## Non-Goals

- Auto-resolving safety conflicts
- Superseding proposals without human approval (v1)
- Modifying source content
- Publishing conflicted objects

---

## Integration with Compiler

- Referenced in `agent-contract-summary.md` as future agent
- Would run between Merge Engine and Publication Validator

## Integration with Merge Engine

- Primary input: `MergedNeighborhoodDraft.conflicts[]`

## Integration with Review Engine

- `mapCurationRouteToReviewRoute` already handles `conflict_count >= 2`
- Conflict Resolver adds merge-level conflicts to this pipeline

---

## Future Improvements

- Auto-resolve low-severity metadata conflicts via source hierarchy
- Supersede proposal generation
- Conflict pair visualization for human reviewers
- Integration with attending review workflow

---

## Open Questions

1. **Authority:** Can Conflict Resolver auto-supersede lower-priority proposals using source hierarchy?
2. **Registration:** Separate agent or extension of Review Assistant?
3. **Safety conflicts:** Always attending, or curator first with attending escalation?
4. **Merge timing:** Should conflicts block downstream agents or allow partial progress?