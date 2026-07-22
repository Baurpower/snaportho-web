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

export const CURRICULUM_CONTRACT_LIMITS = {
  pageText: 240000,
  sectionText: 20000,
  sections: 120,
  tables: 8,
  tableRows: 40,
  tableColumns: 12,
  tableCell: 1000,
  tableCaption: 240,
  tableHeader: 160,
  breadcrumbs: 12,
  breadcrumb: 200,
  images: 20,
  imageSrc: 2000,
  imageAlt: 500,
  imageCaption: 1000,
  authors: 12,
  author: 200,
  title: 300,
  date: 120,
  serializedRequest: 500000,
} as const;
const CURRICULUM_PAGE_TEXT_LIMIT = CURRICULUM_CONTRACT_LIMITS.pageText;
const CURRICULUM_SINGLE_SECTION_TEXT_LIMIT = CURRICULUM_CONTRACT_LIMITS.sectionText;
export const CURRICULUM_EXPLAIN_CONTRACT_VERSION = 'curriculum-explain-v2' as const;

function truncateUnicode(value: string, maxCharacters: number) {
  const normalized = normalizeText(value);
  let result = '';
  for (const character of normalized) {
    if (result.length + character.length > maxCharacters) break;
    result += character;
  }
  return result;
}

function boundedList(values: Array<string | null | undefined> | undefined, count: number, length: number) {
  return (values ?? []).map((value) => truncateUnicode(value ?? '', length)).filter(Boolean).slice(0, count);
}

