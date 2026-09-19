import type { CampaignStep, MarketingTopic } from './types';

export type CampaignProfile = {
  userId: string;
  email: string;
  confirmed: boolean;
  receiveEmails: boolean;
  marketingConsentAt: number | null;
  accountCreatedAt: number | null;
  firstName: string | null;
  profileComplete: boolean;
  profileCohort?: ProfileCohort;
  currentlyEntitled: boolean;
  hasDeliverySuppression: boolean;
  firstUseAt: number | null;
  lastUseAt: number | null;
  priorSteps: Set<CampaignStep>;
  priorStepAt: Map<CampaignStep, number>;
  optedOutTopics: Set<string>;
};

const DAY = 86_400_000;
export const ACTIVATION_1_MAX_ACCOUNT_AGE_DAYS = 30;

export type CampaignIneligibilityReason =
  | 'email_unconfirmed'
  | 'email_disabled'
  | 'explicit_consent_missing'
  | 'currently_entitled'
  | 'delivery_suppressed'
  | 'globally_opted_out'
  | 'topic_opted_out'
  | 'step_already_sent'
  | 'already_activated'
  | 'account_creation_unknown'
  | 'account_too_old'
  | 'prerequisite_missing_or_too_recent'
  | 'recently_active'
  | 'profile_already_complete'
  | 'profile_cohort_ineligible'
  | 'profile_campaign_already_sent';

export type ProfileCohort = 'empty' | 'med_student_grad_year_only' | 'other';

const blank = (value: unknown) => value === null || value === undefined ||
  (typeof value === 'string' && value.trim() === '');

export function profileCohort(profile: Record<string, unknown> | null | undefined, workspaceGradYear?: unknown): ProfileCohort {
  const hasGradYear = !blank(profile?.grad_year) || !blank(workspaceGradYear);
  const hasTrainingLevel = !blank(profile?.training_level);
  if (profile?.training_level === 'MD/DO Student' && !hasGradYear) return 'med_student_grad_year_only';
  if (!hasTrainingLevel && !hasGradYear &&
      ['country', 'city', 'institution', 'subspecialty_interest'].every((field) => blank(profile?.[field]))) return 'empty';
  return 'other';
}

export const CAMPAIGN_CONFIG: Record<CampaignStep, { campaignKey: string; topic: MarketingTopic; templateVersion: string }> = {
  activation_1: { campaignKey: 'brobot_activation_v1', topic: 'brobot_learning', templateVersion: 'v1' },
  activation_2: { campaignKey: 'brobot_activation_v1', topic: 'brobot_learning', templateVersion: 'v1' },
  activation_3: { campaignKey: 'brobot_activation_v1', topic: 'brobot_learning', templateVersion: 'v1' },
  habit_1: { campaignKey: 'brobot_habit_v1', topic: 'brobot_learning', templateVersion: 'v1' },
  habit_2: { campaignKey: 'brobot_habit_v1', topic: 'brobot_learning', templateVersion: 'v1' },
  conversion_1: { campaignKey: 'brobot_conversion_v1', topic: 'offers', templateVersion: 'v1' },
  profile_completion_1: { campaignKey: 'profile_completion_v2', topic: 'product_updates', templateVersion: 'v1' },
  profile_grad_year_1: { campaignKey: 'profile_med_student_grad_year_v1', topic: 'product_updates', templateVersion: 'v1' },
  reengagement_1: { campaignKey: 'brobot_reengagement_v1', topic: 'brobot_learning', templateVersion: 'v1' },
};

export function campaignIneligibilityReason(
  profile: CampaignProfile,
  step: CampaignStep,
  now = Date.now(),
): CampaignIneligibilityReason | null {
  const config = CAMPAIGN_CONFIG[step];
  if (!profile.confirmed) return 'email_unconfirmed';
  if (!profile.receiveEmails) return 'email_disabled';
  if (profile.marketingConsentAt === null) return 'explicit_consent_missing';
  if (profile.currentlyEntitled) return 'currently_entitled';
  if (profile.hasDeliverySuppression) return 'delivery_suppressed';
  if (profile.optedOutTopics.has('*')) return 'globally_opted_out';
  if (profile.optedOutTopics.has(config.topic)) return 'topic_opted_out';
  if (profile.priorSteps.has(step)) return 'step_already_sent';
  if ((step === 'profile_completion_1' || step === 'profile_grad_year_1') &&
      (profile.priorSteps.has('profile_completion_1') || profile.priorSteps.has('profile_grad_year_1'))) {
    return 'profile_campaign_already_sent';
  }

  switch (step) {
    case 'activation_1':
      if (profile.firstUseAt !== null) return 'already_activated';
      if (profile.accountCreatedAt === null) return 'account_creation_unknown';
      if (profile.accountCreatedAt < now - ACTIVATION_1_MAX_ACCOUNT_AGE_DAYS * DAY) return 'account_too_old';
      return null;
    case 'activation_2':
      if (profile.firstUseAt !== null) return 'already_activated';
      return (profile.priorStepAt.get('activation_1') ?? now) <= now - 3 * DAY
        ? null
        : 'prerequisite_missing_or_too_recent';
    case 'activation_3':
      if (profile.firstUseAt !== null) return 'already_activated';
      return (profile.priorStepAt.get('activation_2') ?? now) <= now - 4 * DAY
        ? null
        : 'prerequisite_missing_or_too_recent';
    case 'habit_1':
      return profile.firstUseAt !== null && now - profile.firstUseAt <= 2 * DAY
        ? null
        : 'recently_active';
    case 'habit_2':
      return profile.firstUseAt !== null
        && (profile.priorStepAt.get('habit_1') ?? now) <= now - 4 * DAY
        && profile.lastUseAt !== null
        && now - profile.lastUseAt >= 3 * DAY
        ? null
        : 'prerequisite_missing_or_too_recent';
    case 'conversion_1':
      return profile.firstUseAt !== null ? null : 'recently_active';
    case 'profile_completion_1':
      if (profile.profileComplete) return 'profile_already_complete';
      return profile.profileCohort === 'empty' ? null : 'profile_cohort_ineligible';
    case 'profile_grad_year_1':
      return profile.profileCohort === 'med_student_grad_year_only' ? null : 'profile_cohort_ineligible';
    case 'reengagement_1':
      return profile.lastUseAt !== null && now - profile.lastUseAt >= 30 * DAY
        ? null
        : 'recently_active';
  }
}

export function isEligibleForCampaign(profile: CampaignProfile, step: CampaignStep, now = Date.now()) {
  return campaignIneligibilityReason(profile, step, now) === null;
}
