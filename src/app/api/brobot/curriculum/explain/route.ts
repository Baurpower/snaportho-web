import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import { authenticateDeviceLinkedRequest } from '@/lib/brobot/device-link';
import { getBroBotAccessGate } from '@/lib/brobot/brobot-entitlement-access';
import { type Subject } from '@/lib/brobot/entitlements';
import { getAnswerModelForRoute } from '@/lib/brobot/model-config';
import { getOpenAI } from '@/lib/brobot/openai-client';
import { buildCurriculumExplainMessages } from '@/lib/brobot/orthobullets/curriculum-prompt-builder';
import {
  CurriculumParseError,
  parseCurriculumStudyResponse,
} from '@/lib/brobot/orthobullets/curriculum-response-parser';
import { resolveOrthobulletsContext } from '@/lib/brobot/orthobullets/context-resolver';
import {
  CurriculumExplainRequestSchema,
  type CurriculumExplainRequest,
  type OrthobulletsPageContext,
} from '@/lib/brobot/orthobullets/types';
import { recordSuccessfulAIUse, recordUsageEvent } from '@/lib/brobot/usage';
import { BROBOT_CONFIG } from '@/lib/config/brobot';

const EXTENSION_TOKEN_HEADER = 'x-snaportho-extension-token';

function hashText(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 16);
}

function disabledResponse() {
  return NextResponse.json(
    {
      error: 'disabled',
      message: 'BroBot curriculum explanations are currently unavailable.',
    },
    { status: 403 }
  );
}

function limitReachedResponse(dailyCap: number | null) {
  return NextResponse.json(
    {
      error: 'quota_exceeded',
      message: 'Daily BroBot limit reached.',
      dailyCap,
    },
    { status: 429 }
  );
}

function curriculumValidationError(parsedBody: unknown) {
  if (!parsedBody || typeof parsedBody !== 'object') {
    return { error: 'invalid_curriculum_request', message: 'Invalid curriculum explain request.' };
  }
  const body = parsedBody as { provider?: unknown; curriculum?: { sections?: unknown[]; visibleText?: unknown } };
  if (body.provider != null && body.provider !== 'rock' && body.provider !== 'orthobullets') {
    return { error: 'unsupported_provider', message: 'This curriculum provider is not supported.' };
  }
  const sectionCount = Array.isArray(body.curriculum?.sections) ? body.curriculum.sections.length : 0;
  const visibleTextLength = typeof body.curriculum?.visibleText === 'string' ? body.curriculum.visibleText.trim().length : 0;
  if (sectionCount === 0 && visibleTextLength === 0) {
    return { error: 'curriculum_content_missing', message: 'No readable curriculum content was provided.' };
  }
  if (JSON.stringify(parsedBody).length > 70000) {
    return { error: 'curriculum_content_too_large', message: 'Curriculum content is too large to explain in one request.' };
  }
  return { error: 'invalid_curriculum_request', message: 'Invalid curriculum explain request.' };
}

function buildCurriculumPageContext(request: CurriculumExplainRequest): OrthobulletsPageContext {
  const sectionHeadings = request.curriculum.sections
    .map((section) => section.heading?.trim())
    .filter((heading): heading is string => Boolean(heading));
  const contentSections = request.curriculum.sections.map((section) => ({
    heading: section.heading?.trim() || request.curriculum.title,
    text: section.text.trim(),
  }));
  const tableMarkdown = (request.curriculum.tables ?? []).map((table) => {
    const caption = table.caption ? `${table.caption}\n` : '';
    const headers = table.headers?.length ? `${table.headers.join(' | ')}\n` : '';
    const rows = table.rows.map((row) => row.join(' | ')).join('\n');
    return `${caption}${headers}${rows}`.trim();
  }).filter(Boolean);
  const contentText =
    request.curriculum.visibleText?.trim() ||
    contentSections.map((section) => `${section.heading}\n${section.text}`).join('\n\n');

  return {
    ...request.pageContext,
    source: request.provider,
    provider: request.provider,
    mode: 'curriculum_content',
    pageUrl: request.pageContext.pageUrl || request.sourceUrl,
    sourceUrl: request.sourceUrl,
    pageKind: request.pageContext.pageKind || 'curriculum_content',
    title: request.curriculum.title,
    breadcrumbs: request.curriculum.breadcrumbs ?? [],
    authors: request.curriculum.authors ?? [],
    date: request.curriculum.date,
    sectionHeadings,
    contentText,
    contentMarkdown: request.pageContext.contentMarkdown ?? contentText,
    contentSections,
    tablesMarkdown: tableMarkdown,
    tablesCount: request.curriculum.tables?.length ?? request.pageContext.tablesCount ?? 0,
    images: request.curriculum.images?.map((image) => ({
      src: image.src,
      alt: image.alt,
      caption: image.caption,
    })) ?? request.pageContext.images,
    answerChoices: [],
    percentDistribution: [],
    linkedConcepts: request.pageContext.linkedConcepts ?? [],
    extractionWarnings: request.pageContext.extractionWarnings ?? [],
  };
}

