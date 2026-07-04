export interface OrthobulletsChoice {
  key?: string;
  label?: string | null;
  text: string;
  isSelected?: boolean | null;
  isCorrect?: boolean | null;
}

export interface OrthobulletsPercentDistribution {
  answerKey?: string;
  label?: string;
  percent?: number;
}

export interface OrthobulletsLinkedConcept {
  label: string;
  href?: string;
  kind?: 'oite' | 'card' | 'topic';
}

export interface OrthobulletsImageMetadata {
  src?: string;
  alt?: string;
  caption?: string | null;
  width?: number;
  height?: number;
}

export type OrthobulletsPageKind = 'review' | 'current_test' | 'unknown';
export type QuestionProvider = 'orthobullets' | 'rock';
export type ExtractedPageMode = 'question' | 'curriculum_content';
export type ProviderDetectionStatus = QuestionProvider | 'unsupported' | 'readable_unrecognized';

export type OrthobulletsExtractionFailureCode =
  | 'content_script_no_response'
  | 'page_not_readable';

export interface OrthobulletsExtractionDiagnostics {
  activeTabId: number | null;
  activeTabUrl: string | null;
  activeTabStatus: string | null;
  contentScriptResponded: boolean;
  provider: ProviderDetectionStatus;
  readable: boolean;
  failureCode?: OrthobulletsExtractionFailureCode;
  sendMessageError: string | null;
  fallbackInjectionAttempted: boolean;
  injectionError: string | null;
  hasQuestionId: boolean;
  hasStem: boolean;
  answerChoiceCount: number;
  hasSelectedAnswer: boolean;
  hasCorrectAnswer: boolean;
  hasExplanation: boolean;
  hasCurriculumContent: boolean;
  contentCharCount: number;
  sectionCount: number;
  headingCount: number;
  breadcrumbCount: number;
  percentDistributionCount: number;
  imageCount: number;
  linkedConceptCount: number;
  warnings: string[];
}

export interface ExtensionFetchDiagnostics {
  attemptedLinkUrl: string;
  baseUrl: string;
  httpStatus: number | null;
  responseBody: string | null;
  responseMessage: string | null;
  fetchFailedBeforeResponse: boolean;
}

export interface OrthobulletsPageContext {
  source: QuestionProvider;
  provider: QuestionProvider;
  mode: ExtractedPageMode;
  pageUrl: string;
  sourceUrl: string;
  pageKind: OrthobulletsPageKind | string;
  questionId?: string | null;
  topicId?: string | null;
  title?: string | null;
  breadcrumbs: string[];
  authors?: string[];
  date?: string | null;
  sectionHeadings?: string[];
  contentText?: string | null;
  contentSections?: Array<{
    heading: string;
    text: string;
  }>;
  stem?: string;
  answerChoices: OrthobulletsChoice[];
  selectedAnswerKey?: string | null;
  correctAnswerKey?: string | null;
  selectedAnswer?: string | null;
  correctAnswer?: string | null;
  percentDistribution: OrthobulletsPercentDistribution[];
  explanationText?: string | null;
  explanation?: string | null;
  linkedConcepts: OrthobulletsLinkedConcept[];
  images: OrthobulletsImageMetadata[];
  raw?: {
    providerSpecific?: Record<string, unknown>;
  };
  extractionWarnings: string[];
  debug?: {
    matchedSelectors: Record<string, string[]>;
    extractorVersion: string;
  };
}

export interface OrthobulletsExplainResponse {
  explanationId: string;
  bottomLine: string;
  testedConcept: string;
  whyCorrect: string;
  whyWrong: Array<{
    choiceKey?: string;
    reason: string;
    isClassicTrap?: boolean;
  }>;
  boardTrap?: string;
  boardPearl: string;
  studyNext: string[];
  warnings: string[];
  usage?: {
    remainingToday: number | null;
    dailyCap: number | null;
    unlimited: boolean;
  };
}

export interface OrthobulletsHintResponse {
  hintId: string;
  hintLevel: 1 | 2 | 3;
  title: string;
  hint: string;
  avoidRevealingAnswer: boolean;
  nextActionLabel?: string;
  warnings: string[];
  usage?: {
    remainingToday: number | null;
    dailyCap: number | null;
    unlimited: boolean;
  };
}

export interface OrthobulletsChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface OrthobulletsChatResponse {
  responseId: string;
  answer: string;
  suggestedPrompts: string[];
  warnings: string[];
  usage?: {
    remainingToday: number | null;
    dailyCap: number | null;
    unlimited: boolean;
  };
}
