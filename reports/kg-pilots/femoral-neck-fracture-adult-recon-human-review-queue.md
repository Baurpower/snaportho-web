# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:45:54.167Z

**Items requiring human judgment:** 7
**Auto-curated (low-risk):** 74

Everything else was classified and justified by the first-pass curator.

## rel|femoral-neck-fracture-adult-recon|indicates_treatment|hip-hemiarthroplasty

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** femoral-neck-fracture-adult-recon -[indicates_treatment]-> hip-hemiarthroplasty
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: femoral-neck-fracture-adult-recon -[indicates_treatment]-> hip-hemiarthroplasty

**Rationale:**
- Rule: high_risk_predicate

## rel|femoral-neck-fracture-adult-recon|indicates_treatment|total-hip-arthroplasty

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** femoral-neck-fracture-adult-recon -[indicates_treatment]-> total-hip-arthroplasty
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: femoral-neck-fracture-adult-recon -[indicates_treatment]-> total-hip-arthroplasty

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

## claim|claim-femoral-neck-fracture-adult-recon-core

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-femoral-neck-fracture-adult-recon-core

**Rationale:**
- Rule: l1_management_fact

## claim|claim-femoral-neck-fracture-adult-recon-board-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-femoral-neck-fracture-adult-recon-board-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-femoral-neck-fracture-adult-recon-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-femoral-neck-fracture-adult-recon-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-femoral-neck-fracture-adult-recon-operative

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-femoral-neck-fracture-adult-recon-operative

**Rationale:**
- Rule: decision_point_requires_attending

