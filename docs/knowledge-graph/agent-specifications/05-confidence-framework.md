# Confidence Framework Specification

**Status:** Canonical architectural specification  
**Implementation:** `scripts/lib/education/kg-agent-framework/confidence.ts`

---

## Purpose

Confidence scoring provides **explainable, rule-derived** quality assessment for every proposal. No opaque AI scores. Every confidence value must be decomposable into named dimensions with a `rulesApplied` audit trail.

---

## ConfidenceBreakdown Dimensions

| Dimension | Range | Meaning |
|-----------|-------|---------|
| `evidenceQuantity` | 0–1 | How much supporting evidence exists |
| `evidenceQuality` | 0–1 | How trustworthy the evidence sources are |
| `sourceAgreement` | 0–1 | How well sources agree (inverse of conflicts) |
| `ontologyCompliance` | 0–1 | Conformance to ontology rules and registry |
| `relationshipValidity` | 0–1 | Validity of relationship triple (if applicable) |
| `metadataCompleteness` | 0–1 | Presence of required metadata fields |
| `conflictScore` | 0–1 | Severity of detected conflicts (higher = worse) |
| `safetyLevel` | 0–1 | Safety criticality (higher = more dangerous) |

All values clamped to [0, 1].

---

## Dimension Formulas

### evidenceQuantity

```
(supporting_card_count + supporting_question_count) / 20
```

Capped at 1.0. More cards/questions → higher quantity score.

### evidenceQuality

Base 0.5, bonuses:
- `+0.15` if `supporting_card_count > 0`
- `+0.15` if `supporting_question_count > 0`
- `+0.10` if `supporting_source_count > 1`

### sourceAgreement

```
1 - (conflict_count * 0.2)
```

Each conflict reduces agreement by 0.2. `conflict_count >= 5` → 0.

### ontologyCompliance

| Proposal type | Default | Boost |
|---------------|---------|-------|
| `create_canonical_entity` with `metadata.pilot` | 0.9 | → 0.98 (`spec_backed_entity`) |
| `add_canonical_relationship` | 0.9 | — |
| Other | 0.9 | — |

### relationshipValidity

| Condition | Score |
|-----------|-------|
| `add_canonical_relationship` with predicate | 0.95 |
| `add_canonical_relationship` without predicate | 0.4 |
| Non-relationship proposals | 1.0 |

### metadataCompleteness

| Condition | Score |
|-----------|-------|
| Has `metadata.slug` or `metadata.relationship_metadata` | 0.85 |
| Relationship without `relationship_metadata` | 0.5 (`missing_relationship_metadata`) |
| Claim text > 220 chars | 0.5 (`claim_length_penalty`) |
| Default | 0.55 |

### conflictScore

```
conflict_count * 0.25
```

Capped at 1.0.

### safetyLevel

| Condition | Score | Rule tag |
|-----------|-------|----------|
| Default | 0.1 | — |
| High-risk predicate on relationship | 0.75 | `high_risk_predicate` |
| `propose_decision_point` | 0.85 | `decision_point_safety_weight` |
| Claim type: `board_trap`, `cognitive_trap`, `red_flag` | 0.55 | `safety_adjacent_claim` |

### HIGH_RISK_PREDICATES

```
at_risk_structure, indicates_treatment, treated_by, uses_fixation, explains_instability
```

Also treated as high-risk: `at_risk_structure`, `indicates_treatment` (explicit check beyond set).

---

## Composite Confidence

```
confidence = clamp01(
  proposal.confidence * 0.25 +
  evidenceQuality * 0.20 +
  ontologyCompliance * 0.20 +
  relationshipValidity * 0.15 +
  metadataCompleteness * 0.10 +
  sourceAgreement * 0.10 -
  conflictScore * 0.10
)
```

Weights sum to 1.0 before conflict penalty.

---

## Confidence Tiers (ProposalRecord)

| Tier | Threshold |
|------|-----------|
| `high` | ≥ 0.85 |
| `medium` | ≥ 0.65 |
| `low` | < 0.65 |

