import {
  BroBotChatIntentSchema,
  type BroBotBranchOption,
  type BroBotChatAmbiguity,
  type BroBotChatIntent,
  type BroBotChatMode,
  type BroBotChatSubintent,
  type BroBotModelMessage,
  type BroBotProcedureCategory,
} from './types';

type IntentExpansionInput = {
  message: string;
  selectedMode: BroBotChatMode;
  responseDepth?: string;
  trainingLevel?: string;
  history?: BroBotModelMessage[];
};

const INTENT_EXPANSION_CONTRACT = `{
  "mode": "or_prep" | "oite" | "clinic" | "consult" | "research" | "general",
  "subintent": string,
  "goal": string,
  "procedureCategory": "fracture_orif" | "arthroplasty" | "arthroscopy" | "soft_tissue_release" | "tendon_ligament_repair" | "spine_procedure" | "hand_procedure" | "infection_consult" | "postop_complication" | "arthroplasty_consult" | "sports_injury" | "pediatric_fracture" | "general_topic" | "unknown",
  "procedureOrTopic": string,
  "ambiguity": "low" | "moderate" | "high",
  "assumedContext": string,
  "missingContext": string[],
  "branchOptions": [{ "id": string, "label": string, "description": string, "category": string }],
  "answerImmediately": boolean,
  "requiresBranchSelection": boolean,
  "reasonForBranching": string,
  "confidence": number
}`;

const EMERGENCY_PATTERN =
  /\b(compartment syndrome|septic joint|septic arthritis|open fracture|open tibia|cauda equina|pulseless|neurovascular compromise|necrotizing|dislocation with neurovascular|rapidly progressive infection)\b/i;
const BROAD_OR_STEPS_PATTERN =
  /\b(steps?|walk me through|how do you do|prep|flow|tomorrow)\b.*\b(orif|arthroplasty|tsa|tka|tha|scope|arthroscopy|nail|nailing|plate|fixation|release|reconstruction|repair)\b|\b(orif|arthroplasty|tsa|tka|tha|scope|arthroscopy|nail|nailing|plate|fixation|release|reconstruction|repair)\b.*\b(steps?|walk me through|how do you do|prep|flow|tomorrow)\b/i;
const SPECIFIC_OR_PATTERN =
  /\b(isolated\s+\w+|fcr approach|structures? at risk|anatomy at risk|starting point|start point|identify|identification|where is|where do you find)\b/i;

const BRANCH_REASON_BY_CATEGORY: Partial<Record<BroBotProcedureCategory, string>> = {
  fracture_orif:
    'The useful prep depends on fracture pattern, reduction strategy, fixation plan, imaging checks, and complications.',
  arthroplasty:
    'The useful prep depends on approach, implant plan, bone preparation, trialing/balancing, and complication avoidance.',
  arthroscopy:
    'The useful prep depends on setup, portals, diagnostic sequence, structures to inspect, and instrument workflow.',
  soft_tissue_release:
    'The useful prep depends on landmarks, incision/interval, structures at risk, release endpoint, and postop plan.',
  tendon_ligament_repair:
    'The useful prep depends on exposure, repair or reconstruction construct, fixation/tensioning, rehab limits, and pitfalls.',
  spine_procedure:
    'The useful prep depends on levels, approach, neurologic structures, decompression or fixation goal, and complications.',
  hand_procedure:
    'The useful prep depends on landmarks, exposure, structures at risk, fixation or release goal, and postop restrictions.',
};

const BRANCH_REASON_BY_MODE: Record<string, string> = {
  or_prep: 'The operative prep can go in several directions, and choosing a branch keeps the answer clinically focused.',
  consult:
    'The safest consult framework depends on missing clinical context, imaging, urgency, and presentation goal.',
  oite:
    'The best study path depends on whether you want classification, treatment algorithm, traps, or quiz mode.',
  clinic:
    'The clinic framework depends on diagnosis focus, chronicity, exam target, imaging, and treatment goal.',
  research:
    'The critique depends on whether you want study design, statistics, limitations, or clinical takeaway.',
  general:
    'The answer can go in several learning directions, so choosing a branch will make it more useful.',
};

