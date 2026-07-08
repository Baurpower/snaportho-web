# BroBot P1 Live Audit

Generated: 2026-07-08T03:05:34.507Z
Fixtures: 24
Averages: {"specificity":3.88,"modeFit":4.21,"testRelevance":3,"surgicalUsefulness":3.21,"lengthControl":4,"followUpChipQuality":3.71}

## Key Metrics (target vs P0 baseline)
| Metric | P0 Baseline | P1 Result | Target |
|---|---|---|---|
| Revision triggered | 18/20 | 21/24 | <6/20 |
| Source context found | 0/20 | 0/24 | >8/20 |
| Source context certified | — | 0/24 | any |
| Source context draft | — | 0/24 | any |
| Facet chips from unmet warnings | — | 9/24 | >5/20 |
| Exempt-subintent revision | — | 8/8 | 0/8 |

## Per-Mode Breakdown
- **or_prep**: 5 fixtures | revision 4/5 | source 0/5 (cert=0, draft=0) | facetChips 0/5
- **oite**: 8 fixtures | revision 7/8 | source 0/8 (cert=0, draft=0) | facetChips 6/8
- **consult**: 5 fixtures | revision 4/5 | source 0/5 (cert=0, draft=0) | facetChips 0/5
- **clinic**: 4 fixtures | revision 4/4 | source 0/4 (cert=0, draft=0) | facetChips 3/4
- **general**: 2 fixtures | revision 2/2 | source 0/2 (cert=0, draft=0) | facetChips 0/2

## Results
## or-01: Distal radius ORIF tomorrow. What do I need to know?
- mode/level/depth: or_prep / pgy2 / standard
- subintent: detected=surgical_steps
- detectedMode: or_prep
- sourceContext: null
- clinicalContext: facets=exposure, anatomy, steps, implants, complications, pitfalls; requirements=exposure_or_approach, named_anatomy, key_steps_or_checks, decision_points, pitfalls_or_bailout; missing=none
- quality: {"specificity":5,"modeFit":4,"testRelevance":3,"surgicalUsefulness":4,"lengthControl":4,"followUpChipQuality":3}; answerLength=1066
- warnings before revision: branch_rubric_coverage_low
- warnings final: branch_rubric_coverage_low
- revisionTriggered: true
- facetChipsGenerated: none
- chips: Volar FCR approach anatomy | Avoid dorsal screw penetration | Reduction maneuvers | Volar plate positioning pitfalls | Median nerve protection strategies
- failureMode: quality_gate:branch_rubric_coverage_low
- answerSummary: - **Objective:** Restore length, radial inclination, volar tilt, and articular congruity without losing reduction during plate placement. - **Exposure:** Use the standard volar FCR approach. Stay radial to the flexor car...

## or-02: Trigger finger release steps
- mode/level/depth: or_prep / pgy1 / quick
- subintent: detected=surgical_steps
- detectedMode: or_prep
- sourceContext: null
- clinicalContext: facets=exposure, anatomy, steps, implants, complications, pitfalls; requirements=exposure_or_approach, named_anatomy, key_steps_or_checks, decision_points, pitfalls_or_bailout; missing=none
- quality: {"specificity":5,"modeFit":4,"testRelevance":3,"surgicalUsefulness":4,"lengthControl":4,"followUpChipQuality":3}; answerLength=712
- warnings before revision: branch_rubric_coverage_low
- warnings final: limited_concrete_ortho_detail, branch_rubric_coverage_low
- revisionTriggered: true
- facetChipsGenerated: none
- chips: Flexor tendon sheath anatomy | Implications of incomplete release | Potential complications of release | Avoiding misidentification of A1 pulley | Confirming complete tendon release
- failureMode: quality_gate:limited_concrete_ortho_detail|branch_rubric_coverage_low
- answerSummary: - **Objective:** Release the A1 pulley to restore smooth tendon gliding and alleviate triggering. - **Exposure:** Make an incision just proximal to the distal palmar crease over the metacarpal head. - **Anatomy at Risk:*...

