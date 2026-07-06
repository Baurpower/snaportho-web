# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:34:21.940Z

**Items requiring human judgment:** 10
**Auto-curated (low-risk):** 82

Everything else was classified and justified by the first-pass curator.

## rel|femoral-shaft-fracture|at_risk_structure|sciatic-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** femoral-shaft-fracture -[at_risk_structure]-> sciatic-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|femoral-shaft-fracture|at_risk_structure|sciatic-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|segmental-femoral-shaft-fracture|indicates_treatment|femoral-im-nailing

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** segmental-femoral-shaft-fracture -[indicates_treatment]-> femoral-im-nailing
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: segmental-femoral-shaft-fracture -[indicates_treatment]-> femoral-im-nailing

**Rationale:**
- Rule: high_risk_predicate

## rel|femoral-shaft-fracture|uses_fixation|femoral-im-nail-fixation

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** femoral-shaft-fracture -[uses_fixation]-> femoral-im-nail-fixation
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|femoral-shaft-fracture|uses_fixation|femoral-im-nail-fixation

**Rationale:**
- Rule: high_risk_predicate

## rel|femoral-shaft-fracture|treated_by|femoral-im-nailing

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** femoral-shaft-fracture -[treated_by]-> femoral-im-nailing
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|femoral-shaft-fracture|treated_by|femoral-im-nailing

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-fsf-im-nail-default

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-fsf-im-nail-default

**Rationale:**
- Rule: l1_management_fact

## claim|claim-fsf-fat-embolism-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-fsf-fat-embolism-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-fsf-rotation-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-fsf-rotation-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-fsf-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-fsf-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-fsf-im-nail-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-fsf-im-nail-operative

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-fsf-open-fracture

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-fsf-open-fracture

**Rationale:**
- Rule: decision_point_requires_attending

