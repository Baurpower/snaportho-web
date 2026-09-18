'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AnkiCardDetail, AnkiReference } from '@/lib/brobot/chat/anki-references';
import { answerClaims } from '@/lib/brobot/chat/anki-claims';
import { trackProductEvent } from '@/lib/analytics/product-events-client';
import BroBotMarkdown from './BroBotMarkdown';
import RichAnkiField from './RichAnkiField';

export default function BroBotAnkiReferences({
  answer,
  messageId,
  complete,
  guestToken,
}: {
  answer: string;
  messageId: string;
  complete: boolean;
  guestToken?: string;
}) {
  const [references, setReferences] = useState<AnkiReference[]>([]);
  const [card, setCard] = useState<AnkiCardDetail | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState(false);
  const [cardRetry, setCardRetry] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const isDialogOpen = selectedIndex !== null;

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !complete || !messageId || !answer) return;
    const controller = new AbortController();
    setLoading(true);
    setLookupError(false);
    fetch(`/api/brobot/messages/${encodeURIComponent(messageId)}/anki-references`, {
      method: guestToken ? 'POST' : 'GET',
      credentials: 'include',
      signal: controller.signal,
      ...(guestToken ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer, token: guestToken }) } : {}),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Anki lookup failed');
        return response.json();
      })
      .then((data: { references?: AnkiReference[] } | null) => {
        const claims = new Map(answerClaims(answer).map((claim) => [claim.id, claim.text]));
        const valid = Array.isArray(data?.references)
          ? data.references.filter((reference) => claims.get(reference.claimId) === reference.anchorText)
          : [];
        if (!controller.signal.aborted) setReferences(valid);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setReferences([]);
          setLookupError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [visible, complete, messageId, answer, guestToken, retryCount]);

  useEffect(() => {
    const selected = selectedIndex === null ? null : references[selectedIndex];
    if (!selected) return;
    const controller = new AbortController();
    setCard(null);
    setCardLoading(true);
    setCardError(false);
    fetch('/api/brobot/anki-card', {
      credentials: 'include', signal: controller.signal,
      headers: { 'X-Anki-Card-Token': selected.token },
    }).then(async (response) => {
      if (!response.ok) throw new Error('Card unavailable');
      return response.json() as Promise<AnkiCardDetail>;
    }).then((detail) => { if (!controller.signal.aborted) setCard(detail); })
      .catch(() => { if (!controller.signal.aborted) setCardError(true); })
      .finally(() => { if (!controller.signal.aborted) setCardLoading(false); });
    return () => controller.abort();
  }, [selectedIndex, references, cardRetry]);

  useEffect(() => {
    if (!isDialogOpen) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedIndex(null);
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const items = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      (triggerRef.current ?? before)?.focus();
    };
  }, [isDialogOpen]);

  function open(index: number) {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setRevealed(false);
    setFeedbackSent(false);
    setSelectedIndex(index);
    trackProductEvent({
      eventName: 'brobot_anki_reference_opened',
      surface: 'brobot_web_chat',
      productArea: 'brobot',
      properties: { messageId, cardVersionId: references[index].cardVersionId, rank: index + 1 },
    });
  }
  function navigate(index: number) {
    setRevealed(false);
    setFeedbackSent(false);
    setSelectedIndex(index);
  }
  const selected = selectedIndex === null ? null : references[selectedIndex];
  const hasCloze = card ? /\{\{c\d+::/i.test(card.front) : false;

  return (
    <div ref={rootRef}>
      <BroBotMarkdown
        references={references}
        onOpenAnkiReference={(id) => {
          const index = references.findIndex((item) => item.id === id);
          if (index >= 0) open(index);
        }}
      >{answer}</BroBotMarkdown>
      {references.length > 0 && (
        <nav className="mt-4 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5" aria-label="Anki cards for this answer">
          <p className="text-[11px] font-bold uppercase tracking-wide text-sky-800">Anki cards · {references.length}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {references.map((reference, index) => (
              <button key={reference.id} type="button" onClick={() => open(index)}
                className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500">
                {reference.number}. {reference.title}
              </button>
            ))}
          </div>
        </nav>
      )}
      {loading && <p className="mt-3 text-xs text-slate-500" role="status">Finding Anki cards for this answer…</p>}
      {lookupError && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>Anki cards are unavailable right now.</span>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)}
            className="font-semibold text-sky-700 underline underline-offset-2">Retry</button>
        </div>
      )}
      {selected && createPortal((
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-6"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedIndex(null); }}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="brobot-anki-card-title"
            className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-sky-700">SnapOrtho Anki · {selectedIndex! + 1} of {references.length}</p>
                <h2 id="brobot-anki-card-title" className="truncate text-base font-bold text-slate-950">{selected.title}</h2>
              </div>
              <button type="button" onClick={() => setSelectedIndex(null)} aria-label="Close Anki card"
                className="rounded-full px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500">Close</button>
            </header>
            <div className="overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
              <p className="mb-2 text-xs font-medium text-slate-500">From {selected.deckPath.replace(/::/g, ' › ')}</p>
              {cardLoading && <p role="status" className="rounded-2xl bg-white p-5 text-sm text-slate-500">Loading card…</p>}
              {cardError && <div className="rounded-2xl bg-white p-5 text-sm text-slate-600">Card unavailable. <button type="button" onClick={() => setCardRetry((count) => count + 1)} className="font-semibold text-sky-700 underline">Retry</button></div>}
              {card && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-sky-700">{revealed ? 'Answer' : 'Front'}</p>
                <div className="text-lg leading-8 text-slate-950">
                  <RichAnkiField html={card.frontHtml} fallback={card.front}
                    targetCloze={hasCloze ? card.targetCloze : null}
                    revealed={revealed} images={card.images ?? []} />
                </div>
                {revealed && !hasCloze && card.back && (
                  <div className="mt-5 border-t border-slate-200 pt-5 text-base leading-7 text-slate-800">
                    <RichAnkiField html={card.backHtml} fallback={card.back} targetCloze={null}
                      revealed images={card.images ?? []} />
                  </div>
                )}
                {revealed && (card.extra || /<img\b/i.test(card.extraHtml)) && (
                  <section className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800">Extra</h3>
                    <div className="mt-2 text-sm leading-6 text-slate-800">
                      <RichAnkiField html={card.extraHtml} fallback={card.extra} targetCloze={null}
                        revealed images={card.images ?? []} />
                    </div>
                  </section>
                )}
              </div>}
              {card && !revealed && (
                <button type="button" onClick={() => {
                  setRevealed(true);
                  trackProductEvent({
                    eventName: 'brobot_anki_answer_revealed',
                    surface: 'brobot_web_chat',
                    productArea: 'brobot',
                    properties: { messageId, cardVersionId: selected.cardVersionId, rank: selectedIndex! + 1 },
                  });
                }}
                  className="mt-5 w-full rounded-xl bg-sky-700 px-5 py-3 font-bold text-white hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
                  Show answer
                </button>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <p>Viewing this card does not change your Anki review schedule.</p>
                <button type="button" disabled={feedbackSent} onClick={async () => {
                  const saved = await trackProductEvent({
                    eventName: 'brobot_anki_reference_not_relevant',
                    surface: 'brobot_web_chat',
                    productArea: 'brobot',
                    properties: { messageId, cardVersionId: selected.cardVersionId, rank: selectedIndex! + 1 },
                  });
                  if (saved) setFeedbackSent(true);
                }} className="font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900 disabled:no-underline">
                  {feedbackSent ? 'Feedback saved' : 'Not relevant?'}
                </button>
              </div>
            </div>
            {references.length > 1 && (
              <footer className="flex justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
                <button type="button" onClick={() => navigate(Math.max(0, selectedIndex! - 1))} disabled={selectedIndex === 0}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-sky-800 disabled:opacity-40">Previous card</button>
                <button type="button" onClick={() => navigate(Math.min(references.length - 1, selectedIndex! + 1))} disabled={selectedIndex === references.length - 1}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-sky-800 disabled:opacity-40">Next card</button>
              </footer>
            )}
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
