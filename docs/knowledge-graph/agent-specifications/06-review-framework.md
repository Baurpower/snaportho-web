# Review Framework Specification

**Status:** Canonical architectural specification  
**Implementation:** `intelligent-curator.ts`, `review-engine.ts`, `review-bridge.ts`

---

## Purpose

The review framework routes every proposal to the correct human or automated review path. Routing is **deterministic, explainable, and auditable**. Agents recommend routes; the Intelligent Curator and Review Engine make authoritative decisions.

---

## Review Routes

### Framework ReviewRoute

```
AUTO_APPROVED_LOW_RISK | AUTO_REVISED | HUMAN_REVIEW | ATTENDING_REVIEW | REJECT | CONFLICTED
```

### Curator CurationRoute

```
AUTO_APPROVED_LOW_RISK | AUTO_REVISED | HUMAN_REVIEW | ATTENDING_REVIEW | REJECTED
```

### Mapping

| ReviewRoute | CurationRoute | AutoReviewCategory |
|-------------|---------------|-------------------|
| `AUTO_APPROVED_LOW_RISK` | `AUTO_APPROVED_LOW_RISK` | `AUTO_APPROVE` |
| `AUTO_REVISED` | `AUTO_REVISED` | `SAFE_REVIEW` |
| `HUMAN_REVIEW` | `HUMAN_REVIEW` | `SAFE_REVIEW` or `EXPERT_REVIEW` |
| `ATTENDING_REVIEW` | `ATTENDING_REVIEW` | `EXPERT_REVIEW` |
| `REJECT` | `REJECTED` | `REJECT` |
| `CONFLICTED` | (override) | `EXPERT_REVIEW` |

`CONFLICTED` is derived when `proposal.conflict_count >= 2`, overriding curator route.

---

## Route Definitions

### AUTO_APPROVED_LOW_RISK

**Meaning:** Proposal is safe for automated approval without human review.

**Eligible when:**
- Low-risk relationship predicates (`part_of`, `contains`, `articulates_with`, `inserts_on`, `prerequisite_for`, `has_classification`, `has_grade`, `has_imaging_finding`, `has_complication`, `injured_in`, `involves_anatomy`)
- Spec-backed entity creation (`metadata.pilot` or `factory_version` or `slug`)
- Deterministic bridge proposals with confidence ≥ 0.85
- `anatomy_pearl` claims on anatomy hubs (spec-backed)
- Confidence ≥ 0.88, conflictScore < 0.15, safetyLevel < 0.3

**Never eligible for:**
- Decision points
- High-risk predicates
- Safety-adjacent claim types (`board_trap`, `cognitive_trap`, `red_flag`)
- Claims with `importance_level: L1` management facts
- Any proposal with `safetyLevel >= 0.7`

**Review status after curation:** `approved`

**Required reviewer:** `none`

---

### AUTO_REVISED

**Meaning:** Proposal is acceptable with automatic minor revisions (metadata patches, text trimming).

**Eligible when:**
- Confidence ≥ 0.72 but metadata incomplete
- L2 factual claims needing light review
- Substantive content downgraded from auto-approve

**Automatic revisions:**
- Claims: trim to first clause on comma/semicolon; force `content_source: generated_draft`
- Relationships: default `anatomy_role: supporting`, `review_status: unreviewed`
- Entities: generate `slug` from label if missing

**Review status after curation:** `needs_review`

**Required reviewer:** `none` (but human should verify revisions)

---

### HUMAN_REVIEW

**Meaning:** Curator or clinical expert must review before approval.

**Eligible when:**
- Educational judgment claims (`imaging_point`, `clinical_script`)
- L1 management facts
- Low confidence (< 0.6) or high conflict (> 0.35)
- Non-auto-approve relationship predicates (e.g. `indicates_treatment` → may escalate further)
- Default fallback for unclassified proposals

**Review status after curation:** `needs_review`

**Required reviewer:** `curator` (or `clinical_expert` for clinical content)

---

### ATTENDING_REVIEW

**Meaning:** Attending physician or safety reviewer must approve.

**Eligible when:**
- All decision points (`propose_decision_point`)
- High-risk predicates: `at_risk_structure`, `indicates_treatment`, `must_protect_during`, `treated_by`, `uses_fixation`, `explains_instability`
- `safetyLevel >= 0.5` (and especially >= 0.7)
- Claim types: `board_trap`, `cognitive_trap`, `red_flag` with safety ≥ 0.5
- L1 claims with safety-adjacent content

