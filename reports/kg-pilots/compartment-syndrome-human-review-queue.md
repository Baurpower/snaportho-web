# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T20:59:27.581Z

**Items requiring human judgment:** 10
**Auto-curated (low-risk):** 36

Everything else was classified and justified by the first-pass curator.

## rel|compartment-syndrome|tested_by|pain-with-passive-stretch

- **Type:** add_canonical_relationship
- **Route:** HUMAN_REVIEW
- **Target:** compartment-syndrome -[tested_by]-> pain-with-passive-stretch
- **Agent recommendation:** Curator review required
- **Confidence:** 0.92
- **Safety score:** 0.1
- **Decision required:** Review add_canonical_relationship for rel|compartment-syndrome|tested_by|pain-with-passive-stretch

**Rationale:**
- Rule: default_human_review

## rel|compartment-syndrome|treated_by|leg-fasciotomy

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** compartment-syndrome -[treated_by]-> leg-fasciotomy
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|compartment-syndrome|treated_by|leg-fasciotomy

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-cs-clinical-diagnosis

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cs-clinical-diagnosis

**Rationale:**
- Rule: l1_management_fact

## claim|claim-cs-pulses-unreliable

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cs-pulses-unreliable

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-cs-passive-stretch

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cs-passive-stretch

**Rationale:**
- Rule: l1_management_fact

## claim|claim-cs-imaging-delay-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cs-imaging-delay-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-cs-pressure-adjunct

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cs-pressure-adjunct

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-cs-escalation-language

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-cs-escalation-language

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-cs-emergent-fasciotomy

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-cs-emergent-fasciotomy

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-cs-pressure-measurement-adjunct

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-cs-pressure-measurement-adjunct

**Rationale:**
- Rule: decision_point_requires_attending

