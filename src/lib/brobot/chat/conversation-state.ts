import type { BroBotModelMessage } from './types';
import { detectBroBotInteractionConstraints } from './interaction-constraints';

export type BroBotConversationState = {
  activeTopic?: string;
  activeProcedure?: string;
  establishedFacts: string[];
  correctedClaims: Array<{ originalClaim: string; correction: string }>;
  answeredQuestions: string[];
  unresolvedQuestions: string[];
  explicitInstructions: string[];
  learnerLevel?: string;
};

export function deriveBroBotConversationState(input: {
  message: string;
  history: BroBotModelMessage[];
  topic?: string;
  procedure?: string;
  learnerLevel?: string;
}): BroBotConversationState {
  const history = input.history.filter((item) => item.role !== 'system');
  const answeredQuestions: string[] = [];
  const unresolvedQuestions: string[] = [];
  const correctedClaims: BroBotConversationState['correctedClaims'] = [];
  const establishedFacts: string[] = [];
  for (let index = 0; index < history.length; index += 1) {
    const item = history[index];
    if (item.role === 'user') {
      if (history.slice(index + 1).some((next) => next.role === 'assistant')) answeredQuestions.push(item.content);
      else unresolvedQuestions.push(item.content);
      const constraints = detectBroBotInteractionConstraints({ message: item.content, history: history.slice(0, index) });
      if (constraints.explicitCorrection) {
        const priorAssistant = [...history.slice(0, index)].reverse().find((next) => next.role === 'assistant');
        correctedClaims.push({ originalClaim: priorAssistant?.content.slice(0, 500) ?? '', correction: item.content });
        establishedFacts.push(item.content);
      }
    }
  }
  const current = detectBroBotInteractionConstraints({ message: input.message, history });
  if (current.explicitCorrection) {
    const priorAssistant = [...history].reverse().find((item) => item.role === 'assistant');
    correctedClaims.push({ originalClaim: priorAssistant?.content.slice(0, 500) ?? '', correction: input.message });
    establishedFacts.push(input.message);
  }
  const explicitInstructions = [
    current.stagedQuiz ? 'staged_quiz' : '', current.answerOnly ? 'answer_only' : '',
    current.shortAnswer ? 'short_answer' : '', current.compare ? 'compare' : '',
    current.evidenceRequest ? 'retrieve_evidence' : '', current.repeatedQuestion ? 'avoid_repetition' : '',
  ].filter(Boolean);
  return {
    activeTopic: input.topic,
    activeProcedure: input.procedure,
    establishedFacts: establishedFacts.slice(-5),
    correctedClaims: correctedClaims.slice(-3),
    answeredQuestions: answeredQuestions.slice(-8),
    unresolvedQuestions: unresolvedQuestions.slice(-3),
    explicitInstructions,
    learnerLevel: current.requestedLearnerLevel ?? input.learnerLevel,
  };
}

export function formatConversationStateForPrompt(state: BroBotConversationState): string {
  const corrections = state.correctedClaims.map((claim) => `- Replace prior claim: ${claim.originalClaim}\n  With correction: ${claim.correction}`);
  return [
    'Structured conversation state (internal; obey corrections over prior assistant text):',
    state.activeTopic ? `- Active topic: ${state.activeTopic}` : '',
    state.activeProcedure ? `- Active procedure: ${state.activeProcedure}` : '',
    state.learnerLevel ? `- Learner level: ${state.learnerLevel}` : '',
    state.explicitInstructions.length ? `- Explicit instructions: ${state.explicitInstructions.join(', ')}` : '',
    corrections.length ? `Corrections:\n${corrections.join('\n')}` : '',
    state.answeredQuestions.length ? `Already answered questions:\n${state.answeredQuestions.map((item) => `- ${item}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
}