const SUBINTENT_FALLBACKS = new Set<string>([
  'landmarks',
  'surgical_steps',
  'diagnostic_sequence',
  'implant_options',
  'brand_comparison',
  'anatomy_at_risk',
  'attending_questions',
  'treatment_algorithm',
  'quiz',
  'workup',
  'evidence_critique',
  'initial_consult',
  'presentation_help',
  'imaging_review',
  'differential',
  'treatment_plan',
  'operative_indications',
  'complication',
  'postop_problem',
  'fracture',
  'infection',
  'urgent_red_flags',
  'overview',
  'other',
]);

const CATEGORY_FALLBACKS = new Set<BroBotProcedureCategory>([
  'fracture_orif',
  'arthroplasty',
  'arthroscopy',
  'soft_tissue_release',
  'tendon_ligament_repair',
  'spine_procedure',
  'hand_procedure',
  'infection_consult',
  'postop_complication',
  'arthroplasty_consult',
  'sports_injury',
  'pediatric_fracture',
  'general_topic',
  'unknown',
]);

export const MODE_BRANCH_LIBRARY: Record<Exclude<BroBotChatMode, 'auto' | 'fracture_call'>, BroBotBranchOption[]> = {
  or_prep: [
    { id: 'key_landmarks', label: 'What landmarks should I find first?', description: 'Positioning, incision, portals, and approach cues.', category: 'Surgical Approach' },
    { id: 'surgical_steps', label: 'What are the key operative steps?', description: 'Stepwise flow and decision points.', category: 'OR Technique' },
    { id: 'anatomy_at_risk', label: 'What anatomy is most at risk?', description: 'Structures to protect and where they are encountered.', category: 'Anatomy' },
    { id: 'implants', label: 'What implants should I know?', description: 'Implant choices, reduction goals, and backup plans.', category: 'Implant Selection' },
    { id: 'complications', label: 'What complications get tested most?', description: 'Pitfalls and how to avoid them.', category: 'Complications' },
    { id: 'attending_questions', label: 'What will the attending ask?', description: 'What to ask before incision and what they may ask you.', category: 'Pimp Questions' },
  ],
  consult: [
    { id: 'missing_information', label: 'What information am I missing?', description: 'What data you need before calling up.', category: 'Clinical Decision Making' },
    { id: 'presentation_help', label: 'How should I present this consult?', description: 'How to present the consult clearly.', category: 'Pimp Questions' },
    { id: 'imaging_review', label: 'What imaging findings matter?', description: 'Views, classification, and imaging pitfalls.', category: 'Classification Systems' },
    { id: 'differential', label: 'What else could this be?', description: 'What else this could be and why it matters.', category: 'Clinical Decision Making' },
    { id: 'operative_indications', label: 'What makes this operative?', description: 'What pushes this toward surgery.', category: 'Indications' },
    { id: 'attending_questions', label: 'What will my senior ask?', description: 'Questions to anticipate from your senior or attending.', category: 'Pimp Questions' },
  ],
  oite: [
    { id: 'high_yield_review', label: 'What are the board-style pearls?', description: 'The fastest board-relevant overview.', category: 'Board Review' },
    { id: 'classification', label: 'What classification should I know?', description: 'Classification systems and thresholds.', category: 'Classification Systems' },
    { id: 'treatment_algorithm', label: 'What treatment algorithm gets tested?', description: 'Testable management sequence.', category: 'Clinical Decision Making' },
    { id: 'test_traps', label: 'What traps show up on OITE?', description: 'Common wrong-answer traps.', category: 'Board Review' },
    { id: 'quiz_me', label: 'Can you quiz me on this?', description: 'Turn this into questions.', category: 'Board Review' },
    { id: 'compare_diagnoses', label: 'What diagnoses look similar?', description: 'Differentiate similar diagnoses.', category: 'Controversies' },
  ],
  clinic: [
    { id: 'differential', label: 'What diagnoses should I consider?', description: 'Most likely diagnoses and must-not-miss causes.', category: 'Clinical Decision Making' },
    { id: 'physical_exam', label: 'What exam findings matter most?', description: 'Exam maneuvers and interpretation.', category: 'Anatomy' },
    { id: 'imaging', label: 'What imaging should I order?', description: 'Initial studies and what to look for.', category: 'Clinical Decision Making' },
    { id: 'nonoperative_treatment', label: 'What nonoperative options work?', description: 'First-line treatment and rehab framing.', category: 'Rehabilitation' },
    { id: 'surgical_indications', label: 'When should I recommend surgery?', description: 'When to escalate toward surgery.', category: 'Indications' },
  ],
  research: [
    { id: 'study_critique', label: 'How strong is this study?', description: 'Design, bias, and evidence quality.', category: 'Evidence' },
    { id: 'statistics', label: 'What statistics should I understand?', description: 'Stats interpretation without hand-waving.', category: 'Evidence' },
    { id: 'limitations', label: 'What are the main limitations?', description: 'What weakens applicability.', category: 'Evidence' },
    { id: 'clinical_takeaway', label: 'Does this change practice?', description: 'What changes in practice, if anything.', category: 'Controversies' },
    { id: 'journal_club', label: 'What should I ask in journal club?', description: 'Discussion questions and critique structure.', category: 'Pimp Questions' },
  ],
  general: [
    { id: 'explain', label: 'How should I understand this?', description: 'Clean conceptual explanation.', category: 'Clinical Decision Making' },
    { id: 'compare', label: 'What should I compare this with?', description: 'Contrast similar diagnoses, approaches, or decisions.', category: 'Controversies' },
    { id: 'quiz', label: 'Can you quiz me on this?', description: 'Convert the topic into active recall.', category: 'Board Review' },
    { id: 'clinical_application', label: 'How does this change management?', description: 'Apply the concept to patient care or call.', category: 'Clinical Decision Making' },
    { id: 'or_relevance', label: 'Why does this matter in the OR?', description: 'Why this matters in the operating room.', category: 'OR Technique' },
  ],
};

