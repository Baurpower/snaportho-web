# Knowledge Factory — Human Review Queue (Ankle)

Generated: 2026-07-05T22:42:18.487Z

**Items requiring human judgment:** 10
**Auto-curated (low-risk):** 70

Everything else was classified and justified by the first-pass curator.

## rel|tibial-plateau-fracture|at_risk_structure|common-peroneal-nerve

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** tibial-plateau-fracture -[at_risk_structure]-> common-peroneal-nerve
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|tibial-plateau-fracture|at_risk_structure|common-peroneal-nerve

**Rationale:**
- Rule: high_risk_predicate

## rel|tibial-plateau-fracture|at_risk_structure|popliteal-artery

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** tibial-plateau-fracture -[at_risk_structure]-> popliteal-artery
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|tibial-plateau-fracture|at_risk_structure|popliteal-artery

**Rationale:**
- Rule: high_risk_predicate

## rel|bicondylar-tibial-plateau-fracture|indicates_treatment|tibial-plateau-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** bicondylar-tibial-plateau-fracture -[indicates_treatment]-> tibial-plateau-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Confirm management implication: bicondylar-tibial-plateau-fracture -[indicates_treatment]-> tibial-plateau-orif

**Rationale:**
- Rule: high_risk_predicate

## rel|tibial-plateau-fracture|treated_by|tibial-plateau-orif

- **Type:** add_canonical_relationship
- **Route:** ATTENDING_REVIEW
- **Target:** tibial-plateau-fracture -[treated_by]-> tibial-plateau-orif
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.75
- **Decision required:** Review add_canonical_relationship for rel|tibial-plateau-fracture|treated_by|tibial-plateau-orif

**Rationale:**
- Rule: high_risk_predicate

## claim|claim-tpf-articular-soft-tissue

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-tpf-articular-soft-tissue

**Rationale:**
- Rule: l1_management_fact

## claim|claim-tpf-schatzker-language

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-tpf-schatzker-language

**Rationale:**
- Rule: l1_management_fact

## claim|claim-tpf-soft-tissue-timing-trap

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.55
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-tpf-soft-tissue-timing-trap

**Rationale:**
- Rule: educational_judgment_claim

## claim|claim-tpf-case-script

- **Type:** propose_educational_claim
- **Route:** HUMAN_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Curator review required
- **Confidence:** 0.75
- **Safety score:** 0.1
- **Decision required:** Confirm clinical accuracy and atomicity of claim: claim-tpf-case-script

**Rationale:**
- Rule: educational_judgment_claim

## dp|dp-tpf-unstable-orif

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-tpf-unstable-orif

**Rationale:**
- Rule: decision_point_requires_attending

## dp|dp-tpf-compartment-watch

- **Type:** propose_decision_point
- **Route:** ATTENDING_REVIEW
- **Target:** undefined -[null]-> undefined
- **Agent recommendation:** Attending review required
- **Confidence:** 0.92
- **Safety score:** 0.85
- **Decision required:** Approve operative/management pathway: dp-tpf-compartment-watch

**Rationale:**
- Rule: decision_point_requires_attending

