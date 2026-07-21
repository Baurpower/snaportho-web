import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import { authenticateDeviceLinkedRequest } from '@/lib/brobot/device-link';
import { getBroBotAccessGate } from '@/lib/brobot/brobot-entitlement-access';
import { type Subject } from '@/lib/brobot/entitlements';
import { getAnswerModelForRoute } from '@/lib/brobot/model-config';
import { getOpenAI } from '@/lib/brobot/openai-client';
import { buildCurriculumExplainMessages } from '@/lib/brobot/orthobullets/curriculum-prompt-builder';
import {
  chunkLearningPage,
  estimateTokens,
  stableLearningPageHash,
} from '@/lib/brobot/orthobullets/learning-page-chunker';
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

type SafeValidationIssue = {
  path: string;
  code: string;
  message: string;
  expected?: string;
};

function sanitizeValidationIssues(issues: readonly { path: PropertyKey[]; code: string; message: string; expected?: unknown }[]): SafeValidationIssue[] {
  return issues.slice(0, 20).map((issue) => ({
    path: issue.path.map(String).join('.'),
    code: issue.code,
    message: issue.message,
    expected: issue.expected == null ? undefined : String(issue.expected),
  }));
}

function summarizeCurriculumRequest(value: unknown) {
  if (!value || typeof value !== 'object') return { receivedType: value === null ? 'null' : typeof value };
  const body = value as Record<string, unknown>;
  const curriculum = body.curriculum && typeof body.curriculum === 'object'
    ? body.curriculum as Record<string, unknown>
    : null;
  const pageContext = body.pageContext && typeof body.pageContext === 'object'
    ? body.pageContext as Record<string, unknown>
    : null;
  const sections = Array.isArray(curriculum?.sections) ? curriculum.sections : [];
  const firstSection = sections[0] && typeof sections[0] === 'object' ? sections[0] as Record<string, unknown> : null;
  const stringSize = (input: unknown) => typeof input === 'string' ? input.length : null;
  return {
    topLevelKeys: Object.keys(body).sort(),
    task: typeof body.task === 'string' ? body.task : typeof body.task,
    provider: typeof body.provider === 'string' ? body.provider : typeof body.provider,
    sourceUrlType: typeof body.sourceUrl,
    pageContextKeys: pageContext ? Object.keys(pageContext).sort() : [],
    pageMode: pageContext?.mode,
    pageKind: pageContext?.pageKind,
    pageContentTextCharacters: stringSize(pageContext?.contentText),
    pageContentMarkdownCharacters: stringSize(pageContext?.contentMarkdown),
    pageContentSectionCount: Array.isArray(pageContext?.contentSections) ? pageContext.contentSections.length : null,
    curriculumKeys: curriculum ? Object.keys(curriculum).sort() : [],
    curriculumSectionCount: sections.length,
    firstSectionKeys: firstSection ? Object.keys(firstSection).sort() : [],
    firstSectionHeadingType: typeof firstSection?.heading,
    firstSectionTextCharacters: stringSize(firstSection?.text),
    visibleTextCharacters: stringSize(curriculum?.visibleText),
    serializedCharacters: JSON.stringify(value).length,
  };
}

