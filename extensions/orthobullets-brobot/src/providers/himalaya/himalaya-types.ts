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
  totalQuestions?: string;
  assessmentTitle?: string;
  stem: string;
  choices: HimalayaAnswerChoice[];
  explanation?: string;
  discussion?: string;
  keyReferencePoints?: string;
  references?: string;
  reviewState: 'unanswered' | 'selected' | 'answered_review' | 'unknown';
  fingerprint: string;
};

export type ExtractedReviewQuestion = {
  provider: 'rock_himalaya';
  mode: 'review';
  assessmentTitle?: string;
  questionNumber?: number;
  totalQuestions?: number;
  stem: string;
  choices: HimalayaAnswerChoice[];
  selectedChoice?: string;
  correctChoice?: string;
  explanationText?: string;
  discussionText?: string;
  imageContext: Array<{ src?: string; alt?: string; caption?: string | null }>;
  fingerprint: string;
};
