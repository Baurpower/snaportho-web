import { timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import {
  claimBroBotEnrichmentJobs,
  completeBroBotEnrichmentJob,
  failBroBotEnrichmentJob,
  type BroBotEnrichmentJob,
} from '@/lib/brobot/enrichment';
import {
  BroBotChatIntentSchema,
  buildBroBotClinicalContextFromIntent,
} from '@/lib/brobot/chat';
import { getMetadataModel } from '@/lib/brobot/model-config';
import {
  persistBroBotKgShadowTrace,
  retrieveBroBotKgShadow,
} from '@/lib/brobot/kg';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getDisabledAutomationResponse,
  isCronJobsEnabled,
} from '@/lib/config/automation';
import {
  answerHash,
  ANKI_LINKER_VERSION,
  latestPublishedRelease,
  linkAnkiCardsForSupport,
} from '@/lib/brobot/chat/anki-linker';
import type { BroBotAnswerSupport } from '@/lib/brobot/chat/answer-support';
import { getBroBotClaimAnkiMode } from '@/lib/brobot/kg/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

const JOBS_PER_RUN = 8;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (!secret || !header) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

function configurationError() {
  if (!isCronJobsEnabled()) return 'Cron jobs are disabled.';
  if (!process.env.CRON_SECRET) return 'CRON_SECRET is missing.';
  if (!process.env.OPENAI_API_KEY) return 'OPENAI_API_KEY is missing.';
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return 'Supabase admin environment variables are missing.';
  }
  return null;
}

