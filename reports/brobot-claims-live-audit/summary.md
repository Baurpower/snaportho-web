# BroBot Claims Live Audit

Generated: 2026-09-29T03:03:56.874Z
Paired real chats: 6
Grounded wins: 0; baseline wins: 2; ties: 4
Eligible reviewed claims retrieved: 6

## oite-scfe: SCFE OITE points and treatment thresholds
- Anchors: SCFE
- Eligible claims: 0; used: 0; cards: 0
- Judge winner: tie
- Judge: {"winner":"tie","scoresA":{"correctness":5,"specificity":4,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Accurately states that unstable SCFE has highest AVN risk and urgency depends on stability; includes relevant exam findings and management principles. Slightly less explicit on typical management of stable SCFE."},"scoresB":{"correctness":5,"specificity":5,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Equally accurate and preserves qualifiers; more explicit about stable SCFE management (in-situ pinning) and clarifies treatment strategy differences. Matches A in all other aspects."}}
- Baseline warnings: oite_memory_hook_missing; latency 5181 ms
- Grounded warnings: oite_memory_hook_missing; latency 5246 ms

### Baseline
- **Direct answer:** Unstable SCFE has the highest risk of avascular necrosis (AVN); treatment urgency often pivots on stability rather than just slip angle.
- **Core framework:** Consider age, body habitus, and endocrine risk factors; differentiate stable vs unstable SCFE, then decide on in-situ fixation vs more complex correction.
- **High-yield distinction:** Recognize obligate external rotation and limited internal rotation as key exam findings rather than vague hip pain.
- **Exam trap:** Residents often memorize Klein's line but miss that management decisions usually hinge on stability or atypical endocrine features.
- **Management pivot:** Stability is crucial; unstable SCFE requires urgent surgical intervention to prevent complications like AVN.

### Grounded
- **Direct answer:** Unstable SCFE has the highest risk of avascular necrosis (AVN); treatment urgency and strategy often pivot on stability rather than slip angle alone.
- **Core framework:** Classify SCFE as stable or unstable; stable SCFE typically managed with in-situ pinning, while unstable may require more urgent intervention.
- **High-yield distinction:** Recognize obligate external rotation and limited internal rotation as key exam findings; these are more reliable than vague hip pain.
- **Exam trap:** Klein's line is often memorized, but management decisions usually hinge on stability and atypical features like endocrine disorders.
- **Management pivot:** Stability assessment is crucial; unstable SCFE requires urgent surgical intervention to minimize complications like AVN.

## oite-garden: Explain the Garden classification and why it changes treatment
- Anchors: AIN, Garden Classification
- Eligible claims: 0; used: 0; cards: 0
- Judge winner: tie
- Judge: {"winner":"tie","scoresA":{"correctness":5,"specificity":5,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Accurately describes Garden classification grades and treatment implications with correct qualifiers; clearly explains AVN risk and treatment rationale; includes a useful note on common confusion between Garden I and II."},"scoresB":{"correctness":5,"specificity":5,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Equally accurate and specific as A; correctly details classification and treatment; adds a slightly different but valid note on Garden I being impacted affecting stability and treatment; overall equally educational."}}
- Baseline warnings: oite_memory_hook_missing, branch_rubric_coverage_low; latency 4806 ms
- Grounded warnings: oite_memory_hook_missing, branch_rubric_coverage_low; latency 4997 ms

### Baseline
- **Classification system:** The Garden classification is used for femoral neck fractures, categorizing them based on displacement seen on AP radiographs.
- **Key grades:**
  - **Garden I:** Incomplete fracture, valgus impacted.
  - **Garden II:** Complete fracture, non-displaced.
  - **Garden III:** Complete fracture, partially displaced.
  - **Garden IV:** Complete fracture, fully displaced.
- **Treatment implications:**
  - **Garden I/II:** Typically treated with internal fixation due to preserved blood supply.
  - **Garden III/IV:** Often require arthroplasty in older patients due to higher risk of avascular necrosis (AVN) and nonunion.
- **High-yield distinction:** Displacement (Garden III/IV) increases AVN risk, guiding the decision towards arthroplasty.
- **Common trap:** Confusing Garden I with II; both are non-displaced but differ in fracture completeness.

### Grounded
- **Classification system:** The Garden classification is used for femoral neck fractures, categorizing them based on displacement seen on AP radiographs.
- **Key grades:**
  - **Garden I:** Incomplete fracture, valgus impacted.
  - **Garden II:** Complete fracture, non-displaced.
  - **Garden III:** Complete fracture, partially displaced.
  - **Garden IV:** Complete fracture, fully displaced.
