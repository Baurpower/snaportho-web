# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T21:49:59.627Z

**Items requiring human judgment:** 10
**Auto-curated (low-risk):** 64

Everything else was classified and justified by the first-pass curator.

## rel|proximal-humerus-fracture|at_risk_structure|axillary-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** proximal-humerus-fracture -[at_risk_structure]-> axillary-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|proximal-humerus-fracture|at_risk_structure|axillary-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|displaced-proximal-humerus-fracture|indicates_treatment|proximal-humerus-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** displaced-proximal-humerus-fracture -[indicates_treatment]-> proximal-humerus-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: displaced-proximal-humerus-fracture -[indicates_treatment]-> proximal-humerus-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|proximal-humerus-fracture|treated_by|proximal-humerus-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** proximal-humerus-fracture -[treated_by]-> proximal-humerus-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|proximal-humerus-fracture|treated_by|proximal-humerus-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|proximal-humerus-fracture|treated_by|proximal-humerus-hemiarthroplasty

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** proximal-humerus-fracture -[treated_by]-> proximal-humerus-hemiarthroplasty
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|proximal-humerus-fracture|treated_by|proximal-humerus-hemiarthroplasty

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-ph-nonoperative-majority

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-ph-nonoperative-majority

**Rationale:**
- Rule: l1_management_fact

## claim|claim-ph-tuberosity-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-ph-tuberosity-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-ph-elderly-arthroplasty-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-ph-elderly-arthroplasty-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-ph-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-ph-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-ph-operative-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-ph-operative-orif

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-ph-hemiarthroplasty

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-ph-hemiarthroplasty

**Rationale:**
- Rule: decision_point_requires_attending

