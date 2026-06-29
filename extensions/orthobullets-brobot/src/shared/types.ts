export interface OrthobulletsChoice {
  key?: string;
  text: string;
  isSelected?: boolean;
  isCorrect?: boolean;
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
  width?: number;
  height?: number;
}

export type OrthobulletsPageKind = 'review' | 'current_test' | 'unknown';

export type OrthobulletsExtractionFailureCode =
  | 'content_script_no_response'
  | 'page_not_readable';

export interface OrthobulletsExtractionDiagnostics {
  activeTabUrl: string | null;
  contentScriptResponded: boolean;
  readable: boolean;
  failureCode?: OrthobulletsExtractionFailureCode;
  hasQuestionId: boolean;
  hasStem: boolean;
  answerChoiceCount: number;
  breadcrumbCount: number;
  percentDistributionCount: number;
  imageCount: number;
  linkedConceptCount: number;
  warnings: string[];
}

export interface OrthobulletsPageContext {
  source: 'orthobullets';
  pageUrl: string;
  pageKind: OrthobulletsPageKind;
  questionId?: string;
  topicId?: string;
  breadcrumbs: string[];
  stem?: string;
  answerChoices: OrthobulletsChoice[];
  selectedAnswerKey?: string;
  correctAnswerKey?: string;
  percentDistribution: OrthobulletsPercentDistribution[];
  explanationText?: string;
  linkedConcepts: OrthobulletsLinkedConcept[];
  images: OrthobulletsImageMetadata[];
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
  boardPearl: string;
  warnings: string[];
  usage?: {
    remainingToday: number | null;
    dailyCap: number | null;
    unlimited: boolean;
  };
}
