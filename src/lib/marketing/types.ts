export const MARKETING_TOPICS = [
  'brobot_learning',
  'product_updates',
  'offers',
] as const;

export type MarketingTopic = (typeof MARKETING_TOPICS)[number];

export const CAMPAIGN_STEPS = [
  'activation_1',
  'activation_2',
  'activation_3',
  'habit_1',
  'habit_2',
  'conversion_1',
  'profile_completion_1',
  'reengagement_1',
] as const;

export type CampaignStep = (typeof CAMPAIGN_STEPS)[number];

export type MarketingRecipient = {
  userId: string;
  email: string;
  firstName: string | null;
  addressSource?: 'profile' | 'authentication';
  fallbackFromDeliveryId?: string;
  topic: MarketingTopic;
  campaignKey: string;
  campaignStep: CampaignStep;
  templateVersion: string;
};

export type MarketingEmail = {
  subject: string;
  html: string;
  text: string;
};
