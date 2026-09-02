import type { CampaignStep } from './types';

export function campaignActivity(rows: Record<string, unknown>[]) {
  const times = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.user_id) continue;
    for (const value of [row.created_at, row.updated_at]) {
      const timestamp = new Date(String(value)).getTime();
      if (Number.isFinite(timestamp)) times.set(String(row.user_id), [...(times.get(String(row.user_id)) ?? []), timestamp]);
    }
  }
  return times;
}

export function campaignHistory(sends: Record<string, unknown>[]) {
  const attempted = new Map<string, Set<CampaignStep>>();
  const prior = new Map<string, Map<CampaignStep, number>>();
  for (const row of sends) if (row.user_id && row.campaign_step && row.send_status !== 'failed') {
    const steps = attempted.get(String(row.user_id)) ?? new Set<CampaignStep>();
    steps.add(row.campaign_step as CampaignStep); attempted.set(String(row.user_id), steps);
    if (!['sent', 'delivered', 'clicked'].includes(String(row.send_status))) continue;
    const map = prior.get(String(row.user_id)) ?? new Map<CampaignStep, number>();
    map.set(row.campaign_step as CampaignStep, new Date(String(row.sent_at)).getTime()); prior.set(String(row.user_id), map);
  }
  return { attempted, prior };
}
