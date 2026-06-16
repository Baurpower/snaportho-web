import type {
  BroBotBranchOption,
  BroBotChatMode,
  BroBotProcedureCategory,
} from './types';

export const MODE_BRANCH_LIBRARY: Record<Exclude<BroBotChatMode, 'auto' | 'fracture_call'>, BroBotBranchOption[]> = {
  or_prep: [
    { id: 'landmarks', label: 'Landmarks', description: 'Positioning, incision, portals, and approach cues.', category: 'OR Prep' },
    { id: 'surgical_steps', label: 'Surgical Steps', description: 'Stepwise flow and decision points.', category: 'OR Prep' },
    { id: 'anatomy_at_risk', label: 'Anatomy At Risk', description: 'Structures to protect and where they are encountered.', category: 'OR Prep' },
    { id: 'implant_options', label: 'Implant Options', description: 'Implant choices, reduction goals, and backup plans.', category: 'OR Prep' },
    { id: 'complications', label: 'Complications', description: 'Pitfalls and how to avoid them.', category: 'OR Prep' },
    { id: 'attending_questions', label: 'Attending Questions', description: 'What to ask before incision and what they may ask you.', category: 'OR Prep' },
  ],
  consult: [
    { id: 'missing_information', label: 'Missing Information', description: 'What data you need before calling up.', category: 'Consult' },
    { id: 'immediate_priorities', label: 'Immediate Priorities', description: 'Safety checks, red flags, and temporizing actions.', category: 'Consult' },
    { id: 'presentation_help', label: 'Presentation Help', description: 'How to present the consult clearly.', category: 'Consult' },
    { id: 'imaging_labs', label: 'Imaging / Labs', description: 'Views, labs, and diagnostic pitfalls.', category: 'Consult' },
    { id: 'differential', label: 'Differential', description: 'What else this could be and why it matters.', category: 'Consult' },
    { id: 'operative_indications', label: 'Operative Indications', description: 'What pushes this toward surgery.', category: 'Consult' },
    { id: 'attending_questions', label: 'Attending Questions', description: 'Questions to anticipate from your senior or attending.', category: 'Consult' },
  ],
  oite: [
    { id: 'high_yield_review', label: 'High-Yield Review', description: 'The fastest board-relevant overview.', category: 'OITE' },
    { id: 'classification', label: 'Classification', description: 'Classification systems and thresholds.', category: 'OITE' },
    { id: 'treatment_algorithm', label: 'Treatment Algorithm', description: 'Testable management sequence.', category: 'OITE' },
    { id: 'test_traps', label: 'Test Traps', description: 'Common wrong-answer traps.', category: 'OITE' },
    { id: 'quiz_me', label: 'Quiz Me', description: 'Turn this into questions.', category: 'OITE' },
    { id: 'compare_diagnoses', label: 'Compare Diagnoses', description: 'Differentiate similar diagnoses.', category: 'OITE' },
  ],
  clinic: [
    { id: 'differential', label: 'Differential', description: 'Most likely diagnoses and must-not-miss causes.', category: 'Clinic' },
    { id: 'history_exam', label: 'History and Exam', description: 'History, exam maneuvers, and interpretation.', category: 'Clinic' },
    { id: 'imaging', label: 'Imaging', description: 'Initial studies and what to look for.', category: 'Clinic' },
    { id: 'nonoperative_treatment', label: 'Nonoperative Treatment', description: 'First-line treatment and rehab framing.', category: 'Clinic' },
    { id: 'surgical_indications', label: 'Surgical Indications', description: 'When to escalate toward surgery.', category: 'Clinic' },
    { id: 'red_flags', label: 'Red Flags', description: 'Findings that should change urgency or workup.', category: 'Clinic' },
  ],
  research: [
    { id: 'study_critique', label: 'Study Critique', description: 'Design, bias, and evidence quality.', category: 'Research' },
    { id: 'statistics', label: 'Statistics', description: 'Stats interpretation without hand-waving.', category: 'Research' },
    { id: 'bias_limitations', label: 'Bias and Limitations', description: 'What weakens validity or applicability.', category: 'Research' },
    { id: 'clinical_takeaway', label: 'Clinical Takeaway', description: 'What changes in practice, if anything.', category: 'Research' },
    { id: 'journal_club', label: 'Journal Club Framing', description: 'Discussion questions and critique structure.', category: 'Research' },
  ],
  general: [
    { id: 'explain', label: 'Explain', description: 'Clean conceptual explanation.', category: 'General' },
    { id: 'compare', label: 'Compare', description: 'Contrast similar diagnoses, approaches, or decisions.', category: 'General' },
    { id: 'quiz_me', label: 'Quiz Me', description: 'Convert the topic into active recall.', category: 'General' },
    { id: 'clinical_application', label: 'Clinical Application', description: 'Apply the concept to patient care or call.', category: 'General' },
    { id: 'or_relevance', label: 'OR Relevance', description: 'Why this matters in the operating room.', category: 'General' },
  ],
};

