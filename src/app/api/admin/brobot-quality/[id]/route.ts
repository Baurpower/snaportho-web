import { NextResponse } from 'next/server';

import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from '@/lib/caseprep-review/access-control';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireCasePrepReviewer({ minRole: 'content_admin' });
    const { id } = await context.params;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { adminStatus, adminNotes } = body as { adminStatus?: string; adminNotes?: string };

    if (adminStatus && adminStatus !== 'resolved' && adminStatus !== 'unresolved') {
      return NextResponse.json({ error: 'adminStatus must be "resolved" or "unresolved".' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (adminStatus) update.admin_status = adminStatus;
    if (typeof adminNotes === 'string') update.admin_notes = adminNotes;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('brobot_response_evaluations')
      .update(update)
      .eq('id', id)
      .select('id, admin_status, admin_notes')
      .single();

    if (error || !data) {
      console.error('[admin/brobot-quality] failed to update evaluation', id, error);
      return NextResponse.json({ error: 'Unable to update evaluation.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof CasePrepReviewAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[admin/brobot-quality] unexpected error', error);
    return NextResponse.json({ error: 'Unable to update evaluation.' }, { status: 500 });
  }
}