## or-03: Reverse TSA key surgical techniques
- mode/level/depth: or_prep / pgy4 / deep
- subintent: detected=overview
- detectedMode: or_prep
- sourceContext: null
- clinicalContext: facets=exposure, anatomy, steps, implants, complications, pitfalls; requirements=exposure_or_approach, named_anatomy, key_steps_or_checks, decision_points, pitfalls_or_bailout; missing=none
- quality: {"specificity":5,"modeFit":4,"testRelevance":3,"surgicalUsefulness":4,"lengthControl":4,"followUpChipQuality":3}; answerLength=910
- warnings before revision: none
- warnings final: none
- revisionTriggered: false
- facetChipsGenerated: none
- chips: Biomechanics of reverse TSA | Specific implant systems for reverse TSA | Glenoid and humeral preparation techniques | Assessing deltoid stability intraoperatively | Managing complications in reverse TSA
- failureMode: none_obvious
- answerSummary: - **Objective:** Restore shoulder function and stability by reversing the ball-and-socket configuration, primarily for cuff tear arthropathy. - **Exposure:** Use a deltopectoral approach; identify the cephalic vein and r...

## or-04: How do I confirm carpal tunnel release is complete?
- mode/level/depth: or_prep / pgy1 / standard
- subintent: detected=overview
- detectedMode: or_prep
- sourceContext: null
- clinicalContext: facets=exposure, anatomy, steps, implants, complications, pitfalls; requirements=exposure_or_approach, named_anatomy, key_steps_or_checks, decision_points, pitfalls_or_bailout; missing=none
- quality: {"specificity":4,"modeFit":4,"testRelevance":3,"surgicalUsefulness":4,"lengthControl":4,"followUpChipQuality":4}; answerLength=911
- warnings before revision: level_junior_orientation_missing
- warnings final: level_junior_orientation_missing
- revisionTriggered: true
- facetChipsGenerated: none
- chips: Identifying the recurrent motor branch | Anatomy of the transverse carpal ligament | Techniques for improving visualization | Importance of palpation checks | Common complications of incomplete release
- failureMode: quality_gate:level_junior_orientation_missing
- answerSummary: - **Objective:** Ensure full decompression of the median nerve by releasing the transverse carpal ligament. - **Exposure:** Adequate visualization of the transverse carpal ligament is crucial. Ensure the incision allows...

## or-05: Intertroch nail start point
- mode/level/depth: or_prep / pgy2 / standard
- subintent: detected=implant_options
- detectedMode: or_prep
- sourceContext: null
- clinicalContext: facets=exposure, anatomy, steps, implants, complications, pitfalls; requirements=exposure_or_approach, named_anatomy, key_steps_or_checks, decision_points, pitfalls_or_bailout; missing=none
- quality: {"specificity":5,"modeFit":4,"testRelevance":3,"surgicalUsefulness":4,"lengthControl":4,"followUpChipQuality":4}; answerLength=774
- warnings before revision: branch_rubric_coverage_low, entity_not_named
- warnings final: branch_rubric_coverage_low, entity_not_named
- revisionTriggered: true
- facetChipsGenerated: none
- chips: Greater trochanter anatomy review | Entry points for different nail systems | Effective fluoroscopy techniques | Avoiding varus malalignment | Protecting the gluteus medius during exposure
- failureMode: quality_gate:branch_rubric_coverage_low|entity_not_named
- answerSummary: - **Objective:** Achieve proper entry point to ensure correct alignment and avoid iatrogenic fracture. - **Exposure:** Use a lateral approach to the proximal femur, often through a small incision proximal to the greater...

## oite-01: SCFE OITE points
- mode/level/depth: oite / pgy2 / standard
- subintent: detected=overview
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":5,"modeFit":4,"testRelevance":4,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=749
- warnings before revision: none
- warnings final: none
- revisionTriggered: false
- facetChipsGenerated: none
- chips: Impact of stability classification on management | Key imaging findings in SCFE diagnosis | Endocrine associations with SCFE | Differentiating SCFE from similar conditions | Common exam traps in SCFE management
- failureMode: none_obvious
- answerSummary: - **Direct answer:** Unstable SCFE has the highest risk of AVN; pinning strategy and urgency questions often pivot on stability rather than just slip angle. - **Core framework:** Think age/body habitus/endocrine risk, st...