export const CATEGORY_BRANCH_TEMPLATES: Partial<Record<BroBotProcedureCategory, BroBotBranchOption[]>> = {
  fracture_orif: [
    { id: 'general_or_flow', label: 'General OR flow', description: 'Positioning, setup, sequence, and closure.', category: 'OR Prep' },
    { id: 'fracture_pattern_classification', label: 'Fracture pattern / classification-specific pathway', description: 'Pattern recognition and how it changes the plan.', category: 'OR Prep' },
    { id: 'approach_exposure', label: 'Approach and exposure', description: 'Incision, interval, anatomy, and structures at risk.', category: 'OR Prep' },
    { id: 'reduction_strategy', label: 'Reduction strategy', description: 'Reduction sequence, clamps, provisional fixation, and goals.', category: 'OR Prep' },
    { id: 'implant_fixation_options', label: 'Implant/fixation options', description: 'Construct choices, backup plans, and decision points.', category: 'OR Prep' },
    { id: 'fluoroscopy_checklist', label: 'Fluoroscopy or intraoperative checks', description: 'Views, alignment, hardware position, and final safety checks.', category: 'OR Prep' },
    { id: 'pitfalls_complications', label: 'Common pitfalls / complications', description: 'What commonly goes wrong and how to prevent it.', category: 'OR Prep' },
    { id: 'attending_questions', label: 'Attending questions', description: 'Questions to ask and anticipate before incision.', category: 'OR Prep' },
  ],
  arthroplasty: [
    { id: 'exposure_approach', label: 'Exposure and approach', description: 'Positioning, incision, interval, releases, and exposure goals.', category: 'OR Prep' },
    { id: 'implant_planning', label: 'Implant planning', description: 'Implant selection, templating, constraint, and backup options.', category: 'OR Prep' },
    { id: 'bone_preparation', label: 'Bone preparation', description: 'Cuts, reaming, version, fixation, and bone-loss decisions.', category: 'OR Prep' },
    { id: 'trialing_balancing', label: 'Trialing / balancing', description: 'Stability, soft-tissue balance, ROM, and final checks.', category: 'OR Prep' },
    { id: 'complications_bailouts', label: 'Complications and bailouts', description: 'Intraoperative problems and backup plans.', category: 'OR Prep' },
    { id: 'postop_restrictions', label: 'Postop restrictions', description: 'Precautions, rehab limits, weight bearing, and follow-up.', category: 'OR Prep' },
    { id: 'attending_questions', label: 'Attending questions', description: 'Planning questions and intraoperative decision prompts.', category: 'OR Prep' },
  ],
  arthroscopy: [
    { id: 'setup_positioning', label: 'Setup and positioning', description: 'Position, equipment, traction, pump, and timeout priorities.', category: 'OR Prep' },
    { id: 'portal_placement', label: 'Portal placement', description: 'Portal landmarks, trajectory, and nearby structures.', category: 'OR Prep' },
    { id: 'diagnostic_sequence', label: 'Diagnostic sequence', description: 'Systematic joint survey and documentation flow.', category: 'OR Prep' },
    { id: 'structures_to_inspect', label: 'Structures to inspect', description: 'Key anatomy, pathology, and common missed lesions.', category: 'OR Prep' },
    { id: 'instrument_workflow', label: 'Instrument workflow', description: 'Scope/instrument handling and treatment sequence.', category: 'OR Prep' },
    { id: 'complications_pitfalls', label: 'Complications and pitfalls', description: 'Fluid, nerve, chondral, and visualization pitfalls.', category: 'OR Prep' },
    { id: 'attending_questions', label: 'Attending questions', description: 'Questions to ask about setup, portals, and plan.', category: 'OR Prep' },
  ],
  soft_tissue_release: [
    { id: 'landmarks', label: 'Landmarks', description: 'Surface anatomy and localization cues.', category: 'OR Prep' },
    { id: 'incision_interval', label: 'Incision and interval', description: 'Skin incision, dissection plane, and exposure.', category: 'OR Prep' },
    { id: 'structures_at_risk', label: 'Structures at risk', description: 'Nearby nerves, vessels, tendons, and how to protect them.', category: 'OR Prep' },
    { id: 'release_endpoint', label: 'Release endpoint', description: 'How to know the release is complete and safe.', category: 'OR Prep' },
    { id: 'common_pitfalls', label: 'Common pitfalls', description: 'Incomplete release, wrong plane, instability, or iatrogenic injury.', category: 'OR Prep' },
    { id: 'postop_considerations', label: 'Postop considerations', description: 'Dressing, motion, restrictions, and follow-up.', category: 'OR Prep' },
    { id: 'attending_questions', label: 'Attending questions', description: 'Questions to ask before incision and closure.', category: 'OR Prep' },
  ],
  tendon_ligament_repair: [
    { id: 'exposure_tunnels_or_anchors', label: 'Exposure/tunnels/anchors', description: 'Approach, tunnel or anchor placement, and anatomic targets.', category: 'OR Prep' },
    { id: 'graft_or_repair_choice', label: 'Graft/repair choice', description: 'Graft, suture, anchor, or augmentation decisions.', category: 'OR Prep' },
    { id: 'fixation_construct', label: 'Fixation construct', description: 'Construct sequence, fixation method, and backup options.', category: 'OR Prep' },
    { id: 'tensioning_final_checks', label: 'Tensioning/final checks', description: 'Tension, ROM, stability, and imaging or arthroscopic checks.', category: 'OR Prep' },
    { id: 'rehab_restrictions', label: 'Rehab restrictions', description: 'Early motion, weight bearing, bracing, and failure risks.', category: 'OR Prep' },
    { id: 'pitfalls_complications', label: 'Pitfalls/complications', description: 'Common technical errors and complications.', category: 'OR Prep' },
    { id: 'attending_questions', label: 'Attending questions', description: 'Plan-confirming questions to ask before starting.', category: 'OR Prep' },
  ],
  spine_procedure: [
    { id: 'levels_approach', label: 'Levels/approach', description: 'Localization, exposure, and approach-specific anatomy.', category: 'OR Prep' },
    { id: 'neural_structures', label: 'Neural structures', description: 'Cord, roots, dura, and structures at risk.', category: 'OR Prep' },
    { id: 'decompression_or_fixation_goal', label: 'Decompression/fixation goal', description: 'Primary surgical objective and decision points.', category: 'OR Prep' },
    { id: 'imaging_navigation_checks', label: 'Imaging/navigation checks', description: 'Localization, hardware position, and final confirmation.', category: 'OR Prep' },
    { id: 'complications', label: 'Complications', description: 'Neurologic, dural, vascular, infection, and positioning risks.', category: 'OR Prep' },
    { id: 'attending_questions', label: 'Attending questions', description: 'Questions to clarify levels, plan, and bailout options.', category: 'OR Prep' },
  ],
  hand_procedure: [
    { id: 'landmarks_exposure', label: 'Landmarks/exposure', description: 'Surface anatomy, incision, and safe dissection.', category: 'OR Prep' },
    { id: 'structures_at_risk', label: 'Structures at risk', description: 'Nerves, vessels, tendons, pulleys, and soft tissues to protect.', category: 'OR Prep' },
    { id: 'procedure_endpoint', label: 'Procedure endpoint', description: 'How to confirm release, reduction, repair, or fixation.', category: 'OR Prep' },
    { id: 'fixation_or_repair', label: 'Fixation/repair decisions', description: 'Implant, suture, or repair choices when applicable.', category: 'OR Prep' },
    { id: 'postop_plan', label: 'Postop plan', description: 'Splinting, motion, restrictions, and follow-up.', category: 'OR Prep' },
    { id: 'pitfalls_complications', label: 'Pitfalls/complications', description: 'Common technical errors and complications.', category: 'OR Prep' },
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
