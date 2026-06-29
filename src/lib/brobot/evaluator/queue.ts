import { createAdminClient } from '@/lib/supabase/admin';

const BROBOT_EVAL_ENABLED = process.env.BROBOT_EVAL_ENABLED !== 'false';
const MAX_EVALUATION_ATTEMPTS = 3;

export type EnqueueBroBotEvaluationJobParams = {
  conversationId: string;
  messageId: string;
  userId: string;
  mode: string | null;
  procedure: string | null;
  model: string;
  trainingLevel: string | null;
  responseDepth: string | null;
  intentSnapshot: Record<string, unknown> | null;
  contextSnapshot: Record<string, unknown> | null;
};

export async function enqueueBroBotEvaluationJob(
  params: EnqueueBroBotEvaluationJobParams
): Promise<void> {
  if (!BROBOT_EVAL_ENABLED) {
    return;
  }

  try {
    const supabase = createAdminClient();
    // Upsert with ignoreDuplicates so a duplicate enqueue for the same assistant
    // message (e.g. a caller retry) is a silent no-op rather than a logged error,
    // relying on the unique index on message_id.
    const { error } = await supabase
      .from('brobot_evaluation_jobs')
      .upsert(
        {
          conversation_id: params.conversationId,
          message_id: params.messageId,
          user_id: params.userId,
          mode: params.mode,
          procedure: params.procedure,
          model: params.model,
          training_level: params.trainingLevel,
          response_depth: params.responseDepth,
          intent_snapshot: params.intentSnapshot,
          context_snapshot: params.contextSnapshot,
        },
        { onConflict: 'message_id', ignoreDuplicates: true }
      );

    if (error) {
      console.error('[brobot-evaluator] failed to enqueue evaluation job', error);
    }
  } catch (error) {
    console.error('[brobot-evaluator] failed to enqueue evaluation job', error);
  }
}

export type BroBotEvaluationJobRow = {
  id: string;
  conversation_id: string;
  message_id: string;
  user_id: string;
  mode: string | null;
  procedure: string | null;
  model: string;
  training_level: string | null;
  response_depth: string | null;
  intent_snapshot: Record<string, unknown> | null;
  context_snapshot: Record<string, unknown> | null;
  status: string;
  attempts: number;
  last_error: string | null;
};

// Jobs stuck in 'processing' longer than this (e.g. because the cron invocation
// that claimed them was killed by a function timeout) are treated as abandoned
// and become claimable again, so a single stalled run can't strand jobs forever.
const STALE_PROCESSING_MINUTES = 10;

export async function claimPendingEvaluationJobs(limit: number): Promise<BroBotEvaluationJobRow[]> {
  const supabase = createAdminClient();
  const staleThreshold = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000).toISOString();

  const { data: claimable, error: selectError } = await supabase
    .from('brobot_evaluation_jobs')
    .select('id')
    .or(`status.eq.pending,and(status.eq.processing,started_at.lt.${staleThreshold})`)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (selectError || !claimable || claimable.length === 0) {
    if (selectError) {
      console.error('[brobot-evaluator] failed to select claimable jobs', selectError);
    }
    return [];
  }

  const ids = claimable.map((row) => row.id as string);

  const { data: claimed, error: claimError } = await supabase
    .from('brobot_evaluation_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .in('id', ids)
    .or(`status.eq.pending,and(status.eq.processing,started_at.lt.${staleThreshold})`)
    .select(
      'id, conversation_id, message_id, user_id, mode, procedure, model, training_level, response_depth, intent_snapshot, context_snapshot, status, attempts, last_error'
    );

  if (claimError || !claimed) {
    console.error('[brobot-evaluator] failed to claim pending jobs', claimError);
    return [];
  }

  return claimed as BroBotEvaluationJobRow[];
}

export async function markJobCompleted(jobId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('brobot_evaluation_jobs')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', jobId);

  if (error) {
    console.error('[brobot-evaluator] failed to mark job completed', jobId, error);
  }
}

export async function markJobFailed(
  jobId: string,
  attempts: number,
  errorMessage: string
): Promise<{ permanentlyFailed: boolean }> {
  const supabase = createAdminClient();
  const nextAttempts = attempts + 1;
  const permanentlyFailed = nextAttempts >= MAX_EVALUATION_ATTEMPTS;

  const { error } = await supabase
    .from('brobot_evaluation_jobs')
    .update({
      status: permanentlyFailed ? 'failed' : 'pending',
      attempts: nextAttempts,
      last_error: errorMessage.slice(0, 2000),
      completed_at: permanentlyFailed ? new Date().toISOString() : null,
      started_at: null,
    })
    .eq('id', jobId);

  if (error) {
    console.error('[brobot-evaluator] failed to mark job failed', jobId, error);
  }

  return { permanentlyFailed };
}

export { MAX_EVALUATION_ATTEMPTS };
