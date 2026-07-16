export type PersonalStatementReviewErrorCode =
  | 'quota_exceeded'
  | 'plan_required'
  | 'feature_not_in_plan'
  | 'auth_resolution_failed'
  | 'guest_session_invalid'
  | 'provider_failed'
  | 'invalid_model_response'
  | 'persistence_failed'
  | 'usage_recording_failed'
  | 'entitlement_resolution_failed'
  | 'internal_error'
  | string;

export type ReviewErrorPresentation = {
  message: string;
  showUpgrade: boolean;
  showSignIn: boolean;
  showRetry: boolean;
};

const UPGRADE_CODES = new Set(['quota_exceeded', 'plan_required', 'feature_not_in_plan']);

export function mapReviewError(code: PersonalStatementReviewErrorCode | null, serverMessage: string | null, isGuest: boolean): ReviewErrorPresentation {
  if (code && UPGRADE_CODES.has(code)) {
    return { message: serverMessage || 'You’ve used today’s BroBot reviews.', showUpgrade: true, showSignIn: isGuest, showRetry: false };
  }
  if (code === 'auth_resolution_failed' || code === 'guest_session_invalid') {
    return { message: 'Your session expired. Sign in again to continue.', showUpgrade: false, showSignIn: true, showRetry: false };
  }
  if (code === 'invalid_model_response') {
    return { message: 'BroBot returned an incomplete review. Your allowance was not used.', showUpgrade: false, showSignIn: false, showRetry: true };
  }
  if (code === 'persistence_failed') {
    return { message: 'Your review was generated but could not be saved.', showUpgrade: false, showSignIn: false, showRetry: true };
  }
  return { message: serverMessage || 'We couldn’t complete the review. Your allowance was not used.', showUpgrade: false, showSignIn: false, showRetry: true };
}

export function shouldOfferUpgrade(code: PersonalStatementReviewErrorCode | null) {
  return Boolean(code && UPGRADE_CODES.has(code));
}