const CATEGORY_BRANCH_TEMPLATES: Partial<Record<BroBotProcedureCategory, BroBotBranchOption[]>> = {
  fracture_orif: [
    { id: 'general_or_flow', label: 'How does the case flow start to finish?', description: 'Positioning, setup, sequence, and closure.', category: 'OR Technique' },
    { id: 'fracture_pattern_classification', label: 'How does the fracture pattern change the plan?', description: 'Pattern recognition and how it changes the plan.', category: 'Classification Systems' },
    { id: 'approach_exposure', label: 'What approach and anatomy should I know?', description: 'Incision, interval, anatomy, and structures at risk.', category: 'Surgical Approach' },
    { id: 'reduction_strategy', label: 'How would you reduce this fracture?', description: 'Reduction sequence, clamps, provisional fixation, and goals.', category: 'Reduction Pearls' },
    { id: 'implant_fixation_options', label: 'What fixation options should I know?', description: 'Construct choices, backup plans, and decision points.', category: 'Implant Selection' },
    { id: 'fluoro_intraop_checks', label: 'What fluoro checks matter most?', description: 'Views, alignment, hardware position, and final safety checks.', category: 'OR Technique' },
    { id: 'pitfalls_complications', label: 'What complications should I avoid?', description: 'What commonly goes wrong and how to prevent it.', category: 'Complications' },
    { id: 'attending_questions', label: "What are the attending's favorite questions?", description: 'Questions to ask and anticipate before incision.', category: 'Pimp Questions' },
  ],
  arthroplasty: [
    { id: 'exposure_approach', label: 'What exposure gets you out of trouble?', description: 'Positioning, incision, interval, releases, and exposure goals.', category: 'Surgical Approach' },
    { id: 'implant_planning', label: 'How should I think about implants?', description: 'Implant selection, templating, constraint, and backup options.', category: 'Implant Selection' },
    { id: 'bone_preparation', label: 'What bone prep details matter?', description: 'Cuts, reaming, version, fixation, and bone-loss decisions.', category: 'OR Technique' },
    { id: 'trialing_balancing', label: 'How do I assess balance and stability?', description: 'Stability, soft-tissue balance, ROM, and final checks.', category: 'OR Technique' },
    { id: 'complications', label: 'What complications should I anticipate?', description: 'Intraoperative and early postop problems to anticipate.', category: 'Complications' },
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
    { id: 'structure_at_risk', label: 'What structure is most at risk?', description: 'Nearby nerves, vessels, tendons, and how to protect them.', category: 'Anatomy' },
    { id: 'release_endpoint', label: 'How do I know the release is complete?', description: 'How to know the release is complete and safe.', category: 'OR Technique' },
    { id: 'pitfalls', label: 'What pitfalls cause failure?', description: 'Incomplete release, wrong plane, instability, or iatrogenic injury.', category: 'Complications' },
    { id: 'postop_considerations', label: 'What postop plan matters?', description: 'Dressing, motion, restrictions, and follow-up.', category: 'Postoperative Management' },
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

export function getModeBranchOptions(mode: BroBotChatMode): BroBotBranchOption[] {
  const normalized = normalizeMode(mode);
  return MODE_BRANCH_LIBRARY[normalized] ?? MODE_BRANCH_LIBRARY.general;
}

export function shouldAnswerImmediately(input: {
  message: string;
  ambiguity: BroBotChatAmbiguity;
  mode: BroBotChatMode;
  requiresBranchSelection?: boolean;
}) {
  if (EMERGENCY_PATTERN.test(input.message)) return true;
  if (input.requiresBranchSelection) return false;
  return input.ambiguity === 'low';
}

export function buildBroBotIntentExpansionMessages(input: IntentExpansionInput): BroBotModelMessage[] {
  const selectedMode =
    input.selectedMode === 'auto'
      ? 'auto: infer the best mode'
      : `${normalizeMode(input.selectedMode)}: prefer this unless clearly wrong`;
  const recentHistory = (input.history ?? [])
    .slice(-6)
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n');

  return [
    {
      role: 'system',
      content: `
You are BroBot's orthopaedic intent expansion engine.
Do not answer the learner. Determine what they are trying to accomplish and return JSON only.

Selected UI mode: ${selectedMode}
Response depth: ${input.responseDepth ?? 'standard'}
Training level: ${input.trainingLevel ?? 'pgy2'}

Decide:
- mode: best workflow mode.
- subintent: concise task label.
- goal: one sentence beginning with an action verb when possible.
- procedureCategory: broad reusable category, not a diagnosis-specific branch tree.
- procedureOrTopic: short topic/procedure.
- ambiguity: low, moderate, or high.
- missingContext: details that would materially improve the answer; no PHI.
- branchOptions: 4-7 selectable learning branches. Each label must be a realistic resident-style follow-up question, not a generic focus area. Prefer mode + procedureCategory templates, but tailor labels to the actual prompt.
- answerImmediately: true for low ambiguity and emergency consults; false for moderate/high ambiguity unless urgent safety info should not wait.
- requiresBranchSelection: true when a full answer would materially change based on fracture pattern, approach, implant, anatomy, study goal, or consult context.
- reasonForBranching: one sentence explaining why the branch choice matters. Avoid generic wording.
- confidence: 0 to 1.

Emergency consults must answer immediately: compartment syndrome, septic joint, open fracture, cauda equina, neurovascular compromise, pulseless limb, rapidly progressive infection.
Broad OR-prep procedure prompts should usually require branch selection. Do not answer these immediately unless the user says "just answer" or asks a narrow subtopic.
Do not create one-off procedure-specific branch trees. Classify procedureCategory and generate reusable, procedure-relevant branches from the category.

OR Prep category templates:
- fracture_orif + surgical_steps: How does the case flow start to finish?; How does the fracture pattern change the plan?; What approach and anatomy should I know?; How would you reduce this fracture?; What fixation options should I know?; What fluoro checks matter most?; What complications should I avoid?; What are the attending's favorite questions?
- arthroplasty: What exposure gets you out of trouble?; How should I think about implants?; What bone cuts or prep matter?; How do you assess balance and stability?; What complications should I anticipate?; What postop restrictions matter?; What will the attending ask?
- arthroscopy: How should I set up the case?; Where should the portals go?; What is the diagnostic sequence?; What structures are commonly missed?; How should I handle the instruments?; What complications should I avoid?; What will the attending ask?
- soft_tissue_release: What landmarks should I identify?; Where is the safe interval?; What structure is most at risk?; How do I know the release is complete?; What pitfalls cause failure?; What postop plan matters?
- tendon_ligament_repair: Where do tunnels or anchors go?; How do I choose graft or repair?; What fixation construct should I know?; How do I tension and check it?; What rehab restrictions matter?; What complications should I avoid?
- spine_procedure or hand_procedure: use the same broad principles: landmarks/exposure, structures at risk, technical goal, fixation/repair/release decision points, complications, postop plan, attending questions.

Consult categories: infection_consult, postop_complication, arthroplasty_consult, pediatric_fracture, sports_injury. Prioritize urgency, missing data, imaging, red flags, temporizing management, and presentation.
OITE categories: prioritize classification, treatment algorithms, high-yield facts, traps, and quiz-style framing.
Clinic categories: prioritize differential, exam, imaging, initial nonoperative treatment, and surgical indications.
Research categories: prioritize evidence hierarchy, study design, practical interpretation, and limitations. Do not fabricate citations.

Mode branch examples:
- OR Prep: What landmarks should I find first?; What are the key operative steps?; What anatomy is most at risk?; What implants should I know?; What complications get tested most?; What will the attending ask?
- Consult: What information am I missing?; What should I do first?; How should I present this consult?; What imaging or labs matter?; What makes this operative?; What will my senior ask?
- OITE: What are the board-style pearls?; What classification should I know?; What treatment algorithm gets tested?; What traps show up on OITE?; Can you quiz me on this?
- Clinic: What diagnoses should I consider?; What exam findings matter most?; What imaging should I order?; What nonoperative options work?; When should I recommend surgery?
- Research: How strong is this study?; What statistics should I understand?; What are the main limitations?; Does this change practice?; What should I ask in journal club?
- General: How should I understand this?; What should I compare this with?; Can you quiz me on this?; How does this change management?; Why does this matter in the OR?

Branch quality rules:
- Keep branch labels under 12 words when possible.
- Use question marks for question labels.
- Avoid labels like "Surgical Technique", "Complications", "Rehabilitation", "Anatomy", or "Explore anatomy".
- Make the next branch feel like the next thing an orthopaedic resident would naturally ask.

Return exactly:
${INTENT_EXPANSION_CONTRACT}
      `.trim(),
    },
    ...(recentHistory
      ? [
          {
            role: 'user' as const,
            content: `Recent conversation context:\n${recentHistory}`,
          },
        ]
      : []),
    {
      role: 'user',
      content: input.message,
    },
  ];
}

function normalizeMode(mode: BroBotChatMode | string): Exclude<BroBotChatMode, 'auto' | 'fracture_call'> {
  if (mode === 'fracture_call') return 'consult';
  if (
    mode === 'or_prep' ||
    mode === 'oite' ||
    mode === 'clinic' ||
    mode === 'consult' ||
    mode === 'research' ||
    mode === 'general'
  ) {
    return mode;
  }
  return 'general';
}

function normalizeSubintent(value: unknown): BroBotChatSubintent {
  const subintent = typeof value === 'string' ? value.trim() : '';
  return SUBINTENT_FALLBACKS.has(subintent)
    ? (subintent as BroBotChatSubintent)
    : 'other';
}

function normalizeProcedureCategory(value: unknown): BroBotProcedureCategory {
  const category = typeof value === 'string' ? value.trim() : '';
  return CATEGORY_FALLBACKS.has(category as BroBotProcedureCategory)
    ? (category as BroBotProcedureCategory)
    : 'unknown';
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeArray(value: unknown, max: number): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\n|;/) : [];
  const seen = new Set<string>();

  return raw
    .map((item) => String(item ?? '').replace(/^[-*]\s*/, '').trim())
    .filter((item) => {
      const key = item.toLowerCase().replace(/\s+/g, ' ');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

function templateBranchOptionsForCategory(
  category: BroBotProcedureCategory,
  mode: BroBotChatMode
): BroBotBranchOption[] {
  if (normalizeMode(mode) === 'or_prep') {
    return CATEGORY_BRANCH_TEMPLATES[category] ?? MODE_BRANCH_LIBRARY.or_prep;
  }

  if (
    category === 'infection_consult' ||
    category === 'postop_complication' ||
    category === 'arthroplasty_consult' ||
    category === 'pediatric_fracture' ||
    category === 'sports_injury'
  ) {
    return MODE_BRANCH_LIBRARY.consult;
  }

  return getModeBranchOptions(mode);
}

function normalizeBranchOptions(
  value: unknown,
  mode: BroBotChatMode,
  procedureCategory: BroBotProcedureCategory
): BroBotBranchOption[] {
  const raw = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const normalized = raw
    .map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const label = normalizeString(record.label);
      const fallbackId = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      return {
        id: normalizeString(record.id) || fallbackId,
        label,
        description: normalizeString(record.description) || undefined,
        category: normalizeString(record.category) || undefined,
      };
    })
    .filter((option) => {
      const key = option.id || option.label.toLowerCase();
      if (!option.id || !option.label || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 7);

  return normalized.length >= 4
    ? normalized
    : templateBranchOptionsForCategory(procedureCategory, mode);
}

function requiresBranchSelectionForPrompt(input: {
  message: string;
  mode: BroBotChatMode;
  subintent: BroBotChatSubintent;
  procedureCategory: BroBotProcedureCategory;
}): boolean {
  if (EMERGENCY_PATTERN.test(input.message)) return false;
  if (SPECIFIC_OR_PATTERN.test(input.message)) return false;
  const broadOrCategory =
    input.procedureCategory === 'fracture_orif' ||
    input.procedureCategory === 'arthroplasty' ||
    input.procedureCategory === 'arthroscopy' ||
    input.procedureCategory === 'soft_tissue_release' ||
    input.procedureCategory === 'tendon_ligament_repair' ||
    input.procedureCategory === 'spine_procedure' ||
    input.procedureCategory === 'hand_procedure';
  return normalizeMode(input.mode) === 'or_prep' &&
    (input.subintent === 'surgical_steps' ||
      input.subintent === 'diagnostic_sequence' ||
      input.subintent === 'overview') &&
    (broadOrCategory || BROAD_OR_STEPS_PATTERN.test(input.message));
}

function branchOptionsForPrompt(input: {
  mode: BroBotChatMode;
  procedureCategory: BroBotProcedureCategory;
  parsedBranchOptions?: unknown;
}): BroBotBranchOption[] {
  return normalizeBranchOptions(
    input.parsedBranchOptions,
    input.mode,
    input.procedureCategory
  );
}

function reasonForBranching(
  requiresBranchSelection: boolean,
  mode: BroBotChatMode,
  procedureCategory: BroBotProcedureCategory,
  parsedReason?: unknown
): string {
  if (!requiresBranchSelection) return '';
  return (
    normalizeString(parsedReason) ||
    BRANCH_REASON_BY_CATEGORY[procedureCategory] ||
    BRANCH_REASON_BY_MODE[mode] ||
    BRANCH_REASON_BY_MODE.general
  );
}

function extractJsonObject(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1 || first >= last) return null;
  return cleaned.slice(first, last + 1);
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function parseBroBotIntentExpansionResponse(
  raw: unknown,
  fallback: { message: string; selectedMode: BroBotChatMode }
): BroBotChatIntent {
  const parsed =
    typeof raw === 'string'
      ? (() => {
          const json = extractJsonObject(raw);
          if (!json) return null;
          try {
            return record(JSON.parse(json));
          } catch {
            return null;
          }
        })()
      : record(raw);

  if (!parsed) {
    return fallbackBroBotIntentExpansion(fallback.message, fallback.selectedMode);
  }

  const mode = normalizeMode(normalizeString(parsed.mode) || fallback.selectedMode);
  const subintent = normalizeSubintent(parsed.subintent);
  const procedureCategory =
    normalizeProcedureCategory(parsed.procedureCategory) !== 'unknown'
      ? normalizeProcedureCategory(parsed.procedureCategory)
      : inferFallbackProcedureCategory(fallback.message, mode);
  const modelRequiresBranchSelection = parsed.requiresBranchSelection === true;
  const heuristicRequiresBranchSelection = requiresBranchSelectionForPrompt({
    message: fallback.message,
    mode,
    subintent,
    procedureCategory,
  });
  const requiresBranchSelection =
    modelRequiresBranchSelection || heuristicRequiresBranchSelection;
  const ambiguity = requiresBranchSelection ? 'moderate' : normalizeAmbiguity(parsed.ambiguity);
  const branchOptions = branchOptionsForPrompt({
    mode,
    procedureCategory,
    parsedBranchOptions: parsed.branchOptions,
  });
  const answerImmediately =
    typeof parsed.answerImmediately === 'boolean'
      ? (parsed.answerImmediately && !requiresBranchSelection) ||
        shouldAnswerImmediately({
          message: fallback.message,
          ambiguity,
          mode,
          requiresBranchSelection,
        })
      : shouldAnswerImmediately({
          message: fallback.message,
          ambiguity,
          mode,
          requiresBranchSelection,
        });

  const candidate: BroBotChatIntent = {
    mode,
    subintent,
    procedureCategory,
    procedureOrTopic: normalizeString(parsed.procedureOrTopic) || fallback.message.slice(0, 120),
    goal: normalizeString(parsed.goal) || buildFallbackGoal(fallback.message, mode),
    ambiguity,
    assumedContext: normalizeString(parsed.assumedContext),
    missingContext: normalizeArray(parsed.missingContext, 6),
    clarifyingQuestions: [],
    branchOptions,
    answerImmediately,
    requiresBranchSelection,
    reasonForBranching: reasonForBranching(
      requiresBranchSelection,
      mode,
      procedureCategory,
      parsed.reasonForBranching
    ),
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
  };

  const validation = BroBotChatIntentSchema.safeParse(candidate);
  return validation.success
    ? validation.data
    : fallbackBroBotIntentExpansion(fallback.message, fallback.selectedMode);
}

function normalizeAmbiguity(value: unknown): BroBotChatAmbiguity {
  const ambiguity = normalizeString(value);
  return ambiguity === 'low' || ambiguity === 'moderate' || ambiguity === 'high'
    ? ambiguity
    : 'moderate';
}

function buildFallbackGoal(message: string, mode: BroBotChatMode): string {
  const normalizedMode = normalizeMode(mode);
  if (normalizedMode === 'or_prep') return `Prepare for ${message.slice(0, 80)}.`;
  if (normalizedMode === 'consult') return `Work through the consult safely and present it clearly.`;
  if (normalizedMode === 'oite') return `Review the high-yield testable points.`;
  if (normalizedMode === 'clinic') return `Build a practical clinic workup and treatment framework.`;
  if (normalizedMode === 'research') return `Interpret the evidence and its clinical limitations.`;
  return `Understand the topic and choose the next useful learning branch.`;
}

function inferFallbackProcedureCategory(
  message: string,
  mode: BroBotChatMode
): BroBotProcedureCategory {
  const lower = message.toLowerCase();
  const normalizedMode = normalizeMode(mode);

  if (/\b(septic|infection|abscess|osteomyelitis|septic arthritis|septic joint)\b/.test(lower)) {
    return 'infection_consult';
  }
  if (/\b(postop|post-op|wound drainage|fever after|pain after|complication)\b/.test(lower)) {
    return 'postop_complication';
  }
  if (normalizedMode === 'consult' && /\b(tka|tha|arthroplasty|periprosthetic|prosthetic joint)\b/.test(lower)) {
    return 'arthroplasty_consult';
  }
  if (/\b(scfe|slipped capital|pediatric|physeal|child|adolescent)\b/.test(lower)) {
    return 'pediatric_fracture';
  }
  if (/\b(acl|meniscus|rotator cuff|labrum|sports)\b/.test(lower) && normalizedMode !== 'or_prep') {
    return 'sports_injury';
  }

  if (normalizedMode !== 'or_prep') {
    return normalizedMode === 'general' ? 'general_topic' : 'unknown';
  }

  if (/\b(orif|fixation|fracture|plate|screw|nail|nailing|intertroch)\b/.test(lower)) {
    return 'fracture_orif';
  }
  if (/\b(arthroplasty|tsa|tka|tha|reverse shoulder|reverse tsa|hemiarthroplasty)\b/.test(lower)) {
    return 'arthroplasty';
  }
  if (/\b(scope|arthroscopy|arthroscopic)\b/.test(lower)) {
    return 'arthroscopy';
  }
  if (/\b(release|carpal tunnel|cubital tunnel|trigger finger|a1 pulley|fasciotomy)\b/.test(lower)) {
    return 'soft_tissue_release';
  }
  if (/\b(acl|pcl|mcl|ligament|tendon|repair|reconstruction|anchor|graft)\b/.test(lower)) {
    return 'tendon_ligament_repair';
  }
  if (/\b(spine|lumbar|cervical|thoracic|laminectomy|fusion|decompression)\b/.test(lower)) {
    return 'spine_procedure';
  }
  if (/\b(hand|finger|metacarpal|phalangeal|phalange|tendon sheath|pulley)\b/.test(lower)) {
    return 'hand_procedure';
  }

  return 'unknown';
}

export function fallbackBroBotIntentExpansion(
  message: string,
  selectedMode: BroBotChatMode
): BroBotChatIntent {
  const lower = message.toLowerCase();
  let mode = normalizeMode(selectedMode);

  if (selectedMode === 'auto') {
    if (/\b(oite|boards?|quiz|test trap|scfe)\b/.test(lower)) mode = 'oite';
    else if (/\b(painful|postop|post-op|drainage|fever|infected)\b.*\b(tka|tha|tsa|arthroplasty)\b|\b(tka|tha|tsa|arthroplasty)\b.*\b(painful|postop|post-op|drainage|fever|infected)\b/.test(lower)) mode = 'consult';
    else if (/\b(orif|scope|arthroscopy|arthroplasty|tsa|tka|tha|approach|implant|attending|release|reconstruction|repair|starting point|a1 pulley|pulley)\b/.test(lower)) mode = 'or_prep';
    else if (/\b(consult|fracture|septic|open fracture|compartment|painful tka|postop|ed)\b/.test(lower)) mode = 'consult';
    else if (/\b(workup|clinic|pain|exam)\b/.test(lower)) mode = 'clinic';
    else if (/\b(rct|paper|study|journal|critique|statistics)\b/.test(lower)) mode = 'research';
  }

  const subintent = inferFallbackSubintent(message, mode);
  const procedureCategory = inferFallbackProcedureCategory(message, mode);
  const requiresBranchSelection = requiresBranchSelectionForPrompt({
    message,
    mode,
    subintent,
    procedureCategory,
  });
  const ambiguity: BroBotChatAmbiguity = EMERGENCY_PATTERN.test(message)
    ? 'low'
    : requiresBranchSelection ||
        /\b(critique this rct|diagnostic .*scope|arthroplasty|orif|painful (?:tka|tha|tsa)|fracture consult|pain workup|scfe)\b/i.test(message)
      ? 'moderate'
      : 'low';

  return {
    mode,
    subintent,
    procedureCategory,
    procedureOrTopic: message.slice(0, 120),
    goal: buildFallbackGoal(message, mode),
    ambiguity,
    assumedContext: '',
    missingContext:
      mode === 'research' && ambiguity !== 'low'
        ? ['abstract or methods/results', 'study design', 'outcome of interest']
        : mode === 'consult' && ambiguity !== 'low'
          ? ['age', 'mechanism or clinical story', 'exam', 'imaging findings']
          : [],
    clarifyingQuestions: [],
    branchOptions: branchOptionsForPrompt({ mode, procedureCategory }),
    answerImmediately: shouldAnswerImmediately({
      message,
      ambiguity,
      mode,
      requiresBranchSelection,
    }),
    requiresBranchSelection,
    reasonForBranching: reasonForBranching(
      requiresBranchSelection,
      mode,
      procedureCategory
    ),
    confidence: selectedMode === 'auto' ? 0.35 : 0.45,
  };
}

function inferFallbackSubintent(message: string, mode: BroBotChatMode): BroBotChatSubintent {
  const lower = message.toLowerCase();
  if (/\bquiz\b/.test(lower)) return 'quiz';
  if (/\bclassification|classify\b/.test(lower)) return 'treatment_algorithm';
  if (/\bsteps?|walk me through|how do you do|flow|tomorrow|prep\b/.test(lower)) return 'surgical_steps';
  if (/\b(implant|plate|nail|screw)\b/.test(lower)) return 'implant_options';
  if (/\banatomy|nerve|vessel|risk\b/.test(lower)) return 'anatomy_at_risk';
  if (/\bpresent|presentation\b/.test(lower)) return 'presentation_help';
  if (/\bimage|xray|x-ray|radiograph|ct|mri\b/.test(lower)) return 'imaging_review';
  if (/\bcritique|rct|paper|study\b/.test(lower)) return 'evidence_critique';
  if (mode === 'consult' && /\bfracture\b/.test(lower)) return 'fracture';
  if (mode === 'clinic' && /\bworkup\b/.test(lower)) return 'workup';
  return 'overview';
}