## oite-02: Femoral shaft fracture OITE traps
- mode/level/depth: oite / pgy3 / standard
- subintent: detected=oite_traps
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors, imaging; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":4,"modeFit":4,"testRelevance":4,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=737
- warnings before revision: branch_rubric_coverage_low
- warnings final: branch_rubric_coverage_low
- revisionTriggered: true
- facetChipsGenerated: none
- chips: Gustilo-Anderson classification for open fractures | Indications for external fixation in polytrauma | Complications associated with intramedullary nailing | Associated injuries in high-energy trauma cases | Temporary traction vs. definitive treatment
- failureMode: quality_gate:branch_rubric_coverage_low
- answerSummary: - **Classic trap:** Confusing the treatment for open vs. closed femoral shaft fractures. Open fractures require urgent surgical intervention and antibiotic coverage. - **Distractor:** Misinterpreting the need for tractio...

## oite-03: Flexion extension gap imbalance questions
- mode/level/depth: oite / pgy3 / standard
- subintent: detected=overview
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":3,"modeFit":4,"testRelevance":4,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=827
- warnings before revision: decision_making_missing, facet_algorithm_threshold_missing, oite_algorithm_missing
- warnings final: facet_algorithm_threshold_missing, oite_algorithm_missing
- revisionTriggered: true
- facetChipsGenerated: Algorithm and thresholds
- chips: Surgical adjustments for gap imbalances | Role of posterior structures in gap balance | Impact of gap imbalances on implant positioning | Common traps in gap imbalance assessments | Surgical steps for balancing gaps in TKA
- failureMode: quality_gate:facet_algorithm_threshold_missing|oite_algorithm_missing
- answerSummary: - **Direct answer:** Flexion-extension gap imbalances in knee arthroplasty are assessed by evaluating the balance of soft tissues and bone cuts. - **Core framework:** Identify whether the imbalance is in flexion or exten...

## oite-quiz-01: Quiz me on THA must-see anatomy
- mode/level/depth: oite / med_student / quick
- subintent: detected=quiz forced=quiz
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors, anatomy; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":3,"modeFit":4,"testRelevance":4,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=721
- warnings before revision: facet_oite_trap_distractor_missing, facet_algorithm_threshold_missing, branch_rubric_coverage_low, level_junior_orientation_missing
- warnings final: facet_oite_trap_distractor_missing, facet_algorithm_threshold_missing, branch_rubric_coverage_low
- revisionTriggered: true
- facetChipsGenerated: Board traps and distractors | Algorithm and thresholds
- chips: Key anatomical landmarks for THA | Surgical approaches in total hip arthroplasty | Common complications in THA | Nerve injuries associated with THA | Importance of gluteus medius in THA | Anatomical variations in THA
- failureMode: quality_gate:facet_oite_trap_distractor_missing|facet_algorithm_threshold_missing|branch_rubric_coverage_low
- answerSummary: Key anatomical structures to know for total hip arthroplasty include: 1. **Acetabulum**: Understanding its orientation and depth is crucial for proper cup placement. 2. **Femoral Head and Neck**: Knowledge of the neck-sh...

## oite-quiz-02: Give me 3 OITE questions on ankle fractures
- mode/level/depth: oite / pgy2 / standard
- subintent: detected=quiz forced=quiz
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors, imaging; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":3,"modeFit":4,"testRelevance":2,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=1155
- warnings before revision: facet_oite_trap_distractor_missing, branch_rubric_coverage_low
- warnings final: facet_oite_trap_distractor_missing, branch_rubric_coverage_low
- revisionTriggered: true
- facetChipsGenerated: Board traps and distractors
- chips: Weber vs Lauge-Hansen classifications | When syndesmosis is unstable | Posterior malleolus decision-making | Intra-op stress views for ankle fractures | Ankle fracture treatment algorithms
- failureMode: quality_gate:facet_oite_trap_distractor_missing|branch_rubric_coverage_low
- answerSummary: ### Question 1: A 45-year-old male presents to the emergency department after a fall. X-rays show a displaced fibular fracture above the syndesmosis and a medial malleolus fracture. What is the most appropriate classific...

