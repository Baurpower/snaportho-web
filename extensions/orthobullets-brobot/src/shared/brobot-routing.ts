import type { OrthobulletsPageContext, QuestionProvider } from './types.js';

export type BroBotTask = 'question_hint' | 'question_explain' | 'curriculum_explain';

export type BroBotQuestionPayload = {
  task: 'question_hint' | 'question_explain';
  provider: QuestionProvider;
  sourceUrl: string;
  pageContext: OrthobulletsPageContext;
};

export type BroBotCurriculumPayload = {
  contractVersion: 'curriculum-explain-v2';
  task: 'curriculum_explain';
  provider: 'orthobullets' | 'rock';
  sourceUrl: string;
  pageContext: OrthobulletsPageContext;
  curriculum: {
    title: string;
    breadcrumbs?: string[];
    sections: Array<{
      id?: string;
      heading?: string;
      level?: number;
      text: string;
    }>;
    tables?: Array<{
      caption?: string;
      headers?: string[];
      rows: string[][];
    }>;
    images?: Array<{
      src?: string;
      alt?: string;
      caption?: string;
    }>;
    authors?: string[];
    date?: string | null;
    visibleText?: string;
  };
};

export type BroBotExtensionRequest = BroBotQuestionPayload | BroBotCurriculumPayload;

const CURRICULUM_PAGE_TEXT_LIMIT = 240000;
const CURRICULUM_SINGLE_SECTION_TEXT_LIMIT = 20000;
export const CURRICULUM_EXPLAIN_CONTRACT_VERSION = 'curriculum-explain-v2' as const;

