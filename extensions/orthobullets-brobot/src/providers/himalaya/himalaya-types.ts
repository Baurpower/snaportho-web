export type HimalayaPageMode =
  | 'results-overview'
  | 'reviewed-question'
  | 'active-question'
  | 'unknown';

export type HimalayaAnswerChoice = {
  id: string;
  label?: string;
  text: string;
  selected: boolean;
  correct?: boolean;
};

export type HimalayaQuestionSnapshot = {
  provider: 'himalaya';
  pageMode: 'reviewed-question' | 'active-question';
  questionId?: string;
  questionNumber?: string;
  stem: string;
  choices: HimalayaAnswerChoice[];
  explanation?: string;
  keyReferencePoints?: string;
  references?: string;
  reviewState: 'unanswered' | 'selected' | 'answered_review' | 'unknown';
  fingerprint: string;
};
