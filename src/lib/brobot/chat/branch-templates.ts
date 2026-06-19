import type {
  BroBotBranchOption,
  BroBotChatMode,
  BroBotProcedureCategory,
} from './types';

export const MODE_BRANCH_LIBRARY: Record<Exclude<BroBotChatMode, 'auto' | 'fracture_call'>, BroBotBranchOption[]> = {
  or_prep: [
    { id: 'key_landmarks', label: 'What landmarks should I find first?', description: 'Positioning, incision, portals, and approach cues.', category: 'Surgical Approach' },
    { id: 'operative_steps', label: 'What are the key operative steps?', description: 'Stepwise flow and decision points.', category: 'OR Technique' },
    { id: 'anatomy_at_risk', label: 'What anatomy is most at risk?', description: 'Structures to protect and where they are encountered.', category: 'Anatomy' },
    { id: 'implant_selection', label: 'What implants should I know?', description: 'Implant choices, reduction goals, and backup plans.', category: 'Implant Selection' },
    { id: 'complications_tested', label: 'What complications get tested most?', description: 'Pitfalls and how to avoid them.', category: 'Complications' },
    { id: 'attending_pimp_questions', label: "What will the attending ask?", description: 'What to ask before incision and what they may ask you.', category: 'Pimp Questions' },
  ],
  consult: [
    { id: 'missing_information', label: 'What information am I missing?', description: 'What data you need before calling up.', category: 'Clinical Decision Making' },
    { id: 'immediate_priorities', label: 'What should I do first?', description: 'Safety checks, red flags, and temporizing actions.', category: 'Clinical Decision Making' },
    { id: 'presentation_help', label: 'How should I present this consult?', description: 'How to present the consult clearly.', category: 'Pimp Questions' },
    { id: 'imaging_labs', label: 'What imaging or labs matter?', description: 'Views, labs, and diagnostic pitfalls.', category: 'Classification Systems' },
    { id: 'differential', label: 'What else could this be?', description: 'What else this could be and why it matters.', category: 'Clinical Decision Making' },
    { id: 'operative_indications', label: 'What makes this operative?', description: 'What pushes this toward surgery.', category: 'Indications' },
    { id: 'attending_questions', label: 'What will my senior ask?', description: 'Questions to anticipate from your senior or attending.', category: 'Pimp Questions' },
  ],
  oite: [
    { id: 'board_pearls', label: 'What are the board-style pearls?', description: 'The fastest board-relevant overview.', category: 'Board Review' },
    { id: 'concept_prerequisites', label: 'What must I know first?', description: 'Prerequisite concept framework before memorizing details.', category: 'Board Review' },
    { id: 'classification', label: 'What classification should I know?', description: 'Classification systems and thresholds.', category: 'Classification Systems' },
    { id: 'treatment_algorithm', label: 'What treatment algorithm gets tested?', description: 'Testable management sequence.', category: 'Clinical Decision Making' },
    { id: 'treatment_pivots', label: 'What finding changes treatment?', description: 'Thresholds, classifications, and findings that change the answer.', category: 'Clinical Decision Making' },
    { id: 'test_traps', label: 'What traps show up on OITE?', description: 'Common wrong-answer traps.', category: 'Board Review' },
    { id: 'distractor_diagnosis', label: 'What diagnosis is the distractor?', description: 'The tempting wrong diagnosis and how to distinguish it.', category: 'Controversies' },
    { id: 'quiz_me', label: 'Can you quiz me on this?', description: 'Turn this into questions.', category: 'Board Review' },
    { id: 'compare_diagnoses', label: 'What diagnoses look similar?', description: 'Differentiate similar diagnoses.', category: 'Controversies' },
  ],
  clinic: [
    { id: 'differential', label: 'What diagnoses should I consider?', description: 'Most likely diagnoses and must-not-miss causes.', category: 'Clinical Decision Making' },
    { id: 'history_exam', label: 'What exam findings matter most?', description: 'History, exam maneuvers, and interpretation.', category: 'Anatomy' },
    { id: 'imaging', label: 'What imaging should I order?', description: 'Initial studies and what to look for.', category: 'Clinical Decision Making' },
    { id: 'nonoperative_treatment', label: 'What nonoperative options work?', description: 'First-line treatment and rehab framing.', category: 'Rehabilitation' },
    { id: 'surgical_indications', label: 'When should I recommend surgery?', description: 'When to escalate toward surgery.', category: 'Indications' },
    { id: 'red_flags', label: 'What red flags change urgency?', description: 'Findings that should change urgency or workup.', category: 'Clinical Decision Making' },
  ],
  research: [
    { id: 'study_critique', label: 'How strong is this study?', description: 'Design, bias, and evidence quality.', category: 'Evidence' },
    { id: 'statistics', label: 'What statistics should I understand?', description: 'Stats interpretation without hand-waving.', category: 'Evidence' },
    { id: 'bias_limitations', label: 'What are the main limitations?', description: 'What weakens validity or applicability.', category: 'Evidence' },
    { id: 'clinical_takeaway', label: 'Does this change practice?', description: 'What changes in practice, if anything.', category: 'Controversies' },
    { id: 'journal_club', label: 'What should I ask in journal club?', description: 'Discussion questions and critique structure.', category: 'Pimp Questions' },
  ],
  general: [
    { id: 'explain', label: 'How should I understand this?', description: 'Clean conceptual explanation.', category: 'Clinical Decision Making' },
    { id: 'compare', label: 'What should I compare this with?', description: 'Contrast similar diagnoses, approaches, or decisions.', category: 'Controversies' },
    { id: 'quiz_me', label: 'Can you quiz me on this?', description: 'Convert the topic into active recall.', category: 'Board Review' },
    { id: 'clinical_application', label: 'How does this change management?', description: 'Apply the concept to patient care or call.', category: 'Clinical Decision Making' },
    { id: 'or_relevance', label: 'Why does this matter in the OR?', description: 'Why this matters in the operating room.', category: 'OR Technique' },
  ],
};

