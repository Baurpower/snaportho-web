# BroBot Claims Live Audit

Generated: 2026-09-29T02:48:01.938Z
Paired real chats: 4
Grounded wins: 1; baseline wins: 1; ties: 2
Eligible reviewed claims retrieved: 3

## eligible-perineurium: What connective tissue surrounds nerve fascicles after a partial median nerve laceration?
- Anchors: Median Nerve, Median Nerve Compression, Obturator nerve, Suprascapular nerve, Median Neuropathy, Tibial nerve, Sciatic Nerve, Axillary Nerve
- Eligible claims: 0; used: 0; cards: 0
- Judge winner: tie
- Judge: {"winner":"tie","scoresA":{"correctness":5,"specificity":5,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Accurately identifies perineurium as connective tissue surrounding fascicles; clearly distinguishes nerve layers; includes relevant clinical context and exam pearls."},"scoresB":{"correctness":5,"specificity":5,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Correctly names perineurium and distinguishes nerve layers; provides protective function; includes study advice enhancing educational value."}}
- Baseline warnings: decision_making_missing, facet_algorithm_threshold_missing, anatomy_surgical_relevance_weak, branch_rubric_coverage_low; latency 3514 ms
- Grounded warnings: decision_making_missing, facet_algorithm_threshold_missing, anatomy_surgical_relevance_weak, branch_rubric_coverage_low; latency 3927 ms

### Baseline
- **Direct answer:** The connective tissue that surrounds nerve fascicles is called the **perineurium**.
- **Core framework:** Nerves are organized into fascicles, each surrounded by perineurium, which provides a protective barrier and maintains the internal environment.
- **High-yield distinction:** The perineurium is distinct from the epineurium, which surrounds the entire nerve, and the endoneurium, which surrounds individual nerve fibers within a fascicle.
- **Exam pearl:** Understanding the layers of nerve structure is crucial for surgical repair and avoiding further damage during procedures.
- **Common trap:** Confusing the perineurium with the epineurium or endoneurium can lead to errors in understanding nerve repair techniques.

### Grounded
- **Direct answer:** The perineurium is the connective tissue that surrounds nerve fascicles.
- **Core framework:** In nerve anatomy, the epineurium surrounds the entire nerve, the perineurium surrounds each fascicle, and the endoneurium surrounds individual nerve fibers.
- **High-yield distinction:** The perineurium provides a protective barrier and maintains the internal environment of the fascicles.
- **Exam trap:** Confusing the perineurium with the epineurium or endoneurium can lead to errors in understanding nerve repair techniques.
- **Next study move:** Review the layers of nerve structure and their roles in nerve injury and repair.

## eligible-groin-flap: Preparing a groin flap for traumatic thumb soft-tissue coverage. What is the pedicle and which nerve is at risk?
- Anchors: groin flap, Saphenous Nerve at Risk, Femoral Nerve at Risk, Obturator nerve, Suprascapular nerve, Tibial nerve, Median Nerve, Sciatic Nerve
- Eligible claims: 1; used: 1; cards: 0
- Judge winner: tie
- Judge: {"winner":"tie","scoresA":{"correctness":5,"specificity":5,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Accurately identifies the pedicle as the superficial circumflex iliac artery and the nerve at risk as the lateral femoral cutaneous nerve, consistent with the reviewed claim. Provides detailed anatomical context and consequences of injury, enhancing understanding."},"scoresB":{"correctness":5,"specificity":5,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Correctly states the pedicle and nerve at risk matching the reviewed claim. Includes relevant anatomical details and protective strategies, maintaining clarity and educational value."}}
- Baseline warnings: limited_concrete_ortho_detail, or_prep_exposure_terms_missing, or_prep_pitfall_bailout_missing, or_prep_learner_level_signal_missing, facet_or_prep_exposure_missing, facet_pitfall_layer_missing, branch_rubric_coverage_low; latency 6195 ms
- Grounded warnings: limited_concrete_ortho_detail, or_prep_exposure_terms_missing, or_prep_pitfall_bailout_missing, or_prep_learner_level_signal_missing, facet_or_prep_exposure_missing, facet_pitfall_layer_missing, branch_rubric_coverage_low; latency 4966 ms

### Baseline
- **Pedicle:** The superficial circumflex iliac artery (SCIA) is the primary vascular pedicle for a groin flap.
- **Nerve at Risk:** The lateral femoral cutaneous nerve (LFCN) is at risk during flap elevation.
- **Danger Zone:** The LFCN runs near the anterior superior iliac spine (ASIS) and can be injured during dissection.
- **Protection Strategy:** Carefully identify and preserve the LFCN during flap elevation to prevent sensory loss.
- **Consequence of Injury:** Damage to the LFCN can result in numbness or dysesthesia over the lateral thigh.

### Grounded
- **Pedicle:** The groin flap is based on the superficial circumflex iliac artery, which provides the vascular supply.
- **Nerve at risk:** The lateral femoral cutaneous nerve is at risk during flap elevation.
- **Danger zone:** The nerve is most at risk when dissecting near the anterior superior iliac spine (ASIS).
- **Protection strategy:** Carefully identify and protect the nerve by staying superficial and lateral to the ASIS during dissection.
- **Consequence of injury:** Injury to the lateral femoral cutaneous nerve can result in sensory loss or dysesthesia over the lateral thigh.

