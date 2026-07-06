# Agent Specification: Claim Builder

**Agent ID:** `claim-builder`  
**Status:** Reference adapter registered (scheduling-only stub)  
**Framework version:** 1.0.0

---

## Purpose

Produce `propose_educational_claim` proposals that fill L1–L4 educational assertion gaps. Claims teach; they do not decide (Decision Point Builder handles reasoning).

---

## Responsibilities

- Create educational claims for `missing_claim` gaps
- Assign `claim_type`, `importance_level`, and `why_it_matters` tags
- Always emit `content_source: generated_draft`, `verified: false`
- Respect L1 cap (10–12 per primary entity, hard max 15)
- Never auto-verify claims

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
| `claims` | `propose_educational_claim` |

---

## Capabilities

```
handlesGapKinds: [missing_claim]
requires: [relationship-builder]
proposalTypes: [propose_educational_claim]
confidenceRange: { min: 0.65, max: 0.85 }
validationCategories: [schema, safety, publication, provenance]
```

---

## Dependencies

```
requires: [relationship-builder]
```

Claims anchor to entities linked via relationships.

---

## Ontology Rules Used

- CKO §9: 5–12 L1 claims + traps per fracture pattern
- Excellence Roadmap: L1 codes (patient_safety, board_trap, changes_management, etc.)
- Every L1 requires ≥1 `why_it_matters` tag
- Traps (`board_trap`, `cognitive_trap`, `red_flag`) are claims, not entity types
- Claim types: `anatomy_pearl`, `board_trap`, `cognitive_trap`, `red_flag`, `imaging_point`, `clinical_script`

---

## Evidence Required

| Source | Use |
|--------|-----|
| Static Prepare claims | Highest priority text source |
| Anki card clusters | Claim text candidates |
| OrthoBullets pearls | Supporting evidence |
| LLM extraction | Proposal only, lowest priority |

---

## Proposal Types Generated

### `propose_educational_claim`

| Field | Value |
|-------|-------|
| `metadata.claim_type` | From gap or inference |
| `metadata.claim_text` | Educational assertion text |
| `metadata.importance_level` | L1, L2, L3, L4 |
| `metadata.primary_entity_slug` | Anchor entity |
| `metadata.content_source` | `generated_draft` (always) |
| `metadata.verified` | `false` (always) |
| `metadata.why_it_matters` | Required for L1 |
| `review_status` | `generated` |

---

## Confidence Model

| Claim type | safetyLevel | Typical route |
|------------|-------------|---------------|
| `anatomy_pearl` (spec-backed) | 0.15 | `AUTO_APPROVED_LOW_RISK` |
| `board_trap` | 0.55 | `HUMAN_REVIEW` or `ATTENDING_REVIEW` |
| `red_flag` | 0.55 | `ATTENDING_REVIEW` |
| L1 management fact | 0.3+ | `HUMAN_REVIEW` |
| Long text (>220 chars) | completeness 0.5 | `AUTO_REVISED` |

---

## Validation Rules

| Category | Check |
|----------|-------|
| schema | Fingerprint, claim text present |
| safety | Trap types flagged |
| publication | `DRAFT_LEAK` if verified=true (critical) |
| provenance | Evidence summary |

---

## Review Routing

| Claim type | Route | Reviewer |
|------------|-------|----------|
| `anatomy_pearl` on hub | `AUTO_APPROVED_LOW_RISK` | none |
| `board_trap` | `HUMAN_REVIEW` | curator |
| `red_flag` | `ATTENDING_REVIEW` | attending |
| L1 with safety content | `HUMAN_REVIEW` | curator/clinical |

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| L1 cap exceeded | warning, skip lowest priority |
| Draft leak | `DRAFT_LEAK`, blocked |
| No anchor entity | `MISSING_INPUT`, blocked |

---

## Metrics

| Metric | Expected |
|--------|----------|
| escalationCount | High (most claims need review) |
| acceptanceRate | Low (< 0.3) |

---

## Example WorkAssignment

```json
{
  "id": "work-claim-builder",
  "assignedAgentId": "claim-builder",
  "gaps": [{
    "kind": "missing_claim",
    "anchorEntitySlug": "mortise-stability",
    "claimType": "board_trap",
    "ontologyRule": "claim.mortise_instability",
    "priority": "medium"
  }],
  "dependencies": ["work-relationship-builder"]
}
```

---

## Example ProposalEnvelope

```json
{
  "proposalId": "ankle-pilot:claim:mortise-stability:board_trap:001",
  "target": { "objectType": "propose_educational_claim", "label": "Mortise stability board trap" },
  "confidence": 0.72,
  "reviewRecommendation": {
    "route": "HUMAN_REVIEW",
    "safetyScore": 0.55,
    "reason": "Safety-adjacent claim type board_trap",
    "requiredReviewerRole": "curator"
  },
  "publicationEligible": false
}
```

---

## Example Confidence Calculation

```
claim_type = board_trap → safetyLevel = 0.55
evidenceQuality = 0.7
metadataCompleteness = 0.85
composite = 0.72 → HUMAN_REVIEW
```

---

## Example Review Recommendation

`red_flag` claim → `ATTENDING_REVIEW`, requiredReviewerRole `attending`, safetyScore 0.55.

---

## Example Failure

```json
{
  "errors": [{
    "code": "DRAFT_LEAK",
    "reason": "Draft assertion marked verified before human review",
    "severity": "critical",
    "recoverability": "blocked"
  }]
}
```

---

## Non-Goals

- Decision points
- Verified content generation
- Curriculum view text (claims live in KG only)
- Clinical management recommendations without review

---

## Integration with Compiler

- Matches `missing_claim` gaps only
- 9 claim gaps in ankle pilot

## Integration with Merge Engine

- Claims merged by `draftId` into `MergedNeighborhoodDraft.claims`

## Integration with Review Engine

- `HUMAN_REVIEW_CLAIM_TYPES` set
- `educational_judgment_claim` curator rule

---

## Future Improvements

- Static Prepare decomposition into canonical claims
- Card cluster → claim type inference
- L1 cap enforcement with priority ranking
- `why_it_matters` auto-tagging from claim content

---

## Open Questions

- Should LLM-generated claim text ever exceed 220 chars, or truncate at generation time?
- How to handle duplicate claim text across anchors (Duplicate Detector scope)?