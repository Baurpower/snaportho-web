# BroBot P0 Live Audit

Generated: 2026-07-08T02:24:36.725Z
Fixtures: 20
Averages: {"specificity":3.65,"modeFit":4.25,"testRelevance":3.05,"surgicalUsefulness":3.25,"lengthControl":4,"followUpChipQuality":3.7}
Revision triggered: 18/20
Source context found: 0/20
Final quality gate warnings: 18/20

## or-01: Distal radius ORIF tomorrow. What do I need to know?
- mode/level/depth: or_prep / pgy2 / standard
- detectedMode: or_prep
- sourceContext: null
- clinicalContext: facets=exposure, anatomy, steps, implants, complications, pitfalls; requirements=exposure_or_approach, named_anatomy, key_steps_or_checks, decision_points, pitfalls_or_bailout; missing=none
- quality: {"specificity":5,"modeFit":4,"testRelevance":3,"surgicalUsefulness":4,"lengthControl":4,"followUpChipQuality":3}; answerLength=1013
- warnings before revision: branch_rubric_coverage_low
- warnings final: branch_rubric_coverage_low
- revisionTriggered: true
- chips: Volar FCR approach anatomy | Reduction maneuvers for distal radius fractures | Volar plate positioning pitfalls | Avoid dorsal screw penetration | Fragment-specific fixation strategies
- failureMode: quality_gate:branch_rubric_coverage_low
- answerSummary: - **Objective:** Restore length, radial inclination, volar tilt, and articular congruity without losing reduction during plate placement. - **Exposure:** Use the standard volar FCR approach. Stay radial to the FCR tendon...

## or-02: Trigger finger release steps
- mode/level/depth: or_prep / pgy1 / quick
- detectedMode: or_prep
- sourceContext: null
- clinicalContext: facets=exposure, anatomy, steps, implants, complications, pitfalls; requirements=exposure_or_approach, named_anatomy, key_steps_or_checks, decision_points, pitfalls_or_bailout; missing=none
- quality: {"specificity":4,"modeFit":4,"testRelevance":3,"surgicalUsefulness":4,"lengthControl":4,"followUpChipQuality":3}; answerLength=695
- warnings before revision: or_prep_learner_level_signal_missing, branch_rubric_coverage_low
- warnings final: or_prep_learner_level_signal_missing, branch_rubric_coverage_low
- revisionTriggered: true
- chips: Flexor tendon sheath anatomy | A1 pulley and neurovascular bundle relationship | Signs of incomplete release | Checking tendon gliding post-release | Common pitfalls in trigger finger release | Postoperative management considerations
- failureMode: quality_gate:or_prep_learner_level_signal_missing|branch_rubric_coverage_low
- answerSummary: - **Objective:** Relieve constriction of the flexor tendon at the A1 pulley to restore smooth tendon gliding. - **Exposure:** Use the distal palmar crease as a landmark; make a small transverse or longitudinal incision o...

## or-03: Reverse TSA key surgical techniques
- mode/level/depth: or_prep / pgy4 / deep
- detectedMode: or_prep
- sourceContext: null
- clinicalContext: facets=exposure, anatomy, steps, implants, complications, pitfalls; requirements=exposure_or_approach, named_anatomy, key_steps_or_checks, decision_points, pitfalls_or_bailout; missing=none
- quality: {"specificity":5,"modeFit":4,"testRelevance":3,"surgicalUsefulness":4,"lengthControl":4,"followUpChipQuality":3}; answerLength=991
- warnings before revision: none
- warnings final: none
- revisionTriggered: false
- chips: Biomechanics of reverse TSA | Specific implant systems for reverse TSA | Management of intraoperative complications | Importance of glenoid version | Deltoid tensioning techniques
- failureMode: none_obvious
- answerSummary: - **Objective:** Achieve stable shoulder function by reversing the ball-and-socket configuration to improve deltoid mechanics, especially in cuff-deficient shoulders. - **Exposure:** Use a deltopectoral approach; identif...

## or-04: How do I confirm carpal tunnel release is complete?
- mode/level/depth: or_prep / pgy1 / standard
- detectedMode: or_prep
- sourceContext: null
- clinicalContext: facets=exposure, anatomy, steps, implants, complications, pitfalls; requirements=exposure_or_approach, named_anatomy, key_steps_or_checks, decision_points, pitfalls_or_bailout; missing=none
- quality: {"specificity":4,"modeFit":4,"testRelevance":3,"surgicalUsefulness":4,"lengthControl":4,"followUpChipQuality":4}; answerLength=920
- warnings before revision: level_junior_orientation_missing
- warnings final: level_junior_orientation_missing
- revisionTriggered: true
- chips: Course of the median nerve and branches | Anatomy of the transverse carpal ligament | Techniques for safe exposure extension | Effective palpation techniques for ligament release | Common complications of carpal tunnel release
- failureMode: quality_gate:level_junior_orientation_missing
- answerSummary: - **Objective:** Ensure complete decompression of the median nerve by releasing the transverse carpal ligament. - **Exposure:** Adequate exposure of the transverse carpal ligament is crucial. Ensure you have a clear view...