## eligible-latissimus-flap: For a latissimus dorsi myocutaneous flap covering a large adult elbow defect, what vessel supplies the main perforators?
- Anchors: latissimus dorsi myocutaneous flap, groin flap, Elbow dislocation, Elbow Stiffness, Elbow Joint, Elbow Instability, Elbow Anatomy, Elbow Approaches
- Eligible claims: 2; used: 1; cards: 0
- Judge winner: B
- Judge: {"winner":"B","scoresA":{"correctness":5,"specificity":4,"qualifierPreservation":5,"educationalUsefulness":4,"reasons":"Accurately identifies the thoracodorsal artery as the main vessel supplying the flap and its origin; concise but less detailed on surgical implications."},"scoresB":{"correctness":5,"specificity":5,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Correctly identifies the vessel and origin, adds important surgical relevance, consequences of injury, and protective maneuvers, enhancing educational value without unsupported detail."}}
- Baseline warnings: answer_short_for_depth, decision_making_missing, limited_concrete_ortho_detail, or_prep_exposure_terms_missing, or_prep_decision_point_missing, or_prep_pitfall_bailout_missing, or_prep_learner_level_signal_missing, facet_or_prep_exposure_missing, facet_pitfall_layer_missing, anatomy_surgical_relevance_weak, branch_rubric_coverage_low; latency 6307 ms
- Grounded warnings: limited_concrete_ortho_detail, or_prep_exposure_terms_missing, or_prep_learner_level_signal_missing, facet_or_prep_exposure_missing, branch_rubric_coverage_low; latency 5987 ms

### Baseline
**Vessel Supply:** The thoracodorsal artery supplies the main perforators for the latissimus dorsi myocutaneous flap. This artery is a branch of the subscapular artery, which itself branches from the axillary artery. The thoracodorsal artery runs along the deep surface of the latissimus dorsi muscle, providing robust vascular supply for the flap.

### Grounded
- **Vessel:** The thoracodorsal artery supplies the main perforators to the latissimus dorsi myocutaneous flap.
- **Course:** The thoracodorsal artery is a branch of the subscapular artery, which itself branches from the axillary artery.
- **Surgical Relevance:** Ensure the thoracodorsal artery is preserved during flap harvest to maintain flap viability.
- **Injury Consequence:** Damage to this artery can lead to flap necrosis due to inadequate blood supply.
- **Protective Maneuver:** Careful dissection and identification of the thoracodorsal artery during flap elevation are crucial to avoid injury.

## eligible-carpal-tunnel: During open carpal tunnel release, which branch is endangered by a radial transverse carpal ligament cut and what deficit results?
- Anchors: Carpal Tunnel, Open Carpal Tunnel Release, Incomplete Carpal Tunnel Release, Revision Carpal Tunnel Release, Endoscopic Carpal Tunnel Release, Open Carpal Tunnel Approach, Radial Collateral Ligament, Carpal Tunnel Syndrome
- Eligible claims: 0; used: 0; cards: 0
- Judge winner: A
- Judge: {"winner":"A","scoresA":{"correctness":5,"specificity":4,"qualifierPreservation":5,"educationalUsefulness":5,"reasons":"Correctly identifies the palmar cutaneous branch as at risk and sensory loss in the palm; emphasizes incision placement relative to the thenar crease, which is a standard landmark; includes useful surgical tips and pitfalls; preserves qualifiers about anatomy and surgical technique."},"scoresB":{"correctness":3,"specificity":3,"qualifierPreservation":4,"educationalUsefulness":4,"reasons":"Correctly identifies the palmar cutaneous branch but incorrectly states sensory loss over the thenar eminence rather than the central palm; incision guidance is less precise; notes sensory-only deficit which is accurate; less detailed about surgical landmarks and pitfalls."}}
- Baseline warnings: decision_making_missing, limited_concrete_ortho_detail, or_prep_exposure_terms_missing, level_junior_orientation_missing; latency 5236 ms
- Grounded warnings: limited_concrete_ortho_detail, or_prep_exposure_terms_missing; latency 4508 ms

### Baseline
- **Anatomy at risk:** The palmar cutaneous branch of the median nerve is at risk during a radial transverse cut of the transverse carpal ligament.
- **Resulting deficit:** Injury to this branch can lead to sensory loss in the palm, as it provides sensation to the central palm area.
- **Key decision:** Ensure the incision stays ulnar to the thenar crease to avoid this branch.
- **Pitfall:** Residents often misjudge the location of the palmar cutaneous branch, leading to inadvertent injury.
- **Attending expectation:** Be prepared to discuss the course of the palmar cutaneous branch and how to avoid it during the procedure.

### Grounded
- **Anatomy at risk:** The palmar cutaneous branch of the median nerve is at risk during a radial transverse cut of the transverse carpal ligament.
- **Deficit:** Injury to this branch can result in sensory loss over the thenar eminence, as it provides sensation to the skin over this area.
- **Key decision:** Ensure the incision stays ulnar to the palmar cutaneous branch to avoid injury.
- **Pitfall/Bailout:** If the branch is inadvertently cut, the deficit is purely sensory, and no motor function is affected.
- **Attending relevance:** Be prepared to discuss how you identify and protect the palmar cutaneous branch during the procedure.
