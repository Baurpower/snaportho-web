import {
  OrthobulletsTopicTutorResponseSchema,
  type OrthobulletsTopicTutorResponse,
} from './topic-tutor-types';

export class TopicTutorParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TopicTutorParseError';
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
    throw new TopicTutorParseError('BroBot topic tutor response did not contain JSON.');
  }
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new TopicTutorParseError('BroBot topic tutor response was not valid JSON.');
  }
}

export function parseTopicTutorResponse(input: {
  raw: string;
  responseId: string;
  remainingToday: number | null;
  dailyCap: number | null;
  unlimited: boolean;
}): OrthobulletsTopicTutorResponse {
  const parsed = parseJsonObject(input.raw);

  try {
    return OrthobulletsTopicTutorResponseSchema.parse({
      ...parsed,
      responseId: input.responseId,
      usage: {
        remainingToday: input.remainingToday,
        dailyCap: input.dailyCap,
        unlimited: input.unlimited,
      },
    });
  } catch {
    throw new TopicTutorParseError('BroBot topic tutor response did not match the expected shape.');
  }
}
