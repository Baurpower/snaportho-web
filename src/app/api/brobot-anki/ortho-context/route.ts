import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  authenticateBroBotAnkiRequest,
  optionalStringArraySchema,
  optionalTrimmedStringSchema,
  parseJsonBody,
} from '../_lib';

const orthoContextRequestSchema = z.object({
  note_id: optionalTrimmedStringSchema,
  card_id: optionalTrimmedStringSchema,
  deck: optionalTrimmedStringSchema,
  front: z.string().trim().min(1, 'front is required.'),
  back: optionalTrimmedStringSchema,
  tags: optionalStringArraySchema,
  mode: z.enum(['fast', 'enhanced']).optional(),
});

type OrthoContextRequest = {
  note_id?: string;
  card_id?: string;
  deck?: string;
  front: string;
  back?: string;
  tags: string[];
  mode: 'fast' | 'enhanced';
};

const DEFAULT_CASEPREP_INTERNAL_BASE_URL = 'https://api.snap-ortho.com';
const DEFAULT_FAST_TIMEOUT_MS = 30_000;
const DEFAULT_ENHANCED_TIMEOUT_MS = 30_000;

function resolveCaseprepBaseUrl(): string {
  const configured = process.env.CASEPREP_INTERNAL_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEFAULT_CASEPREP_INTERNAL_BASE_URL;
  }

  throw new Error(
    'CASEPREP_INTERNAL_BASE_URL is required in production for brobot-anki ortho-context.',
  );
}

function resolveTimeoutMs(mode: 'fast' | 'enhanced'): number {
  const configured = process.env.ANKI_ORTHO_CONTEXT_PROXY_TIMEOUT_MS?.trim();
  const fallback =
    mode === 'enhanced' ? DEFAULT_ENHANCED_TIMEOUT_MS : DEFAULT_FAST_TIMEOUT_MS;

  if (!configured) {
    return fallback;
  }

  const parsed = Number.parseInt(configured, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePayload(
  parsed: z.infer<typeof orthoContextRequestSchema>,
): OrthoContextRequest {
  return {
    note_id: parsed.note_id ?? undefined,
    card_id: parsed.card_id ?? undefined,
    deck: parsed.deck ?? undefined,
    front: parsed.front.trim(),
    back: parsed.back ?? undefined,
    tags: parsed.tags ?? [],
    mode: parsed.mode ?? 'fast',
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readUpstreamError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const payload: unknown = await response.json();

      if (isObject(payload) && typeof payload.error === 'string') {
        return payload.error;
      }

      if (isObject(payload) && typeof payload.message === 'string') {
        return payload.message;
      }
    } catch {
      return 'Caseprep ortho-context request failed.';
    }
  }

  try {
    const text = await response.text();
    const trimmed = text.trim();

    if (trimmed) {
      return trimmed.slice(0, 300);
    }
  } catch {
    return 'Caseprep ortho-context request failed.';
  }

  return 'Caseprep ortho-context request failed.';
}

export async function POST(request: Request) {
  const routeStartedAt = Date.now();

  try {
    const auth = await authenticateBroBotAnkiRequest(request);

    if ('response' in auth) {
      return auth.response;
    }

    const parsedBody = await parseJsonBody(request, orthoContextRequestSchema);

    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const payload = normalizePayload(parsedBody.data);
    const timeoutMs = resolveTimeoutMs(payload.mode);
    const caseprepBaseUrl = resolveCaseprepBaseUrl();
    const endpoint = `${caseprepBaseUrl}/anki/ortho-context`;

    console.log('[brobot-anki/ortho-context] start', {
      mode: payload.mode,
      timeoutMs,
      caseprepBaseUrl,
      hasDeck: Boolean(payload.deck),
      tagCount: payload.tags.length,
    });

    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => {
      abortController.abort();
    }, timeoutMs);

    try {
      const upstreamStartedAt = Date.now();
      const upstreamResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
        cache: 'no-store',
      });
      const upstreamElapsedMs = Date.now() - upstreamStartedAt;

      console.log('[brobot-anki/ortho-context] caseprep response', {
        mode: payload.mode,
        status: upstreamResponse.status,
        elapsedMs: upstreamElapsedMs,
      });

      if (!upstreamResponse.ok) {
        const errorMessage = await readUpstreamError(upstreamResponse);
        const status =
          upstreamResponse.status >= 500 ? 502 : upstreamResponse.status;

        console.error('[brobot-anki/ortho-context] caseprep error', {
          mode: payload.mode,
          status: upstreamResponse.status,
          mappedStatus: status,
        });

        return NextResponse.json({ error: errorMessage }, { status });
      }

      let upstreamJson: unknown;

      try {
        upstreamJson = await upstreamResponse.json();
      } catch {
        console.error(
          '[brobot-anki/ortho-context] invalid JSON from caseprep response',
          {
            mode: payload.mode,
          },
        );

        return NextResponse.json(
          { error: 'Caseprep ortho-context returned invalid JSON.' },
          { status: 502 },
        );
      }

      console.log('[brobot-anki/ortho-context] complete', {
        mode: payload.mode,
        totalElapsedMs: Date.now() - routeStartedAt,
      });

      // Preserve the upstream caseprep payload verbatim so new fields like
      // `card_level`, flat `related_pimp_questions`, `question_count`, and
      // `formatter` flow through without route-specific reshaping.
      // TODO: Add a cache layer here if we establish a shared backend caching pattern.
      return NextResponse.json(upstreamJson);
    } catch (error: unknown) {
      if (isAbortError(error)) {
        console.error('[brobot-anki/ortho-context] caseprep timeout', {
          mode: payload.mode,
          timeoutMs,
        });

        return NextResponse.json(
          { error: 'Caseprep ortho-context request timed out.' },
          { status: 504 },
        );
      }

      console.error('[brobot-anki/ortho-context] caseprep unavailable', {
        mode: payload.mode,
        error:
          error instanceof Error ? error.message : 'Unknown upstream fetch error',
      });

      return NextResponse.json(
        { error: 'Caseprep ortho-context service is unavailable.' },
        { status: 502 },
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes('CASEPREP_INTERNAL_BASE_URL is required')
    ) {
      console.error('[brobot-anki/ortho-context] configuration error', {
        message: error.message,
      });

      return NextResponse.json(
        {
          error:
            'Caseprep ortho-context is not configured on this deployment.',
        },
        { status: 500 },
      );
    }

    throw error;
  } finally {
    console.log('[brobot-anki/ortho-context] route finished', {
      totalElapsedMs: Date.now() - routeStartedAt,
    });
  }
}
