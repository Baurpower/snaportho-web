import { NextResponse } from 'next/server';

import { loadAnkiUsageSnapshot } from '@/lib/analytics/anki-usage';
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from '@/lib/caseprep-review/access-control';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireCasePrepReviewer({ minRole: 'content_admin' });
  } catch (error) {
    if (error instanceof CasePrepReviewAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const days = Number(new URL(request.url).searchParams.get('days') ?? '30');
  const windowDays = days === 7 || days === 90 ? days : 30;

  try {
    const data = await loadAnkiUsageSnapshot(windowDays);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[admin/anki-usage] failed to load snapshot', error);
    return NextResponse.json({ error: 'Unable to load Anki usage.' }, { status: 500 });
  }
}
