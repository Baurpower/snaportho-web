export {
  CURRICULUM_TOPIC_BY_ID,
  CURRICULUM_TOPICS,
  CURRICULUM_TRACK_BY_ID,
  CURRICULUM_TRACKS,
  validateStudentCurriculum,
} from '@/lib/student-curriculum/curriculum-data';
export {
  getCommonStudentCases,
  getCurriculumOverview,
  getRecommendedNextTopics,
  getPrerequisiteTopics,
  getRelatedTopics,
  getSuggestedStartTopic,
  getStudyTemplate,
  getTopicById,
  getTopicsByTrack,
  getTrackById,
} from '@/lib/student-curriculum/curriculum-recommendations';
export { searchCurriculumTopics } from '@/lib/student-curriculum/curriculum-search';
export {
  buildCaseReadinessSession,
  normalizeStudyGuideCompletionIds,
  resolveCaseReadinessMinutes,
} from '@/lib/student-curriculum/case-readiness-builder';
export { buildLearningPathView, getLearningPathWeeks } from '@/lib/student-curriculum/learning-paths';
export { buildTodaysPreparationCards } from '@/lib/student-curriculum/prep-recommendations';
export { buildRotationPrepProfile } from '@/lib/student-curriculum/rotation-prep-profile';
export { getCasePrepSlugForTopic } from '@/lib/student-curriculum/caseprep-topic-mapping';
export {
  detectStudyGuideTopicType,
  STUDY_GUIDE_IMPORTANCE_LEVELS,
  STUDY_GUIDE_SECTION_KINDS,
  STUDY_GUIDE_TOPIC_TYPES,
} from '@/lib/student-curriculum/case-readiness-builder';
export { getStudentCasePrepContext } from '@/lib/student-curriculum/student-caseprep-context';
export type {
  CurriculumCommonStudentCase,
  CurriculumCommonStudentCaseTopicReference,
  CurriculumCase,
  CurriculumRecommendation,
  CurriculumRecommendationReason,
  CurriculumRecommendationReasonCode,
  CurriculumSearchMatchedField,
  CurriculumSearchOptions,
  CurriculumSearchReasonLabel,
  CurriculumSearchResult,
  CurriculumStudyTemplate,
  CurriculumTopic,
  CurriculumTrack,
  CurriculumTrackOverview,
  DeepStudyTemplate,
  DifficultyLevel,
  FastStudyTemplate,
  LearningObjective,
  RecommendedNextTopicsParams,
  StudentLevel,
  StudentCurriculumValidationCode,
  StudentCurriculumValidationIssue,
  StudentCurriculumValidationResult,
  StudentCurriculumValidationSeverity,
  StudyMode,
} from '@/lib/student-curriculum/curriculum-types';
export type {
  CaseReadinessActionKind,
  CaseReadinessBrobotAction,
  CaseReadinessLaunchContext,
  CaseReadinessObjective,
  CaseReadinessObjectiveKind,
  CaseReadinessSourceField,
  CaseReadinessSession,
  StudyGuideBlockKind,
  StudyGuideContentBlock,
  StudyGuideImportance,
  StudyGuideSection,
  StudyGuideSectionKind,
  StudyGuideTopicType,
} from '@/lib/student-curriculum/case-readiness-builder';
export {
  CURRICULUM_RECOMMENDATION_REASON_CODES,
  CURRICULUM_SEARCH_MATCH_FIELDS,
  CURRICULUM_SEARCH_REASON_LABELS,
  DIFFICULTY_LEVELS,
  STUDENT_LEVELS,
  STUDENT_CURRICULUM_VALIDATION_CODES,
  STUDENT_CURRICULUM_VALIDATION_SEVERITIES,
  STUDY_MODES,
} from '@/lib/student-curriculum/curriculum-types';