## oite-def-01: What is the Garden classification?
- mode/level/depth: oite / pgy2 / standard
- subintent: detected=classification forced=classification
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":3,"modeFit":4,"testRelevance":2,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=793
- warnings before revision: attending_or_exam_pearl_missing, facet_oite_trap_distractor_missing, oite_trap_missing, oite_test_taking_signal_missing, oite_memory_hook_missing, branch_rubric_coverage_low
- warnings final: attending_or_exam_pearl_missing, facet_oite_trap_distractor_missing, oite_trap_missing, oite_test_taking_signal_missing, oite_memory_hook_missing, branch_rubric_coverage_low
- revisionTriggered: true
- facetChipsGenerated: Board traps and distractors
- chips: Garden vs Pauwels classification | Treatment implications for Garden types | Imaging features of displacement | Common traps in Garden classification | Avascular necrosis risk in Garden types
- failureMode: quality_gate:attending_or_exam_pearl_missing|facet_oite_trap_distractor_missing|oite_trap_missing|oite_test_taking_signal_missing|oite_memory_hook_missing|branch_rubric_coverage_low, weak_oite_trap_layer
- answerSummary: - **Garden classification** is used for femoral neck fractures to guide treatment decisions based on displacement and stability. - **Type I:** Incomplete fracture, valgus impacted. Often stable and can be treated non-ope...

## oite-anat-01: What nerves are at risk in carpal tunnel release?
- mode/level/depth: oite / pgy1 / quick
- subintent: detected=anatomy_at_risk forced=anatomy_at_risk
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors, anatomy; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":4,"modeFit":4,"testRelevance":2,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":3}; answerLength=510
- warnings before revision: facet_oite_trap_distractor_missing, facet_algorithm_threshold_missing, branch_rubric_coverage_low, level_junior_orientation_missing
- warnings final: facet_oite_trap_distractor_missing, facet_algorithm_threshold_missing, branch_rubric_coverage_low, level_junior_orientation_missing
- revisionTriggered: true
- facetChipsGenerated: Board traps and distractors | Algorithm and thresholds
- chips: Course of the recurrent motor branch | Anatomical landmarks for carpal tunnel release | Carpal tunnel syndrome vs other compressive neuropathies | Techniques to prevent nerve injury | Effects of incision position on nerve preservation
- failureMode: quality_gate:facet_oite_trap_distractor_missing|facet_algorithm_threshold_missing|branch_rubric_coverage_low|level_junior_orientation_missing
- answerSummary: - **Median nerve:** The primary structure at risk; ensure proper identification and protection during release. - **Recurrent motor branch of the median nerve:** Can be injured if the release is too radial or proximal; it...

## oite-anat-02: FDP and FDS anatomy facts I need to know
- mode/level/depth: oite / pgy2 / standard
- subintent: detected=anatomy_at_risk forced=anatomy_at_risk
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors, anatomy, imaging; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":3,"modeFit":4,"testRelevance":2,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=950
- warnings before revision: facet_oite_trap_distractor_missing, facet_algorithm_threshold_missing, branch_rubric_coverage_low
- warnings final: facet_oite_trap_distractor_missing, facet_algorithm_threshold_missing, branch_rubric_coverage_low
- revisionTriggered: true
- facetChipsGenerated: Board traps and distractors | Algorithm and thresholds
- chips: Anatomy of the carpal tunnel | Clinical presentation of jersey finger | Surgical steps for flexor tendon repair | Differentiating FDP and FDS in surgery | Common misconceptions about FDP and FDS
- failureMode: quality_gate:facet_oite_trap_distractor_missing|facet_algorithm_threshold_missing|branch_rubric_coverage_low
- answerSummary: - **Flexor Digitorum Profundus (FDP):** Originates from the anterior and medial surfaces of the ulna and interosseous membrane. Inserts on the distal phalanges of the fingers, flexing the distal interphalangeal joints. -...