## or-05: Intertroch nail start point
- mode/level/depth: or_prep / pgy2 / standard
- detectedMode: or_prep
- sourceContext: null
- clinicalContext: facets=exposure, anatomy, steps, implants, complications, pitfalls; requirements=exposure_or_approach, named_anatomy, key_steps_or_checks, decision_points, pitfalls_or_bailout; missing=none
- quality: {"specificity":5,"modeFit":4,"testRelevance":3,"surgicalUsefulness":4,"lengthControl":4,"followUpChipQuality":4}; answerLength=981
- warnings before revision: branch_rubric_coverage_low, entity_not_named
- warnings final: branch_rubric_coverage_low, entity_not_named
- revisionTriggered: true
- chips: Greater trochanter anatomy review | Implications of incorrect starting points | Using fluoroscopy for entry point adjustment | Preventing varus malalignment | Importance of nail trajectory
- failureMode: quality_gate:branch_rubric_coverage_low|entity_not_named
- answerSummary: **Objective:** Achieve proper entry point for nail insertion to ensure alignment and avoid iatrogenic fracture. **Exposure:** Use a lateral approach with the patient in a supine position on a fracture table. Ensure the C...

## oite-01: SCFE OITE points
- mode/level/depth: oite / pgy2 / standard
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":4,"modeFit":4,"testRelevance":4,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=862
- warnings before revision: oite_memory_hook_missing
- warnings final: oite_test_taking_signal_missing, oite_memory_hook_missing
- revisionTriggered: true
- chips: Classification of SCFE: Stable vs Unstable | Imaging Findings in SCFE | Endocrine Risk Factors in SCFE | Management of Unstable SCFE | Differential Diagnosis: SCFE vs Perthes
- failureMode: quality_gate:oite_test_taking_signal_missing|oite_memory_hook_missing
- answerSummary: - **Direct answer:** Unstable SCFE carries the highest risk of avascular necrosis (AVN); management urgency and pinning strategy are primarily determined by stability rather than slip angle alone. - **Core framework:** C...

## oite-02: What is the Garden classification?
- mode/level/depth: oite / pgy2 / standard
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":3,"modeFit":4,"testRelevance":2,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=751
- warnings before revision: attending_or_exam_pearl_missing, facet_oite_trap_distractor_missing, oite_trap_missing, oite_comparison_missing, oite_test_taking_signal_missing, oite_memory_hook_missing, branch_rubric_coverage_low
- warnings final: attending_or_exam_pearl_missing, facet_oite_trap_distractor_missing, oite_trap_missing, oite_comparison_missing, oite_test_taking_signal_missing, oite_memory_hook_missing, branch_rubric_coverage_low
- revisionTriggered: true
- chips: Differentiate Garden from Pauwels classification | Understand surgical options for Garden III/IV | Recognize imaging features of Garden types | Learn complications associated with displaced fractures
- failureMode: quality_gate:attending_or_exam_pearl_missing|facet_oite_trap_distractor_missing|oite_trap_missing|oite_comparison_missing|oite_test_taking_signal_missing|oite_memory_hook_missing|branch_rubric_coverage_low, weak_oite_trap_layer
- answerSummary: - **Garden Classification Purpose:** Used to classify femoral neck fractures based on displacement, which guides treatment decisions. - **Type I:** Incomplete fracture or valgus impacted; often stable and treated non-ope...

## oite-03: Femoral shaft fracture OITE traps
- mode/level/depth: oite / pgy3 / standard
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors, imaging; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":4,"modeFit":4,"testRelevance":4,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=866
- warnings before revision: oite_comparison_missing, branch_rubric_coverage_low
- warnings final: oite_comparison_missing, branch_rubric_coverage_low
- revisionTriggered: true
- chips: Differentiating femoral neck from shaft fractures | Indications for intramedullary nailing | Recognizing fat embolism syndrome | High-energy vs low-energy trauma in fractures | Criteria for surgical intervention in fractures
- failureMode: quality_gate:oite_comparison_missing|branch_rubric_coverage_low
- answerSummary: - **Classic trap:** Confusing femoral shaft fractures with femoral neck fractures, especially in stems emphasizing mechanism and patient age. Pay attention to the location of the fracture on imaging. - **Distractor:** Op...

