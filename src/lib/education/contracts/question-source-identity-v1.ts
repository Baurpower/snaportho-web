// Re-exported from the extension compile root. The content-script tsconfig
// cannot import files outside extensions/orthobullets-brobot/src, so the
// implementation lives there and this module is the web contract path.
export {
  QUESTION_SOURCE_IDENTITY_CONTRACT,
  QUESTION_SOURCE_PROVIDERS,
  REVIEW_OUTCOME_CAPTURE_MIN,
  STABLE_NATIVE_ID_CAPTURE_MIN,
  buildQuestionSourceIdentity,
  containsProtectedIdentityContent,
  evaluateSanitizedIdentityCapture,
  isQuestionSourceIdentityV1,
  normalizeHimalayaDefinitionId,
  normalizeOrthobulletsNativeId,
  normalizeSourceText,
  resolveHimalayaDefinitionId,
  sha256Hex,
  sourceFingerprintHash,
} from "../../../../extensions/orthobullets-brobot/src/shared/question-source-identity.ts";

export type {
  HimalayaDefinitionLookup,
  IdentityCaptureReport,
  QuestionIdentityStatus,
  QuestionReviewCaptureState,
  QuestionSourceIdentityInput,
  QuestionSourceIdentityV1,
  QuestionSourceProvider,
} from "../../../../extensions/orthobullets-brobot/src/shared/question-source-identity.ts";