export const CATEGORY_BRANCH_TEMPLATES: Partial<Record<BroBotProcedureCategory, BroBotBranchOption[]>> = {
  fracture_orif: [
    { id: 'general_or_flow', label: 'How does the case flow start to finish?', description: 'Positioning, setup, sequence, and closure.', category: 'OR Technique' },
    { id: 'fracture_pattern_classification', label: 'How does the fracture pattern change the plan?', description: 'Pattern recognition and how it changes the plan.', category: 'Classification Systems' },
    { id: 'approach_exposure', label: 'What approach and anatomy should I know?', description: 'Incision, interval, anatomy, and structures at risk.', category: 'Surgical Approach' },
    { id: 'reduction_strategy', label: 'How would you reduce this fracture?', description: 'Reduction sequence, clamps, provisional fixation, and goals.', category: 'Reduction Pearls' },
    { id: 'implant_fixation_options', label: 'What fixation options should I know?', description: 'Construct choices, backup plans, and decision points.', category: 'Implant Selection' },
    { id: 'fluoroscopy_checklist', label: 'What fluoro checks matter most?', description: 'Views, alignment, hardware position, and final safety checks.', category: 'OR Technique' },
    { id: 'pitfalls_complications', label: 'What complications should I avoid?', description: 'What commonly goes wrong and how to prevent it.', category: 'Complications' },
    { id: 'attending_questions', label: "What are the attending's favorite questions?", description: 'Questions to ask and anticipate before incision.', category: 'Pimp Questions' },
  ],
  arthroplasty: [
    { id: 'exposure_approach', label: 'What exposure gets you out of trouble?', description: 'Positioning, incision, interval, releases, and exposure goals.', category: 'Surgical Approach' },
    { id: 'implant_planning', label: 'How should I think about implants?', description: 'Implant selection, templating, constraint, and backup options.', category: 'Implant Selection' },
    { id: 'bone_preparation', label: 'What bone prep details matter?', description: 'Cuts, reaming, version, fixation, and bone-loss decisions.', category: 'OR Technique' },
    { id: 'trialing_balancing', label: 'How do I assess balance and stability?', description: 'Stability, soft-tissue balance, ROM, and final checks.', category: 'OR Technique' },
    { id: 'complications_bailouts', label: 'What complications should I anticipate?', description: 'Intraoperative problems and backup plans.', category: 'Complications' },
    { id: 'postop_restrictions', label: 'What postop restrictions matter?', description: 'Precautions, rehab limits, weight bearing, and follow-up.', category: 'Postoperative Management' },
    { id: 'attending_questions', label: 'What will the attending ask?', description: 'Planning questions and intraoperative decision prompts.', category: 'Pimp Questions' },
  ],
  arthroscopy: [
    { id: 'setup_positioning', label: 'How should I set up the case?', description: 'Position, equipment, traction, pump, and timeout priorities.', category: 'OR Technique' },
    { id: 'portal_placement', label: 'Where should the portals go?', description: 'Portal landmarks, trajectory, and nearby structures.', category: 'Surgical Approach' },
    { id: 'diagnostic_sequence', label: 'What is the diagnostic sequence?', description: 'Systematic joint survey and documentation flow.', category: 'OR Technique' },
    { id: 'structures_to_inspect', label: 'What structures are commonly missed?', description: 'Key anatomy, pathology, and common missed lesions.', category: 'Anatomy' },
    { id: 'instrument_workflow', label: 'How should I handle the instruments?', description: 'Scope/instrument handling and treatment sequence.', category: 'OR Technique' },
    { id: 'complications_pitfalls', label: 'What complications should I avoid?', description: 'Fluid, nerve, chondral, and visualization pitfalls.', category: 'Complications' },
    { id: 'attending_questions', label: 'What will the attending ask?', description: 'Questions to ask about setup, portals, and plan.', category: 'Pimp Questions' },
  ],
  soft_tissue_release: [
    { id: 'landmarks', label: 'What landmarks should I identify?', description: 'Surface anatomy and localization cues.', category: 'Surgical Approach' },
    { id: 'incision_interval', label: 'Where is the safe interval?', description: 'Skin incision, dissection plane, and exposure.', category: 'Surgical Approach' },
    { id: 'structures_at_risk', label: 'What structure is most at risk?', description: 'Nearby nerves, vessels, tendons, and how to protect them.', category: 'Anatomy' },
    { id: 'release_endpoint', label: 'How do I know the release is complete?', description: 'How to know the release is complete and safe.', category: 'OR Technique' },
    { id: 'common_pitfalls', label: 'What pitfalls cause failure?', description: 'Incomplete release, wrong plane, instability, or iatrogenic injury.', category: 'Complications' },
    { id: 'postop_considerations', label: 'What postop plan matters?', description: 'Dressing, motion, restrictions, and follow-up.', category: 'Postoperative Management' },
    { id: 'attending_questions', label: 'What will the attending ask?', description: 'Questions to ask before incision and closure.', category: 'Pimp Questions' },
  ],
  tendon_ligament_repair: [
    { id: 'exposure_tunnels_or_anchors', label: 'Where do tunnels or anchors go?', description: 'Approach, tunnel or anchor placement, and anatomic targets.', category: 'OR Technique' },
    { id: 'graft_or_repair_choice', label: 'How do I choose graft or repair?', description: 'Graft, suture, anchor, or augmentation decisions.', category: 'Implant Selection' },
    { id: 'fixation_construct', label: 'What fixation construct should I know?', description: 'Construct sequence, fixation method, and backup options.', category: 'Implant Selection' },
    { id: 'tensioning_final_checks', label: 'How do I tension and check it?', description: 'Tension, ROM, stability, and imaging or arthroscopic checks.', category: 'OR Technique' },
    { id: 'rehab_restrictions', label: 'What rehab restrictions matter?', description: 'Early motion, weight bearing, bracing, and failure risks.', category: 'Rehabilitation' },
    { id: 'pitfalls_complications', label: 'What complications should I avoid?', description: 'Common technical errors and complications.', category: 'Complications' },
    { id: 'attending_questions', label: 'What will the attending ask?', description: 'Plan-confirming questions to ask before starting.', category: 'Pimp Questions' },
  ],
  spine_procedure: [
    { id: 'levels_approach', label: 'How do I confirm levels and approach?', description: 'Localization, exposure, and approach-specific anatomy.', category: 'Surgical Approach' },
    { id: 'neural_structures', label: 'What neural structures are at risk?', description: 'Cord, roots, dura, and structures at risk.', category: 'Anatomy' },
    { id: 'decompression_or_fixation_goal', label: 'What is the decompression or fixation goal?', description: 'Primary surgical objective and decision points.', category: 'OR Technique' },
    { id: 'imaging_navigation_checks', label: 'What imaging checks matter?', description: 'Localization, hardware position, and final confirmation.', category: 'OR Technique' },
    { id: 'complications', label: 'What complications should I avoid?', description: 'Neurologic, dural, vascular, infection, and positioning risks.', category: 'Complications' },
    { id: 'attending_questions', label: 'What will the attending ask?', description: 'Questions to clarify levels, plan, and bailout options.', category: 'Pimp Questions' },
  ],
  hand_procedure: [
    { id: 'landmarks_exposure', label: 'What landmarks guide the exposure?', description: 'Surface anatomy, incision, and safe dissection.', category: 'Surgical Approach' },
    { id: 'structures_at_risk', label: 'What structures are most at risk?', description: 'Nerves, vessels, tendons, pulleys, and soft tissues to protect.', category: 'Anatomy' },
    { id: 'procedure_endpoint', label: 'How do I confirm the endpoint?', description: 'How to confirm release, reduction, repair, or fixation.', category: 'OR Technique' },
    { id: 'fixation_or_repair', label: 'What fixation or repair choice matters?', description: 'Implant, suture, or repair choices when applicable.', category: 'Implant Selection' },
    { id: 'postop_plan', label: 'What postop plan should I know?', description: 'Splinting, motion, restrictions, and follow-up.', category: 'Postoperative Management' },
    { id: 'pitfalls_complications', label: 'What complications should I avoid?', description: 'Common technical errors and complications.', category: 'Complications' },
  ],
};

function normalizeMode(mode: BroBotChatMode): Exclude<BroBotChatMode, 'auto' | 'fracture_call'> {
  if (mode === 'fracture_call') return 'consult';
  if (mode === 'auto') return 'general';
  return mode;
}

export function getModeBranchOptions(mode: BroBotChatMode): BroBotBranchOption[] {
  return MODE_BRANCH_LIBRARY[normalizeMode(mode)] ?? MODE_BRANCH_LIBRARY.general;
}

export function getBranchOptionsForCategory(input: {
  mode: BroBotChatMode;
  procedureCategory: BroBotProcedureCategory;
}): BroBotBranchOption[] {
  const mode = normalizeMode(input.mode);

  if (mode === 'or_prep') {
    return CATEGORY_BRANCH_TEMPLATES[input.procedureCategory] ?? MODE_BRANCH_LIBRARY.or_prep;
  }

  return MODE_BRANCH_LIBRARY[mode] ?? MODE_BRANCH_LIBRARY.general;
}
