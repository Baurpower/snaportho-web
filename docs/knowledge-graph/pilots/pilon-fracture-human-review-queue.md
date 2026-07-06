# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:44:26.586Z

**Items requiring human judgment:** 9
**Auto-curated (low-risk):** 70

Everything else was classified and justified by the first-pass curator.

## rel|soft-tissue-compromise-pilon|indicates_treatment|staged-pilon-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** soft-tissue-compromise-pilon -[indicates_treatment]-> staged-pilon-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: soft-tissue-compromise-pilon -[indicates_treatment]-> staged-pilon-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|pilon-fracture|treated_by|staged-pilon-protocol

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** pilon-fracture -[treated_by]-> staged-pilon-protocol
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|pilon-fracture|treated_by|staged-pilon-protocol

**Rationale:**
- Rule: high_risk_predicate

## rel|pilon-fracture|treated_by|pilon-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** pilon-fracture -[treated_by]-> pilon-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|pilon-fracture|treated_by|pilon-orif

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-pilon-staged-soft-tissue

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pilon-staged-soft-tissue

**Rationale:**
- Rule: l1_management_fact

## claim|claim-pilon-rush-fixation-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pilon-rush-fixation-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-pilon-ct-articular-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pilon-ct-articular-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-pilon-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-pilon-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-pilon-staged-spanning

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-pilon-staged-spanning

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-pilon-definitive-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-pilon-definitive-orif

**Rationale:**
- Rule: decision_point_requires_attending

