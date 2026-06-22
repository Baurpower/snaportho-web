import {
  BROBOT_CHAT_MODES,
  BroBotChatOutputSchema,
  type BroBotChatMode,
  type BroBotChatOutput,
  type BroBotBranchOption,
} from './types';
import { getModeBranchOptions } from './intent-expander';
import { normalizeResearchSubmode } from '@/lib/brobot/research/types';

const MODE_SET = new Set<string>(BROBOT_CHAT_MODES);

type ParseOptions = {
  fallbackAnswer?: string;
  fallbackMode?: BroBotChatMode;
};

const STRUCTURE_FALLBACK =
  'BroBot generated a response, but it could not be structured cleanly. Please try again or rephrase your question.';
const ROUTE_STRUCTURE_FALLBACK =
  'BroBot could not format a structured response. Please try again.';

const OR_PREP_VAGUE_CONCEPTS = [
  'anatomy familiarity',
  'complications awareness',
  'post-op care',
  'postop care',
  'diagnostic techniques',
  'know the anatomy',
  'understand the procedure',
];

const FILLER_INTROS = [
  /^certainly[,.!\s-]*/i,
  /^sure[,.!\s-]*/i,
  /^here(?:'|’)s a concise overview[:\s-]*/i,
  /^here is a concise overview[:\s-]*/i,
  /^here(?:'|’)s a high-yield overview[:\s-]*/i,
  /^here are the key points[:\s-]*/i,
  /^here are the high-yield points[:\s-]*/i,
  /^this is a high-yield topic[:\s-]*/i,
];

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const unfenced = stripCodeFence(trimmed);

  if (unfenced.startsWith('{') && unfenced.endsWith('}')) {
    return unfenced;
  }

  const first = unfenced.indexOf('{');
  const last = unfenced.lastIndexOf('}');
  if (first === -1 || last === -1 || first >= last) {
    return null;
  }

  return unfenced.slice(first, last + 1);
}

function stripCodeFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json|markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseRaw(raw: unknown): Record<string, unknown> | null {
  if (raw !== null && typeof raw === 'object') {
    return record(raw);
  }

  if (typeof raw !== 'string') {
    return null;
  }

  const json = extractJsonObject(raw);
  if (!json) {
    return null;
  }

  try {
    return record(JSON.parse(json));
  } catch {
    return null;
  }
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? stripCodeFence(value).trim() : '';
}

function stripArrayMarkdown(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function isFallbackAnswer(value: string): boolean {
  const normalized = normalizeForDedupe(value);
  return (
    normalized === normalizeForDedupe(STRUCTURE_FALLBACK) ||
    normalized === normalizeForDedupe(ROUTE_STRUCTURE_FALLBACK)
  );
}

function stripFillerIntro(value: string): string {
  let cleaned = value.trim();

  for (const intro of FILLER_INTROS) {
    cleaned = cleaned.replace(intro, '').trim();
  }

  return cleaned;
}

function softCapAnswer(value: string, maxLength = 1200): string {
  if (value.length <= maxLength + 200) return value;

  const candidate = value.slice(0, maxLength);
  const breakpoints = [
    candidate.lastIndexOf('\n- '),
    candidate.lastIndexOf('\n* '),
    candidate.lastIndexOf('\n'),
    candidate.lastIndexOf('. '),
    candidate.lastIndexOf('; '),
  ].filter((index) => index > 700);

  const breakpoint = breakpoints.length ? Math.max(...breakpoints) : maxLength;
  return `${candidate.slice(0, breakpoint).trim()}...`;
}

function normalizeAnswer(value: unknown, fallbackAnswer: string): string {
  const answer = normalizeString(value);
  if (!answer) return fallbackAnswer;
  return softCapAnswer(stripFillerIntro(answer));
}

function normalizeForDedupe(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_#>()[\]{}:;,.!?-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArray(value: unknown, max: number): string[] {
  const array = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value
          .split(/\n|;/)
          .map((item) => item.replace(/^[-*]\s*/, '').trim())
      : [];

  const seen = new Set<string>();

  return array
    .map((item) => normalizeString(item))
    .map((item) => stripFillerIntro(item))
    .map((item) => stripArrayMarkdown(item))
    .map((item) => softCapListItem(item))
    .filter((item) => {
      if (!item) return false;
      const normalized = normalizeForDedupe(item);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, max);
}

function normalizeBranchOptions(value: unknown, mode: BroBotChatMode): BroBotBranchOption[] {
  const raw = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const normalized = raw
    .map((item) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const label = normalizeString(record.label);
      const id =
        normalizeString(record.id) ||
        label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

      return {
        id,
        label,
        description: normalizeString(record.description) || undefined,
        category: normalizeString(record.category) || undefined,
        topicId: normalizeString(record.topicId) || undefined,
        branchQuestionId: normalizeString(record.branchQuestionId) || undefined,
        rankScore:
          typeof record.rankScore === 'number' && Number.isFinite(record.rankScore)
            ? record.rankScore
            : undefined,
      };
    })
    .filter((option) => {
      if (!option.id || !option.label || seen.has(option.id)) return false;
      seen.add(option.id);
      return true;
    })
    .slice(0, 6);

  return normalized.length > 0 ? normalized : getModeBranchOptions(mode).slice(0, 6);
}

function softCapListItem(value: string, maxLength = 220): string {
  if (value.length <= maxLength) return value;
  const candidate = value.slice(0, maxLength);
  const breakpoint = Math.max(
    candidate.lastIndexOf('. '),
    candidate.lastIndexOf('; '),
    candidate.lastIndexOf(', ')
  );
  return `${candidate.slice(0, breakpoint > 90 ? breakpoint : maxLength).trim()}...`;
}

function normalizeConfidence(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return Math.min(1, Math.max(0, numeric));
}

function normalizeMode(value: unknown, fallbackMode: BroBotChatMode): BroBotChatMode {
  const mode = normalizeString(value);
  const fallback = fallbackMode === 'fracture_call' ? 'consult' : fallbackMode;
  if (mode === 'fracture_call') return 'consult';
  return MODE_SET.has(mode) ? (mode as BroBotChatMode) : fallback;
}

function normalizeConsultConfidence(value: unknown): BroBotChatOutput['consultConfidence'] {
  const confidence = normalizeString(value);
  return confidence === 'low' || confidence === 'moderate' || confidence === 'high'
    ? confidence
    : undefined;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return /^(true|yes|1)$/i.test(value.trim());
  }
  return false;
}

function synthesizeAnswerFromStructured(input: {
  priorityPoints: string[];
  knowledgeGaps: string[];
  fallbackAnswer: string;
}): string {
  const source = input.priorityPoints.length > 0 ? input.priorityPoints : input.knowledgeGaps;
  const usable = source.slice(0, 3);

  if (usable.length === 0) {
    return input.fallbackAnswer;
  }

  return usable.map((item) => `- ${item}`).join('\n');
}

function filterVagueOrPrepConcepts(items: string[]): string[] {
  const filtered = items.filter((item) => {
    const normalized = normalizeForDedupe(item);
    return !OR_PREP_VAGUE_CONCEPTS.some((phrase) =>
      normalized.includes(normalizeForDedupe(phrase))
    );
  });

  return filtered.length > 0 ? filtered : items;
}

function fallbackOutput(raw: unknown, options: ParseOptions): BroBotChatOutput {
  const answer =
    typeof raw === 'string' && isReadableProse(raw)
      ? stripCodeFence(raw)
      : options.fallbackAnswer ?? STRUCTURE_FALLBACK;

  return {
    goal: '',
    selectedFocus: '',
    answer,
    priorityPoints: [],
    knowledgeGaps: [],
    whatMostResidentsMiss: [],
    suggestedQuestions: [],
    nextLearningBranches: getModeBranchOptions(options.fallbackMode ?? 'general').slice(0, 6),
    tags: [],
    detectedMode:
      options.fallbackMode === 'fracture_call' ? 'consult' : options.fallbackMode ?? 'general',
    confidence: 0.25,
    needsClarification: false,
    clarifyingQuestions: [],
    assumedContext: '',
  };
}

function isReadableProse(raw: string): boolean {
  const cleaned = stripCodeFence(raw);
  if (!cleaned) return false;
  if (/^\s*[{[]/.test(cleaned)) return false;
  if (/"answer"\s*:/.test(cleaned) || /"priorityPoints"\s*:/.test(cleaned)) return false;
  return true;
}

function removeItemsDuplicatedInAnswer(items: string[], answer: string): string[] {
  const normalizedAnswer = normalizeForDedupe(answer);
  return items.filter((item) => {
    const normalizedItem = normalizeForDedupe(item);
    return normalizedItem.length > 20 ? !normalizedAnswer.includes(normalizedItem) : true;
  });
}

function mergeClarifyingQuestionsIntoSuggested(
  suggestedQuestions: string[],
  clarifyingQuestions: string[]
): string[] {
  const seen = new Set<string>();
  return [...clarifyingQuestions, ...suggestedQuestions]
    .filter((question) => {
      const normalized = normalizeForDedupe(question);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, 7);
}

export function parseBroBotChatResponse(raw: unknown, options: ParseOptions = {}): BroBotChatOutput {
  const parsed = parseRaw(raw);
  if (!parsed) {
    return fallbackOutput(raw, options);
  }

  const fallbackAnswer = options.fallbackAnswer || STRUCTURE_FALLBACK;
  const detectedMode = normalizeMode(parsed.detectedMode, options.fallbackMode ?? 'general');
  const priorityPoints = normalizeArray(parsed.priorityPoints, 6);
  const knowledgeGaps = normalizeArray(
    parsed.knowledgeGaps,
    detectedMode === 'consult' ? 8 : detectedMode === 'or_prep' ? 5 : 4
  );
  const missingInformation = normalizeArray(parsed.missingInformation, 8);
  const normalizedAnswer = normalizeAnswer(parsed.answer, fallbackAnswer);
  const goal = normalizeString(parsed.goal);
  const clarifyingQuestions = normalizeArray(parsed.clarifyingQuestions, 3);
  const assumedContext = normalizeString(parsed.assumedContext);
  const needsClarification =
    normalizeBoolean(parsed.needsClarification) ||
    clarifyingQuestions.length > 0 ||
    Boolean(assumedContext);

  const normalized: BroBotChatOutput = {
    goal,
    selectedFocus: normalizeString(parsed.selectedFocus),
    answer: isFallbackAnswer(normalizedAnswer)
      ? synthesizeAnswerFromStructured({
          priorityPoints,
          knowledgeGaps,
          fallbackAnswer,
        })
      : normalizedAnswer,
    priorityPoints:
      detectedMode === 'or_prep' ? filterVagueOrPrepConcepts(priorityPoints) : priorityPoints,
    knowledgeGaps,
    whatMostResidentsMiss: normalizeArray(parsed.whatMostResidentsMiss, 5),
    suggestedQuestions: mergeClarifyingQuestionsIntoSuggested(
      normalizeArray(parsed.suggestedQuestions, 6),
      clarifyingQuestions
    ),
    nextLearningBranches: normalizeBranchOptions(parsed.nextLearningBranches, detectedMode),
    tags: normalizeArray(parsed.tags, 8).map((tag) => tag.toLowerCase()),
    detectedMode,
    confidence: normalizeConfidence(parsed.confidence),
    needsClarification,
    clarifyingQuestions,
    assumedContext,
    consultConfidence:
      detectedMode === 'consult' ? normalizeConsultConfidence(parsed.consultConfidence) : undefined,
    missingInformation:
      detectedMode === 'consult'
        ? missingInformation.length > 0
          ? missingInformation
          : knowledgeGaps.slice(0, 8)
        : [],
    researchSubmode:
      detectedMode === 'research' ? normalizeResearchSubmode(parsed.researchSubmode) : undefined,
  };

  normalized.suggestedQuestions = removeItemsDuplicatedInAnswer(
    normalized.suggestedQuestions,
    normalized.answer
  );

  const validation = BroBotChatOutputSchema.safeParse(normalized);
  if (!validation.success) {
    return fallbackOutput(raw, options);
  }

  return validation.data;
}