export async function POST(request: Request) {
  if (!BROBOT_CONFIG.ENABLED || !BROBOT_CONFIG.ORTHOBULLETS_ENABLED) {
    return disabledResponse();
  }

  const auth = await authenticateDeviceLinkedRequest(request, {
    deviceTokenHeader: EXTENSION_TOKEN_HEADER,
    allowBearerToken: false,
    allowBrowserSession: false,
  });

  if ('response' in auth) {
    return auth.response;
  }

  const parsedBody = await request.json().catch(() => null);
  const parsed = CurriculumExplainRequestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    const error = curriculumValidationError(parsedBody);
    return NextResponse.json(error, { status: error.error === 'unsupported_provider' ? 400 : 400 });
  }

  const subject: Subject = { type: 'user', id: auth.userId };
  const gate = await getBroBotAccessGate(subject);
  const entitlement = gate.normalized.data;

  if (gate.source === 'disabled') {
    return disabledResponse();
  }

  if (gate.isLimitReached) {
    await recordUsageEvent({
      subject,
      outcome: 'limit_hit',
    });
    return limitReachedResponse(gate.dailyCap);
  }

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const pageContext = buildCurriculumPageContext(parsed.data);
  const resolvedContext = resolveOrthobulletsContext({
    pageContext,
    kgLookup: null,
  });
  const contentCharCount = pageContext.contentText?.length ?? 0;

  console.log('[brobot-curriculum] explain_request', {
    requestId,
    userIdPrefix: auth.userId.slice(0, 8),
    requestedTask: parsed.data.task,
    provider: parsed.data.provider,
    pageKind: pageContext.pageKind,
    sourceUrlHash: hashText(parsed.data.sourceUrl),
    titleHash: hashText(pageContext.title),
    curriculumSectionCount: pageContext.contentSections?.length ?? 0,
    curriculumContentCharCount: contentCharCount,
    imageCount: pageContext.images.length,
    tableCount: pageContext.tablesCount ?? 0,
    warningCount: resolvedContext.warnings.length,
  });

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: getAnswerModelForRoute({
        mode: 'oite',
        ambiguity: 'low',
        responseDepth: 'standard',
        subintent: 'oite_traps',
      }),
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: buildCurriculumExplainMessages({
        context: resolvedContext,
        emphasis: parsed.data.emphasis,
      }),
    });

    const latencyMs = Date.now() - startedAt;
    const usedAfter = await recordSuccessfulAIUse(subject, latencyMs);
    const remainingToday =
      entitlement.aiAccess.dailyCap != null
        ? Math.max(0, entitlement.aiAccess.dailyCap - usedAfter)
        : null;

    const response = parseCurriculumStudyResponse({
      raw: completion.choices[0]?.message?.content ?? '',
      explanationId: crypto.randomUUID(),
      emphasis: parsed.data.emphasis,
      remainingToday,
      dailyCap: entitlement.aiAccess.dailyCap,
      unlimited: entitlement.aiAccess.unlimited,
    });

    console.log('[brobot-curriculum] explain_success', {
      requestId,
      userIdPrefix: auth.userId.slice(0, 8),
      provider: parsed.data.provider,
      latencyMs,
      remainingToday,
    });

    return NextResponse.json(response);
  } catch (error) {
    await recordUsageEvent({
      subject,
      outcome: 'failure',
      latencyMs: Date.now() - startedAt,
    });

    console.error('[brobot-curriculum] explain_failure', {
      requestId,
      userIdPrefix: auth.userId.slice(0, 8),
      provider: parsed.data.provider,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof CurriculumParseError) {
      return NextResponse.json(
        { error: 'parse_failure', message: "BroBot's curriculum response could not be parsed. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'api_failure', message: 'BroBot could not generate a curriculum explanation.' },
      { status: 500 }
    );
  }
}