export function validateCurriculumExplainRequest(payload: BroBotCurriculumPayload) {
  const issues: Array<{ path: string; code: string; message: string }> = [];
  const add = (path: string, code: string, message: string) => issues.push({ path, code, message });
  if (payload.contractVersion !== CURRICULUM_EXPLAIN_CONTRACT_VERSION) add('contractVersion', 'unsupported_contract_version', 'Unsupported curriculum contract version.');
  if (payload.task !== 'curriculum_explain') add('task', 'wrong_task', 'Expected curriculum_explain.');
  if (!['rock', 'orthobullets'].includes(payload.provider)) add('provider', 'unsupported_provider', 'Unsupported curriculum provider.');
  try { new URL(payload.sourceUrl); } catch { add('sourceUrl', 'invalid_source_url', 'Expected a valid source URL.'); }
  if (payload.pageContext.mode !== 'curriculum_content') add('pageContext.mode', 'unsupported_page_kind', 'Expected curriculum_content mode.');
  if (!payload.curriculum.title.trim()) add('curriculum.title', 'missing_title', 'A page title is required.');
  if (!payload.curriculum.sections.length && !payload.curriculum.visibleText?.trim()) add('curriculum.sections', 'missing_sections', 'At least one readable section is required.');
  if (payload.curriculum.sections.length > 120) add('curriculum.sections', 'too_many_sections', 'At most 120 sections are accepted.');
  const ids = new Set<string>();
  payload.curriculum.sections.forEach((section, index) => {
    if (section.text.length > CURRICULUM_SINGLE_SECTION_TEXT_LIMIT) add(`curriculum.sections.${index}.text`, 'section_too_large', 'Section exceeds 20,000 characters.');
    if (section.id && ids.has(section.id)) add(`curriculum.sections.${index}.id`, 'duplicate_section_id', 'Section IDs must be unique.');
    if (section.id) ids.add(section.id);
  });
  const totalCharacters = payload.curriculum.sections.reduce((sum, section) => sum + section.text.length, 0);
  if (totalCharacters > CURRICULUM_PAGE_TEXT_LIMIT) add('curriculum.sections', 'document_too_large', 'Document exceeds 240,000 characters.');
  if (JSON.stringify(payload).length > 500000) add('', 'request_too_large', 'Serialized request exceeds 500,000 characters.');
  return { success: issues.length === 0, issues };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled BroBot task: ${String(value)}`);
}

export function resolveBroBotEndpoint(request: BroBotExtensionRequest): string {
  switch (request.task) {
    case 'curriculum_explain':
      return '/api/brobot/curriculum/explain';
    case 'question_hint':
      return '/api/brobot/orthobullets/hint';
    case 'question_explain':
      return '/api/brobot/orthobullets/explain';
    default:
      return assertNever(request);
  }
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function dedupeSections(
  sections: Array<{ id: string; heading: string; level: number; text: string }>
) {
  const seen = new Set<string>();
  return sections.filter((section) => {
    const key = `${section.heading.toLowerCase()}|${section.text.slice(0, 240).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildCurriculumExplainRequest(pageContext: OrthobulletsPageContext): BroBotCurriculumPayload {
  const rawSections = (pageContext.contentSections ?? [])
    .map((section, index) => ({
      id: `section-${index + 1}`,
      heading: normalizeText(section.heading),
      level: 2,
      text: normalizeText(section.text).slice(0, CURRICULUM_SINGLE_SECTION_TEXT_LIMIT),
    }))
    .filter((section) => section.text);

  const fallbackText = normalizeText(pageContext.contentText ?? pageContext.contentMarkdown);
  const dedupedSections = dedupeSections(rawSections);
  const curriculumSections = dedupedSections.length
    ? dedupedSections
    : fallbackText
      ? [{
          id: 'visible-text',
          heading: normalizeText(pageContext.title) || 'Visible content',
          level: 1,
          text: fallbackText.slice(0, CURRICULUM_PAGE_TEXT_LIMIT),
        }]
      : [];
  const providerSpecific = {
    ...(pageContext.raw?.providerSpecific ?? {}),
    wasTruncated: fallbackText.length > CURRICULUM_PAGE_TEXT_LIMIT,
    omittedSectionCount: 0,
    originalSectionCount: rawSections.length,
    preparedSectionCount: curriculumSections.length,
  };
  const preparedPageContext: OrthobulletsPageContext = {
    ...pageContext,
    // The structured curriculum below is the source of truth. Do not duplicate
    // a long copyrighted page several times in the transport payload.
    contentSections: [],
    contentText: null,
    contentMarkdown: null,
    raw: {
      ...(pageContext.raw ?? {}),
      providerSpecific,
    },
  };

  return {
    contractVersion: CURRICULUM_EXPLAIN_CONTRACT_VERSION,
    task: 'curriculum_explain',
    provider: pageContext.provider === 'rock' ? 'rock' : 'orthobullets',
    sourceUrl: pageContext.sourceUrl ?? pageContext.pageUrl,
    pageContext: preparedPageContext,
    curriculum: {
      title: normalizeText(pageContext.title) || 'Untitled curriculum page',
      breadcrumbs: pageContext.breadcrumbs?.map(normalizeText).filter(Boolean),
      sections: curriculumSections,
      tables: (pageContext.tablesMarkdown ?? []).map((table, index) => ({
        caption: `Table ${index + 1}`,
        rows: [[normalizeText(table)]],
      })),
      images: pageContext.images.map((image) => ({
        src: image.src,
        alt: normalizeText(image.alt),
        caption: normalizeText(image.caption),
      })),
      authors: pageContext.authors?.map(normalizeText).filter(Boolean),
      date: pageContext.date ?? null,
      visibleText: curriculumSections.length ? undefined : fallbackText.slice(0, CURRICULUM_PAGE_TEXT_LIMIT) || undefined,
    },
  };
}

export function buildQuestionExplainRequest(pageContext: OrthobulletsPageContext): BroBotQuestionPayload {
  return {
    task: 'question_explain',
    provider: pageContext.provider,
    sourceUrl: pageContext.sourceUrl ?? pageContext.pageUrl,
    pageContext,
  };
}

export function buildQuestionHintRequest(pageContext: OrthobulletsPageContext): BroBotQuestionPayload {
  return {
    task: 'question_hint',
    provider: pageContext.provider,
    sourceUrl: pageContext.sourceUrl ?? pageContext.pageUrl,
    pageContext,
  };
}
