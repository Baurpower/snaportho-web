import type { BroBotBranchOption, BroBotChatSubintent } from './types';

/**
 * Tier 1: curated, topic-specific chip sets for high-frequency ortho questions.
 * Keyed by a regex match against the raw user message, then by the classified
 * subintent (the same topic needs different chips depending on whether the
 * user asked about approach vs. classification vs. indications, etc.).
 */
type CuratedTopic = {
  id: string;
  match: RegExp;
  chips: Partial<Record<BroBotChatSubintent, BroBotBranchOption[]>>;
};

const CURATED_TOPICS: CuratedTopic[] = [
  {
    id: 'proximal_humerus',
    match: /\bproximal humerus\b/i,
    chips: {
      surgical_approach: [
        { id: 'deltopectoral_steps', label: 'Deltopectoral steps', description: 'Step-by-step deltopectoral exposure.', category: 'Surgical Approach' },
        { id: 'axillary_nerve_risk', label: 'Axillary nerve risk', description: 'Where the axillary nerve is at risk and how to protect it.', category: 'Anatomy' },
        { id: 'deltoid_split_alternative', label: 'Deltoid-split alternative', description: 'When to use the anterolateral deltoid-splitting approach instead.', category: 'Surgical Approach' },
        { id: 'extend_the_exposure', label: 'Extend the exposure', description: 'How to extend proximally or distally if needed.', category: 'Surgical Approach' },
        { id: 'common_mistakes', label: 'Common mistakes', description: 'Frequent exposure errors and how to avoid them.', category: 'Complications' },
        { id: 'attending_pimp_questions', label: 'Attending pimp questions', description: 'What the attending is likely to ask before incision.', category: 'Pimp Questions' },
        { id: 'oite_traps', label: 'OITE traps', description: 'Board-style traps for this approach.', category: 'Board Review' },
      ],
    },
  },
  {
    id: 'distal_radius',
    match: /\bdistal radius\b/i,
    chips: {
      overview: [
        { id: 'volar_fcr_approach_anatomy', label: 'Volar FCR approach anatomy', description: 'FCR interval, radial artery, PQ, and median nerve relevance.', category: 'Surgical Approach' },
        { id: 'avoid_dorsal_screw_penetration', label: 'Avoid dorsal screw penetration', description: 'Views and tactics to prevent extensor tendon injury.', category: 'OR Technique' },
        { id: 'ct_changes_plan', label: 'When CT changes the plan', description: 'Articular fragments and fixation strategy changes.', category: 'Imaging' },
        { id: 'unstable_fracture_features', label: 'What makes it unstable', description: 'Radiographic and patient factors that change treatment.', category: 'Clinical Decision Making' },
        { id: 'volar_plate_position_pitfalls', label: 'Volar plate positioning pitfalls', description: 'Watershed line, plate prominence, and tendon risk.', category: 'Complications' },
      ],
      surgical_approach: [
        { id: 'volar_approach_flexor_carpi_radialis', label: 'Volar FCR approach anatomy', description: 'Volar Henry approach via the FCR interval.', category: 'Surgical Approach' },
        { id: 'pronator_quadratus_management', label: 'Pronator quadratus elevation', description: 'How to elevate and repair pronator quadratus.', category: 'Surgical Approach' },
        { id: 'radial_artery_risk', label: 'Radial artery risk', description: 'Where the radial artery is at risk during exposure.', category: 'Anatomy' },
        { id: 'dorsal_approach_alternative', label: 'Dorsal approach alternative', description: 'When a dorsal approach is preferred instead.', category: 'Surgical Approach' },
        { id: 'common_mistakes', label: 'Common mistakes', description: 'Frequent exposure errors for distal radius ORIF.', category: 'Complications' },
        { id: 'oite_traps', label: 'OITE traps', description: 'Board-style traps for distal radius approach.', category: 'Board Review' },
      ],
      surgical_steps: [
        { id: 'volar_fcr_approach_anatomy', label: 'Volar FCR approach anatomy', description: 'FCR interval, radial artery, PQ, and median nerve relevance.', category: 'Surgical Approach' },
        { id: 'fragment_specific_fixation', label: 'Fragment-specific fixation', description: 'How fixation choice changes by fracture fragment.', category: 'Implant Selection' },
        { id: 'reduction_maneuvers', label: 'Reduction maneuvers', description: 'Traction, manipulation, and provisional fixation.', category: 'Reduction Pearls' },
        { id: 'avoid_dorsal_screw_penetration', label: 'Avoid dorsal screw penetration', description: 'Required intraoperative views and what they confirm.', category: 'OR Technique' },
        { id: 'volar_plate_position_pitfalls', label: 'Volar plate positioning pitfalls', description: 'Frequent technical errors in distal radius ORIF.', category: 'Complications' },
      ],
      implant_options: [
        { id: 'volar_locking_plate', label: 'Volar locking plate', description: 'Indications and pitfalls of volar locking plates.', category: 'Implant Selection' },
        { id: 'fragment_specific_implants', label: 'Fragment-specific implants', description: 'When dedicated fragment plates are needed.', category: 'Implant Selection' },
        { id: 'external_fixation_alternative', label: 'External fixation alternative', description: 'When to choose ex-fix over plating.', category: 'Implant Selection' },
        { id: 'plate_position_pitfalls', label: 'Plate position pitfalls', description: 'Watershed line and tendon irritation risk.', category: 'Complications' },
      ],
    },
  },
  {
    id: 'ankle_fracture',
    match: /\bankle fracture(s)?\b/i,
    chips: {
      overview: [
        { id: 'stable_vs_unstable_mortise', label: 'Stable vs unstable mortise', description: 'Medial clear space, talar shift, and operative relevance.', category: 'Clinical Decision Making' },
        { id: 'weber_vs_lauge_hansen', label: 'Weber vs Lauge-Hansen', description: 'How the two classification systems differ and when each is used.', category: 'Classification Systems' },
        { id: 'syndesmosis_instability', label: 'When syndesmosis is unstable', description: 'Imaging, stress tests, and fixation implications.', category: 'Clinical Decision Making' },
        { id: 'posterior_malleolus_decision', label: 'Posterior malleolus decision-making', description: 'Fragment size, incisura involvement, and fixation decisions.', category: 'Clinical Decision Making' },
        { id: 'intraop_stress_views', label: 'Intra-op stress views', description: 'Stress imaging and syndesmotic assessment in the OR.', category: 'OR Technique' },
      ],
      classification: [
        { id: 'stable_vs_unstable_mortise', label: 'Stable vs unstable mortise', description: 'Medial clear space, talar shift, and operative relevance.', category: 'Clinical Decision Making' },
        { id: 'weber_vs_lauge_hansen', label: 'Weber vs Lauge-Hansen', description: 'How the two classification systems differ and when each is used.', category: 'Classification Systems' },
        { id: 'stress_views', label: 'Stress views', description: 'When and how to get stress radiographs.', category: 'Clinical Decision Making' },
        { id: 'syndesmosis_instability', label: 'When syndesmosis is unstable', description: 'Imaging and exam clues for syndesmotic injury.', category: 'Anatomy' },
        { id: 'posterior_malleolus_decision', label: 'Posterior malleolus decision-making', description: 'How posterior malleolus morphology changes treatment.', category: 'Clinical Decision Making' },
        { id: 'oite_questions', label: 'OITE questions', description: 'Board-style questions on ankle fracture classification.', category: 'Board Review' },
      ],
    },
  },
  {
    id: 'intertrochanteric',
    match: /\binter ?troch(anteric)?\b/i,
    chips: {
      treatment_algorithm: [
        { id: 'stable_vs_unstable_pattern', label: 'Stable vs unstable pattern', description: 'What makes a pattern unstable and why it matters.', category: 'Classification Systems' },
        { id: 'reverse_obliquity_pattern', label: 'Reverse obliquity pattern', description: 'Why reverse obliquity changes implant choice.', category: 'Classification Systems' },
        { id: 'cephalomedullary_nail_vs_sliding_hip_screw', label: 'Nail vs sliding hip screw', description: 'When each fixation construct is preferred.', category: 'Implant Selection' },
        { id: 'tip_apex_distance', label: 'Tip-apex distance', description: 'Why TAD matters and how to measure it.', category: 'Clinical Decision Making' },
        { id: 'fixation_failure_modes', label: 'Fixation failure modes', description: 'Cutout, varus collapse, and how to avoid them.', category: 'Complications' },
        { id: 'oite_traps', label: 'OITE traps', description: 'Board-style traps for intertrochanteric fixation.', category: 'Board Review' },
      ],
      surgical_steps: [
        { id: 'general_or_flow', label: 'Case flow start to finish', description: 'Positioning, reduction, nail insertion, fixation, closure.', category: 'OR Technique' },
        { id: 'starting_point', label: 'Starting point', description: 'Entry point landmarks for the cephalomedullary nail.', category: 'Surgical Approach' },
        { id: 'reduction_maneuvers', label: 'Reduction maneuvers', description: 'Traction table and manual reduction techniques.', category: 'Reduction Pearls' },
        { id: 'fluoro_checks', label: 'Fluoro checks', description: 'Required views to confirm reduction and implant position.', category: 'OR Technique' },
        { id: 'common_mistakes', label: 'Common mistakes', description: 'Frequent technical errors in nailing.', category: 'Complications' },
      ],
    },
  },
  {
    id: 'femoral_neck',
    match: /\bfemoral neck\b/i,
    chips: {
      overview: [
        { id: 'young_patient_reduction_algorithm', label: 'Young patient reduction algorithm', description: 'Urgent reduction/fixation priorities and why they matter.', category: 'Clinical Decision Making' },
        { id: 'garden_vs_pauwels', label: 'Garden vs Pauwels', description: 'Displacement vs vertical shear and fixation risk.', category: 'Classification Systems' },
        { id: 'blood_supply_avn_risk', label: 'Blood supply and AVN risk', description: 'Retinacular vessel anatomy and AVN risk.', category: 'Anatomy' },
        { id: 'fixation_vs_hemi_vs_tha', label: 'Fixation vs hemi vs THA', description: 'Age, displacement, activity, and arthroplasty choice.', category: 'Clinical Decision Making' },
        { id: 'oite_complications_traps', label: 'OITE complications and traps', description: 'AVN, nonunion, and board-style treatment traps.', category: 'Board Review' },
      ],
      classification: [
        { id: 'garden_vs_pauwels', label: 'Garden vs Pauwels', description: 'Displacement vs vertical shear and fixation risk.', category: 'Classification Systems' },
        { id: 'blood_supply_avn_risk', label: 'Blood supply and AVN risk', description: 'Retinacular vessel anatomy and AVN risk.', category: 'Anatomy' },
        { id: 'fixation_vs_hemi_vs_tha', label: 'Fixation vs hemi vs THA', description: 'Age, displacement, activity, and arthroplasty choice.', category: 'Clinical Decision Making' },
        { id: 'oite_complications_traps', label: 'OITE complications and traps', description: 'AVN, nonunion, and board-style treatment traps.', category: 'Board Review' },
      ],
      treatment_algorithm: [
        { id: 'young_patient_reduction_algorithm', label: 'Young patient reduction algorithm', description: 'Urgent reduction/fixation priorities and why they matter.', category: 'Clinical Decision Making' },
        { id: 'garden_vs_pauwels', label: 'Garden vs Pauwels', description: 'Displacement vs vertical shear and fixation risk.', category: 'Classification Systems' },
        { id: 'blood_supply_avn_risk', label: 'Blood supply and AVN risk', description: 'Retinacular vessel anatomy and AVN risk.', category: 'Anatomy' },
        { id: 'fixation_vs_hemi_vs_tha', label: 'Fixation vs hemi vs THA', description: 'Age and displacement thresholds for each option.', category: 'Clinical Decision Making' },
        { id: 'oite_complications_traps', label: 'OITE complications and traps', description: 'Board-style traps for femoral neck fracture management.', category: 'Board Review' },
      ],
    },
  },
  {
    id: 'total_hip_arthroplasty',
    match: /\b(tha|total hip arthroplasty)\b/i,
    chips: {
      overview: [
        { id: 'cup_position_instability', label: 'Cup position and instability', description: 'Inclination, anteversion, and impingement/stability risk.', category: 'OR Technique' },
        { id: 'femoral_exposure_mistakes', label: 'Femoral exposure mistakes', description: 'How poor exposure causes fracture, varus, or undersizing.', category: 'Surgical Approach' },
        { id: 'leg_length_offset_checks', label: 'Leg length and offset checks', description: 'Intraoperative checks and what changes the plan.', category: 'OR Technique' },
        { id: 'combined_anteversion', label: 'Combined anteversion', description: 'How cup and stem version interact.', category: 'Clinical Decision Making' },
        { id: 'approach_specific_anatomy', label: 'Approach-specific anatomy', description: 'Structures at risk by posterior, anterior, and lateral approaches.', category: 'Anatomy' },
      ],
      surgical_steps: [
        { id: 'cup_position_instability', label: 'Cup position and instability', description: 'Inclination, anteversion, and impingement/stability risk.', category: 'OR Technique' },
        { id: 'femoral_exposure_mistakes', label: 'Femoral exposure mistakes', description: 'How poor exposure causes fracture, varus, or undersizing.', category: 'Surgical Approach' },
        { id: 'leg_length_offset_checks', label: 'Leg length and offset checks', description: 'Intraoperative checks and what changes the plan.', category: 'OR Technique' },
        { id: 'combined_anteversion', label: 'Combined anteversion', description: 'How cup and stem version interact.', category: 'Clinical Decision Making' },
      ],
    },
  },
  {
    id: 'reverse_tsa',
    match: /\breverse (tsa|total shoulder( arthroplasty)?|shoulder arthroplasty)\b/i,
    chips: {
      indications: [
        { id: 'cuff_tear_arthropathy', label: 'Cuff tear arthropathy', description: 'The classic indication for reverse TSA.', category: 'Indications' },
        { id: 'fracture_indications', label: 'Fracture indications', description: 'When reverse TSA is chosen for proximal humerus fracture.', category: 'Indications' },
        { id: 'contraindications', label: 'Contraindications', description: 'When reverse TSA should be avoided.', category: 'Indications' },
        { id: 'anatomic_vs_reverse_tsa', label: 'Anatomic vs reverse TSA', description: 'How to decide between anatomic and reverse options.', category: 'Clinical Decision Making' },
        { id: 'complication_profile', label: 'Complication profile', description: 'Notch, instability, infection, and nerve risk.', category: 'Complications' },
        { id: 'key_papers', label: 'Key papers', description: 'Landmark literature behind reverse TSA indications.', category: 'Evidence' },
      ],
    },
  },
  {
    id: 'acl_tear',
    match: /\bacl\b/i,
    chips: {
      overview: [
        { id: 'femoral_tunnel_pitfalls', label: 'Femoral tunnel placement pitfalls', description: 'Avoid vertical/anterior tunnel errors and rotational instability.', category: 'OR Technique' },
        { id: 'graft_choice_tradeoffs', label: 'BTB vs quad vs hamstring graft', description: 'Graft choice tradeoffs by age, sport, morbidity, and failure risk.', category: 'Implant Selection' },
        { id: 'pivot_shift_rotational_instability', label: 'Pivot shift and rotational instability', description: 'What pivot shift tells you and why it changes planning.', category: 'Clinical Decision Making' },
        { id: 'meniscus_root_plan_changers', label: 'Meniscus/root lesions that change the plan', description: 'Associated pathology that changes reconstruction strategy.', category: 'Clinical Decision Making' },
        { id: 'oite_graft_choice_traps', label: 'OITE graft-choice traps', description: 'Board-style graft selection and failure-risk traps.', category: 'Board Review' },
      ],
      surgical_steps: [
        { id: 'femoral_tunnel_pitfalls', label: 'Femoral tunnel placement pitfalls', description: 'Avoid vertical/anterior tunnel errors and rotational instability.', category: 'OR Technique' },
        { id: 'graft_choice_tradeoffs', label: 'BTB vs quad vs hamstring graft', description: 'Graft choice tradeoffs by age, sport, morbidity, and failure risk.', category: 'Implant Selection' },
        { id: 'pivot_shift_rotational_instability', label: 'Pivot shift and rotational instability', description: 'What pivot shift tells you and why it changes planning.', category: 'Clinical Decision Making' },
        { id: 'meniscus_root_plan_changers', label: 'Meniscus/root lesions that change the plan', description: 'Associated pathology that changes reconstruction strategy.', category: 'Clinical Decision Making' },
        { id: 'oite_graft_choice_traps', label: 'OITE graft-choice traps', description: 'Board-style graft selection and failure-risk traps.', category: 'Board Review' },
      ],
      workup: [
        { id: 'lachman_vs_pivot_shift', label: 'Lachman vs pivot shift', description: 'Exam maneuvers and what each suggests.', category: 'Anatomy' },
        { id: 'imaging_to_order', label: 'Imaging to order', description: 'When MRI is needed vs clinical diagnosis alone.', category: 'Clinical Decision Making' },
        { id: 'associated_injuries', label: 'Associated injuries', description: 'Meniscus, MCL, and bone bruise patterns to check.', category: 'Clinical Decision Making' },
        { id: 'nonoperative_vs_operative', label: 'Nonoperative vs operative', description: 'Activity level and instability thresholds for surgery.', category: 'Indications' },
        { id: 'graft_choice_overview', label: 'Graft choice overview', description: 'Autograft vs allograft tradeoffs.', category: 'Implant Selection' },
      ],
      differential: [
        { id: 'lachman_vs_pivot_shift', label: 'Lachman vs pivot shift', description: 'Exam maneuvers and what each suggests.', category: 'Anatomy' },
        { id: 'associated_injuries', label: 'Associated injuries', description: 'Meniscus, MCL, and bone bruise patterns to check.', category: 'Clinical Decision Making' },
        { id: 'imaging_to_order', label: 'Imaging to order', description: 'When MRI is needed vs clinical diagnosis alone.', category: 'Clinical Decision Making' },
      ],
    },
  },
  {
    id: 'hand_infections',
    match: /\b(hand infection|hand infections|flexor tenosynovitis|deep space infection)\b/i,
    chips: {
      overview: [
        { id: 'flexor_tenosynovitis_algorithm', label: 'Flexor tenosynovitis algorithm', description: 'Kanavel signs, urgency, antibiotics, and operative drainage.', category: 'Clinical Decision Making' },
        { id: 'deep_space_infection_anatomy', label: 'Deep space infection anatomy', description: 'Thenar, midpalmar, web space, and Parona space relevance.', category: 'Anatomy' },
        { id: 'when_to_go_to_or', label: 'When to go to the OR', description: 'Clinical triggers for urgent operative management.', category: 'Indications' },
        { id: 'antibiotics_vs_drainage', label: 'Antibiotics vs drainage', description: 'When antibiotics alone are insufficient.', category: 'Clinical Decision Making' },
        { id: 'oite_red_flags', label: 'OITE red flags', description: 'Board traps and red flags for hand infections.', category: 'Board Review' },
      ],
      differential: [
        { id: 'flexor_tenosynovitis_algorithm', label: 'Flexor tenosynovitis algorithm', description: 'Kanavel signs, urgency, antibiotics, and operative drainage.', category: 'Clinical Decision Making' },
        { id: 'deep_space_infection_anatomy', label: 'Deep space infection anatomy', description: 'Thenar, midpalmar, web space, and Parona space relevance.', category: 'Anatomy' },
        { id: 'when_to_go_to_or', label: 'When to go to the OR', description: 'Clinical triggers for urgent operative management.', category: 'Indications' },
        { id: 'antibiotics_vs_drainage', label: 'Antibiotics vs drainage', description: 'When antibiotics alone are insufficient.', category: 'Clinical Decision Making' },
        { id: 'oite_red_flags', label: 'OITE red flags', description: 'Board traps and red flags for hand infections.', category: 'Board Review' },
      ],
      infection: [
        { id: 'flexor_tenosynovitis_algorithm', label: 'Flexor tenosynovitis algorithm', description: 'Kanavel signs, urgency, antibiotics, and operative drainage.', category: 'Clinical Decision Making' },
        { id: 'deep_space_infection_anatomy', label: 'Deep space infection anatomy', description: 'Thenar, midpalmar, web space, and Parona space relevance.', category: 'Anatomy' },
        { id: 'when_to_go_to_or', label: 'When to go to the OR', description: 'Clinical triggers for urgent operative management.', category: 'Indications' },
        { id: 'antibiotics_vs_drainage', label: 'Antibiotics vs drainage', description: 'When antibiotics alone are insufficient.', category: 'Clinical Decision Making' },
      ],
    },
  },
  {
    id: 'carpal_tunnel',
    match: /\bcarpal tunnel\b/i,
    chips: {
      workup: [
        { id: 'phalen_vs_tinel', label: 'Phalen vs Tinel', description: 'Provocative exam maneuvers and sensitivity/specificity.', category: 'Anatomy' },
        { id: 'nerve_conduction_studies', label: 'Nerve conduction studies', description: 'When NCS/EMG is indicated before surgery.', category: 'Clinical Decision Making' },
        { id: 'nonoperative_options', label: 'Nonoperative options', description: 'Splinting and injection before surgical referral.', category: 'Rehabilitation' },
        { id: 'surgical_indications', label: 'Surgical indications', description: 'When to recommend carpal tunnel release.', category: 'Indications' },
        { id: 'differential_diagnoses', label: 'Differential diagnoses', description: 'Cervical radiculopathy and other mimics.', category: 'Clinical Decision Making' },
      ],
    },
  },
  {
    id: 'septic_arthritis',
    match: /\bseptic (arthritis|joint)\b/i,
    chips: {
      overview: [
        { id: 'kocher_criteria', label: 'Kocher criteria', description: 'Clinical prediction rule for septic arthritis vs transient synovitis.', category: 'Clinical Decision Making' },
        { id: 'joint_aspiration_thresholds', label: 'Joint aspiration thresholds', description: 'Synovial WBC and other thresholds suggesting infection.', category: 'Clinical Decision Making' },
        { id: 'urgent_management_steps', label: 'Urgent management steps', description: 'Why this needs urgent OR washout.', category: 'Clinical Decision Making' },
        { id: 'presentation_help', label: 'How to present this consult', description: 'How to present a suspected septic joint to your senior.', category: 'Pimp Questions' },
        { id: 'common_mistakes', label: 'Common mistakes', description: 'Delays and pitfalls in septic joint workup.', category: 'Complications' },
      ],
      initial_consult: [
        { id: 'kocher_criteria', label: 'Kocher criteria', description: 'Clinical prediction rule for septic arthritis vs transient synovitis.', category: 'Clinical Decision Making' },
        { id: 'joint_aspiration_thresholds', label: 'Joint aspiration thresholds', description: 'Synovial WBC and other thresholds suggesting infection.', category: 'Clinical Decision Making' },
        { id: 'urgent_management_steps', label: 'Urgent management steps', description: 'Why this needs urgent OR washout.', category: 'Clinical Decision Making' },
        { id: 'presentation_help', label: 'How to present this consult', description: 'How to present a suspected septic joint to your senior.', category: 'Pimp Questions' },
      ],
    },
  },
  {
    id: 'compartment_syndrome',
    match: /\bcompartment syndrome\b/i,
    chips: {
      overview: [
        { id: 'six_ps', label: 'The 6 P\'s', description: 'Classic exam findings and their limitations.', category: 'Clinical Decision Making' },
        { id: 'compartment_pressure_thresholds', label: 'Compartment pressure thresholds', description: 'Delta-P and absolute pressure thresholds for fasciotomy.', category: 'Clinical Decision Making' },
        { id: 'fasciotomy_timing', label: 'Fasciotomy timing', description: 'Why this is a time-critical surgical emergency.', category: 'Clinical Decision Making' },
        { id: 'presentation_help', label: 'How to present this consult', description: 'How to present suspected compartment syndrome urgently.', category: 'Pimp Questions' },
        { id: 'common_mistakes', label: 'Common mistakes', description: 'Delays and pitfalls that worsen outcomes.', category: 'Complications' },
      ],
      initial_consult: [
        { id: 'six_ps', label: 'The 6 P\'s', description: 'Classic exam findings and their limitations.', category: 'Clinical Decision Making' },
        { id: 'compartment_pressure_thresholds', label: 'Compartment pressure thresholds', description: 'Delta-P and absolute pressure thresholds for fasciotomy.', category: 'Clinical Decision Making' },
        { id: 'fasciotomy_timing', label: 'Fasciotomy timing', description: 'Why this is a time-critical surgical emergency.', category: 'Clinical Decision Making' },
        { id: 'presentation_help', label: 'How to present this consult', description: 'How to present suspected compartment syndrome urgently.', category: 'Pimp Questions' },
      ],
    },
  },
];

