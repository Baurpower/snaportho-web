import {
  OrthobulletsChatResponseSchema,
  OrthobulletsExplainResponseSchema,
  OrthobulletsHintResponseSchema,
  type OrthobulletsChatResponse,
  type OrthobulletsExplainResponse,
  type OrthobulletsHintResponse,
} from './types';

export class OrthobulletsParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrthobulletsParseError';
  }
}

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first === -1 || last === -1 || first >= last) return null;
  return trimmed.slice(first, last + 1);
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const json = extractJsonObject(raw);
  if (!json) {
    throw new OrthobulletsParseError('BroBot orthobullets response did not contain JSON.');
  }

  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new OrthobulletsParseError('BroBot orthobullets response was not valid JSON.');
  }
}

export function parseOrthobulletsExplainResponse(input: {
  raw: string;
  explanationId: string;
  remainingToday: number | null;
  dailyCap: number | null;
  unlimited: boolean;
}): OrthobulletsExplainResponse {
  const parsed = parseJsonObject(input.raw);

  try {
    return OrthobulletsExplainResponseSchema.parse({
      ...parsed,
      explanationId: input.explanationId,
      usage: {
        remainingToday: input.remainingToday,
        dailyCap: input.dailyCap,
        unlimited: input.unlimited,
      },
    });
  } catch {
    throw new OrthobulletsParseError('BroBot orthobullets response did not match the expected shape.');
  }
}

export function parseOrthobulletsChatResponse(input: {
  raw: string;
  responseId: string;
  remainingToday: number | null;
  dailyCap: number | null;
  unlimited: boolean;
}): OrthobulletsChatResponse {
  const parsed = parseJsonObject(input.raw);

  try {
    return OrthobulletsChatResponseSchema.parse({
      ...parsed,
      responseId: input.responseId,
      usage: {
        remainingToday: input.remainingToday,
        dailyCap: input.dailyCap,
        unlimited: input.unlimited,
      },
    });
  } catch {
    throw new OrthobulletsParseError('BroBot orthobullets chat response did not match the expected shape.');
  }
}

export function parseOrthobulletsHintResponse(input: {
  raw: string;
  hintId: string;
  hintLevel: 1 | 2 | 3;
  remainingToday: number | null;
  dailyCap: number | null;
  unlimited: boolean;
}): OrthobulletsHintResponse {
  const parsed = parseJsonObject(input.raw);
  const nextActionLabel =
    input.hintLevel === 1 ? 'Next Hint' : input.hintLevel === 2 ? 'Final Hint' : 'Reveal Reasoning';

  try {
    return OrthobulletsHintResponseSchema.parse({
      ...parsed,
      hintId: input.hintId,
      hintLevel: input.hintLevel,
      avoidRevealingAnswer: true,
      nextActionLabel,
      usage: {
        remainingToday: input.remainingToday,
        dailyCap: input.dailyCap,
        unlimited: input.unlimited,
      },
    });
  } catch {
    throw new OrthobulletsParseError('BroBot orthobullets hint response did not match the expected shape.');
  }
}