Agents set `proposal.confidence` and `confidence_tier` on raw proposals; framework recomputes composite.

---

## Route Recommendation from Confidence

`recommendRoute(proposal, breakdown, confidence)` — evaluated in priority order:

| Priority | Condition | Route |
|----------|-----------|-------|
| 1 | `conflict_count >= 2` | `CONFLICTED` |
| 2 | `propose_decision_point` | `ATTENDING_REVIEW` |
| 3 | High-risk relationship predicate | `ATTENDING_REVIEW` |
| 4 | `safetyLevel >= 0.7` | `ATTENDING_REVIEW` |
| 5 | `confidence >= 0.88` AND `conflictScore < 0.15` AND `safetyLevel < 0.3` | `AUTO_APPROVED_LOW_RISK` |
| 6 | `confidence >= 0.72` AND `metadataCompleteness < 0.65` | `AUTO_REVISED` |
| 7 | `safetyLevel >= 0.5` | `ATTENDING_REVIEW` |
| 8 | `confidence < 0.6` OR `conflictScore > 0.35` | `HUMAN_REVIEW` |
| 9 | Default | `HUMAN_REVIEW` |

---

## Curator Scoring (Parallel System)

The Intelligent Curator uses a separate `CurationScores` model:

| Dimension | Meaning |
|-----------|---------|
| `confidence` | Proposal confidence (boosted for spec-backed) |
| `evidence` | Card/question evidence strength |
| `ambiguity` | Uncertainty (penalized by conflicts, long claims) |
| `safety` | Safety criticality |
| `completeness` | Metadata completeness |

The Review Engine bridges curator scores to `ReviewRecommendation` fields. Agents should align with curator thresholds but the curator is authoritative at review time.

---

## Publication Readiness Score

Computed by Review Engine per decision:

| Category | Formula |
|----------|---------|
| `REJECT` | 0 |
| `EXPERT_REVIEW` | `min(0.45, confidence * 0.5)` |
| `SAFE_REVIEW` | `min(0.7, confidence * 0.75)` |
| `AUTO_APPROVE` | `min(0.85, confidence * completeness)` |

---

## Duplicate Probability

```
conflict_count > 0 ? min(0.9, conflict_count * 0.2) : 0.05
```

Also mapped from `confidence.breakdown.conflictScore` in envelope wrapping.

---

## Agent-Specific Confidence Ranges

Declared in `capabilities.confidenceRange`:

| Agent | Min | Max |
|-------|-----|-----|
| Anatomy Builder | 0.85 | 0.95 |
| Clinical Entity Builder | 0.80 | 0.95 |
| Relationship Builder | 0.80 | 0.98 |
| Claim Builder | 0.65 | 0.85 |
| Decision Point Builder | 0.60 | 0.80 |
| Metadata Builder | 0.75 | 0.90 |
| Asset Linker | 0.70 | 0.90 |
| Provenance Builder | 0.85 | 0.95 |
| Review Assistant | 0.90 | 0.99 |
| Publication Validator | 0.95 | 0.99 |

Agents should not emit proposals outside their declared range without explicit rule justification in `rulesApplied`.

---

## Example: Relationship Proposal Confidence

**Proposal:** `add_canonical_relationship`, predicate `part_of`, 3 supporting cards, no conflicts, spec-backed.

| Dimension | Value | Rule |
|-----------|-------|------|
| evidenceQuantity | 0.15 | 3/20 |
| evidenceQuality | 0.80 | cards + base |
| sourceAgreement | 1.0 | no conflicts |
| ontologyCompliance | 0.9 | default |
| relationshipValidity | 0.95 | predicate present |
| metadataCompleteness | 0.5 | missing rel metadata |
| conflictScore | 0.0 | — |
| safetyLevel | 0.1 | low-risk predicate |

**Composite:** ~0.82 → `AUTO_REVISED` (metadata incomplete) or `HUMAN_REVIEW` depending on thresholds.

---

## Related Documents

- `06-review-framework.md` — How confidence drives routing
- `02-agent-contract.md` — `ConfidenceBreakdown` type