import { timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  BROBOT_EVAL_MODEL,
  claimPendingEvaluationJobs,
  markJobCompleted,
  markJobFailed,
  runBroBotEvaluation,
  type BroBotEvalConversationTurn,
  type BroBotEvaluationJobRow,
} from '@/lib/brobot/evaluator';

export const runtime = 'nodejs';
// Generous ceiling for a sequential batch of OpenAI evaluation calls; requires a
// Vercel plan that supports a 60s function duration for this route.
export const maxDuration = 60;

const JOBS_PER_RUN = 5;
const BROBOT_EVAL_ENABLED = process.env.BROBOT_EVAL_ENABLED !== 'false';

function isAuthorized(request: Request): boolean {
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

async function loadConversationContext(
  job: BroBotEvaluationJobRow
): Promise<{ history: BroBotEvalConversationTurn[]; currentUserQuestion: string; finalAssistantResponse: string }> {
  const supabase = createAdminClient();

  const { data: messages, error } = await supabase
    .from('brobot_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', job.conversation_id)
    .order('created_at', { ascending: true });

  if (error || !messages) {
    throw new Error(`Failed to load conversation history: ${error?.message ?? 'unknown error'}`);
  }

  const targetIndex = messages.findIndex((message) => message.id === job.message_id);
  const targetMessage = targetIndex >= 0 ? messages[targetIndex] : null;

  if (!targetMessage) {
    throw new Error('Target assistant message not found in conversation history.');
  }

  const priorMessages = messages.slice(0, targetIndex);
  const history: BroBotEvalConversationTurn[] = priorMessages.map((message) => ({
    role: message.role as 'user' | 'assistant' | 'system',
    content: message.content,
  }));

  const lastUserMessage = [...priorMessages].reverse().find((message) => message.role === 'user');

  return {
    history,
    currentUserQuestion: lastUserMessage?.content ?? '(unable to recover the original user question)',
    finalAssistantResponse: targetMessage.content,
  };
}

async function insertPipelineFailureEvaluation(
  job: BroBotEvaluationJobRow,
  errorMessage: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('brobot_response_evaluations').insert({
    job_id: job.id,
    conversation_id: job.conversation_id,
    message_id: job.message_id,
    user_id: job.user_id,
    model: job.model,
    eval_model: BROBOT_EVAL_MODEL,
    mode: job.mode,
    procedure: job.procedure,
    response_depth: job.response_depth,
    training_level: job.training_level,
    overall_score: 0,
    severity: 'pipeline_error',
    requires_admin_review: true,
    subscores: {
      accuracy: 0,
      question_understanding: 0,
      educational_quality: 0,
      specificity: 0,
      clinical_utility: 0,
      completeness: 0,
      appropriate_level: 0,
      structure: 0,
      safety: 0,
      hallucination_risk: 0,
    },
    strengths: [],
    weaknesses: [],
    failure_labels: ['prompt_failure'],
    missing_topics: [],
    summary: 'Evaluation pipeline failed after the maximum number of retry attempts.',
    engineering_recommendation: `Investigate the BroBot evaluator pipeline failure for job ${job.id}: ${errorMessage}`,
    confidence: 0,
  });

  if (error) {
    console.error('[brobot-evaluate-cron] failed to insert pipeline-failure evaluation', job.id, error);
  }
}

async function processJob(job: BroBotEvaluationJobRow): Promise<boolean> {
  try {
    const { history, currentUserQuestion, finalAssistantResponse } = await loadConversationContext(job);

    const result = await runBroBotEvaluation({
      jobId: job.id,
      conversationId: job.conversation_id,
      messageId: job.message_id,
      userId: job.user_id,
      mode: job.mode,
      procedure: job.procedure,
      model: job.model,
      trainingLevel: job.training_level,
      responseDepth: job.response_depth,
      intentSnapshot: job.intent_snapshot,
      contextSnapshot: job.context_snapshot,
      conversationHistory: history,
      currentUserQuestion,
      finalAssistantResponse,
    });

    const supabase = createAdminClient();
    const { error: insertError } = await supabase.from('brobot_response_evaluations').insert({
      job_id: job.id,
      conversation_id: job.conversation_id,
      message_id: job.message_id,
      user_id: job.user_id,
      model: job.model,
      eval_model: BROBOT_EVAL_MODEL,
      mode: job.mode,
      procedure: job.procedure,
      response_depth: job.response_depth,
      training_level: job.training_level,
      overall_score: Math.round(result.overall_score),
      severity: result.severity,
      requires_admin_review: result.requires_admin_review,
      subscores: result.subscores,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      failure_labels: result.failure_labels,
      missing_topics: result.missing_topics,
      summary: result.summary,
      engineering_recommendation: result.engineering_recommendation,
      confidence: result.confidence,
    });

    if (insertError) {
      throw new Error(`Failed to insert evaluation result: ${insertError.message}`);
    }

    await markJobCompleted(job.id);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[brobot-evaluate-cron] job failed', job.id, errorMessage);
    const { permanentlyFailed } = await markJobFailed(job.id, job.attempts, errorMessage);
    if (permanentlyFailed) {
      await insertPipelineFailureEvaluation(job, errorMessage);
    }
    return false;
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!BROBOT_EVAL_ENABLED) {
    return NextResponse.json({ disabled: true, claimed: 0, succeeded: 0, failed: 0 });
  }

  const jobs = await claimPendingEvaluationJobs(JOBS_PER_RUN);

  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    const ok = await processJob(job);
    if (ok) {
      succeeded += 1;
    } else {
      failed += 1;
    }
  }

  return NextResponse.json({ claimed: jobs.length, succeeded, failed });
}
