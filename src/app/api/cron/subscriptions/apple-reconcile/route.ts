import { timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';

import { reconcileAppleSubscriptions } from '@/lib/subscriptions/apple-reconciliation';
import { recoverAppleNotificationHistory } from '@/lib/subscriptions/apple-notification-recovery';

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

  const [productionHistoryResult, sandboxHistoryResult, reconciliationResult] =
    await Promise.allSettled([
      recoverAppleNotificationHistory({ environment: 'production', lookbackHours: 72 }),
      recoverAppleNotificationHistory({ environment: 'sandbox', lookbackHours: 72 }),
      reconcileAppleSubscriptions({ dryRun: false }),
    ]);

  const productionHistory =
    productionHistoryResult.status === 'fulfilled'
      ? productionHistoryResult.value
      : { error: String(productionHistoryResult.reason) };
  const sandboxHistory =
    sandboxHistoryResult.status === 'fulfilled'
      ? sandboxHistoryResult.value
      : { error: String(sandboxHistoryResult.reason) };
  const reconciliation =
    reconciliationResult.status === 'fulfilled'
      ? reconciliationResult.value
      : { error: String(reconciliationResult.reason) };
  const failed =
    [productionHistoryResult, sandboxHistoryResult, reconciliationResult].some(
      (result) => result.status === 'rejected'
    ) ||
    (productionHistoryResult.status === 'fulfilled' && productionHistoryResult.value.failed.length > 0) ||
    (sandboxHistoryResult.status === 'fulfilled' && sandboxHistoryResult.value.failed.length > 0);

  return NextResponse.json(
    { productionHistory, sandboxHistory, reconciliation },
    { status: failed ? 500 : 200 }
  );
}
