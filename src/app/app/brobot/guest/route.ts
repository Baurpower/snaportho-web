import { NextResponse } from 'next/server';
import { brobotCampaignWebUrl } from '@/lib/marketing/links';

export function GET(request: Request) {
  return NextResponse.redirect(brobotCampaignWebUrl(new URL(request.url)));
}
