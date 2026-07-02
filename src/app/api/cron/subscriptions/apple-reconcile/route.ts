import { timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';

import { reconcileAppleSubscriptions } from '@/lib/subscriptions/apple-reconciliation';

export const runtime = 'nodejs';
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get('authorization');
  const expected = `Bearer ${secret}`;
  if (!header || header.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (process.env.ENABLE_CRON_JOBS !== 'true') {
    return NextResponse.json({ disabled: true, reason: 'cron_jobs_disabled' });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await reconcileAppleSubscriptions({ dryRun: false });
  return NextResponse.json(result);
}
