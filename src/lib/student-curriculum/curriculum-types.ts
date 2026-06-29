export const STUDY_MODES = ['fast', 'deep'] as const;

export type StudyMode = (typeof STUDY_MODES)[number];

export const DIFFICULTY_LEVELS = [
  'introductory',
  'core',
  'advanced',
] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const STUDENT_LEVELS = [
  'preclinical',
  'clerkship',
  'subintern',
  'intern-ready',
] as const;

export type StudentLevel = (typeof STUDENT_LEVELS)[number];

export type LearningObjective = {
  id: string;
  objective: string;
};

export type CurriculumCase = {
  id: string;
  name: string;
  scenario: string;
};

export type FastStudyTemplate = {
  overviewPrompt: string;
  mustKnow: string[];
  anatomyFocus: string[];
  caseSteps: string[];
  pimpQuestions: string[];
  orSurvivalTips: string[];
  oneLiner: string;
};

export type DeepStudyTemplate = {
  overviewPrompt: string;
  anatomy: string[];
  classification: string[];
  imaging: string[];
  decisionMaking: string[];
  treatmentOptions: string[];
  surgicalApproach: string[];
  complications: string[];
  boardPearls: string[];
  selfCheckQuestions: string[];
  relatedTopics: string[];
};

export type CurriculumTopic = {
  id: string;
  title: string;
  aliases: string[];
  trackId: string;
  subspecialty: string;
  studentLevel: StudentLevel;
  difficulty: DifficultyLevel;
  tags: string[];
  commonCases: CurriculumCase[];
  learningObjectives: LearningObjective[];
  prerequisites: string[];
  relatedTopicIds: string[];
  estimatedFastMinutes: number;
  estimatedDeepMinutes: number;
  fastStudyTemplate: FastStudyTemplate;
  deepStudyTemplate: DeepStudyTemplate;
};

export type CurriculumTrack = {
  id: string;
  title: string;
  description: string;
  rotationRelevance: string;
  iconName: string;
  suggestedStartTopicId: string;
  topicIds: string[];
};

export const CURRICULUM_SEARCH_MATCH_FIELDS = [
  'title',
  'alias',
  'common-case',
  'tag',
  'learning-objective',
  'track',
  'subspecialty',
] as const;

export type CurriculumSearchMatchedField =
  (typeof CURRICULUM_SEARCH_MATCH_FIELDS)[number];

export const CURRICULUM_SEARCH_REASON_LABELS = [
  'Title match',
  'Alias match',
  'Common case match',
  'Tag match',
  'Learning objective match',
  'Track match',
  'Subspecialty match',
] as const;

export type CurriculumSearchReasonLabel =
  (typeof CURRICULUM_SEARCH_REASON_LABELS)[number];

export type CurriculumSearchOptions = {
  trackId?: string;
  limit?: number;
};

export type CurriculumSearchResult = {
  topic: CurriculumTopic;
  track: CurriculumTrack;
  score: number;
  matchedFields: CurriculumSearchMatchedField[];
  reasonLabel: CurriculumSearchReasonLabel;
};

export const CURRICULUM_RECOMMENDATION_REASON_CODES = [
  'related-topic',
  'preferred-track',
  'matching-weak-tag',
  'prerequisites-ready',
  'same-track',
  'suggested-start-topic',
  'introductory-difficulty',
  'core-difficulty',
  'student-level-fit',
  'fallback-topic',
] as const;

export type CurriculumRecommendationReasonCode =
  (typeof CURRICULUM_RECOMMENDATION_REASON_CODES)[number];

export type CurriculumRecommendationReason = {
  code: CurriculumRecommendationReasonCode;
  label: string;
};

export type CurriculumRecommendation = {
  topic: CurriculumTopic;
  track: CurriculumTrack;
  score: number;
  reasons: CurriculumRecommendationReason[];
};

export type RecommendedNextTopicsParams = {
  currentTopicId?: string;
  trackId?: string;
  completedTopicIds?: string[];
  weakTagIds?: string[];
  limit?: number;
};

export type CurriculumTrackOverview = {
  track: CurriculumTrack;
  topicCount: number;
  estimatedFastMinutes: number;
  estimatedDeepMinutes: number;
  suggestedStartTopic?: CurriculumTopic;
};

export type CurriculumCommonStudentCaseTopicReference = {
  topicId: string;
  topicTitle: string;
  trackId: string;
  trackTitle: string;
};

export type CurriculumCommonStudentCase = {
  caseName: string;
  topics: CurriculumCommonStudentCaseTopicReference[];
};

export type CurriculumStudyTemplate = FastStudyTemplate | DeepStudyTemplate;

export const STUDENT_CURRICULUM_VALIDATION_SEVERITIES = [
  'error',
  'warning',
] as const;

export type StudentCurriculumValidationSeverity =
  (typeof STUDENT_CURRICULUM_VALIDATION_SEVERITIES)[number];

export const STUDENT_CURRICULUM_VALIDATION_CODES = [
  'duplicate-topic-id',
  'duplicate-track-id',
  'missing-track-for-topic',
  'missing-topic-for-track',
  'missing-related-topic',
  'missing-prerequisite-topic',
  'missing-suggested-start-topic',
  'suggested-start-topic-outside-track',
  'self-related-topic',
  'self-prerequisite-topic',
  'empty-track-title',
  'empty-track-description',
  'empty-track-rotation-relevance',
  'empty-track-topic-ids',
  'empty-topic-title',
  'empty-topic-aliases',
  'empty-topic-common-cases',
  'empty-topic-learning-objectives',
  'empty-topic-template',
  'invalid-estimated-minutes',
] as const;

export type StudentCurriculumValidationCode =
  (typeof STUDENT_CURRICULUM_VALIDATION_CODES)[number];

export type StudentCurriculumValidationIssue = {
  severity: StudentCurriculumValidationSeverity;
  code: StudentCurriculumValidationCode;
  entityType: 'track' | 'topic' | 'curriculum';
  entityId: string;
  path: string;
  message: string;
};

export type StudentCurriculumValidationResult = {
  isValid: boolean;
  errors: StudentCurriculumValidationIssue[];
  warnings: StudentCurriculumValidationIssue[];
};