async function processJob(job: BroBotEnrichmentJob) {
  const supabase = createAdminClient();
  const intent = BroBotChatIntentSchema.parse(job.payload.intent);
  const startedAt = performance.now();
  const { data: message, error: messageError } = await supabase
    .from('brobot_messages')
    .select('structured_json')
    .eq('id', job.message_id)
    .eq('user_id', job.user_id)
    .single();
  if (messageError || !message)
    throw new Error(messageError?.message ?? 'Assistant message missing');

  let suggestedQuestions = job.payload.suggestedFollowUps.slice(0, 3);
  let tags: string[] = [];
  let metadataUsage: unknown = null;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: getMetadataModel(),
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Return JSON with suggestedQuestions (0-3 concise, topic-specific questions) and tags (0-6 compact local metadata tags). Do not rewrite or add medical claims.',
        },
        {
          role: 'user',
          content: `Question: ${job.payload.question}\nAnswer: ${job.payload.answer}\nTopic: ${intent.procedureOrTopic}\nMode: ${intent.mode}`,
        },
      ],
    });
    metadataUsage = completion.usage ?? null;
    const raw = JSON.parse(
      completion.choices[0]?.message?.content ?? '{}',
    ) as Record<string, unknown>;
    if (Array.isArray(raw.suggestedQuestions)) {
      suggestedQuestions = raw.suggestedQuestions
        .filter(
          (value): value is string =>
            typeof value === 'string' && Boolean(value.trim()),
        )
        .slice(0, 3);
    }
    if (Array.isArray(raw.tags)) {
      tags = raw.tags
        .filter(
          (value): value is string =>
            typeof value === 'string' && Boolean(value.trim()),
        )
        .slice(0, 6);
    }
  } catch (error) {
    // Deterministic primary-call follow-ups remain valid if metadata generation fails.
    console.error('[brobot-enrichment] metadata fallback', job.id, error);
  }

  const clinicalContext = buildBroBotClinicalContextFromIntent({
    message: job.payload.question,
    intent,
  });
  const kg = await retrieveBroBotKgShadow({
    requestId: job.payload.requestId,
    query: job.payload.question,
    intent,
    clinicalContext,
    responseDepth: job.payload.responseDepth as 'quick' | 'standard' | 'deep',
    trainingLevel: job.payload.trainingLevel as
      'med_student' | 'pgy1' | 'pgy2' | 'pgy3' | 'pgy4' | 'pgy5' | 'attending',
  });
  await persistBroBotKgShadowTrace({
    result: kg,
    query: job.payload.question,
    userId: job.user_id,
    conversationId: job.conversation_id,
    messageId: job.message_id,
    mode: intent.mode,
    subintent: intent.subintent,
    trainingLevel: job.payload.trainingLevel,
    responseDepth: job.payload.responseDepth,
    isFollowUp: false,
  });

  const structured = (message.structured_json ?? {}) as Record<string, unknown>;
  const claimSupport = Array.isArray(structured.claimSupport)
    ? (structured.claimSupport as BroBotAnswerSupport[])
    : [];
  let claimLinkedCardCount = 0;
  if (getBroBotClaimAnkiMode() === 'enabled' && claimSupport.length) {
    const releaseId = await latestPublishedRelease();
    if (releaseId) {
      const references = await linkAnkiCardsForSupport(
        claimSupport,
        releaseId,
        job.user_id,
      );
      const hash = answerHash(job.payload.answer);
      await supabase
        .from('brobot_anki_references')
        .delete()
        .eq('message_id', job.message_id)
        .eq('user_id', job.user_id);
      if (references.length) {
        const { error: referenceError } = await supabase
          .from('brobot_anki_references')
          .insert(
            references.map((reference) => ({
              user_id: job.user_id,
              message_id: job.message_id,
              answer_hash: hash,
              anchor_text: reference.anchorText,
              claim_id: reference.claimId,
              support_claim_id: reference.supportClaimId,
              support_claim_version_id: reference.supportClaimVersionId,
              answer_anchor_id: reference.answerAnchorId,
              answer_anchor_hash: reference.answerAnchorHash,
              match_source: reference.matchSource ?? 'semantic_fallback',
              support_confidence: reference.supportConfidence,
              canonical_card_id: reference.cardId,
              canonical_card_version_id: reference.cardVersionId,
              deck_release_id: releaseId,
              rank: reference.number,
            })),
          );
        if (referenceError) throw new Error(referenceError.message);
      }
      const { error: lookupError } = await supabase
        .from('brobot_anki_reference_lookups')
        .upsert(
          {
            message_id: job.message_id,
            user_id: job.user_id,
            answer_hash: hash,
            deck_release_id: releaseId,
            linker_version: ANKI_LINKER_VERSION,
            checked_at: new Date().toISOString(),
          },
          { onConflict: 'message_id' },
        );
      if (lookupError) throw new Error(lookupError.message);
      claimLinkedCardCount = references.length;
    }
  }
  const enrichmentLatencyMs =
    Math.round((performance.now() - startedAt) * 100) / 100;
  const { error: updateError } = await supabase
    .from('brobot_messages')
    .update({
      structured_json: {
        ...structured,
        suggestedQuestions,
        tags,
        enrichment: {
          status: 'completed',
          completedAt: new Date().toISOString(),
          latencyMs: enrichmentLatencyMs,
          metadataModel: getMetadataModel(),
          metadataUsage,
          kgRetrievalId: kg.trace.retrievalId,
          kgStatus: kg.trace.status,
          claimLinkedCardCount,
        },
      },
    })
    .eq('id', job.message_id)
    .eq('user_id', job.user_id);
  if (updateError) throw new Error(updateError.message);

  await supabase.from('brobot_usage_events').insert({
    user_id: job.user_id,
    guest_id: null,
    feature: 'brobot',
    outcome: 'success',
    event_type: 'brobot_async_enrichment_completed',
    latency_ms: enrichmentLatencyMs,
    metadata: {
      tier: job.payload.tier,
      answer_model: job.payload.model,
      answer_token_usage: job.payload.answerUsage ?? null,
      metadata_token_usage: metadataUsage,
      stage_timings: job.payload.stageTimings ?? {},
      suggested_follow_up_count: suggestedQuestions.length,
      claim_linked_card_count: claimLinkedCardCount,
    },
  });
  await completeBroBotEnrichmentJob(job.id);
}

export async function GET(request: Request) {
  const error = configurationError();
  if (error) {
    return NextResponse.json(getDisabledAutomationResponse(error), {
      status: isCronJobsEnabled() ? 503 : 200,
    });
  }
  if (!isAuthorized(request))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const jobs = await claimBroBotEnrichmentJobs(JOBS_PER_RUN);
  let succeeded = 0;
  for (const job of jobs) {
    try {
      await processJob(job);
      succeeded += 1;
    } catch (jobError) {
      console.error('[brobot-enrichment] job failed', job.id, jobError);
      await failBroBotEnrichmentJob(job, jobError);
    }
  }
  return NextResponse.json({
    claimed: jobs.length,
    succeeded,
    failed: jobs.length - succeeded,
  });
}
