# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:48:38.743Z

**Items requiring human judgment:** 9
**Auto-curated (low-risk):** 61

Everything else was classified and justified by the first-pass curator.

## rel|talar-neck-fracture|indicates_treatment|talus-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** talar-neck-fracture -[indicates_treatment]-> talus-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: talar-neck-fracture -[indicates_treatment]-> talus-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|talus-fracture|treated_by|talus-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** talus-fracture -[treated_by]-> talus-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|talus-fracture|treated_by|talus-orif

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-talus-avn-risk

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-talus-avn-risk

**Rationale:**
- Rule: l1_management_fact

## claim|claim-talus-hawkins-language

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-talus-hawkins-language

**Rationale:**
- Rule: l1_management_fact

## claim|claim-talus-urgent-reduction-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-talus-urgent-reduction-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-talus-missed-fracture-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-talus-missed-fracture-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-talus-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-talus-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-talus-urgent-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-talus-urgent-orif

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-talus-avn-surveillance

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-talus-avn-surveillance

**Rationale:**
- Rule: decision_point_requires_attending

