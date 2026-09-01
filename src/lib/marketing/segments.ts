import type { CampaignStep, MarketingTopic } from './types';

export type CampaignProfile = {
  userId: string;
  email: string;
  confirmed: boolean;
  receiveEmails: boolean;
  firstName: string | null;
  profileComplete: boolean;
  currentlyEntitled: boolean;
  firstUseAt: number | null;
  lastUseAt: number | null;
  priorSteps: Set<CampaignStep>;
  priorStepAt: Map<CampaignStep, number>;
  optedOutTopics: Set<string>;
};

const DAY = 86_400_000;

export const CAMPAIGN_CONFIG: Record<CampaignStep, { campaignKey: string; topic: MarketingTopic; templateVersion: string }> = {
  activation_1: { campaignKey: 'brobot_activation_v1', topic: 'brobot_learning', templateVersion: 'v1' },
  activation_2: { campaignKey: 'brobot_activation_v1', topic: 'brobot_learning', templateVersion: 'v1' },
  activation_3: { campaignKey: 'brobot_activation_v1', topic: 'brobot_learning', templateVersion: 'v1' },
  habit_1: { campaignKey: 'brobot_habit_v1', topic: 'brobot_learning', templateVersion: 'v1' },
  habit_2: { campaignKey: 'brobot_habit_v1', topic: 'brobot_learning', templateVersion: 'v1' },
  conversion_1: { campaignKey: 'brobot_conversion_v1', topic: 'offers', templateVersion: 'v1' },
  profile_completion_1: { campaignKey: 'profile_completion_v1', topic: 'product_updates', templateVersion: 'v1' },
  reengagement_1: { campaignKey: 'brobot_reengagement_v1', topic: 'brobot_learning', templateVersion: 'v1' },
};

export function isEligibleForCampaign(profile: CampaignProfile, step: CampaignStep, now = Date.now()) {
  const config = CAMPAIGN_CONFIG[step];
  if (!profile.confirmed || !profile.receiveEmails || profile.currentlyEntitled) return false;
  if (profile.optedOutTopics.has('*') || profile.optedOutTopics.has(config.topic)) return false;
  if (profile.priorSteps.has(step)) return false;

  switch (step) {
    case 'activation_1': return profile.firstUseAt === null;
    case 'activation_2': return profile.firstUseAt === null && (profile.priorStepAt.get('activation_1') ?? now) <= now - 3 * DAY;
    case 'activation_3': return profile.firstUseAt === null && (profile.priorStepAt.get('activation_2') ?? now) <= now - 4 * DAY;
    case 'habit_1': return profile.firstUseAt !== null && now - profile.firstUseAt <= 2 * DAY;
    case 'habit_2': return profile.firstUseAt !== null && (profile.priorStepAt.get('habit_1') ?? now) <= now - 4 * DAY && profile.lastUseAt !== null && now - profile.lastUseAt >= 3 * DAY;
    case 'conversion_1': return profile.firstUseAt !== null;
    case 'profile_completion_1': return !profile.profileComplete;
    case 'reengagement_1': return profile.lastUseAt !== null && now - profile.lastUseAt >= 30 * DAY;
  }
}
