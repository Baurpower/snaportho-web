import { getBranchOptionsForCategory } from './branch-templates';
import type {
  BroBotBranchOption,
  BroBotChatAmbiguity,
  BroBotChatMode,
  BroBotChatSubintent,
  BroBotIntentSource,
  BroBotProcedureCategory,
} from './types';

export type BroBotPreRouterResult = {
  mode: Exclude<BroBotChatMode, 'auto' | 'fracture_call'>;
  subintent: BroBotChatSubintent;
  procedureOrTopic: string;
  procedureCategory: BroBotProcedureCategory;
  ambiguity: BroBotChatAmbiguity;
  assumedContext: string;
  missingContext: string[];
  clarifyingQuestions: string[];
  branchOptions: BroBotBranchOption[];
  answerImmediately: boolean;
  requiresBranchSelection: boolean;
  reasonForBranching: string;
  confidence: number;
  source: BroBotIntentSource;
};

const EMERGENCY_PATTERN =
  /\b(compartment syndrome|septic joint|septic arthritis|open fracture|open tibia|cauda equina|pulseless|neurovascular compromise|necrotizing|dislocation with neurovascular|rapidly progressive infection)\b/i;
const SPECIFIC_OR_PATTERN =
  /\b(isolated\s+\w+|fcr approach|structures? at risk|anatomy at risk|starting point|start point|identify|identification|where is|where do you find)\b/i;

function normalizeMode(mode: BroBotChatMode): Exclude<BroBotChatMode, 'auto' | 'fracture_call'> {
  if (mode === 'fracture_call') return 'consult';
  if (mode === 'auto') return 'general';
  return mode;
}

export function inferLocalMode(message: string, selectedMode: BroBotChatMode): Exclude<BroBotChatMode, 'auto' | 'fracture_call'> {
  if (selectedMode !== 'auto') return normalizeMode(selectedMode);

  const lower = message.toLowerCase();
  if (/\b(oite|boards?|quiz|test trap|scfe)\b/.test(lower)) return 'oite';
  if (/\b(painful|postop|post-op|drainage|fever|infected)\b.*\b(tka|tha|tsa|arthroplasty)\b|\b(tka|tha|tsa|arthroplasty)\b.*\b(painful|postop|post-op|drainage|fever|infected)\b/.test(lower)) return 'consult';
  if (/\b(orif|scope|arthroscopy|arthroplasty|tsa|tka|tha|approach|implant|attending|release|reconstruction|repair|starting point|a1 pulley|pulley|nail|nailing)\b/.test(lower)) return 'or_prep';
  if (/\b(consult|fracture|septic|open fracture|compartment|postop|ed)\b/.test(lower)) return 'consult';
  if (/\b(workup|clinic|pain|exam)\b/.test(lower)) return 'clinic';
  if (/\b(rct|paper|study|journal|critique|statistics|bias|limitations)\b/.test(lower)) return 'research';
  return 'general';
}

