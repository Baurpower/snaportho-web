import { NextResponse } from 'next/server';
import { campaignWebUrl } from '@/lib/marketing/links';

export function GET(request: Request) {
  return NextResponse.redirect(campaignWebUrl(new URL(request.url)));
}
