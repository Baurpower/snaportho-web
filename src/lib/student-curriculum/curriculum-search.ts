import {
  CURRICULUM_TOPICS,
  CURRICULUM_TRACK_BY_ID,
} from '@/lib/student-curriculum/curriculum-data';
import type {
  CurriculumSearchMatchedField,
  CurriculumSearchOptions,
  CurriculumSearchReasonLabel,
  CurriculumSearchResult,
  CurriculumTopic,
} from '@/lib/student-curriculum/curriculum-types';

type MatchSignal = {
  score: number;
  field: CurriculumSearchMatchedField;
  reasonLabel: CurriculumSearchReasonLabel;
};

function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (token.endsWith('ies') && token.length > 3) {
        return `${token.slice(0, -3)}y`;
      }

      if (
        /(xes|zes|ches|shes|sses)$/.test(token) &&
        token.length > 4
      ) {
        return token.slice(0, -2);
      }

      if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
        return token.slice(0, -1);
      }

      return token;
    })
    .join(' ');
}

function compactSearchValue(value: string): string {
  return value.replace(/\s+/g, '');
}

function buildTextVariants(value: string): Set<string> {
  const normalized = normalizeSearchValue(value);
  const variants = new Set<string>();
  if (!normalized) {
    return variants;
  }

  variants.add(normalized);
  variants.add(compactSearchValue(normalized));
  return variants;
}

function getBestMatchSignal(
  queryVariants: Set<string>,
  candidates: string[],
  exactScore: number,
  startsWithScore: number,
  includesScore: number,
  field: CurriculumSearchMatchedField,
  reasonLabel: CurriculumSearchReasonLabel
): MatchSignal | null {
  let bestSignal: MatchSignal | null = null;

  for (const candidate of candidates) {
    const candidateVariants = buildTextVariants(candidate);
    for (const candidateVariant of candidateVariants) {
      for (const queryVariant of queryVariants) {
        let nextScore = 0;

        if (candidateVariant === queryVariant) {
          nextScore = exactScore;
        } else if (candidateVariant.startsWith(queryVariant)) {
          nextScore = startsWithScore;
        } else if (candidateVariant.includes(queryVariant)) {
          nextScore = includesScore;
        }

        if (
          nextScore > 0 &&
          (!bestSignal || nextScore > bestSignal.score)
        ) {
          bestSignal = {
            score: nextScore,
            field,
            reasonLabel,
          };
        }
      }
    }
  }

  return bestSignal;
}

function scoreTopic(
  topic: CurriculumTopic,
  queryVariants: Set<string>
): CurriculumSearchResult | null {
  const track = CURRICULUM_TRACK_BY_ID[topic.trackId];
  if (!track) {
    return null;
  }

  const matchedFields = new Set<CurriculumSearchMatchedField>();
  let score = 0;
  let primarySignal: MatchSignal | null = null;

  const signals = [
    getBestMatchSignal(queryVariants, [topic.title], 160, 120, 90, 'title', 'Title match'),
    getBestMatchSignal(queryVariants, topic.aliases, 145, 110, 80, 'alias', 'Alias match'),
    getBestMatchSignal(
      queryVariants,
      topic.commonCases.flatMap((curriculumCase) => [
        curriculumCase.name,
        curriculumCase.scenario,
      ]),
      70,
      60,
      50,
      'common-case',
      'Common case match'
    ),
    getBestMatchSignal(queryVariants, topic.tags, 55, 45, 38, 'tag', 'Tag match'),
    getBestMatchSignal(
      queryVariants,
      topic.learningObjectives.map((objective) => objective.objective),
      42,
      34,
      28,
      'learning-objective',
      'Learning objective match'
    ),
    getBestMatchSignal(queryVariants, [track.title], 30, 26, 22, 'track', 'Track match'),
    getBestMatchSignal(
      queryVariants,
      [topic.subspecialty],
      24,
      20,
      16,
      'subspecialty',
      'Subspecialty match'
    ),
  ];

  for (const signal of signals) {
    if (!signal) {
      continue;
    }

    score += signal.score;
    matchedFields.add(signal.field);
    if (!primarySignal || signal.score > primarySignal.score) {
      primarySignal = signal;
    }
  }

  if (!primarySignal) {
    return null;
  }

  return {
    topic,
    track,
    score,
    matchedFields: Array.from(matchedFields),
    reasonLabel: primarySignal.reasonLabel,
  };
}

export function searchCurriculumTopics(
  query: string,
  options: CurriculumSearchOptions = {}
): CurriculumSearchResult[] {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return [];
  }

  const queryVariants = buildTextVariants(normalizedQuery);
  const limit = options.limit ?? 10;
  const pool = options.trackId
    ? CURRICULUM_TOPICS.filter((topic) => topic.trackId === options.trackId)
    : CURRICULUM_TOPICS;

  return pool
    .map((topic) => scoreTopic(topic, queryVariants))
    .filter((result): result is CurriculumSearchResult => result !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.reasonLabel !== right.reasonLabel) {
        return left.reasonLabel.localeCompare(right.reasonLabel);
      }

      if (left.track.title !== right.track.title) {
        return left.track.title.localeCompare(right.track.title);
      }

      if (left.topic.title !== right.topic.title) {
        return left.topic.title.localeCompare(right.topic.title);
      }

      return left.topic.id.localeCompare(right.topic.id);
    })
    .slice(0, limit);
}
