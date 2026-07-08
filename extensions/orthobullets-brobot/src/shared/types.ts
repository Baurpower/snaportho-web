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

export interface TopicBullet {
  text: string;
  depth: number;
  path: string[];
}

export interface TopicSection {
  id: string;
  title: string;
  bullets: TopicBullet[];
}

export type OrthobulletsPageKind = 'review' | 'current_test' | 'topic' | 'unknown';
export type QuestionProvider = 'orthobullets' | 'rock';
export type ExtractedPageMode = 'question' | 'curriculum_content' | 'topic_page';
export type ClassifiedPageKind = 'question' | 'educational_content' | 'mixed' | 'topic_page' | 'unreadable';
export type ProviderDetectionStatus = QuestionProvider | 'unsupported' | 'readable_unrecognized';

export interface PageClassification {
  pageKind: ClassifiedPageKind;
  confidence: number;
  reason: string;
  detected: {
    hasStem: boolean;
    answerChoiceCount: number;
    readableTextLength: number;
    headings: string[];
    referencesCount: number;
    tablesCount: number;
    imagesCount: number;
    activeUrl: string;
    title: string | null;
  };
}

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
  classification?: PageClassification;
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
  contentMarkdown?: string | null;
  contentSections?: Array<{
    heading: string;
    text: string;
  }>;
  topicSections?: TopicSection[];
  topicBulletCount?: number;
  learningObjectives?: string[];
  tablesMarkdown?: string[];
  references?: string[];
  tablesCount?: number;
  referencesCount?: number;
  questionCount?: number;
  cardCount?: number;
  videoCount?: number;
  classification?: PageClassification;
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

export type CurriculumExplainEmphasis = 'high_yield' | 'clinical' | 'boards' | 'or';

export interface CurriculumMustKnowGroup {
  title: string;
  bullets: string[];
}

export interface CurriculumAttendingQuestion {
  question: string;
  answer: string;
  difficulty: 'MS3' | 'PGY1' | 'PGY2+';
}

export interface CurriculumMiniQuizItem {
  question: string;
  choices?: string[];
  answer: string;
  explanation: string;
}

export interface CurriculumLearningObjectiveCoverage {
  objective: string;
  status?: 'covered' | 'partial' | 'not_covered';
  highYieldPoint?: string;
}

export interface CurriculumComparisonTable {
  headers: string[];
  rows: string[][];
}

export interface CurriculumStudyResponse {
  responseKind: 'curriculum';
  explanationId: string;
  emphasis: CurriculumExplainEmphasis;
  oneSentenceTakeaway: string;
  inThirtySeconds: string[];
  mustKnow: CurriculumMustKnowGroup[];
  clinicalPearls: string[];
  commonMistakes: string[];
  attendingQuestions: CurriculumAttendingQuestion[];
  testableFacts: string[];
  miniQuiz: CurriculumMiniQuizItem[];
  memoryHooks: string[];
  suggestedFollowUps: string[];
  nextReviewTopics: string[];
  learningObjectives: CurriculumLearningObjectiveCoverage[];
  comparisonTable?: CurriculumComparisonTable;
  deepDive: string[];
  referencesNote?: string;
  fallbackBullets?: string[];
  parseError?: string;
  warnings: string[];
  usage?: {
    remainingToday: number | null;
    dailyCap: number | null;
    unlimited: boolean;
  };
}

export type BrobotExplainResult = OrthobulletsExplainResponse | CurriculumStudyResponse;

export function isCurriculumStudyResponse(
  value: BrobotExplainResult | null | undefined
): value is CurriculumStudyResponse {
  return Boolean(value && 'responseKind' in value && value.responseKind === 'curriculum');
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

/**
 * Orthobullets Page Mode — active-reading tutor for topic pages. Distinct
 * from ROCK's curriculum_content mode: the tutor asks page-grounded
 * questions and judges answers rather than teaching/expanding the page.
 */
export type OrthobulletsTopicAction =
  | 'quiz_me'
  | 'find_answer'
  | 'explain_section'
  | 'what_tested'
  | 'attending_question'
  | 'explain_images'
  | 'board_traps'
  | 'rapid_review'
  | 'grade_answer'
  | 'save_missed';

export interface OrthobulletsTopicAskedQuestion {
  id: string;
  sourceSectionId?: string;
  question: string;
  expectedAnswer: string;
  explanation: string;
  pageEvidence: string[];
  status: 'unanswered' | 'correct' | 'partial' | 'missed';
}

export interface OrthobulletsTopicProgress {
  sectionsCompleted: string[];
  conceptsMastered: string[];
  conceptsMissed: string[];
  savedPearls: string[];
  tier: 1 | 2 | 3 | 4 | 5;
  askedQuestions: OrthobulletsTopicAskedQuestion[];
  currentMode?: OrthobulletsTopicAction | null;
}

export interface OrthobulletsTopicTutorTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface OrthobulletsRapidReview {
  mustKnow: string[];
  commonConfusion: string[];
  redFlags: string[];
  managementAlgorithm: string[];
  recallPrompts: string[];
}

export interface OrthobulletsTopicTutorResponse {
  responseId: string;
  message: string;
  citedHeading?: string | null;
  citedQuote?: string | null;
  verdict?: 'correct' | 'partial' | 'incorrect' | null;
  clinicalWhyItMatters?: string | null;
  followUpQuestion?: string | null;
  conceptTag?: string | null;
  conceptStatus?: 'missed' | 'mastered' | null;
  sectionCompleted?: string | null;
  trackedQuestionId?: string | null;
  trackedQuestion?: string | null;
  trackedExpectedAnswer?: string | null;
  trackedExplanation?: string | null;
  trackedPageEvidence?: string[] | null;
  rapidReview?: OrthobulletsRapidReview | null;
  tier: 1 | 2 | 3 | 4 | 5;
  insufficientContent: boolean;
  suggestedChips: string[];
  warnings: string[];
  usage?: {
    remainingToday: number | null;
    dailyCap: number | null;
    unlimited: boolean;
  };
}

export function createEmptyTopicProgress(): OrthobulletsTopicProgress {
  return {
    sectionsCompleted: [],
    conceptsMastered: [],
    conceptsMissed: [],
    savedPearls: [],
    tier: 1,
    askedQuestions: [],
    currentMode: null,
  };
}