## oite-04: Flexion extension gap imbalance questions
- mode/level/depth: oite / pgy3 / standard
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":3,"modeFit":4,"testRelevance":4,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":3}; answerLength=648
- warnings before revision: facet_algorithm_threshold_missing, oite_comparison_missing, oite_algorithm_missing, oite_test_taking_signal_missing, oite_memory_hook_missing
- warnings final: facet_algorithm_threshold_missing, oite_comparison_missing, oite_algorithm_missing, oite_test_taking_signal_missing, oite_memory_hook_missing
- revisionTriggered: true
- chips: How femoral component rotation affects gap balance | Role of tibial slope in gap balancing | Surgical techniques for gap imbalances | Common misconceptions about gap imbalances | Assessing flexion and extension gaps
- failureMode: quality_gate:facet_algorithm_threshold_missing|oite_comparison_missing|oite_algorithm_missing|oite_test_taking_signal_missing|oite_memory_hook_missing
- answerSummary: - **Direct answer:** Flexion-extension gap imbalance in knee arthroplasty often requires adjusting femoral component position or soft tissue balancing. - **Core framework:** Evaluate the flexion gap (posterior condyles)...

## oite-05: Quiz me on THA must-see anatomy
- mode/level/depth: oite / med_student / quick
- detectedMode: oite
- sourceContext: null
- clinicalContext: facets=classification, treatmentAlgorithm, testTraps, distractors, anatomy; requirements=tested_concept, stem_clues, trap_or_distractor, algorithm_or_threshold; missing=none
- quality: {"specificity":3,"modeFit":4,"testRelevance":2,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=739
- warnings before revision: facet_oite_trap_distractor_missing, facet_algorithm_threshold_missing, oite_trap_missing, oite_comparison_missing, oite_algorithm_missing, oite_board_pearl_missing, oite_test_taking_signal_missing, branch_rubric_coverage_low, level_junior_orientation_missing
- warnings final: facet_oite_trap_distractor_missing, facet_algorithm_threshold_missing, oite_trap_missing, oite_comparison_missing, oite_algorithm_missing, oite_board_pearl_missing, oite_test_taking_signal_missing, oite_memory_hook_missing, branch_rubric_coverage_low, level_junior_orientation_missing
- revisionTriggered: true
- chips: Structures at risk in posterior approach | Structures at risk in lateral approach | Preventing nerve injuries in THA | Comparing surgical approaches for THA | Common pitfalls in total hip arthroplasty
- failureMode: quality_gate:facet_oite_trap_distractor_missing|facet_algorithm_threshold_missing|oite_trap_missing|oite_comparison_missing|oite_algorithm_missing|oite_board_pearl_missing|oite_test_taking_signal_missing|oite_memory_hook_missing|branch_rubric_coverage_low|level_junior_orientation_missing, weak_oite_trap_layer
- answerSummary: **Question:** During a posterior approach to total hip arthroplasty, which structure is most at risk of injury when dislocating the hip? A) Sciatic nerve B) Femoral artery C) Obturator nerve D) Superior gluteal artery **...