- **Treatment implications:**
  - **Garden I/II:** Typically managed with internal fixation due to stability.
  - **Garden III/IV:** Often require arthroplasty in older patients due to high risk of avascular necrosis (AVN) and nonunion.
- **High-yield distinction:** Displacement (III/IV) increases risk of AVN, influencing the decision towards arthroplasty.
- **Common trap:** Confusing Garden I with II; both are non-displaced but I is impacted, which affects stability and treatment.

## clinic-acl: What are the indications for ACL reconstruction?
- Anchors: none
- Eligible claims: 0; used: 0; cards: 0
- Judge winner: A
- Judge: {"winner":"A","scoresA":{"correctness":5,"specificity":4,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Accurately identifies key clinical indications such as instability during activities, considers meniscal injuries and patient factors like age and activity level, which are important in decision-making."},"scoresB":{"correctness":4,"specificity":4,"qualifierPreservation":4,"educationalUsefulness":4,"reasons":"Lists relevant clinical history and exam findings and imaging, but these are more diagnostic steps rather than direct indications for reconstruction."}}
- Baseline warnings: answer_short_for_depth, facet_clinic_differential_missing, branch_rubric_coverage_low; latency 4525 ms
- Grounded warnings: answer_short_for_depth, facet_clinic_differential_missing, branch_rubric_coverage_low; latency 4010 ms

### Baseline
- Instability during activities of daily living or sports is a key indication.
- Associated meniscal injuries can influence surgical decisions.
- Age and activity level are critical factors in determining the need for reconstruction.

### Grounded
- History of knee instability or giving way episodes.
- Physical exam findings: Lachman test and pivot shift test.
- Imaging: MRI to confirm ACL tear and assess for associated injuries.

## or-ctr: How do I confirm carpal tunnel release is complete?
- Anchors: Carpal Tunnel
- Eligible claims: 0; used: 0; cards: 0
- Judge winner: tie
- Judge: {"winner":"tie","scoresA":{"correctness":5,"specificity":4,"qualifierPreservation":5,"educationalUsefulness":4,"reasons":"Accurately describes key steps to confirm complete release, including palpation and visualization of the median nerve. Mentions anatomy at risk and potential pitfalls. Slightly less specific about incision details."},"scoresB":{"correctness":5,"specificity":4,"qualifierPreservation":5,"educationalUsefulness":4,"reasons":"Also accurately describes confirmation by palpation and visualization, mentions anatomy at risk with slightly different branch noted, and incision details. Similar educational value and completeness."}}
- Baseline warnings: none; latency 6375 ms
- Grounded warnings: none; latency 6013 ms

### Baseline
- **Objective:** Ensure full decompression of the median nerve by releasing the transverse carpal ligament.
- **Exposure:** Identify the transverse carpal ligament under direct visualization after incising the skin and subcutaneous tissue.
- **Anatomy at Risk:** Be cautious of the median nerve and its branches, especially the recurrent motor branch, during the release.
- **Key Decision/Check:** Palpate the edges of the released ligament to ensure no residual tight bands remain. You should be able to see and feel the median nerve freely.
- **Pitfall/Bailout:** Incomplete release can lead to persistent symptoms. If unsure, extend the incision proximally or distally to ensure full release.
- **Attending Expectation:** Be prepared to explain how you confirmed the release and what you did to protect the nerve during the procedure.

### Grounded
- **Objective:** Ensure complete decompression of the median nerve by releasing the transverse carpal ligament.
- **Exposure:** Use a standard longitudinal incision over the carpal tunnel, typically starting at the wrist crease and extending distally.
- **Anatomy at Risk:** Be cautious of the median nerve and its palmar cutaneous branch, which are at risk during the release.
- **Key Decision/Check:** Palpate the edges of the released transverse carpal ligament to ensure no residual tight bands remain. You should be able to see and feel the median nerve freely.
- **Pitfall/Bailout:** Incomplete release can lead to persistent symptoms. If unsure, extend the incision slightly to improve visualization and ensure full release.
- **Attending Expectation:** Be prepared to explain how you confirmed the release was complete and how you protected the nerve during the procedure.

## consult-ankle: Ankle fracture consult. What changes urgency and management?
- Anchors: Ankle Fracture
- Eligible claims: 0; used: 0; cards: 0
- Judge winner: A
- Judge: {"winner":"A","scoresA":{"correctness":5,"specificity":5,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"A accurately identifies key urgency factors including open fractures, neurovascular compromise, dislocation, and skin tenting. It clearly links specific findings (talar shift, syndesmotic injury, medial clear-space widening) to management changes. It provides a structured approach to presentation and attending questions, enhancing educational value."},"scoresB":{"correctness":4,"specificity":4,"qualifierPreservation":4,"educationalUsefulness":4,"reasons":"B correctly lists urgency factors but uses less precise terms (e.g., 'severe soft tissue injury' vs 'skin tenting or compromise'). It mentions important management steps like immediate reduction but lacks detail on specific radiographic findings that alter management. The attending questions are less comprehensive."}}
- Baseline warnings: ask_clarification_answer_too_long; latency 4571 ms
- Grounded warnings: ask_clarification_answer_too_long; latency 4085 ms

### Baseline
- **Urgency factors:** Open fractures, neurovascular compromise, dislocation, and skin tenting or compromise are emergent and require immediate attention.
- **Management changes:** Talar shift, syndesmotic injury, medial clear-space widening, and inability to maintain reduction can change management from non-operative to operative.
- **Immediate priorities:** Document neurovascular status, open vs closed fracture, reduction status, and obtain appropriate imaging.
- **Presentation framework:** Include age, mechanism, open/closed status, neurovascular exam, reduction/splint status, and imaging findings.
- **Attending questions:** Expect questions on fracture classification, stability, and any signs of soft tissue compromise.

### Grounded
- **Urgency factors:** Open fractures, neurovascular compromise, dislocation, and severe soft tissue injury require emergent attention.
- **Assessment:** Determine if the fracture is open or closed, check for neurovascular status, and assess for dislocation or talar shift.
- **Management priorities:** Immediate reduction and splinting if dislocated, especially if neurovascular compromise is present.
- **Imaging:** Obtain AP, lateral, and mortise views to assess fracture pattern and stability.
- **Attending questions:** Be prepared to discuss the mechanism of injury, fracture classification, and any signs of syndesmotic injury.

## or-distal-radius: Distal radius ORIF tomorrow. Key exposure, anatomy, and decisions?
- Anchors: Distal Radius, Distal Radius ORIF, ORIF, ORIF, Radius
- Eligible claims: 6; used: 0; cards: 0
- Judge winner: tie
- Judge: {"winner":"tie","scoresA":{"correctness":5,"specificity":5,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Accurately describes key exposure, anatomy, and decisions with correct anatomical details and surgical steps. Includes relevant pitfalls and attending discussion points."},"scoresB":{"correctness":5,"specificity":5,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Equally accurate and specific as A, with clear description of exposure, anatomy at risk, and key decisions. Includes fluoroscopy mention which is appropriate and consistent with A's content."}}
- Baseline warnings: branch_rubric_coverage_low; latency 4450 ms
- Grounded warnings: branch_rubric_coverage_low; latency 5822 ms

### Baseline
- **Objective:** Restore length, radial inclination, volar tilt, and articular congruity without losing reduction during plate placement.
- **Exposure:** Use the volar FCR approach. Incise along the radial border of the flexor carpi radialis (FCR) tendon, retract it ulnarly, and protect the radial artery. Elevate the pronator quadratus to expose the distal radius.
- **Anatomy at risk:** Be cautious of the median nerve in the carpal tunnel, the palmar cutaneous branch of the median nerve, the radial artery, and flexor tendons if the plate is placed too distally.
- **Key decisions/checks:** Confirm fracture pattern and reduction. Use provisional fixation before plate application. Check lateral and tilt views for dorsal screw penetration.
- **Pitfall/Bailout:** Avoid accepting malreduction or long distal screws. If the volar plate is fighting the reduction, re-reduce before locking distally.
- **Attending relevance:** Be prepared to discuss why the FCR interval was chosen, the significance of the watershed line, and strategies to avoid flexor tendon irritation.

### Grounded
- **Objective:** Restore length, radial inclination, volar tilt, and articular congruity without losing reduction during plate placement.
- **Exposure:** Use the volar FCR approach; stay radial to the Flexor Carpi Radialis (FCR) tendon, protect the radial artery, and elevate the pronator quadratus to expose the distal radius.
- **Anatomy at risk:** Be cautious of the median nerve in the carpal tunnel, the palmar cutaneous branch, the radial artery, and flexor tendons, especially if the plate is placed too distally.
- **Key decisions/checks:** Confirm fracture pattern and reduction before plate fixation. Use fluoroscopy to check for dorsal screw penetration and ensure proper alignment.
- **Pitfall/Bailout:** Avoid accepting malreduction or long distal screws. If the volar plate is not fitting well, re-reduce the fracture before locking the distal screws.
- **Attending relevance:** Be prepared to discuss why the FCR interval was chosen, the significance of the watershed line, and strategies to avoid flexor tendon irritation.