## consult-01: Ankle fracture consult. How should I think about it?
- mode/level/depth: consult / pgy1 / standard
- subintent: detected=imaging_review
- detectedMode: consult
- sourceContext: null
- clinicalContext: facets=workup, imaging, classification, treatmentAlgorithm, complications, disposition; requirements=red_flags, missing_information, workup, temporizing_care, definitive_management_or_disposition; missing=age, mechanism, open/closed status, neurovascular exam, imaging findings
- quality: {"specificity":3,"modeFit":4,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=46
- warnings before revision: none
- warnings final: none
- revisionTriggered: false
- facetChipsGenerated: none
- chips: Stable vs unstable mortise | Weber vs Lauge-Hansen classification | When syndesmosis is unstable | Posterior malleolus decision-making | Intra-op stress views for ankle fractures
- failureMode: weak_consult_disposition
- answerSummary: BroBot could not format a structured response.

## consult-02: Treatment options for PJI
- mode/level/depth: consult / pgy2 / standard
- subintent: detected=overview
- detectedMode: consult
- sourceContext: null
- clinicalContext: facets=workup, imaging, classification, treatmentAlgorithm, complications, disposition; requirements=red_flags, missing_information, workup, temporizing_care, definitive_management_or_disposition; missing=age, imaging findings, ESR/CRP/WBC and aspiration status, wound status
- quality: {"specificity":4,"modeFit":4,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=823
- warnings before revision: ask_clarification_answer_too_long
- warnings final: ask_clarification_answer_too_long
- revisionTriggered: true
- facetChipsGenerated: none
- chips: Criteria for DAIR eligibility | Role of biofilm in PJI | Antibiotic regimens for PJI | Indications for single-stage revision | Impact of comorbidities on PJI management
- failureMode: quality_gate:ask_clarification_answer_too_long
- answerSummary: Treatment for prosthetic joint infection (PJI) depends on the infection's timing, implant stability, and patient health. - **Acute PJI (<3 weeks):** Debridement, antibiotics, and implant retention (DAIR) is considered if...

## consult-03: Open tibia in ED
- mode/level/depth: consult / pgy1 / quick
- subintent: detected=overview
- detectedMode: consult
- sourceContext: null
- clinicalContext: facets=workup, imaging, classification, treatmentAlgorithm, complications, disposition; requirements=red_flags, missing_information, workup, temporizing_care, definitive_management_or_disposition; missing=age, wound status
- quality: {"specificity":4,"modeFit":4,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=722
- warnings before revision: level_junior_orientation_missing
- warnings final: level_junior_orientation_missing
- revisionTriggered: true
- facetChipsGenerated: none
- chips: Gustilo-Anderson classification overview | Antibiotic regimen for open fractures | Signs of compartment syndrome | Performing a neurovascular assessment | Urgent orthopaedic consultation protocols
- failureMode: quality_gate:level_junior_orientation_missing
- answerSummary: - **Urgency:** Open tibia fractures are emergencies due to high infection risk and potential neurovascular compromise. - **Immediate priorities:** - Perform a thorough neurovascular assessment and document findings. - Cl...

## consult-04: Painful TKA consult
- mode/level/depth: consult / pgy2 / standard
- subintent: detected=overview
- detectedMode: consult
- sourceContext: null
- clinicalContext: facets=workup, imaging, classification, treatmentAlgorithm, complications, disposition; requirements=red_flags, missing_information, workup, temporizing_care, definitive_management_or_disposition; missing=age, imaging findings
- quality: {"specificity":5,"modeFit":5,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=583
- warnings before revision: ask_clarification_answer_too_long
- warnings final: ask_clarification_answer_too_long
- revisionTriggered: true
- facetChipsGenerated: none
- chips: Common causes of painful TKA | Workup for suspected infection in TKA | Indications for revision surgery in TKA | Identifying red flags in TKA | Physical exam techniques for TKA
- failureMode: quality_gate:ask_clarification_answer_too_long, weak_consult_disposition
- answerSummary: In evaluating a painful total knee arthroplasty (TKA), prioritize identifying red flags such as infection, instability, or neurovascular compromise. Begin with a detailed history, noting the patient's age, time since sur...

## consult-05: How should I present a distal radius fracture consult?
- mode/level/depth: consult / pgy1 / standard
- subintent: detected=presentation_help
- detectedMode: consult
- sourceContext: null
- clinicalContext: facets=workup, imaging, classification, treatmentAlgorithm, complications, disposition; requirements=red_flags, missing_information, workup, temporizing_care, definitive_management_or_disposition; missing=age, mechanism, open/closed status, neurovascular exam, imaging findings
- quality: {"specificity":5,"modeFit":5,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=589
- warnings before revision: ask_clarification_answer_too_long
- warnings final: ask_clarification_answer_too_long
- revisionTriggered: true
- facetChipsGenerated: none
- chips: AO classification for distal radius fractures | Indications for operative management | Steps for closed reduction and splinting | Importance of neurovascular assessment | Signs of compartment syndrome
- failureMode: quality_gate:ask_clarification_answer_too_long, weak_consult_disposition
- answerSummary: - **Assessment:** Quickly determine if the fracture is open or closed and assess neurovascular status. - **Immediate priorities:** Document the neurovascular exam, open vs closed status, and any reduction or splinting pe...

## clinic-01: Shoulder pain workup
- mode/level/depth: clinic / med_student / standard
- subintent: detected=workup
- detectedMode: clinic
- sourceContext: null
- clinicalContext: facets=workup, imaging, indications, treatmentAlgorithm, complications; requirements=differential, history_exam, workup, first_line_management, escalation; missing=none
- quality: {"specificity":3,"modeFit":5,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=1060
- warnings before revision: attending_or_exam_pearl_missing
- warnings final: attending_or_exam_pearl_missing, level_junior_orientation_missing
- revisionTriggered: true
- facetChipsGenerated: none
- chips: Imaging findings for rotator cuff tears | Differentiating adhesive capsulitis and rotator cuff issues | Indications for shoulder surgery | Neurovascular exam in shoulder pain | Impact of comorbidities on shoulder pathology | Common pitfalls in shoulder pain workup
- failureMode: quality_gate:attending_or_exam_pearl_missing|level_junior_orientation_missing
- answerSummary: 1. **Differential Diagnoses**: Consider rotator cuff tear, adhesive capsulitis, shoulder impingement, glenohumeral osteoarthritis, and referred pain from the cervical spine. Tailor the differential based on age, activity...

## clinic-03: Differential diagnosis of hand infections
- mode/level/depth: clinic / pgy1 / quick
- subintent: detected=imaging_review
- detectedMode: clinic
- sourceContext: null
- clinicalContext: facets=workup, imaging, indications, treatmentAlgorithm, complications; requirements=differential, history_exam, workup, first_line_management, escalation; missing=none
- quality: {"specificity":2,"modeFit":5,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=816
- warnings before revision: level_junior_orientation_missing
- warnings final: facet_clinic_differential_missing, level_junior_orientation_missing
- revisionTriggered: true
- facetChipsGenerated: Differential diagnosis
- chips: Kanavel signs for flexor tenosynovitis | Differentiating cellulitis from abscess | Imaging for osteomyelitis in the hand | Indications for surgery in hand infections | Complications of deep space infections | Impact of trauma on hand infection diagnosis
- failureMode: quality_gate:facet_clinic_differential_missing|level_junior_orientation_missing, weak_clinic_workup_shape
- answerSummary: 1. **Cellulitis**: Presents with diffuse erythema and swelling. Imaging is typically not required unless there is suspicion of deeper infection. 2. **Abscess**: Characterized by localized swelling and fluctuance. Ultraso...

## clinic-ind-01: Indications for ACL reconstruction
- mode/level/depth: clinic / pgy2 / standard
- subintent: detected=indications forced=indications
- detectedMode: clinic
- sourceContext: null
- clinicalContext: facets=workup, imaging, indications, treatmentAlgorithm, complications; requirements=differential, history_exam, workup, first_line_management, escalation; missing=none
- quality: {"specificity":3,"modeFit":4,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":3}; answerLength=678
- warnings before revision: facet_clinic_differential_missing, branch_rubric_coverage_low
- warnings final: facet_clinic_differential_missing, branch_rubric_coverage_low
- revisionTriggered: true
- facetChipsGenerated: Differential diagnosis
- chips: Long-term outcomes of ACL reconstruction | Impact of meniscal injuries on ACL surgery | Conservative management for ACL injuries | Timing of ACL surgery post-injury | Role of physical therapy in ACL recovery
- failureMode: quality_gate:facet_clinic_differential_missing|branch_rubric_coverage_low, weak_clinic_workup_shape
- answerSummary: ACL reconstruction is indicated in the following scenarios: - **Acute ACL tear** with significant knee instability, particularly in athletes or active individuals who require knee stability for their activities. - **Chro...

## clinic-cls-01: Weber ankle fracture classification
- mode/level/depth: clinic / pgy2 / standard
- subintent: detected=classification forced=classification
- detectedMode: clinic
- sourceContext: null
- clinicalContext: facets=workup, imaging, indications, treatmentAlgorithm, complications, classification; requirements=differential, history_exam, workup, first_line_management, escalation; missing=none
- quality: {"specificity":3,"modeFit":5,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=929
- warnings before revision: attending_or_exam_pearl_missing, facet_clinic_differential_missing, branch_rubric_coverage_low
- warnings final: attending_or_exam_pearl_missing, facet_clinic_differential_missing, branch_rubric_coverage_low
- revisionTriggered: true
- facetChipsGenerated: Differential diagnosis
- chips: How to perform stress views for ankle fractures | Indications for syndesmotic fixation in Weber C fractures | Comparison of Weber and Lauge-Hansen classifications | Decision-making for posterior malleolus involvement | OITE questions on ankle fractures and classifications
- failureMode: quality_gate:attending_or_exam_pearl_missing|facet_clinic_differential_missing|branch_rubric_coverage_low, weak_clinic_workup_shape
- answerSummary: **Weber Classification**: - **Weber A**: Fracture below the syndesmosis. Typically stable and often managed non-operatively with casting or a walking boot. - **Weber B**: Fracture at the level of the syndesmosis. Stabili...

## general-01: What is a neutralization plate?
- mode/level/depth: general / pgy2 / standard
- subintent: detected=implant_options
- detectedMode: general
- sourceContext: null
- clinicalContext: facets=implants; requirements=; missing=none
- quality: {"specificity":4,"modeFit":4,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":3}; answerLength=661
- warnings before revision: branch_rubric_coverage_low
- warnings final: branch_rubric_coverage_low
- revisionTriggered: true
- facetChipsGenerated: none
- chips: Neutralization vs Compression Plates | Surgical Technique for Neutralization Plates | Complications of Neutralization Plates | Soft Tissue Considerations in Fixation | Fracture Stabilization Methods Overview
- failureMode: quality_gate:branch_rubric_coverage_low
- answerSummary: A neutralization plate is an orthopaedic implant used to stabilize fractures without providing compression. It is particularly useful in cases of unstable fractures, often in the diaphysis of long bones, where soft tissu...

## general-02: Tibial nail insertion techniques overview
- mode/level/depth: general / pgy2 / standard
- subintent: detected=implant_options
- detectedMode: general
- sourceContext: null
- clinicalContext: facets=implants; requirements=; missing=none
- quality: {"specificity":5,"modeFit":4,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":3}; answerLength=1041
- warnings before revision: branch_rubric_coverage_low
- warnings final: branch_rubric_coverage_low
- revisionTriggered: true
- facetChipsGenerated: none
- chips: Entry points for tibial nailing techniques | Impact of nail diameter on healing | Post-operative care protocols | Role of fluoroscopy in nail placement | Reaming technique nuances
- failureMode: quality_gate:branch_rubric_coverage_low
- answerSummary: 1. **Indications**: Tibial nailing is primarily indicated for diaphyseal fractures, especially unstable or comminuted ones. It can also be used for select metaphyseal fractures. 2. **Approach**: The anterograde technique...