/** Tier 1: exact curated topic + subintent match. */
export function getCuratedChips(
  message: string,
  subintent: BroBotChatSubintent
): BroBotBranchOption[] | null {
  const lower = message.toLowerCase();
  for (const topic of CURATED_TOPICS) {
    if (topic.match.test(lower)) {
      const chips = topic.chips[subintent] ?? topic.chips.overview;
      if (chips?.length) return chips;
    }
  }
  return null;
}

/**
 * Tier 2: subintent-aware generic chips, used when no curated topic matched
 * but the subintent itself is one of the curated-rubric subintents. These
 * are still specific to the question type (not "Surgical details"/"Complications"),
 * just not procedure-named.
 */
export function getSubintentFallbackChips(input: {
  subintent: BroBotChatSubintent;
  procedureOrTopic: string;
}): BroBotBranchOption[] | null {
  const topicLabel = input.procedureOrTopic.trim().slice(0, 60) || 'this procedure';

  if (input.subintent === 'surgical_approach') {
    return [
      { id: 'approach_options', label: 'Approach options', description: `Named approach choices for ${topicLabel}.`, category: 'Surgical Approach' },
      { id: 'internervous_plane', label: 'Internervous plane', description: 'The internervous/intermuscular plane used.', category: 'Anatomy' },
      { id: 'structures_at_risk', label: 'Structures at risk', description: 'Named structures at risk during this approach.', category: 'Anatomy' },
      { id: 'extend_the_exposure', label: 'Extend the exposure', description: 'How to extend the approach if needed.', category: 'Surgical Approach' },
      { id: 'common_mistakes', label: 'Common mistakes', description: 'Frequent exposure errors.', category: 'Complications' },
      { id: 'oite_traps', label: 'OITE traps', description: 'Board-style pearls for this approach.', category: 'Board Review' },
    ];
  }

  if (input.subintent === 'classification') {
    return [
      { id: 'classification_systems', label: 'Classification systems', description: `Systems used to classify ${topicLabel}.`, category: 'Classification Systems' },
      { id: 'treatment_implications', label: 'Treatment implications', description: 'How classification changes management.', category: 'Clinical Decision Making' },
      { id: 'common_traps', label: 'Common traps', description: 'Classification pitfalls.', category: 'Complications' },
      { id: 'oite_questions', label: 'OITE questions', description: 'Board-style classification questions.', category: 'Board Review' },
    ];
  }

  if (input.subintent === 'indications') {
    return [
      { id: 'primary_indications', label: 'Primary indications', description: `Main indications for ${topicLabel}.`, category: 'Indications' },
      { id: 'contraindications', label: 'Contraindications', description: 'When this should be avoided.', category: 'Indications' },
      { id: 'alternative_options', label: 'Alternative options', description: 'Other treatment options to compare against.', category: 'Clinical Decision Making' },
      { id: 'complication_profile', label: 'Complication profile', description: 'Key complications to anticipate.', category: 'Complications' },
      { id: 'key_papers', label: 'Key papers', description: 'Evidence behind the indications.', category: 'Evidence' },
    ];
  }

  if (input.subintent === 'patient_explanation') {
    return [
      { id: 'plain_language_summary', label: 'Plain-language summary', description: `How to explain ${topicLabel} to a patient.`, category: 'Patient Education' },
      { id: 'risks_in_plain_terms', label: 'Risks in plain terms', description: 'How to describe risks without jargon.', category: 'Patient Education' },
      { id: 'recovery_expectations', label: 'Recovery expectations', description: 'What to tell patients about recovery.', category: 'Patient Education' },
      { id: 'common_patient_questions', label: 'Common patient questions', description: 'Questions patients often ask.', category: 'Patient Education' },
    ];
  }

  return null;
}

/** Tiered selection: curated topic match, then subintent-aware fallback, then null. */
export function selectSmartChips(input: {
  message: string;
  subintent: BroBotChatSubintent;
  procedureOrTopic: string;
}): BroBotBranchOption[] | null {
  return (
    getCuratedChips(input.message, input.subintent) ??
    getSubintentFallbackChips({ subintent: input.subintent, procedureOrTopic: input.procedureOrTopic })
  );
}
