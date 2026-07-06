# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T21:50:46.784Z

**Items requiring human judgment:** 13
**Auto-curated (low-risk):** 59

Everything else was classified and justified by the first-pass curator.

## rel|humeral-shaft-fracture|at_risk_structure|radial-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** humeral-shaft-fracture -[at_risk_structure]-> radial-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|humeral-shaft-fracture|at_risk_structure|radial-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|humeral-shaft-fracture|at_risk_structure|brachial-artery

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** humeral-shaft-fracture -[at_risk_structure]-> brachial-artery
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|humeral-shaft-fracture|at_risk_structure|brachial-artery

**Rationale:**
- Rule: high_risk_predicate

## rel|holstein-lewis-fracture|indicates_treatment|humeral-plate-osteosynthesis

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** holstein-lewis-fracture -[indicates_treatment]-> humeral-plate-osteosynthesis
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: holstein-lewis-fracture -[indicates_treatment]-> humeral-plate-osteosynthesis

**Rationale:**
- Rule: high_risk_predicate

## rel|humeral-shaft-fracture|treated_by|humeral-im-nailing

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** humeral-shaft-fracture -[treated_by]-> humeral-im-nailing
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|humeral-shaft-fracture|treated_by|humeral-im-nailing

**Rationale:**
- Rule: high_risk_predicate

## rel|humeral-shaft-fracture|treated_by|humeral-plate-osteosynthesis

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** humeral-shaft-fracture -[treated_by]-> humeral-plate-osteosynthesis
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|humeral-shaft-fracture|treated_by|humeral-plate-osteosynthesis

**Rationale:**
- Rule: high_risk_predicate

## rel|humeral-plate-osteosynthesis|at_risk_structure|radial-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** humeral-plate-osteosynthesis -[at_risk_structure]-> radial-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|humeral-plate-osteosynthesis|at_risk_structure|radial-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|holstein-lewis-fracture|explains_instability|humeral-shaft-fracture

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** holstein-lewis-fracture -[explains_instability]-> humeral-shaft-fracture
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|holstein-lewis-fracture|explains_instability|humeral-shaft-fracture

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-hs-radial-nerve-exam

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-hs-radial-nerve-exam

**Rationale:**
- Rule: l1_management_fact

## claim|claim-hs-holstein-lewis

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-hs-holstein-lewis

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-hs-radial-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-hs-radial-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-hs-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-hs-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-hs-operative-nail

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-hs-operative-nail

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-hs-radial-nerve-deficit

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-hs-radial-nerve-deficit

**Rationale:**
- Rule: decision_point_requires_attending

