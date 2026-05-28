'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  MagnifyingGlassCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
// Phase 1: All BroBot AI calls now go through our secure server proxy.
// The old direct getBroBotResponse (which called the public CasePrep API from the browser)
// has been removed for security and usage tracking.



type ApproachSelection = {
  selected: { id: string; rationale: string }[];
  notes?: string;
};

type AnatomyQuizQuestion = {
  approach_id: string;
  q: string;
  answer: string;
  tag?: string;
  difficulty?: number;
};

type HighYieldStructure = {
  name: string;
  type: string;
  why_high_yield?: string;
  when_in_case?: string;
  approach_ids?: string[];
};

interface AnatomyPayload {
  approachSelection?: ApproachSelection;
  anatomyQuiz?: { questions: AnatomyQuizQuestion[] };
  highYieldAnatomy?: {
    structures?: HighYieldStructure[];
    must_not_miss?: string[];
  };
}

interface BroBotPayload {
  pimpQuestions: string[];
  otherUsefulFacts: string[];
  anatomy?: AnatomyPayload | null;
}


export default function BroBotBasic() {
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<BroBotPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Guest quota error state (separate from generic errors)
  type GuestError = { type: 'quota_limit' } | { type: 'generic'; message?: string };
  const [guestError, setGuestError] = useState<GuestError | null>(null);

  // Proactive usage info for guests (fetched from /api/me/entitlements)
  const [guestUsage, setGuestUsage] = useState<{ remainingToday: number | null; dailyCap: number | null } | null>(null);

  // Fetch guest entitlement on mount for proactive limit display
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me/entitlements');
        const body = await res.json();
        if (body.data?.aiAccess) {
          setGuestUsage({
            remainingToday: body.data.aiAccess.remainingToday,
            dailyCap: body.data.aiAccess.dailyCap,
          });
        }
      } catch {
        // Non-critical for guests
      }
    })();
  }, []);

  async function handleSubmit() {
    try {
      setLoading(true);
      setData(null);
      setWasHelpful(null);
      setUserFeedback('');
      setFeedbackSubmitted(false);

      // Phase 1: Route through our secure server proxy (auth + usage tracking + limits)
      const res = await fetch('/api/brobot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));

        if (res.status === 429 || err.isLimitReached) {
          // Guest quota hit — show the guest paywall card, never fake content
          setGuestError({ type: 'quota_limit' });
          setData(null);
          return;
        }

        // Other errors
        setGuestError({ type: 'generic', message: err.error || `HTTP ${res.status}` });
        setData(null);
        return;
      }

      const parsed = await res.json();
      console.log('✅ parsed response (via secure proxy):', parsed);
      setData(parsed);
      setGuestError(null);

      // Dynamically import branch and log event (only in browser)
      const branch = (await import('branch-sdk')).default;
      branch.logEvent('BroBot Prompt Entered', {
        prompt_text: prompt,
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('❌ BroBot Error', error);
      setGuestError({ type: 'generic' });
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback() {
    try {
      if (!data) return;
      setFeedbackSubmitted(true);

      // TODO (Phase 2): Move feedback to our own backend (/api/brobot/feedback or similar)
      // This direct external call bypasses our infrastructure and should be consolidated.
      await fetch('https://api.snap-ortho.com/case-prep-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          responseJSON: JSON.stringify(data),
          wasHelpful,
          userFeedback,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('❌ Feedback submission failed:', err);
    }
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#fefcf7] to-[#f5f2e8] text-[#1A1C2C]">
      {loading && <LoadingOverlay />}

     {/* Sign Up Button */}
<div className="absolute top-24 right-6">
  <Link
    href="/auth/sign-up?from=brobot"
    className="inline-block rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-teal-700"
  >
    Sign Up
  </Link>
</div>

      <header className="px-6 pt-24 pb-14 text-center">
        <div className="mx-auto flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-4">
            <img
              src="/brologo.png"
              alt="Bro Logo"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full"
            />
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-midnight">
              Meet <span className="text-teal-600">Bro</span>
            </h1>
          </div>

          <p className="max-w-xl text-lg text-gray-800">
            Prepare for ortho cases faster and smarter
          </p>
          <p className="max-w-xl text-base text-gray-600">
            Get the key anatomy and high-yield questions you need before you scrub.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-2xl space-y-10 px-6 pb-24 sm:px-8">
        <Card title="Describe Your Case">
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. 90 y/o femoral neck fracture"
            className="w-full rounded-md border border-gray-300 p-3 shadow-sm focus:ring-2 focus:ring-teal-600"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !prompt.trim() || guestUsage?.remainingToday === 0}
            className="mt-4 inline-flex items-center justify-center rounded-md bg-teal-600 px-5 py-2 text-white shadow hover:bg-teal-700 disabled:opacity-40"
          >
            Get&nbsp;Prep
          </button>
        </Card>

        {/* Proactive guest limit card */}
        {guestUsage && guestUsage.remainingToday === 0 && !loading && !guestError && (
          <div className="mt-6">
            <GuestQuotaCard guestUsage={guestUsage} />
          </div>
        )}

        {guestError && !loading && (
          <div ref={summaryRef} className="mt-8">
            {guestError.type === 'quota_limit' ? (
              <GuestQuotaCard guestUsage={guestUsage} />
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                <p className="text-gray-700">
                  {guestError.message || 'Something went wrong. Please try again in a moment.'}
                </p>
              </div>
            )}
          </div>
        )}

        {data && !guestError && (
          <div ref={summaryRef}>
            <Card title="Prep Summary">
              <Section label="Common Pimp Questions" bullets={data.pimpQuestions} />
              <Section label="Other Useful Facts" bullets={data.otherUsefulFacts} />
            </Card>
            {data.anatomy && (
  <Card title="Anatomy">
    {data.anatomy.approachSelection?.selected?.length ? (
  <ApproachQuiz
    approaches={data.anatomy.approachSelection.selected}
  />
) : null}


    {data.anatomy.anatomyQuiz?.questions?.length ? (
      <Section
        label="Anatomy Quiz"
        bullets={data.anatomy.anatomyQuiz.questions.map(
          (q) => `Q: ${q.q} A: ${q.answer}`
        )}
      />
    ) : null}
    {data.anatomy.highYieldAnatomy?.structures?.length ? (
  <Section
    label="High-Yield Structures: Identification & Function"
    bullets={data.anatomy.highYieldAnatomy.structures.map(
      (s) => `${s.name} — ${s.why_high_yield}`
    )}
  />
) : null}
  </Card>
)}

            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-700">Was this helpful?</h3>
              <div className="flex space-x-4">
                <button
                  className={`px-4 py-2 rounded-md ${
                    wasHelpful === true
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                  onClick={() => setWasHelpful(true)}
                >
                  Yes
                </button>
                <button
                  className={`px-4 py-2 rounded-md ${
                    wasHelpful === false
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                  onClick={() => setWasHelpful(false)}
                >
                  No
                </button>
              </div>

              {wasHelpful === false && (
                <textarea
                  rows={3}
                  className="w-full mt-4 p-3 rounded-md border border-gray-300 shadow-sm focus:ring-2 focus:ring-red-400"
                  placeholder="Let us know how we can improve this response..."
                  value={userFeedback}
                  onChange={(e) => setUserFeedback(e.target.value)}
                />
              )}

              <button
                onClick={submitFeedback}
                className="mt-2 inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-white shadow hover:bg-teal-700 disabled:opacity-40"
                disabled={wasHelpful === null || feedbackSubmitted}
              >
                {feedbackSubmitted ? 'Thanks for your feedback!' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#d6d2c7] bg-[#fefdfb] shadow-sm px-6 py-8 space-y-4">
      <h2 className="flex items-center gap-3 text-xl font-semibold text-[#1A1C2C]">
        <MagnifyingGlassCircleIcon className="h-6 w-6 text-teal-600" />
        {title}
      </h2>
      {children}
    </div>
  );
}

// Guest-specific quota limit card (encourages sign-up)
function GuestQuotaCard({ guestUsage }: { guestUsage: { remainingToday: number | null; dailyCap: number | null } | null }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
        <p className="font-semibold text-amber-900">Daily guest limit reached</p>
        <p className="text-amber-700 text-sm mt-1">
          {guestUsage?.dailyCap
            ? `You’ve used your ${guestUsage.dailyCap} free guest BroBot ${guestUsage.dailyCap === 1 ? 'prep' : 'preps'} for today.`
            : "You've reached your daily guest BroBot limit."}
        </p>
      </div>

      <div className="px-6 py-6 space-y-4">
        <p className="text-gray-700 text-sm">
          Create an account to save your history, get more daily preps (server-configured limit), and unlock the option to go unlimited.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/auth/sign-up?from=brobot"
            className="inline-flex flex-1 items-center justify-center rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition-colors"
          >
            Create an account
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Try again tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  bullets,
  defaultCollapsed = false,
  forceQA = false,
}: {
  label: string;
  bullets: string[];
  defaultCollapsed?: boolean;
  forceQA?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const isOpen = !collapsed;

  // pimp + quiz should use ToggleItem formatting
  const isQA =
    forceQA ||
    label.toLowerCase().includes('pimp') ||
    label.toLowerCase().includes('quiz');

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md bg-teal-100 px-4 py-2 text-left text-base font-semibold text-teal-900"
      >
        <span>{label}</span>
        {isOpen ? (
          <ChevronUpIcon className="h-5 w-5" />
        ) : (
          <ChevronDownIcon className="h-5 w-5" />
        )}
      </button>

      {isOpen && (
        <ul className="space-y-3 pl-1">
          {bullets.length > 0 ? (
            isQA ? (
              bullets.map((b, i) => <ToggleItem key={i} raw={b} />)
            ) : (
              bullets.map((b, i) => (
                <li
                  key={i}
                  className="rounded-md border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm"
                >
                  {b}
                </li>
              ))
            )
          ) : (
            <li className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-500 italic">
              No key points returned for this section.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}


function ToggleItem({ raw }: { raw: string }) {
  const [show, setShow] = useState(false);

  let question = raw;
  let answer = '';

  const parts = raw.split(/Q:\s*|\s*A:\s*/).filter(Boolean);
  if (parts.length === 2) {
    question = parts[0].trim();
    answer = parts[1].trim();
  }

  return (
    <li className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
      <div className="flex justify-between items-center">
        <span className="font-medium text-gray-800">{question}</span>
        <button
          onClick={() => setShow((s) => !s)}
          className="ml-4 text-sm text-teal-600 hover:underline"
        >
          {show ? 'Hide' : 'Show'} Answer
        </button>
      </div>
      {show && answer && (
        <p className="mt-2 rounded bg-teal-50 px-3 py-2 text-teal-900 shadow-inner">{answer}</p>
      )}
    </li>
  );
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="mb-6 h-14 w-14 animate-spin rounded-full border-4 border-t-4 border-gray-200 border-t-teal-600" />
      <h3 className="text-2xl font-bold text-teal-700 tracking-tight">Powered by SnapOrtho</h3>
      <p className="mt-1 text-sm text-[#444]">Memorize • Master • Excel</p>
      <p className="mt-4 max-w-xs text-center text-xs text-[#666]">
        Crafted from the highest-yield orthopaedic student resources.
      </p>
    </div>
  );
}

function ApproachQuiz({
  approaches,
}: {
  approaches: { id: string; rationale: string }[];
}) {
  // whole section closed by default
  const [collapsed, setCollapsed] = useState(true);
  const isOpen = !collapsed;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="flex w-full items-center justify-between rounded-md bg-teal-100 px-4 py-2 text-left text-base font-semibold text-teal-900"
      >
        <span>Recommended Approaches</span>
        {isOpen ? (
          <ChevronUpIcon className="h-5 w-5" />
        ) : (
          <ChevronDownIcon className="h-5 w-5" />
        )}
      </button>

      {isOpen && (
        <ul className="space-y-3 pl-1">
          {approaches.map((a) => (
            <ApproachItem
              key={a.id}
              name={formatApproachName(a.id)}
              description={a.rationale}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ApproachItem({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <li className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-gray-800 truncate">{name}</span>

        <button
          onClick={() => setShow((s) => !s)}
          className="ml-2 shrink-0 text-sm text-teal-600 hover:underline"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>

      {show && (
        <p className="mt-2 rounded bg-teal-50 px-3 py-2 text-teal-900 shadow-inner">
          {description}
        </p>
      )}
    </li>
  );
}


function formatApproachName(id: string) {
  // "approach_wrist_volar_distal_henry" -> "Wrist volar distal Henry"
  return id
    .replace(/^approach_/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
