# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T21:32:36.163Z

**Items requiring human judgment:** 11
**Auto-curated (low-risk):** 41

Everything else was classified and justified by the first-pass curator.

## rel|femoral-neck-fracture|at_risk_structure|medial-femoral-circumflex-artery

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** femoral-neck-fracture -[at_risk_structure]-> medial-femoral-circumflex-artery
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|femoral-neck-fracture|at_risk_structure|medial-femoral-circumflex-artery

**Rationale:**
- Rule: high_risk_predicate

## rel|displaced-femoral-neck-fracture|indicates_treatment|hip-hemiarthroplasty

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** displaced-femoral-neck-fracture -[indicates_treatment]-> hip-hemiarthroplasty
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: displaced-femoral-neck-fracture -[indicates_treatment]-> hip-hemiarthroplasty

**Rationale:**
- Rule: high_risk_predicate

## rel|femoral-neck-fracture|uses_fixation|cannulated-screw-fixation

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** femoral-neck-fracture -[uses_fixation]-> cannulated-screw-fixation
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|femoral-neck-fracture|uses_fixation|cannulated-screw-fixation

**Rationale:**
- Rule: high_risk_predicate

## rel|femoral-neck-fracture|treated_by|femoral-neck-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** femoral-neck-fracture -[treated_by]-> femoral-neck-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|femoral-neck-fracture|treated_by|femoral-neck-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|femoral-neck-fracture|treated_by|hip-hemiarthroplasty

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** femoral-neck-fracture -[treated_by]-> hip-hemiarthroplasty
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|femoral-neck-fracture|treated_by|hip-hemiarthroplasty

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-fnf-intracapsular-urgency

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-fnf-intracapsular-urgency

**Rationale:**
- Rule: l1_management_fact

## claim|claim-fnf-displaced-older-arthroplasty

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-fnf-displaced-older-arthroplasty

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-fnf-younger-orif

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-fnf-younger-orif

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-fnf-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-fnf-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-fnf-arthroplasty-pathway

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-fnf-arthroplasty-pathway

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-fnf-head-preservation-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-fnf-head-preservation-orif

**Rationale:**
- Rule: decision_point_requires_attending