export function inferLocalProcedureCategory(
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

export function inferLocalSubintent(
  message: string,
  mode: BroBotChatMode
): BroBotChatSubintent {
  const lower = message.toLowerCase();
  if (/\bquiz\b/.test(lower)) return 'quiz';
  if (/\bclassification|classify\b/.test(lower)) return 'treatment_algorithm';
  if (/\b(test trap|trap)\b/.test(lower)) return 'quiz';
  if (/\bsteps?|walk me through|how do you do|flow|tomorrow|prep\b/.test(lower)) return 'surgical_steps';
  if (/\b(implant|plate|nail|screw|fixation option)\b/.test(lower)) return 'implant_options';
  if (/\banatomy|nerve|vessel|risk|structures? at risk\b/.test(lower)) return 'anatomy_at_risk';
  if (/\bpresent|presentation\b/.test(lower)) return 'presentation_help';
  if (/\bimage|xray|x-ray|radiograph|ct|mri|fluoro|fluoroscopy\b/.test(lower)) return 'imaging_review';
  if (/\bcritique|rct|paper|study|bias|statistics\b/.test(lower)) return 'evidence_critique';
  if (mode === 'consult' && /\bfracture\b/.test(lower)) return 'fracture';
  if (mode === 'clinic' && /\bworkup\b/.test(lower)) return 'workup';
  return 'overview';
}

function reasonForBranching(input: {
  mode: Exclude<BroBotChatMode, 'auto' | 'fracture_call'>;
  procedureCategory: BroBotProcedureCategory;
}): string {
  if (input.mode === 'or_prep') {
    if (input.procedureCategory === 'fracture_orif') {
      return 'fracture pattern, approach, reduction strategy, implant choice, and intraoperative imaging';
    }
    if (input.procedureCategory === 'arthroplasty') {
      return 'approach, implant planning, bone preparation, balancing, and complication avoidance';
    }
    if (input.procedureCategory === 'arthroscopy') {
      return 'setup, portals, diagnostic sequence, structures inspected, and instrument workflow';
    }
    if (input.procedureCategory === 'soft_tissue_release') {
      return 'landmarks, incision, structures at risk, release endpoint, and postop plan';
    }
    if (input.procedureCategory === 'tendon_ligament_repair') {
      return 'exposure, graft or repair construct, fixation, tensioning, and rehab restrictions';
    }
    return 'approach, anatomy at risk, technical goal, complications, and attending preferences';
  }

  if (input.mode === 'consult') {
    return 'missing clinical context, urgency, imaging, red flags, and how you present the consult';
  }
  if (input.mode === 'oite') return 'whether you want classification, algorithm, traps, or active recall';
  if (input.mode === 'clinic') return 'diagnosis focus, exam target, imaging choice, and treatment goal';
  if (input.mode === 'research') return 'study design, statistics, limitations, and clinical interpretation';
  return 'the learning goal can go in several useful directions';
}

function hasBroadBranchableCategory(category: BroBotProcedureCategory): boolean {
  return (
    category === 'fracture_orif' ||
    category === 'arthroplasty' ||
    category === 'arthroscopy' ||
    category === 'soft_tissue_release' ||
    category === 'tendon_ligament_repair' ||
    category === 'spine_procedure' ||
    category === 'hand_procedure'
  );
}

function shouldRequireBranchSelection(input: {
  message: string;
  mode: Exclude<BroBotChatMode, 'auto' | 'fracture_call'>;
  subintent: BroBotChatSubintent;
  procedureCategory: BroBotProcedureCategory;
}) {
  if (EMERGENCY_PATTERN.test(input.message)) return false;
  if (SPECIFIC_OR_PATTERN.test(input.message)) return false;
  if (input.mode !== 'or_prep') return input.mode !== 'general' && input.subintent === 'overview';
  return (
    hasBroadBranchableCategory(input.procedureCategory) &&
    (input.subintent === 'surgical_steps' ||
      input.subintent === 'diagnostic_sequence' ||
      input.subintent === 'overview')
  );
}

function inferConfidence(input: {
  selectedMode: BroBotChatMode;
  mode: Exclude<BroBotChatMode, 'auto' | 'fracture_call'>;
  procedureCategory: BroBotProcedureCategory;
  subintent: BroBotChatSubintent;
  requiresBranchSelection: boolean;
}) {
  if (input.selectedMode !== 'auto') return 0.78;
  if (input.requiresBranchSelection && input.procedureCategory !== 'unknown') return 0.82;
  if (input.mode !== 'general' && input.subintent !== 'overview') return 0.72;
  if (input.mode !== 'general') return 0.62;
  return 0.38;
}

export function preRouteBroBotIntent(input: {
  message: string;
  selectedMode: BroBotChatMode;
}): BroBotPreRouterResult {
  const mode = inferLocalMode(input.message, input.selectedMode);
  const procedureCategory = inferLocalProcedureCategory(input.message, mode);
  const subintent = inferLocalSubintent(input.message, mode);
  const requiresBranchSelection = shouldRequireBranchSelection({
    message: input.message,
    mode,
    subintent,
    procedureCategory,
  });
  const ambiguity: BroBotChatAmbiguity = EMERGENCY_PATTERN.test(input.message)
    ? 'low'
    : requiresBranchSelection || mode !== 'general'
      ? 'moderate'
      : 'low';
  const confidence = inferConfidence({
    selectedMode: input.selectedMode,
    mode,
    procedureCategory,
    subintent,
    requiresBranchSelection,
  });

  return {
    mode,
    subintent,
    procedureOrTopic: input.message.slice(0, 120),
    procedureCategory,
    ambiguity,
    assumedContext: '',
    missingContext:
      mode === 'consult' && ambiguity !== 'low'
        ? ['age', 'mechanism or clinical story', 'exam', 'imaging findings']
        : mode === 'research' && ambiguity !== 'low'
          ? ['abstract or methods/results', 'study design', 'outcome of interest']
          : [],
    clarifyingQuestions: [],
    branchOptions: getBranchOptionsForCategory({ mode, procedureCategory }),
    answerImmediately: EMERGENCY_PATTERN.test(input.message) || !requiresBranchSelection,
    requiresBranchSelection,
    reasonForBranching: requiresBranchSelection
      ? reasonForBranching({ mode, procedureCategory })
      : '',
    confidence,
    source: confidence >= 0.55 ? 'local' : 'fallback',
  };
}
