import type { BroBotConversationState } from './conversation-state';
import type { BroBotInteractionConstraints } from './interaction-constraints';
import { detectBroBotInteractionConstraints } from './interaction-constraints';
import type { BroBotChatMode, BroBotResponseDepth, BroBotTrainingLevel } from './types';

export const BROBOT_FACTORED_INTENT_VERSION = 'factored-intent-v1';

export type FactoredIntentSource = 'deterministic' | 'classifier' | 'legacy_fallback';
export type BroBotFactoredSetting = 'or' | 'clinic' | 'consult' | 'boards' | 'research' | 'general';
export type BroBotFactoredTask = 'explain' | 'compare' | 'decide' | 'plan' | 'quiz' | 'retrieve_evidence' | 'counsel';
export type BroBotFactoredAudience = 'student' | 'junior_resident' | 'senior_resident' | 'attending';
export type BroBotFactoredDepth = 'quick' | 'standard' | 'deep';
export type BroBotEvidenceNeed = 'none' | 'helpful' | 'required' | 'current';
export type BroBotFactoredUrgency = 'routine' | 'urgent' | 'emergent';
export type BroBotFactoredInteraction = 'answer' | 'staged_quiz' | 'clarify' | 'progressive_teaching';
export type BroBotPatientSpecificity = 'educational' | 'case_specific';

export type BroBotFactoredIntent = {
  setting: BroBotFactoredSetting;
  task: BroBotFactoredTask;
  audience: BroBotFactoredAudience;
  depth: BroBotFactoredDepth;
  evidenceNeed: BroBotEvidenceNeed;
  urgency: BroBotFactoredUrgency;
  interaction: BroBotFactoredInteraction;
  patientSpecificity: BroBotPatientSpecificity;
  topic?: string;
  procedure?: string;
  confidence: number;
  sources: Record<
    'setting' | 'task' | 'audience' | 'depth' | 'evidenceNeed' | 'urgency' | 'interaction' | 'patientSpecificity',
    FactoredIntentSource
  >;
};

type LegacyIntentLike = {
  mode?: unknown;
  subintent?: unknown;
  procedureOrTopic?: unknown;
  procedureCategory?: unknown;
  ambiguity?: unknown;
  confidence?: unknown;
};

export type DeriveBroBotFactoredIntentInput = {
  message: string;
  selectedMode: BroBotChatMode;
  responseDepth: BroBotResponseDepth;
  trainingLevel: BroBotTrainingLevel | string;
  legacyIntent?: LegacyIntentLike | null;
  conversationState?: BroBotConversationState | null;
  interactionConstraints?: BroBotInteractionConstraints;
};

const EMERGENT = /\b(compartment syndrome|pulseless (?:foot|limb|extremity)|septic (?:joint|arthritis)|cauda equina|necrotizing (?:infection|fasciitis)|dislocation\b.{0,40}\bneurovascular compromise|neurovascular compromise\b.{0,40}\bdislocation)\b/i;
const URGENT = /\b(post-?op(?:erative)? (?:drainage|infection|fever|wound)|acute infection|wound drainage|open fracture|fracture[- ]dislocation|acute consult|septic|rapidly progressive infection)\b/i;
const PATIENT_DETAIL = /(?:\b\d{1,3}[- ]year[- ]old\b|\b(?:after|following) (?:a |an )?(?:fall|crash|collision|injury|twist|motorcycle|mvc)\b|\b(?:exam|examination|neurovascular|pulses?|sensation|motor|imaging|x-?ray|radiograph|ct|mri|labs?|esr|crp|wbc|wound|drainage|post-?op day|weeks? after surgery|diabetes|smoker|anticoagulation)\b.{0,80}\b(?:shows?|showed|with|is|are|has|reveals?|elevated|decreased|absent|present|positive|negative)\b)/i;

const cleanOptional = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 160) : undefined;
const legacyString = (intent: LegacyIntentLike | null | undefined, key: keyof LegacyIntentLike) =>
  typeof intent?.[key] === 'string' ? String(intent[key]).trim().toLowerCase() : '';

function audienceFromText(value: string): BroBotFactoredAudience | null {
  if (/\b(attending|attending-level)\b/i.test(value)) return 'attending';
  if (/\b(pgy[- ]?[3-5]|senior resident|chief resident|chief|fellow)\b/i.test(value)) return 'senior_resident';
  if (/\b(pgy[- ]?[1-2]|intern|junior resident|junior)\b/i.test(value)) return 'junior_resident';
  if (/\b(med(?:ical)? student|student)\b/i.test(value)) return 'student';
  return null;
}

function audienceFromTrainingLevel(value: string): BroBotFactoredAudience {
  if (/attending/i.test(value)) return 'attending';
  if (/pgy[-_ ]?[3-5]|fellow|senior/i.test(value)) return 'senior_resident';
  if (/pgy[-_ ]?[1-2]|intern|junior/i.test(value)) return 'junior_resident';
  return 'student';
}

