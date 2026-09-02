import BroBotChatPage from '@/components/brobot/BroBotChatPage';
import { isBrobotCampaignEntry } from '@/lib/marketing/links';

export const metadata = {
  title: 'BroBot Chat',
  description:
    'Ask open-ended orthopaedic questions, prep faster, and find what you may be missing.',
};

export default async function Page({ searchParams }: {
  searchParams: Promise<{ utm_source?: string; utm_medium?: string; utm_campaign?: string }>;
}) {
  return <BroBotChatPage campaignEntry={isBrobotCampaignEntry(await searchParams)} />;
}
