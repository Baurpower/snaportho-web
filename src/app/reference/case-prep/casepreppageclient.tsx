'use client';

import { useState, useRef } from 'react';
import {
  MagnifyingGlassCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { getCasePrepResponse } from '@/lib/api';
import branch from 'branch-sdk'; // Make sure this is at the top

interface CasePrepPayload {
  pimpQuestions: string[];
  otherUsefulFacts: string[];
}

export default function CasePrepPage() {
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<CasePrepPayload | null>(null);
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

    const parsed = await getCasePrepResponse(prompt);
    setData(parsed);

    // 🔥 Track Branch custom event
    branch.logEvent('CasePrep Prompt Entered', {
      prompt_text: prompt,
      timestamp: new Date().toISOString(),
    });

    setTimeout(() => {
      summaryRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  } catch (error) {
    console.error('❌ CasePrep Error', error);
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
    responseJSON: JSON.stringify(data), // ← Fix: stringify this
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
    <main className="min-h-screen bg-gradient-to-b from-[#fefcf7] to-[#f5f2e8] text-[#1A1C2C]">
      {loading && <LoadingOverlay />}

      <header className="relative px-6 pt-24 pb-14 text-center">
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

function Section({ label, bullets }: { label: string; bullets: string[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const isOpen = !collapsed;
  const isPimp = label.toLowerCase().includes('pimp');

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md bg-teal-100 px-4 py-2 text-left text-base font-semibold text-teal-900"
      >
        <span>{label}</span>
        {isOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
      </button>

      {isOpen && (
        <ul className="space-y-3 pl-1">
          {bullets.length > 0 ? (
            isPimp
              ? bullets.map((b, i) => <ToggleItem key={i} raw={b} />)
              : bullets.map((b, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    {b}
                  </li>
                ))
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