## consult-01: Ankle fracture consult. How should I think about it?
- mode/level/depth: consult / pgy1 / standard
- detectedMode: consult
- sourceContext: null
- clinicalContext: facets=workup, imaging, classification, treatmentAlgorithm, complications, disposition; requirements=red_flags, missing_information, workup, temporizing_care, definitive_management_or_disposition; missing=age, mechanism, open/closed status, neurovascular exam, imaging findings
- quality: {"specificity":3,"modeFit":5,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=780
- warnings before revision: ask_clarification_answer_too_long
- warnings final: ask_clarification_answer_too_long
- revisionTriggered: true
- chips: Weber vs Lauge-Hansen classifications | When syndesmosis is unstable | Posterior malleolus decision-making | Intra-op stress views for ankle stability | Ankle fracture treatment algorithms
- failureMode: quality_gate:ask_clarification_answer_too_long, weak_consult_disposition
- answerSummary: When evaluating an ankle fracture, start by determining if the fracture is open or closed, and assess for any neurovascular compromise or dislocation. Conduct a thorough neurovascular exam, check for open wounds, assess...

## consult-02: Treatment options for PJI
- mode/level/depth: consult / pgy2 / standard
- detectedMode: consult
- sourceContext: null
- clinicalContext: facets=workup, imaging, classification, treatmentAlgorithm, complications, disposition; requirements=red_flags, missing_information, workup, temporizing_care, definitive_management_or_disposition; missing=age, imaging findings, ESR/CRP/WBC and aspiration status, wound status
- quality: {"specificity":5,"modeFit":4,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=1169
- warnings before revision: ask_clarification_answer_too_long
- warnings final: ask_clarification_answer_too_long
- revisionTriggered: true
- chips: DAIR eligibility criteria | One-stage vs. two-stage exchange indications | Role of biofilm in PJI management | Importance of culture-directed antibiotics | Differentiating acute and chronic PJI
- failureMode: quality_gate:ask_clarification_answer_too_long, weak_consult_disposition
- answerSummary: - **Assessment:** Determine if the infection is acute or chronic, as this influences treatment strategy. - **Immediate priorities:** Obtain cultures, assess the patient's systemic status, and evaluate the stability of th...

## consult-03: Open tibia in ED
- mode/level/depth: consult / pgy1 / quick
- detectedMode: consult
- sourceContext: null
- clinicalContext: facets=workup, imaging, classification, treatmentAlgorithm, complications, disposition; requirements=red_flags, missing_information, workup, temporizing_care, definitive_management_or_disposition; missing=age, wound status
- quality: {"specificity":3,"modeFit":5,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=704
- warnings before revision: facet_consult_disposition_missing, level_junior_orientation_missing
- warnings final: facet_consult_disposition_missing, level_junior_orientation_missing
- revisionTriggered: true
- chips: Gustilo-Anderson classification for open fractures | Principles of initial antibiotic therapy | Steps for surgical debridement and fixation | Conducting a thorough neurovascular exam | Tetanus prophylaxis in open fractures
- failureMode: quality_gate:facet_consult_disposition_missing|level_junior_orientation_missing, weak_consult_disposition
- answerSummary: - **Urgency:** This is an emergent situation due to the high risk of infection and potential for neurovascular compromise. - **Immediate priorities:** Assess and document the neurovascular status, evaluate the wound for...

## consult-04: Painful TKA consult
- mode/level/depth: consult / pgy2 / standard
- detectedMode: consult
- sourceContext: null
- clinicalContext: facets=workup, imaging, classification, treatmentAlgorithm, complications, disposition; requirements=red_flags, missing_information, workup, temporizing_care, definitive_management_or_disposition; missing=age, imaging findings
- quality: {"specificity":3,"modeFit":4,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=46
- warnings before revision: none
- warnings final: none
- revisionTriggered: false
- chips: Workup for painful total knee arthroplasty | Imaging strategies for TKA pain | Differential diagnosis for TKA pain | Treatment options for painful TKA | Red flags in painful TKA cases | Questions seniors might ask about TKA
- failureMode: weak_consult_disposition
- answerSummary: BroBot could not format a structured response.

## consult-05: How should I present a distal radius fracture consult?
- mode/level/depth: consult / pgy1 / standard
- detectedMode: consult
- sourceContext: null
- clinicalContext: facets=workup, imaging, classification, treatmentAlgorithm, complications, disposition; requirements=red_flags, missing_information, workup, temporizing_care, definitive_management_or_disposition; missing=age, mechanism, open/closed status, neurovascular exam, imaging findings
- quality: {"specificity":5,"modeFit":5,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=641
- warnings before revision: ask_clarification_answer_too_long
- warnings final: ask_clarification_answer_too_long
- revisionTriggered: true
- chips: Classification of distal radius fractures | Indications for operative vs non-operative management | Anatomy relevant to distal radius fractures | Common complications and their management | Importance of neurovascular exam in wrist injuries
- failureMode: quality_gate:ask_clarification_answer_too_long, weak_consult_disposition
- answerSummary: - **Assessment:** Confirm if the fracture is open or closed and evaluate for neurovascular compromise. - **Immediate priorities:** Conduct and document a thorough neurovascular exam, ascertain open fracture status, and e...

## clinic-01: Shoulder pain workup
- mode/level/depth: clinic / med_student / standard
- detectedMode: clinic
- sourceContext: null
- clinicalContext: facets=workup, imaging, indications, treatmentAlgorithm, complications; requirements=differential, history_exam, workup, first_line_management, escalation; missing=none
- quality: {"specificity":3,"modeFit":5,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=1161
- warnings before revision: attending_or_exam_pearl_missing
- warnings final: attending_or_exam_pearl_missing
- revisionTriggered: true
- chips: Specific tests for shoulder pathology | Indications for MRI vs. X-ray | Differentiating acute and chronic shoulder pain | Identifying red flags in shoulder pain | Importance of mechanism of injury | Nonoperative management options for shoulder pain
- failureMode: quality_gate:attending_or_exam_pearl_missing
- answerSummary: 1. **Differential Diagnoses**: Consider conditions such as rotator cuff tear, impingement syndrome, adhesive capsulitis, glenohumeral arthritis, and referred pain from the cervical spine. Differentiate based on patient a...

## clinic-02: Indications for ACL reconstruction
- mode/level/depth: clinic / pgy2 / standard
- detectedMode: clinic
- sourceContext: null
- clinicalContext: facets=workup, imaging, indications, treatmentAlgorithm, complications; requirements=differential, history_exam, workup, first_line_management, escalation; missing=none
- quality: {"specificity":3,"modeFit":4,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":3}; answerLength=728
- warnings before revision: facet_clinic_differential_missing, clinic_framework_weak, branch_rubric_coverage_low
- warnings final: facet_clinic_differential_missing, clinic_framework_weak, branch_rubric_coverage_low
- revisionTriggered: true
- chips: Non-operative management for partial ACL tears | Timing of ACL surgery after injury | Impact of age and activity on ACL surgery decisions | Assessing functional demands for ACL surgery | Influence of associated injuries on ACL reconstruction
- failureMode: quality_gate:facet_clinic_differential_missing|clinic_framework_weak|branch_rubric_coverage_low, weak_clinic_workup_shape
- answerSummary: 1. **Acute ACL tear in active individuals**: Indicated for patients, especially athletes, with a complete tear and instability during activities involving pivoting or cutting. 2. **Chronic knee instability**: Patients ex...

## clinic-03: Differential diagnosis of hand infections
- mode/level/depth: clinic / pgy1 / quick
- detectedMode: clinic
- sourceContext: null
- clinicalContext: facets=workup, imaging, indications, treatmentAlgorithm, complications; requirements=differential, history_exam, workup, first_line_management, escalation; missing=none
- quality: {"specificity":2,"modeFit":5,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=626
- warnings before revision: facet_clinic_differential_missing, clinic_framework_weak, level_junior_orientation_missing
- warnings final: facet_clinic_differential_missing, level_junior_orientation_missing
- revisionTriggered: true
- chips: Signs of flexor tenosynovitis | Imaging indications for osteomyelitis | Management protocol for abscesses | Management of deep space infections | Differential diagnosis of hand infections
- failureMode: quality_gate:facet_clinic_differential_missing|level_junior_orientation_missing, weak_clinic_workup_shape
- answerSummary: 1. **Cellulitis**: Look for diffuse erythema and swelling; typically managed with antibiotics. 2. **Abscess**: Presents with localized fluctuance; requires drainage and antibiotics. 3. **Flexor Tenosynovitis**: Character...

## general-01: What is a neutralization plate?
- mode/level/depth: general / pgy2 / standard
- detectedMode: general
- sourceContext: null
- clinicalContext: facets=implants; requirements=; missing=none
- quality: {"specificity":4,"modeFit":4,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":3}; answerLength=806
- warnings before revision: branch_rubric_coverage_low
- warnings final: branch_rubric_coverage_low
- revisionTriggered: true
- chips: Neutralization vs Compression Plates | Surgical Techniques for Neutralization Plates | Biomechanical Principles of Plate Fixation | Load Sharing vs Load Bearing in Plate Selection | Role of Soft Tissue Management in Plate Fixation
- failureMode: quality_gate:branch_rubric_coverage_low
- answerSummary: A neutralization plate is an orthopaedic implant used to stabilize fractures by neutralizing forces at the fracture site without providing compression. It is particularly indicated for unstable fractures, often in the di...

## general-02: FDP and FDS anatomy facts I need to know
- mode/level/depth: general / pgy2 / standard
- detectedMode: general
- sourceContext: null
- clinicalContext: facets=anatomy, imaging; requirements=named_anatomy; missing=none
- quality: {"specificity":2,"modeFit":4,"testRelevance":3,"surgicalUsefulness":3,"lengthControl":4,"followUpChipQuality":4}; answerLength=808
- warnings before revision: decision_making_missing, branch_rubric_coverage_low
- warnings final: decision_making_missing, branch_rubric_coverage_low
- revisionTriggered: true
- chips: Common surgical approaches affecting FDS and FDP | Assessing FDP and FDS function clinically | Rehabilitation implications of tendon injuries | Differentiating between FDP and FDS injuries | Role of the flexor sheath in tendon healing | Potential complications of FDS and FDP injuries
- failureMode: quality_gate:decision_making_missing|branch_rubric_coverage_low
- answerSummary: The flexor digitorum superficialis (FDS) and flexor digitorum profundus (FDP) are essential for finger flexion. - **FDS**: Originates from the medial epicondyle of the humerus and inserts on the middle phalanx of digits...
