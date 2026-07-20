import { createAdminClient } from '@/lib/supabase/admin';

const MAX_ATTEMPTS = 3;
const STALE_PROCESSING_MINUTES = 10;

export type BroBotEnrichmentPayload = {
  requestId: string;
  question: string;
  answer: string;
  tier: 1 | 2 | 3;
  model: string;
  answerUsage?: unknown;
  latencyMs: number;
  intent: Record<string, unknown>;
  entityResolution: Record<string, unknown>;
  responseDepth: string;
  trainingLevel: string;
  suggestedFollowUps: string[];
  stageTimings?: Record<string, unknown>;
};

export type BroBotEnrichmentJob = {
  id: string;
  conversation_id: string;
  message_id: string;
  user_id: string;
  payload: BroBotEnrichmentPayload;
  attempts: number;
};

export async function enqueueBroBotEnrichmentJob(input: {
  conversationId: string;
  messageId: string;
  userId: string;
  payload: BroBotEnrichmentPayload;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('brobot_enrichment_jobs').upsert(
    {
      conversation_id: input.conversationId,
      message_id: input.messageId,
      user_id: input.userId,
      payload: input.payload,
    },
    { onConflict: 'message_id', ignoreDuplicates: true }
  );
  if (error) throw new Error(`Failed to enqueue BroBot enrichment: ${error.message}`);
}

export async function claimBroBotEnrichmentJobs(limit: number): Promise<BroBotEnrichmentJob[]> {
  const supabase = createAdminClient();
  const stale = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60_000).toISOString();
  const { data: claimable, error: selectError } = await supabase
    .from('brobot_enrichment_jobs')
    .select('id')
    .or(`status.eq.pending,and(status.eq.processing,started_at.lt.${stale})`)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (selectError) throw new Error(selectError.message);
  if (!claimable?.length) return [];

  const { data, error } = await supabase
    .from('brobot_enrichment_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .in('id', claimable.map((row) => row.id))
    .or(`status.eq.pending,and(status.eq.processing,started_at.lt.${stale})`)
    .select('id, conversation_id, message_id, user_id, payload, attempts');
  if (error) throw new Error(error.message);
  return (data ?? []) as BroBotEnrichmentJob[];
}

export async function completeBroBotEnrichmentJob(id: string) {
  const { error } = await createAdminClient()
    .from('brobot_enrichment_jobs')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function failBroBotEnrichmentJob(job: BroBotEnrichmentJob, error: unknown) {
  const attempts = job.attempts + 1;
  const terminal = attempts >= MAX_ATTEMPTS;
  const { error: updateError } = await createAdminClient()
    .from('brobot_enrichment_jobs')
    .update({
      status: terminal ? 'failed' : 'pending',
      attempts,
      last_error: (error instanceof Error ? error.message : String(error)).slice(0, 2000),
      started_at: null,
      completed_at: terminal ? new Date().toISOString() : null,
    })
    .eq('id', job.id);
  if (updateError) throw new Error(updateError.message);
}
