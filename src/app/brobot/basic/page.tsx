'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  MagnifyingGlassCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { getBroBotResponse } from '@/lib/api';


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

  async function handleSubmit() {
    try {
      setLoading(true);
      setData(null);
      setWasHelpful(null);
      setUserFeedback('');
      setFeedbackSubmitted(false);

      const parsed = await getBroBotResponse(prompt);
      console.log('✅ parsed response:', parsed);
      console.log('✅ anatomy:', parsed?.anatomy);
      setData(parsed);

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
      setData({
        pimpQuestions: [],
        otherUsefulFacts: ['❌ Error fetching data. Please try again.'],
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback() {
    try {
      if (!data) return;
      setFeedbackSubmitted(true);

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
            disabled={loading || !prompt.trim()}
            className="mt-4 inline-flex items-center justify-center rounded-md bg-teal-600 px-5 py-2 text-white shadow hover:bg-teal-700 disabled:opacity-40"
          >
            Get&nbsp;Prep
          </button>
        </Card>

        {data && (
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
            <li className="rounded bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
              Nothing found.
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