**Review status after curation:** `needs_review`

**Required reviewer:** `attending`

**Hard rule:** Never auto-approve attending-gated items.

---

### CONFLICTED

**Meaning:** Multiple sources disagree; human must resolve conflict before approval.

**Eligible when:**
- `proposal.conflict_count >= 2`
- Merge engine detects irreconcilable drafts (future: Conflict Resolver input)

**Review status:** Remains `generated` or `needs_review`; never auto-approved

**Required reviewer:** `curator` (may escalate to `attending` for safety conflicts)

**Open question:** Whether Conflict Resolver can auto-resolve low-severity conflicts or only flags them.

---

### REJECT

**Meaning:** Proposal is invalid and should not proceed.

**Eligible when:**
- Curator classifies as `REJECTED`
- Ontology violation (invalid triple)
- Draft leak (verified before review)
- Duplicate fingerprint in batch

**Review status after curation:** `rejected`

**Required reviewer:** `none`

---

## Curator Rule Tags

Rules triggered during `classifyRoute()`:

| Rule tag | Typical route |
|----------|---------------|
| `decision_point_requires_attending` | `ATTENDING_REVIEW` |
| `high_risk_predicate` | `ATTENDING_REVIEW` |
| `deterministic_clinical_or_anatomy_predicate` | `AUTO_APPROVED_LOW_RISK` |
| `spec_backed_entity_create` | `AUTO_APPROVED_LOW_RISK` |
| `deterministic_bridge` | `AUTO_APPROVED_LOW_RISK` or `HUMAN_REVIEW` |
| `anatomy_pearl_on_hub` | `AUTO_APPROVED_LOW_RISK` |
| `l2_fact_light_review` | `AUTO_REVISED` |
| `educational_judgment_claim` | `HUMAN_REVIEW` |
| `l1_management_fact` | `HUMAN_REVIEW` |
| `low_confidence_or_high_ambiguity` | `HUMAN_REVIEW` |
| `default_human_review` | `HUMAN_REVIEW` |

---

## ReviewRecommendation Fields

Every route must include (per agent contract):

| Field | Description |
|-------|-------------|
| `route` | Review route |
| `confidence` | Composite confidence |
| `safetyScore` | `breakdown.safetyLevel` |
| `evidenceScore` | `breakdown.evidenceQuality` |
| `ontologyComplianceScore` | `breakdown.ontologyCompliance` |
| `duplicateRisk` | Derived from conflicts |
| `conflictRisk` | Derived from conflicts (elevated for CONFLICTED) |
| `reason` | Single-sentence explanation |
| `rationale` | Full rule list |
| `requiredReviewerRole` | `none`, `curator`, `clinical_expert`, `attending` |

---

## Human Review Queues

| Queue | Route source | Reviewer role |
|-------|-------------|---------------|
| Identity | Entity proposals | Curator |
| Relationship | Non-auto relationship proposals | Curator / clinical expert |
| Claim | Educational claims | Curator / education reviewer |
| Decision point | All DPs | Attending |
| Safety-critical | High-risk predicates, red flags | Attending |
| Conflict | CONFLICTED proposals | Curator (escalate if safety) |
| Publication | Pre-publication blockers | Publication reviewer |

---

## Review Burden Estimation

Formula (from `agent-reports.ts`):

```
burden = attendingItems * 3 + curatorItems * 1 + conflicted * 2
```

| Band | Threshold |
|------|-----------|
| Low | < 15 |
| Medium | 15–39 |
| High | ≥ 40 |

Reported in `reviewer-burden-estimate.md`.

---

## Agent Responsibilities vs Review Engine

| Responsibility | Agent | Review Engine |
|----------------|-------|---------------|
| Generate proposals | Yes | No |
| Recommend route | Yes (per envelope) | Yes (authoritative) |
| Apply revisions | No | Yes (AUTO_REVISED) |
| Set review_status | No | Yes |
| Stamp curation metadata | No | Yes |
| Block publication | No | Yes (via Publication Validator) |

---

## Related Documents

- `05-confidence-framework.md` — Scoring that drives routing
- `07-validation-framework.md` — Validation failures that force REJECT