function taskFromLegacy(subintent: string): BroBotFactoredTask | null {
  if (/quiz|trap/.test(subintent)) return 'quiz';
  if (/evidence|research|reference|journal|critique/.test(subintent)) return 'retrieve_evidence';
  if (/brand_comparison|compare/.test(subintent)) return 'compare';
  if (/indication|treatment|algorithm|workup|differential/.test(subintent)) return 'decide';
  if (/step|approach|landmark|implant|initial_consult|presentation/.test(subintent)) return 'plan';
  if (/patient_explanation/.test(subintent)) return 'counsel';
  if (subintent) return 'explain';
  return null;
}

function settingFromMode(mode: string): BroBotFactoredSetting | null {
  if (mode === 'or_prep') return 'or';
  if (mode === 'oite') return 'boards';
  if (mode === 'fracture_call' || mode === 'consult') return 'consult';
  if (mode === 'clinic') return 'clinic';
  if (mode === 'research') return 'research';
  if (mode === 'general') return 'general';
  return null;
}

function isMissingTopic(message: string, legacyTopic?: string) {
  return !legacyTopic && /^(?:help|teach me|quiz me|what should i study|compare|explain|what are the steps)\??$/i.test(message.trim());
}

export function deriveBroBotFactoredIntent(input: DeriveBroBotFactoredIntentInput): BroBotFactoredIntent {
  const message = String(input.message ?? '').trim();
  const legacyMode = legacyString(input.legacyIntent, 'mode');
  const legacySubintent = legacyString(input.legacyIntent, 'subintent');
  const topic = cleanOptional(input.legacyIntent?.procedureOrTopic) ?? cleanOptional(input.conversationState?.activeTopic);
  const constraints = input.interactionConstraints ?? detectBroBotInteractionConstraints({ message });
  const emergent = EMERGENT.test(message);
  const patientSpecificity: BroBotPatientSpecificity = PATIENT_DETAIL.test(message) || emergent ? 'case_specific' : 'educational';

  let task: BroBotFactoredTask;
  let taskSource: FactoredIntentSource = 'deterministic';
  if (/\b(patient explanation|explain (?:this|it) to (?:a |the )?patient|counsel(?:ing)?|shared decision)\b/i.test(message)) task = 'counsel';
  else if (constraints.evidenceRequest || /\b(latest evidence|recent studies?|current guidelines?)\b/i.test(message)) task = 'retrieve_evidence';
  else if (/\b(quiz me|test me)\b/i.test(message)) task = 'quiz';
  else if (constraints.compare) task = 'compare';
  else if (/\b(which treatment|treatment algorithm|algorithm|indications?|what should i do|operative vs nonoperative|management decision)\b/i.test(message)) task = 'decide';
  else if (/\b(prep me|plan(?: the| this| my)?|walk me through (?:the |this )?(?:case|procedure)|(?:operative|surgical|release) steps?|approach|exposure|fixation|portals?|implants?)\b/i.test(message)) task = 'plan';
  else if (/\b(explain|teach me|what (?:is|are)|why|how does)\b/i.test(message)) task = 'explain';
  else {
    task = taskFromLegacy(legacySubintent) ?? 'explain';
    taskSource = taskFromLegacy(legacySubintent) ? 'classifier' : 'legacy_fallback';
  }

  let evidenceNeed: BroBotEvidenceNeed = 'none';
  if (/\b(latest|recent|current)\b.{0,40}\b(evidence|guidelines?|stud(?:y|ies)|literature|advancements?)\b|\b(latest|recent|current) (?:tka|tha|implant|treatment|management)/i.test(message)) evidenceNeed = 'current';
  else if (/\b(articles?|papers?|citations?|references?|pubmed)\b/i.test(message)) evidenceNeed = 'required';
  else if (/\b(evidence|controvers(?:y|ies|ial)|literature|study data)\b/i.test(message)) evidenceNeed = 'helpful';

  const explicitAudience = audienceFromText(message);
  const audience = explicitAudience ?? audienceFromTrainingLevel(input.trainingLevel);
  const audienceSource: FactoredIntentSource = explicitAudience ? 'deterministic' : 'legacy_fallback';

  let depth: BroBotFactoredDepth = input.responseDepth;
  let depthSource: FactoredIntentSource = 'legacy_fallback';
  if (constraints.shortAnswer || /\b(quick|brief|concise|in (?:three|3) minutes?)\b/i.test(message)) { depth = 'quick'; depthSource = 'deterministic'; }
  else if (/\b(detailed|deep dive|comprehensive|everything|in depth)\b/i.test(message)) { depth = 'deep'; depthSource = 'deterministic'; }

  let interaction: BroBotFactoredInteraction = 'answer';
  if (constraints.stagedQuiz) interaction = 'staged_quiz';
  else if (/\b(start basic|teach (?:me )?progressively|build (?:it )?up|one concept at a time)\b/i.test(message)) interaction = 'progressive_teaching';
  else if (/\b(ask (?:me )?(?:a )?clarifying question|clarify (?:with me|first)|help me narrow)\b/i.test(message) || isMissingTopic(message, topic)) interaction = 'clarify';

  const urgency: BroBotFactoredUrgency = emergent ? 'emergent' : URGENT.test(message) ? 'urgent' : 'routine';

  let setting: BroBotFactoredSetting;
  let settingSource: FactoredIntentSource = 'deterministic';
  if (emergent) setting = 'consult';
  else if (/\b(oite|boards?|board-style|distractors?|test traps?|classification quiz)\b/i.test(message)) setting = 'boards';
  else if (/\b(papers?|articles?|citations?|references?|pubmed|statistics?|methodology|meta-analysis|systematic review|evidence synthesis|latest|recent studies?)\b/i.test(message)) setting = 'research';
  else if (/\b(or prep|scrub|operative|surgical|release steps?|approach|exposure|fixation|orif|portals?|implant(?: choice| options?)?|intraoperative|fluoro)\b/i.test(message)) setting = 'or';
  else if (/\b(consult presentation|present (?:this|the|my) consult|day float|call shift|ed consult)\b/i.test(message)) setting = 'consult';
  else if (patientSpecificity === 'case_specific' && /\b(fracture|dislocation|injury|trauma|crash|fall|reduction|splint|ed|emergency|consult|neurovascular|post-?op|infection)\b/i.test(message)) setting = 'consult';
  else if (/\b(clinic|outpatient|physical exam|exam maneuvers?|injection|nonoperative|conservative treatment|workup)\b/i.test(message)) setting = 'clinic';
  else if (patientSpecificity === 'educational' && (task === 'explain' || task === 'decide' || task === 'compare')) setting = 'general';
  else {
    setting = settingFromMode(legacyMode) ?? settingFromMode(input.selectedMode) ?? 'general';
    settingSource = settingFromMode(legacyMode) ? 'classifier' : 'legacy_fallback';
  }

  const deterministicCount = [settingSource, taskSource, audienceSource, depthSource, evidenceNeed !== 'none' ? 'deterministic' : 'legacy_fallback', emergent || URGENT.test(message) ? 'deterministic' : 'legacy_fallback', interaction !== 'answer' ? 'deterministic' : 'legacy_fallback', patientSpecificity === 'case_specific' ? 'deterministic' : 'legacy_fallback'].filter((source) => source === 'deterministic').length;
  const legacyConfidence = Number(input.legacyIntent?.confidence);
  const confidence = Math.max(0, Math.min(1, Number.isFinite(legacyConfidence) ? 0.55 + deterministicCount * 0.05 + legacyConfidence * 0.1 : 0.55 + deterministicCount * 0.05));

  return {
    setting, task, audience, depth, evidenceNeed, urgency, interaction, patientSpecificity,
    topic,
    procedure: setting === 'or' ? topic : cleanOptional(input.conversationState?.activeProcedure),
    confidence,
    sources: {
      setting: settingSource,
      task: taskSource,
      audience: audienceSource,
      depth: depthSource,
      evidenceNeed: evidenceNeed === 'none' ? 'legacy_fallback' : 'deterministic',
      urgency: urgency === 'routine' ? 'legacy_fallback' : 'deterministic',
      interaction: interaction === 'answer' ? 'legacy_fallback' : 'deterministic',
      patientSpecificity: patientSpecificity === 'educational' ? 'legacy_fallback' : 'deterministic',
    },
  };
}

export function mapFactoredIntentToLegacy(intent: BroBotFactoredIntent): { mode: Exclude<BroBotChatMode, 'auto' | 'fracture_call'>; subintent: string } {
  const mode = ({ or: 'or_prep', boards: 'oite', consult: 'consult', clinic: 'clinic', research: 'research', general: 'general' } as const)[intent.setting];
  let subintent = 'overview';
  if (intent.task === 'quiz') subintent = 'quiz';
  else if (intent.task === 'retrieve_evidence') subintent = 'evidence_critique';
  else if (intent.task === 'compare') subintent = 'other';
  else if (intent.task === 'decide') subintent = intent.setting === 'boards' ? 'treatment_algorithm' : 'treatment_plan';
  else if (intent.task === 'plan') subintent = intent.setting === 'or' ? 'surgical_steps' : intent.setting === 'consult' ? 'initial_consult' : 'overview';
  else if (intent.task === 'counsel') subintent = 'patient_explanation';
  return { mode, subintent };
}
