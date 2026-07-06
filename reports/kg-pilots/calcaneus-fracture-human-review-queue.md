# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:46:36.319Z

**Items requiring human judgment:** 8
**Auto-curated (low-risk):** 63

Everything else was classified and justified by the first-pass curator.

## rel|intra-articular-calcaneus-fracture|indicates_treatment|calcaneus-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** intra-articular-calcaneus-fracture -[indicates_treatment]-> calcaneus-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: intra-articular-calcaneus-fracture -[indicates_treatment]-> calcaneus-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|calcaneus-fracture|treated_by|calcaneus-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** calcaneus-fracture -[treated_by]-> calcaneus-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|calcaneus-fracture|treated_by|calcaneus-orif

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-calc-soft-tissue-timing

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-calc-soft-tissue-timing

**Rationale:**
- Rule: l1_management_fact

## claim|claim-calc-skin-timing-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-calc-skin-timing-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-calc-spine-screen-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-calc-spine-screen-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-calc-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-calc-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-calc-delayed-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-calc-delayed-orif

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-calc-soft-tissue-hold

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-calc-soft-tissue-hold

**Rationale:**
- Rule: decision_point_requires_attending

