# Validation Framework Specification

**Status:** Canonical architectural specification  
**Implementation:** `scripts/lib/education/kg-agent-framework/validation.ts`, `kg-factory/validator.ts`

---

## Purpose

Validation ensures every proposal conforms to schema, ontology, safety, and publication rules before entering the merge and review pipeline. Validation runs at two levels:

1. **Per-proposal** — during agent self-validation
2. **Per-batch** — during packet validation and publication readiness

---

## Validation Categories

```
schema | ontology | relationship | duplicate | metadata | provenance | safety | publication
```

Each category reports `{ passed: boolean, issueCount: number }`.

---

## Schema Validation

### Rules

| Code | Severity | Condition | Recoverability |
|------|----------|-----------|----------------|
| `MISSING_FINGERPRINT` | error | `proposal_fingerprint` empty | blocked |
| `MISSING_PROPOSAL_ID` | error | Envelope `proposalId` empty | blocked |
| `MISSING_ROUTE` | error | Envelope missing review route | blocked |
| `MISSING_ASSIGNMENT_ID` | error | WorkAssignment `id` empty | blocked |
| `MISSING_AGENT` | error | WorkAssignment `assignedAgentId` empty | blocked |
| `MISSING_INPUT` | error | Required input not provided | blocked |
| `EMPTY_GAPS` | warning | Gap assignment has no gaps | skip |
| `NO_REQUIRED_INPUTS` | warning | Gap assignment missing required inputs | retry |

### Input validation map

See `03-agent-lifecycle.md` Stage 2 for `ConsumesCapability` presence rules.

---

## Ontology Validation

### Relationship triple validation

For `add_canonical_relationship` proposals with subject type, object type, and predicate:

```
validateRelationshipTriple({
  subjectEndpointType: "canonical_entity",
  subjectEntityType,
  predicate,
  objectEndpointType: "canonical_entity",
  objectEntityType
})
```

| Code | Severity | Condition |
|------|----------|-----------|
| `ONTOLOGY_VIOLATION` | error | Triple fails registry constraints |

Registry constraints include:
- Allowed subject/object entity type pairs per predicate
- Predicate existence in relationship registry
- Endpoint type compatibility

### Entity type validation

Entity proposals must use valid `CanonicalEntityType` values from the ontology plan (~18 types).

---

## Relationship Validation

Relationship-specific checks beyond ontology:

| Check | Severity | Description |
|-------|----------|-------------|
| Predicate present | error (via validity score) | Missing predicate on relationship proposal |
| Subject/object slugs | warning | Missing slug metadata |
| High-risk without metadata | warning | High-risk predicate without `relationship_metadata` |

Relationship Builder and Metadata Builder are jointly responsible for complete relationship metadata.

---

## Metadata Validation

| Code | Severity | Condition | Recoverability |
|------|----------|-----------|----------------|
| `MISSING_REL_METADATA` | warning | Relationship missing `anatomy_role` and `clinical_importance` | retry |

### Required relationship metadata (publication)

Per Anatomy Ontology Plan §6:

| Field | Required for publication |
|-------|-------------------------|
| `anatomy_role` | `essential`, `supporting`, `background`, or `advanced` |
| `relevance_reason` | Diagnosis, exam, imaging, approach, etc. |
| `clinical_importance` | Weighting score |

### Required entity metadata

| Field | Required |
|-------|----------|
| `slug` | Yes (or auto-generated on AUTO_REVISED) |
| `anatomy_kind` | For `anatomy_structure` |
| `clinical_kind` | For `condition` |

---

## Duplicate Detection

| Code | Severity | Condition | Recoverability |
|------|----------|-----------|----------------|
| `DUPLICATE_FINGERPRINT` | error | Same fingerprint in batch | skip |

Duplicate Detector agent (specified, not yet registered) will additionally emit:
- `flag_duplicate_entity`
- `flag_possible_merge`
- `flag_possible_split`

### Duplicate detection strategies (future)

| Strategy | Scope |
|----------|-------|
| Fingerprint match | Within batch |
| Label similarity | Cross-entity within neighborhood |
| Slug collision | Within entity type |
| Claim text hash | Cross-claim within anchor entity |

---

## Conflict Detection

| Signal | Source | Effect |
|--------|--------|--------|
| `conflict_count > 0` | Proposal record | Elevated `conflictScore`, reduced `sourceAgreement` |
| `conflict_count >= 2` | Proposal record | Route → `CONFLICTED` |
| `relationship_metadata_conflict` | Merge engine | Listed in `MergedNeighborhoodDraft.conflicts` |

Conflict Resolver agent (specified, not yet registered) will handle irreconcilable merge conflicts.

---

## Safety Validation

| Code | Severity | Condition | Recoverability |
|------|----------|-----------|----------------|
| `DP_ATTENDING_FLAG` | info | Decision point with `requires_attending_review` | escalate |

### Safety rules (hard gates)

- Decision points always route to `ATTENDING_REVIEW`
- High-risk predicates never auto-approve
- `must_protect_during` edges require governance gate
- Emergency DPs require attending sign-off before publication
- Red flag claims require attending review

---

## Publication Validation

| Code | Severity | Condition | Recoverability |
|------|----------|-----------|----------------|
| `DRAFT_LEAK` | critical | Claim/DP marked `verified: true` or `content_source: verified` before human review | blocked |

### Publication readiness checks (Publication Validator)

| Check | Blocker |
|-------|---------|
| `currentLevel < requiredLevel` | Yes |
| Critical gaps remaining | Yes |
| Batch validation failed | Yes |
| Draft L1 claims in neighborhood | Yes |
| Safety DP without `safety_reviewed_at` | Yes |
| `conflict_count > 0` on approved proposals | Yes |
| `public_draft_leak_rate > 0` | Yes |

### publicationEligible on envelope

```
validation.passed
AND reviewRecommendation.route === "AUTO_APPROVED_LOW_RISK"
AND metadata.content_source !== "verified"
```

---

## Batch Validation

`validateProposalBatch(pilotKey, proposals)` combines:

1. Packet-level validation from `validateProposalPacket()`
2. Per-proposal `validateProposal()` results
3. Fingerprint deduplication

Used by Publication Validator and pilot persist scripts.

---

## Validation in Agent Lifecycle

```
Agent.run() → ProposalRecord[]
    ↓
wrapProposals() → validateProposal() per record
    ↓
AgentResult.validation (aggregate)
    ↓
status: completed | partial | failed
```

| Status | Validation outcome |
|--------|-------------------|
| `completed` | No error/critical issues |
| `partial` | Error-severity issues present |
| `failed` | Input validation or execution failure |

---

## Related Documents

- `06-review-framework.md` — How validation failures affect routing
- `02-agent-contract.md` — `ValidationResult` type