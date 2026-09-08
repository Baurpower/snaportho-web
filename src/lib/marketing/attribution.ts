import { CAMPAIGN_CONFIG } from './segments';
import { CAMPAIGN_STEPS, type CampaignStep } from './types';

export type EmailCampaignAttribution = {
  source: 'branch' | 'resend';
  medium: 'email';
  campaign: string;
  content: CampaignStep;
  branchClickId?: string | null;
};

export function validatedEmailCampaignAttribution(input: unknown): EmailCampaignAttribution | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  if ((value.source !== 'branch' && value.source !== 'resend') || value.medium !== 'email' ||
      typeof value.campaign !== 'string' || typeof value.content !== 'string' ||
      !CAMPAIGN_STEPS.includes(value.content as CampaignStep)) return null;
  const content = value.content as CampaignStep;
  if (CAMPAIGN_CONFIG[content].campaignKey !== value.campaign) return null;
  const branchClickId = typeof value.branchClickId === 'string' && value.branchClickId.length <= 128
    ? value.branchClickId
    : null;
  return { source: value.source, medium: 'email', campaign: value.campaign, content, branchClickId };
}
