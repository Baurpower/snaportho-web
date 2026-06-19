import { loadVerifiedReadingResources } from './repository';
import { rankReadingResources } from './ranker';
import {
  BroBotReadingContextSchema,
  type BroBotReadingContext,
  type BroBotReadingRecommendation,
} from './types';

type ReadingRepository = {
  loadVerifiedReadingResources: typeof loadVerifiedReadingResources;
};

const defaultRepository: ReadingRepository = {
  loadVerifiedReadingResources,
};

export async function getReadingRecommendations(params: {
  supabase: Parameters<typeof loadVerifiedReadingResources>[0]['supabase'];
  context: BroBotReadingContext;
  repository?: ReadingRepository;
  max?: number;
}): Promise<BroBotReadingRecommendation[]> {
  const context = BroBotReadingContextSchema.parse(params.context);
  const repository = params.repository ?? defaultRepository;
  const resources = await repository.loadVerifiedReadingResources({
    supabase: params.supabase,
    context,
    limit: 100,
  });

  return rankReadingResources(resources, context, params.max ?? 5);
}

export function deriveReadingContextFromStructuredMessage(input: {
  structuredJson: unknown;
  fallbackMode?: string | null;
  fallbackTrainingLevel?: string | null;
}): BroBotReadingContext {
  const topicStopwords = new Set([
    'mode',
    'oite',
    'or_prep',
    'consult',
    'clinic',
    'research',
    'general',
    'concept',
    'procedure',
    'complication',
  ]);
  const record =
    input.structuredJson && typeof input.structuredJson === 'object'
      ? (input.structuredJson as Record<string, unknown>)
      : {};
  const tags = Array.isArray(record.tags)
    ? record.tags
        .flatMap((tag) => {
          const raw = String(tag).toLowerCase();
          const parts = raw.split(':').map((part) => part.trim()).filter(Boolean);
          return [raw, ...parts];
        })
        .filter(Boolean)
    : [];
  const goal = typeof record.goal === 'string' ? record.goal : '';
  const selectedFocus = typeof record.selectedFocus === 'string' ? record.selectedFocus : '';
  const topicFromTags = tags
    .map((tag) => tag.split(':').slice(1).join(':') || tag)
    .find((tag) => tag && !topicStopwords.has(tag) && !tag.startsWith('mode'));
  const mode =
    typeof record.detectedMode === 'string'
      ? record.detectedMode
      : input.fallbackMode || 'general';

  return BroBotReadingContextSchema.parse({
    mode: mode === 'fracture_call' || mode === 'auto' ? 'general' : mode,
    trainingLevel: input.fallbackTrainingLevel || 'pgy2',
    topic: topicFromTags || selectedFocus || goal || undefined,
    procedureCategory:
      tags
        .find((tag) => tag.startsWith('procedure:') || tag.startsWith('consult:'))
        ?.split(':')
        .slice(1)
        .join(':') || undefined,
    subintent:
      tags
        .find((tag) => tag.startsWith('concept:') || tag.startsWith('complication:'))
        ?.split(':')
        .slice(1)
        .join(':') || undefined,
    tags,
  });
}