function curriculumValidationError(parsedBody: unknown, issues: SafeValidationIssue[] = []) {
  if (!parsedBody || typeof parsedBody !== 'object') {
    return { error: 'invalid_request_shape', message: 'The curriculum request format was not recognized.', issues };
  }
  const body = parsedBody as { provider?: unknown; curriculum?: { sections?: unknown[]; visibleText?: unknown } };
  if (body.provider != null && body.provider !== 'rock' && body.provider !== 'orthobullets') {
    return { error: 'unsupported_provider', message: 'This curriculum provider is not supported.', issues };
  }
  const sectionCount = Array.isArray(body.curriculum?.sections) ? body.curriculum.sections.length : 0;
  const visibleTextLength = typeof body.curriculum?.visibleText === 'string' ? body.curriculum.visibleText.trim().length : 0;
  if (sectionCount === 0 && visibleTextLength === 0) {
    return { error: 'missing_sections', message: 'No readable curriculum sections were provided.', issues };
  }
  if (JSON.stringify(parsedBody).length > 500000) {
    return { error: 'document_too_large', message: 'BroBot prepared the major sections first. Choose a remaining section to continue.', issues };
  }
  return { error: 'invalid_request_shape', message: 'The extension and server curriculum formats do not match.', issues };
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
    const issues = sanitizeValidationIssues(parsed.error.issues);
    const error = curriculumValidationError(parsedBody, issues);
    console.warn('[brobot-curriculum] request_validation_failed', {
      errorCode: error.error,
      issues,
      bodySummary: summarizeCurriculumRequest(parsedBody),
    });
    return NextResponse.json(
      process.env.NODE_ENV === 'production' ? { error: error.error, message: error.message } : error,
      { status: 400 }
    );
  }
  if (!parsedBody || typeof parsedBody !== 'object' || !('contractVersion' in parsedBody)) {
    console.warn('[brobot-curriculum] legacy_contract_accepted', {
      normalizedTo: 'curriculum-explain-v2',
      sourceUrlHash: hashText(parsed.data.sourceUrl),
    });
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
  const pageId = stableLearningPageHash(`${parsed.data.sourceUrl}|${pageContext.title ?? ''}`).slice(0, 20);
  const contentHash = stableLearningPageHash(parsed.data.curriculum.sections
    .map((section) => `${section.id ?? ''}|${section.heading ?? ''}|${section.text}`)
    .join('\n'));
  const chunks = chunkLearningPage({
    pageId,
    title: pageContext.title ?? 'Curriculum page',
    sections: parsed.data.curriculum.sections.length
      ? parsed.data.curriculum.sections
      : [{ id: 'visible-text', heading: pageContext.title ?? 'Visible content', level: 1, text: parsed.data.curriculum.visibleText ?? '' }],
  });

  console.log('[brobot-curriculum] explain_request', {
    requestId,
    userIdPrefix: auth.userId.slice(0, 8),
    requestedTask: parsed.data.task,
    provider: parsed.data.provider,
    pageKind: pageContext.pageKind,
    sourceUrlHash: hashText(parsed.data.sourceUrl),
    contentHashPrefix: contentHash.slice(0, 12),
    titleHash: hashText(pageContext.title),
    curriculumSectionCount: pageContext.contentSections?.length ?? 0,
    curriculumContentCharCount: contentCharCount,
    estimatedTokens: estimateTokens(pageContext.contentText ?? ''),
    chunkCount: chunks.length,
    imageCount: pageContext.images.length,
    tableCount: pageContext.tablesCount ?? 0,
    warningCount: resolvedContext.warnings.length,
  });

  try {
    const model = getAnswerModelForRoute({
        mode: 'oite',
        ambiguity: 'low',
        responseDepth: 'standard',
        subintent: 'oite_traps',
    });
    const chunkResults: Array<{ chunkId: string; sectionIds: string[]; result: unknown } | null> = new Array(chunks.length).fill(null);
    let nextChunk = 0;
    const worker = async () => {
      while (nextChunk < chunks.length) {
        const index = nextChunk++;
        const chunk = chunks[index];
        const chunkContext = resolveOrthobulletsContext({
          pageContext: {
            ...pageContext,
            contentText: chunk.content,
            contentMarkdown: chunk.content,
            contentSections: [{ heading: chunk.headingPath.join(' > ') || pageContext.title || 'Section', text: chunk.content }],
            sectionHeadings: chunk.headingPath,
          },
          kgLookup: null,
        });
        try {
          const completion = await getOpenAI().chat.completions.create({
            model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: buildCurriculumExplainMessages({ context: chunkContext, emphasis: parsed.data.emphasis }),
          });
          chunkResults[index] = {
            chunkId: chunk.chunkId,
            sectionIds: chunk.sectionIds,
            result: JSON.parse(completion.choices[0]?.message?.content ?? '{}'),
          };
        } catch (chunkError) {
          console.warn('[brobot-curriculum] chunk_failure', {
            requestId,
            chunkId: chunk.chunkId,
            sequence: chunk.sequence,
            error: chunkError instanceof Error ? chunkError.message : 'Unknown error',
          });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, chunks.length) }, () => worker()));
    const successfulChunks = chunkResults.filter((value): value is NonNullable<typeof value> => value != null);
    if (!successfulChunks.length) throw new Error('All curriculum chunks failed.');

    const synthesis = await getOpenAI().chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are BroBot, an orthopaedic teaching attending. Synthesize the supplied per-chunk JSON notes into one coherent page study response. Return JSON only with exactly these keys: oneSentenceTakeaway, inThirtySeconds, mustKnow, clinicalPearls, commonMistakes, attendingQuestions, testableFacts, suggestedFollowUps, warnings. Preserve supported clinical details, numbers, approaches, complications, and limitations; remove duplicates; never add facts absent from the chunk notes. Keep the result concise for a narrow side panel.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            title: pageContext.title,
            emphasis: parsed.data.emphasis,
            totalChunks: chunks.length,
            successfulChunks: successfulChunks.length,
            failedSectionIds: chunks.filter((_, index) => !chunkResults[index]).flatMap((chunk) => chunk.sectionIds),
            chunkNotes: successfulChunks,
          }),
        },
      ],
    });

    const latencyMs = Date.now() - startedAt;
    const usedAfter = await recordSuccessfulAIUse(subject, latencyMs);
    const remainingToday =
      entitlement.aiAccess.dailyCap != null
        ? Math.max(0, entitlement.aiAccess.dailyCap - usedAfter)
        : null;

    const response = parseCurriculumStudyResponse({
      raw: synthesis.choices[0]?.message?.content ?? '',
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
      chunkCount: chunks.length,
      successfulChunks: successfulChunks.length,
      coveragePercent: Math.round((successfulChunks.length / chunks.length) * 100),
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
