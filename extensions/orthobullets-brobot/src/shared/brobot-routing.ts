import type { OrthobulletsPageContext, QuestionProvider } from './types.js';

export type BroBotTask = 'question_hint' | 'question_explain' | 'curriculum_explain';

export type BroBotQuestionPayload = {
  task: 'question_hint' | 'question_explain';
  provider: QuestionProvider;
  sourceUrl: string;
  pageContext: OrthobulletsPageContext;
};

export type BroBotCurriculumPayload = {
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

const CURRICULUM_SECTION_TEXT_LIMIT = 14000;
const CURRICULUM_SINGLE_SECTION_TEXT_LIMIT = 4800;

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

function selectSectionsAcrossPage(
  sections: Array<{ id: string; heading: string; level: number; text: string }>
) {
  const total = sections.reduce((sum, section) => sum + section.text.length, 0);
  if (total <= CURRICULUM_SECTION_TEXT_LIMIT) {
    return { sections, wasTruncated: false, omittedSectionCount: 0 };
  }

  const selected: typeof sections = [];
  const selectedIndexes = new Set<number>();
  const anchorIndexes = [0, sections.length - 1, Math.floor(sections.length / 2)].filter(
    (index) => index >= 0 && index < sections.length
  );
  for (const index of anchorIndexes) {
    selectedIndexes.add(index);
  }
  const stride = Math.max(1, Math.floor(sections.length / 8));
  for (let index = 0; index < sections.length; index += stride) {
    selectedIndexes.add(index);
  }

  let used = 0;
  for (const index of [...selectedIndexes].sort((a, b) => a - b)) {
    const section = sections[index];
    if (!section) continue;
    const remaining = CURRICULUM_SECTION_TEXT_LIMIT - used;
    if (remaining <= 0) break;
    const text = section.text.length > remaining ? section.text.slice(0, Math.max(0, remaining - 120)).trim() : section.text;
    if (!text) continue;
    selected.push({ ...section, text });
    used += text.length;
  }

  return {
    sections: selected,
    wasTruncated: true,
    omittedSectionCount: Math.max(0, sections.length - selected.length),
  };
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
  const selected = selectSectionsAcrossPage(dedupedSections);
  const curriculumSections = selected.sections.length
    ? selected.sections
    : fallbackText
      ? [{
          id: 'visible-text',
          heading: normalizeText(pageContext.title) || 'Visible content',
          level: 1,
          text: fallbackText.slice(0, CURRICULUM_SECTION_TEXT_LIMIT),
        }]
      : [];
  const providerSpecific = {
    ...(pageContext.raw?.providerSpecific ?? {}),
    wasTruncated: selected.wasTruncated || fallbackText.length > CURRICULUM_SECTION_TEXT_LIMIT,
    omittedSectionCount: selected.omittedSectionCount,
    originalSectionCount: rawSections.length,
    preparedSectionCount: curriculumSections.length,
  };
  const preparedPageContext: OrthobulletsPageContext = {
    ...pageContext,
    contentSections: curriculumSections.map((section) => ({
      heading: section.heading || 'Visible content',
      text: section.text,
    })),
    contentText: curriculumSections.map((section) => `${section.heading}\n${section.text}`).join('\n\n') || fallbackText.slice(0, CURRICULUM_SECTION_TEXT_LIMIT),
    raw: {
      ...(pageContext.raw ?? {}),
      providerSpecific,
    },
  };

  return {
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
      visibleText: preparedPageContext.contentText || undefined,
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