export function validateCurriculumExplainRequest(payload: BroBotCurriculumPayload & { emphasis?: unknown }) {
  const issues: Array<{ path: string; code: string; message: string }> = [];
  const add = (path: string, code: string, message: string) => issues.push({ path, code, message });
  if (payload.contractVersion !== CURRICULUM_EXPLAIN_CONTRACT_VERSION) add('contractVersion', 'unsupported_contract_version', 'Unsupported curriculum contract version.');
  if (payload.task !== 'curriculum_explain') add('task', 'wrong_task', 'Expected curriculum_explain.');
  if (!['rock', 'orthobullets'].includes(payload.provider)) add('provider', 'unsupported_provider', 'Unsupported curriculum provider.');
  try { new URL(payload.sourceUrl); } catch { add('sourceUrl', 'invalid_source_url', 'Expected a valid source URL.'); }
  if (payload.pageContext.mode !== 'curriculum_content') add('pageContext.mode', 'unsupported_page_kind', 'Expected curriculum_content mode.');
  if (payload.emphasis != null && !['high_yield', 'comprehensive', 'board_review'].includes(String(payload.emphasis))) add('emphasis', 'invalid_enum_value', 'Unsupported curriculum emphasis.');
  if (!payload.curriculum.title.trim()) add('curriculum.title', 'missing_title', 'A page title is required.');
  if (!payload.curriculum.sections.length && !payload.curriculum.visibleText?.trim()) add('curriculum.sections', 'missing_sections', 'At least one readable section is required.');
  if (payload.curriculum.sections.length > 120) add('curriculum.sections', 'too_many_sections', 'At most 120 sections are accepted.');
  const ids = new Set<string>();
  payload.curriculum.sections.forEach((section, index) => {
    if (section.text.length > CURRICULUM_SINGLE_SECTION_TEXT_LIMIT) add(`curriculum.sections.${index}.text`, 'section_too_large', 'Section exceeds 20,000 characters.');
    if (section.id && ids.has(section.id)) add(`curriculum.sections.${index}.id`, 'duplicate_section_id', 'Section IDs must be unique.');
    if (section.id) ids.add(section.id);
  });
  if ((payload.curriculum.tables?.length ?? 0) > CURRICULUM_CONTRACT_LIMITS.tables) add('curriculum.tables', 'too_many_tables', 'At most 8 tables are accepted.');
  payload.curriculum.tables?.forEach((table, tableIndex) => {
    if ((table.caption?.length ?? 0) > CURRICULUM_CONTRACT_LIMITS.tableCaption) add(`curriculum.tables.${tableIndex}.caption`, 'too_big', 'Table caption exceeds 240 characters.');
    if ((table.headers?.length ?? 0) > CURRICULUM_CONTRACT_LIMITS.tableColumns) add(`curriculum.tables.${tableIndex}.headers`, 'too_many_columns', 'At most 12 table headers are accepted.');
    table.headers?.forEach((header, columnIndex) => {
      if (header.length > CURRICULUM_CONTRACT_LIMITS.tableHeader) add(`curriculum.tables.${tableIndex}.headers.${columnIndex}`, 'too_big', 'Table header exceeds 160 characters.');
    });
    if (table.rows.length > CURRICULUM_CONTRACT_LIMITS.tableRows) add(`curriculum.tables.${tableIndex}.rows`, 'too_many_rows', 'At most 40 table rows are accepted.');
    table.rows.forEach((row, rowIndex) => {
      if (row.length > CURRICULUM_CONTRACT_LIMITS.tableColumns) add(`curriculum.tables.${tableIndex}.rows.${rowIndex}`, 'too_many_columns', 'At most 12 table columns are accepted.');
      row.forEach((cell, columnIndex) => {
        if (!cell.trim()) add(`curriculum.tables.${tableIndex}.rows.${rowIndex}.${columnIndex}`, 'too_small', 'Table cells must not be empty.');
        if (cell.length > CURRICULUM_CONTRACT_LIMITS.tableCell) add(`curriculum.tables.${tableIndex}.rows.${rowIndex}.${columnIndex}`, 'too_big', 'Table cell exceeds 1,000 characters.');
      });
    });
  });
  const totalCharacters = payload.curriculum.sections.reduce((sum, section) => sum + section.text.length, 0);
  if (totalCharacters > CURRICULUM_PAGE_TEXT_LIMIT) add('curriculum.sections', 'document_too_large', 'Document exceeds 240,000 characters.');
  if (JSON.stringify(payload).length > CURRICULUM_CONTRACT_LIMITS.serializedRequest) add('', 'request_too_large', 'Serialized request exceeds 500,000 characters.');
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
  const rawTables = pageContext.tablesMarkdown ?? [];
  const preparedTables = rawTables.slice(0, CURRICULUM_CONTRACT_LIMITS.tables).map((table, index) => ({
    caption: `Table ${index + 1}`,
    rows: [[truncateUnicode(table, CURRICULUM_CONTRACT_LIMITS.tableCell)]],
  })).filter((table) => table.rows[0]?.[0]);
  const truncatedTableCellCount = rawTables.reduce(
    (count, table, index) => count + (index >= CURRICULUM_CONTRACT_LIMITS.tables || normalizeText(table).length > CURRICULUM_CONTRACT_LIMITS.tableCell ? 1 : 0),
    0
  );
  const providerSpecific = {
    ...(pageContext.raw?.providerSpecific ?? {}),
    wasTruncated: fallbackText.length > CURRICULUM_PAGE_TEXT_LIMIT,
    omittedSectionCount: 0,
    originalSectionCount: rawSections.length,
    preparedSectionCount: curriculumSections.length,
    truncatedTableCellCount,
    omittedTableCount: Math.max(0, rawTables.length - CURRICULUM_CONTRACT_LIMITS.tables),
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
      title: truncateUnicode(pageContext.title || 'Untitled curriculum page', CURRICULUM_CONTRACT_LIMITS.title),
      breadcrumbs: boundedList(pageContext.breadcrumbs, CURRICULUM_CONTRACT_LIMITS.breadcrumbs, CURRICULUM_CONTRACT_LIMITS.breadcrumb),
      sections: curriculumSections,
      tables: preparedTables,
      images: pageContext.images.slice(0, CURRICULUM_CONTRACT_LIMITS.images).map((image) => ({
        src: truncateUnicode(image.src ?? '', CURRICULUM_CONTRACT_LIMITS.imageSrc) || undefined,
        alt: truncateUnicode(image.alt ?? '', CURRICULUM_CONTRACT_LIMITS.imageAlt) || undefined,
        caption: truncateUnicode(image.caption ?? '', CURRICULUM_CONTRACT_LIMITS.imageCaption) || undefined,
      })),
      authors: boundedList(pageContext.authors, CURRICULUM_CONTRACT_LIMITS.authors, CURRICULUM_CONTRACT_LIMITS.author),
      date: pageContext.date ? truncateUnicode(pageContext.date, CURRICULUM_CONTRACT_LIMITS.date) : null,
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
