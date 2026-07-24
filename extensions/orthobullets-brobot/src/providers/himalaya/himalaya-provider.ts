import type { OrthobulletsPageContext } from '../../shared/types.js';
import { extractHimalayaPageContext, isHimalayaUrl } from './himalaya-extractor.js';
import { buildHimalayaApiPageContext, buildHimalayaOverviewContext } from './himalaya-context.js';
import { findHimalayaQuestion, getActiveHimalayaQuestion, getHimalayaStoreSnapshot } from './himalaya-store.js';

export const HIMALAYA_PROVIDER_ID = 'himalaya' as const;

export function detectHimalayaProvider(pageUrl: string | null | undefined) {
  return isHimalayaUrl(pageUrl) ? HIMALAYA_PROVIDER_ID : null;
}

export function extractHimalayaProviderContext(input: {
  document: Parameters<typeof extractHimalayaPageContext>[0]['document'];
  pageUrl?: string;
  /** Target one specific question rather than whatever is on screen. */
  questionAttemptId?: number;
}): OrthobulletsPageContext | null {
  const pageUrl = input.pageUrl ?? input.document.locationHref ?? '';
  const store = getHimalayaStoreSnapshot();

  // Review board rows resolve by id: the learner is asking about a question
  // that is not necessarily the one open on the page.
  if (input.questionAttemptId != null) {
    const targeted = findHimalayaQuestion(input.questionAttemptId);
    if (!targeted) return null;
    return buildHimalayaApiPageContext({
      question: targeted,
      bridgeState: store.bridgeState,
      allQuestions: store.questions,
      pageUrl,
      documentTitle: typeof input.document.title === 'string' ? input.document.title : null,
    });
  }

  // Preferred path: structured data straight from the te6 API. It is complete
  // and immune to AAOS restyling, so it wins whenever the bridge delivered.
  if (store.questions.length) {
    const active = getActiveHimalayaQuestion();
    const documentTitle = typeof input.document.title === 'string' ? input.document.title : null;
    if (active) {
      return buildHimalayaApiPageContext({
        question: active,
        bridgeState: store.bridgeState,
        allQuestions: store.questions,
        pageUrl,
        documentTitle,
      });
    }
    if (store.bridgeState?.view === 'results') {
      return buildHimalayaOverviewContext({
        bridgeState: store.bridgeState,
        allQuestions: store.questions,
        pageUrl,
        documentTitle,
      });
    }
  }

  // Fallback: scrape the rendered DOM. Keeps BroBot working if the bridge is
  // blocked or AAOS changes the API payload.
  return extractHimalayaPageContext(input);
}
