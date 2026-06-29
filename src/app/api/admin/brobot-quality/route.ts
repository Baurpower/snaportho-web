import { NextResponse } from 'next/server';

import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from '@/lib/caseprep-review/access-control';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  try {
    await requireCasePrepReviewer({ minRole: 'content_admin' });

    const url = new URL(request.url);
    const params = url.searchParams;

    const minScore = params.get('minScore');
    const maxScore = params.get('maxScore');
    const mode = params.get('mode');
    const model = params.get('model');
    const failureLabel = params.get('failureLabel');
    const severity = params.get('severity');
    const requiresReview = params.get('requiresReview');
    const adminStatus = params.get('adminStatus');
    const cursor = params.get('cursor');

    const supabase = createAdminClient();
    let query = supabase
      .from('brobot_response_evaluations')
      .select(
        `id, job_id, conversation_id, message_id, user_id, model, eval_model, mode, procedure,
         response_depth, training_level, overall_score, severity, requires_admin_review,
         subscores, strengths, weaknesses, failure_labels, missing_topics, summary,
         engineering_recommendation, confidence, admin_status, admin_notes, created_at`
      )
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (minScore) query = query.gte('overall_score', Number(minScore));
    if (maxScore) query = query.lte('overall_score', Number(maxScore));
    if (mode) query = query.eq('mode', mode);
    if (model) query = query.eq('model', model);
    if (severity) query = query.eq('severity', severity);
    if (requiresReview === 'true') query = query.eq('requires_admin_review', true);
    if (requiresReview === 'false') query = query.eq('requires_admin_review', false);
    if (adminStatus) query = query.eq('admin_status', adminStatus);
    if (failureLabel) query = query.contains('failure_labels', [failureLabel]);
    if (cursor) query = query.lt('created_at', cursor);

    const { data: evaluations, error } = await query;

    if (error) {
      console.error('[admin/brobot-quality] failed to load evaluations', error);
      return NextResponse.json({ error: 'Unable to load evaluations.' }, { status: 500 });
    }

    const messageIds = Array.from(
      new Set((evaluations ?? []).map((row) => row.message_id).filter(Boolean))
    );
    const conversationIds = Array.from(
      new Set((evaluations ?? []).map((row) => row.conversation_id).filter(Boolean))
    );

    const { data: assistantMessages } = messageIds.length
      ? await supabase
          .from('brobot_messages')
          .select('id, content, conversation_id, created_at')
          .in('id', messageIds)
      : { data: [] };

    const { data: userMessages } = conversationIds.length
      ? await supabase
          .from('brobot_messages')
          .select('id, content, conversation_id, role, created_at')
          .in('conversation_id', conversationIds)
          .eq('role', 'user')
          .order('created_at', { ascending: true })
      : { data: [] };

    const assistantById = new Map((assistantMessages ?? []).map((m) => [m.id, m]));
    const lastUserByConversation = new Map<string, string>();
    for (const message of userMessages ?? []) {
      lastUserByConversation.set(message.conversation_id, message.content);
    }

    const enriched = (evaluations ?? []).map((row) => {
      const assistantMessage = assistantById.get(row.message_id);
      // Strip user_id before it ever reaches the browser -- the dashboard has no
      // legitimate need to display which resident asked a given question.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { user_id: _userId, ...rest } = row;
      return {
        ...rest,
        question: lastUserByConversation.get(row.conversation_id) ?? null,
        response: assistantMessage?.content ?? null,
      };
    });

    return NextResponse.json({ data: enriched });
  } catch (error) {
    if (error instanceof CasePrepReviewAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[admin/brobot-quality] unexpected error', error);
    return NextResponse.json({ error: 'Unable to load evaluations.' }, { status: 500 });
  }
}
