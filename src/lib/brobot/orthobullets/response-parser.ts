import { OrthobulletsExplainResponseSchema, type OrthobulletsExplainResponse } from './types';

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

export function parseOrthobulletsExplainResponse(input: {
  raw: string;
  explanationId: string;
  remainingToday: number | null;
  dailyCap: number | null;
  unlimited: boolean;
}): OrthobulletsExplainResponse {
  const json = extractJsonObject(input.raw);
  if (!json) {
    throw new OrthobulletsParseError('BroBot orthobullets response did not contain JSON.');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new OrthobulletsParseError('BroBot orthobullets response was not valid JSON.');
  }

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
