import { detectBroBotInteractionConstraints } from '../chat/interaction-constraints';
import { deriveBroBotConversationState } from '../chat/conversation-state';
import type { BroBotChatMode, BroBotModelMessage, BroBotTrainingLevel } from '../chat/types';
import type { ReadNextContextPacket } from './types';

const PATIENT_SPECIFIC = /\b(my patient|this patient|\d{1,3}[- ]year[- ]old|he has|she has|their (?:x-?ray|mri|ct))\b/i;
const URGENT = /\b(emergency|urgent|immediately|right now|neurovascular|compartment syndrome|open fracture|septic|cauda equina)\b/i;

export function buildReadNextContextPacket(input: {
  latestUserRequest: string;
  latestVisibleAnswer: string;
  history: BroBotModelMessage[];
  mode: BroBotChatMode;
  learnerLevel: BroBotTrainingLevel;
  activeTopic?: string;
  previouslyExposedHashes?: string[];
}): ReadNextContextPacket {
  const history = input.history.filter((item) => item.role !== 'system');
  const constraints = detectBroBotInteractionConstraints({
    message: input.latestUserRequest,
    history,
  });
  const state = deriveBroBotConversationState({
    message: input.latestUserRequest,
    history,
    topic: input.activeTopic,
    learnerLevel: input.learnerLevel,
  });

  return {
    latestUserRequest: input.latestUserRequest,
    latestVisibleAnswer: input.latestVisibleAnswer,
    mode: input.mode,
    learnerLevel: input.learnerLevel,
    activeTopic: state.activeTopic,
    answeredQuestions: state.answeredQuestions,
    corrections: state.correctedClaims.map((item) => item.correction),
    previouslyExposedHashes: input.previouslyExposedHashes ?? [],
    stagedQuiz: constraints.stagedQuiz,
    compare: constraints.compare,
    evidenceRequest: constraints.evidenceRequest,
    explicitCorrection: constraints.explicitCorrection,
    patientSpecific: PATIENT_SPECIFIC.test(input.latestUserRequest),
    urgent: URGENT.test(input.latestUserRequest),
  };
}
