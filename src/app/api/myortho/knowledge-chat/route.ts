import { NextResponse } from 'next/server';
import { zodResponseFormat } from 'openai/helpers/zod';

import { getOpenAI } from '@/lib/brobot/openai-client';
import { retrieveMyOrthoSources, sourceById } from '@/lib/myortho-chat/corpus';
import { MYORTHO_CHAT_MODEL } from '@/lib/myortho-chat/model-config';
import { buildMyOrthoPrompt } from '@/lib/myortho-chat/prompt-builder';
import { checkMyOrthoRateLimit } from '@/lib/myortho-chat/rate-limit';
import { MyOrthoChatRequestSchema, MyOrthoChatResponseSchema, type MyOrthoChatResponse } from '@/lib/myortho-chat/schemas';
import { classifySafety, emergencyResponse, enforceSafety } from '@/lib/myortho-chat/safety';

export const runtime = 'nodejs';
export const maxDuration = 30;

function clientKey(request: Request) {
  const installation = request.headers.get('x-myortho-installation-id')?.trim().slice(0, 100);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip') || 'unknown';
  return `${installation || 'no-installation'}:${ip}`;
}

function validateSourceContract(parsed: MyOrthoChatResponse, allowedSourceIDs: Set<string>): MyOrthoChatResponse {
  const sources = parsed.sources.flatMap((citation) => {
    if (!allowedSourceIDs.has(citation.sourceId)) return [];
    const approved = sourceById(citation.sourceId);
    return approved ? [{ sourceId: approved.sourceId, title: approved.title, publisher: approved.publisher, url: approved.url }] : [];
  });
  const allowedArticleIDs = new Set(sources.flatMap((citation) => sourceById(citation.sourceId)?.articleIds ?? []));
  return { ...parsed, sources, relatedArticles: parsed.relatedArticles.filter((article) => allowedArticleIDs.has(article.id)) };
}

export async function POST(request: Request) {
  const rateLimit = checkMyOrthoRateLimit(clientKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Please wait a moment before asking another question.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  const input = MyOrthoChatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Please enter a shorter question and try again.' },
      { status: 400 }
    );
  }

  const detectedSafety = classifySafety(input.data.message);
  if (detectedSafety === 'emergency') {
    return NextResponse.json(emergencyResponse(), { headers: { 'Cache-Control': 'no-store' } });
  }

  const retrievalQuery = [...input.data.history.slice(-4).map((turn) => turn.content), input.data.message].join(' ');
  const sources = retrieveMyOrthoSources(retrievalQuery);
  const prompt = buildMyOrthoPrompt(input.data, sources);

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: MYORTHO_CHAT_MODEL,
      messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
      response_format: zodResponseFormat(MyOrthoChatResponseSchema, 'myortho_patient_answer_v1'),
    });
    const raw = completion.choices[0]?.message.content;
    if (!raw) throw new Error('Model returned an empty response');
    const parsed = validateSourceContract(
      MyOrthoChatResponseSchema.parse(JSON.parse(raw)),
      new Set(sources.map((source) => source.sourceId))
    );
    return NextResponse.json(enforceSafety(parsed, detectedSafety), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[MYORTHO-CHAT-GENERATION]', { message: error instanceof Error ? error.message : 'Unknown generation error' });
    return NextResponse.json(
      { error: 'generation_failed', message: 'MyOrtho Guide is unavailable right now. Please try again shortly.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
