'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type ReadingResourceType =
  | 'pubmed_article'
  | 'landmark_paper'
  | 'review_article'
  | 'guideline'
  | 'society_resource'
  | 'technique_article'
  | 'visual_resource'
  | 'textbook_reference'
  | 'systematic_review'
  | 'trial'
  | 'educational_website';

type ReadingRecommendation = {
  id: string;
  title: string;
  resourceType: ReadingResourceType;
  sourceName: string;
  journal?: string;
  year?: number;
  url: string;
  whyItMatters: string;
  tags: string[];
  pmid?: string;
  doi?: string;
  citationCount?: number;
  citationSource?: string;
  bestFor?: string;
  badges?: string[];
  matchedTerms?: string[];
  sourceOrigin?: 'curated' | 'pubmed_live' | 'trusted_web_live' | 'cached_live';
  rankScore?: number;
  rankPosition: number;
  isLandmark?: boolean;
  isBoardRelevant?: boolean;
  isTechniqueRelevant?: boolean;
};

type ReadingResponse = {
  recommendationSetId?: string;
  topic: string;
  generatedFrom?: 'curated' | 'live' | 'hybrid' | 'cached';
  resources: ReadingRecommendation[];
};

type PanelState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; data: ReadingResponse }
  | { status: 'error'; message: string };

export default function ReadingRecommendationsPanel({
  conversationId,
  sourceMessageId,
  mode,
  trainingLevel,
  onClose,
}: {
  conversationId: string;
  sourceMessageId: string;
  mode: string;
  trainingLevel: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<PanelState>({ status: 'idle' });
  const readyData = state.status === 'ready' ? state.data : null;

  const loadRecommendations = useCallback(async () => {
    setState({ status: 'loading' });

    try {
      const res = await fetch('/api/brobot/reading-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationId, sourceMessageId }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.message ?? body?.error ?? 'Read Next is unavailable.');
      }

      const resources = Array.isArray(body?.resources) ? body.resources : [];
      setState({
        status: 'ready',
        data: {
          topic: typeof body?.topic === 'string' ? body.topic : 'orthopaedics',
          recommendationSetId:
            typeof body?.recommendationSetId === 'string' ? body.recommendationSetId : undefined,
          generatedFrom:
            body?.generatedFrom === 'curated' ||
            body?.generatedFrom === 'live' ||
            body?.generatedFrom === 'hybrid' ||
            body?.generatedFrom === 'cached'
              ? body.generatedFrom
              : undefined,
          resources,
        },
      });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Read Next is unavailable.',
      });
    }
  }, [conversationId, sourceMessageId]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  async function openResource(resource: ReadingRecommendation) {
    const openWindow = window.open(resource.url, '_blank', 'noopener,noreferrer');

    void fetch('/api/brobot/reading-recommendations/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        conversationId,
        sourceMessageId,
        resourceId: resource.id,
        eventType: 'click',
        rankPosition: resource.rankPosition,
        mode,
        trainingLevel,
        topic: state.status === 'ready' ? state.data.topic : undefined,
      }),
    }).catch(() => undefined);

    if (!openWindow) {
      window.location.href = resource.url;
    }
  }

  return (
    <section className="mt-3 rounded-xl border border-sky-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 rounded-full bg-sky-50 p-1.5 text-sky-700">
            <BookOpenIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-midnight">Read Next</h3>
            {state.status === 'ready' && (
              <p className="mt-0.5 truncate text-xs text-slate-500">
                Search results for &quot;{state.data.topic}&quot;
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Read Next"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {state.status === 'loading' || state.status === 'idle' ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          <ArrowPathIcon className="h-4 w-4 animate-spin text-sky-600" />
          Searching verified sources...
        </div>
      ) : state.status === 'error' ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
          <div className="flex items-start gap-2 text-sm text-amber-900">
            <ExclamationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.message}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadRecommendations()}
            className="mt-2 rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      ) : readyData && readyData.resources.length === 0 ? (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-sm leading-5 text-slate-600">
          <p>No verified results found for &quot;{readyData.topic}&quot;.</p>
          <p className="mt-1 text-xs text-slate-500">
            Try a more specific phrase like &quot;intertrochanteric fracture fixation&quot; or
            &quot;cephalomedullary nail&quot;.
          </p>
        </div>
      ) : readyData ? (
        <div className="mt-3 grid gap-2">
          {readyData.resources.map((resource) => (
            <article
              key={resource.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                  {resource.pmid ? 'PubMed' : resource.sourceName}
                </span>
                {(resource.badges ?? []).map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <h4 className="mt-2 text-sm font-bold leading-5 text-midnight">
                {resource.title}
              </h4>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {resource.sourceName}
                {resource.journal ? ` · ${resource.journal}` : ''}
                {resource.year ? ` · ${resource.year}` : ''}
                {resource.pmid ? ` · PMID ${resource.pmid}` : ''}
                {typeof resource.citationCount === 'number' ? ` · ${resource.citationCount} citations` : ''}
              </p>
              {(resource.matchedTerms?.length ?? 0) > 0 && (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Matched: {resource.matchedTerms?.slice(0, 3).join(' / ')}
                </p>
              )}
              <button
                type="button"
                onClick={() => void openResource(resource)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-sky-700"
              >
                Open
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
