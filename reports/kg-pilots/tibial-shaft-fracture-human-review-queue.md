# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T21:21:50.899Z

**Items requiring human judgment:** 10
**Auto-curated (low-risk):** 32

Everything else was classified and justified by the first-pass curator.

## rel|segmental-tibial-fracture|indicates_treatment|tibial-im-nail

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** segmental-tibial-fracture -[indicates_treatment]-> tibial-im-nail
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: segmental-tibial-fracture -[indicates_treatment]-> tibial-im-nail

**Rationale:**
- Rule: high_risk_predicate

## rel|tibial-shaft-fracture|uses_fixation|im-nail-fixation

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** tibial-shaft-fracture -[uses_fixation]-> im-nail-fixation
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|tibial-shaft-fracture|uses_fixation|im-nail-fixation

**Rationale:**
- Rule: high_risk_predicate

## rel|tibial-shaft-fracture|treated_by|tibial-im-nail

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** tibial-shaft-fracture -[treated_by]-> tibial-im-nail
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|tibial-shaft-fracture|treated_by|tibial-im-nail

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-tsf-soft-tissue-first

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-tsf-soft-tissue-first

**Rationale:**
- Rule: l1_management_fact

## claim|claim-tsf-compartment-serial-exams

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-tsf-compartment-serial-exams

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-tsf-open-urgency

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-tsf-open-urgency

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-tsf-segmental-instability

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-tsf-segmental-instability

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-tsf-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-tsf-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-tsf-operative-nailing

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-tsf-operative-nailing

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-tsf-nonoperative-cast

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-tsf-nonoperative-cast

**Rationale:**
- Rule: decision_point_requires_attending

