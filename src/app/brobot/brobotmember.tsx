'use client';

import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { getBroBotResponse } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import Nav from '@/components/Nav';
import AccountDropdown from '@/components/accountdropdown';


const BROBOT_VERSION = 2.0;

type ApproachSelection = {
  selected: { id: string; confidence: number; rationale: string }[];
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

interface SessionRow {
  response_id: number;
  question: string;
  answer: BroBotPayload;
  created_at: string;
}

export default function BroBotMember() {
  const router = useRouter();
  const { user } = useAuth();

  // Redirect guests
  useEffect(() => {
    if (!user) router.replace('/guest');
  }, [user, router]);

  // Form & response state
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<BroBotPayload | null>(null);
  const [loading, setLoading] = useState(false);

  // Feedback
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Sessions menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const summaryRef = useRef<HTMLDivElement>(null);

  // Load recent sessions when menu opens
  useEffect(() => {
    if (!menuOpen || !user) return;
    (async () => {
      setSessionsLoading(true);
      const res = await supabase
        .from('brobot_user_responses')
        .select('response_id, question, answer, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (res.error) {
        console.error('[BroBot] fetch sessions error:', res.error);
        setSessions([]);
      } else {
        setSessions(res.data as SessionRow[]);
      }
      setSessionsLoading(false);
    })();
  }, [menuOpen, user]);

  // Handle prompt submit / caching logic
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !prompt.trim()) return;

    setLoading(true);
    setData(null);
    setWasHelpful(null);
    setUserFeedback('');
    setFeedbackSubmitted(false);

    try {
      // Check for cached answer
      const { data: existing } = await supabase
        .from('brobot_user_responses')
        .select('answer')
        .eq('user_id', user.id)
        .eq('question', prompt)
        .limit(1)
        .single();

      if (existing?.answer) {
        setData(existing.answer as BroBotPayload);
      } else {
        // Call API
        const start = Date.now();
        const parsed = await getBroBotResponse(prompt);
        setData(parsed);
        const latency = Date.now() - start;

        // Save for next time
        const { error: insertErr } = await supabase
          .from('brobot_user_responses')
          .insert({
            user_id:        user.id,
            question:       prompt,
            answer: parsed,
            latency,
            brobot_version: BROBOT_VERSION,
          });

        if (insertErr && insertErr.code !== '23505') {
          console.error('[BroBot] insert error:', insertErr);
        }
      }

      setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('[BroBot] error:', err);
      setData({
        pimpQuestions: [],
        otherUsefulFacts: ['❌ Error fetching data. Please try again.'],
      });
    } finally {
      setLoading(false);
    }
  }

  // Submit feedback
  async function submitFeedback() {
    if (!data || feedbackSubmitted) return;
    setFeedbackSubmitted(true);
    try {
      await fetch('/api/case-prep-feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt, data, wasHelpful, userFeedback }),
      });
    } catch (err) {
      console.error('[BroBot] feedback error:', err);
    }
  }

  if (!user) return null;

  return (
  <div className="min-h-screen flex flex-col bg-[#fefcf7] text-[#1A1C2C]">
    {/* shared navigation */}
    <Nav />

    {/* single row with burger on left and account on right */}
    <div className="mt-16 px-6 py-2 bg-[#fefcf7] flex justify-between items-center relative">
  <button
    onClick={() => setMenuOpen(o => !o)}
    className="p-2 bg-white rounded shadow"
  >
    <Bars3Icon className="h-6 w-6 text-gray-700" />
  </button>

  <AccountDropdown />

  {menuOpen && (
    <div className="absolute top-full left-6 w-64 max-h-80 overflow-auto bg-white rounded shadow-lg z-50">
      {sessionsLoading
        ? <p className="p-4 text-sm text-gray-500">Loading…</p>
        : sessions.length === 0
          ? <p className="p-4 text-sm text-gray-500">No recent prompts</p>
          : sessions.map(s => (
              <button
                key={s.response_id}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => {
                  setPrompt(s.question);
                  setData(s.answer);
                  setMenuOpen(false);
                  setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
              >
                <p className="truncate font-medium text-[#1A1C2C]">{s.question}</p>
                <time className="block text-xs text-gray-500">
                  {new Date(s.created_at).toLocaleString()}
                </time>
              </button>
            ))
      }
    </div>
  )}
</div>

    <BroBotHeader />

      <main className="flex-1 px-6 pt-6 pb-12 relative max-w-3xl mx-auto">
        {loading && <LoadingOverlay />}


        <form onSubmit={handleSubmit} className="space-y-6">
          <Card title="Describe Your Case">
            <textarea
              rows={3}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. 90 y/o femoral neck fracture"
              className="w-full rounded-md border border-gray-300 p-3 shadow-sm focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="mt-4 inline-flex items-center rounded-md bg-teal-600 px-5 py-2 text-white shadow hover:bg-teal-700 disabled:opacity-40"
            >
              <MagnifyingGlassCircleIcon className="h-5 w-5 mr-2" />
              Get Prep
            </button>
          </Card>
        </form>

        {data && (
          <div ref={summaryRef} className="mt-8 space-y-6">
            <Card title="Prep Summary">
              <Section label="Common Pimp Questions" bullets={data.pimpQuestions} />
              <Section label="Other Useful Facts" bullets={data.otherUsefulFacts} />
            </Card>
            {data.anatomy && (
  <Card title="Anatomy">
    {data.anatomy.approachSelection?.selected?.length ? (
      <ApproachQuiz approaches={data.anatomy.approachSelection.selected} />
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

            <FeedbackSection
              wasHelpful={wasHelpful}
              setWasHelpful={setWasHelpful}
              userFeedback={userFeedback}
              setUserFeedback={setUserFeedback}
              feedbackSubmitted={feedbackSubmitted}
              submitFeedback={submitFeedback}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function BroBotHeader() {
  return (
    <header className="px-6 pb-12 text-center">
      <div className="mx-auto flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-4">
          <img src="/brologo.png" alt="Bro Logo" className="h-16 w-16 sm:h-20 sm:w-20 rounded-full" />
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-midnight">
            Meet <span className="text-teal-600">Bro</span>
          </h1>
        </div>
        <p className="max-w-xl text-lg text-gray-800">Prepare for ortho cases faster and smarter</p>
      </div>
    </header>
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

function FeedbackSection({
  wasHelpful,
  setWasHelpful,
  userFeedback,
  setUserFeedback,
  feedbackSubmitted,
  submitFeedback,
}: {
  wasHelpful: boolean | null;
  setWasHelpful: (b: boolean) => void;
  userFeedback: string;
  setUserFeedback: (s: string) => void;
  feedbackSubmitted: boolean;
  submitFeedback: () => void;
}) {
  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-medium text-gray-700">Was this helpful?</h3>
      <div className="flex space-x-4">
        <button
          onClick={() => setWasHelpful(true)}
          className={`px-4 py-2 rounded-md ${
            wasHelpful === true ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-800'
          }`}
        >
          Yes
        </button>
        <button
          onClick={() => setWasHelpful(false)}
          className={`px-4 py-2 rounded-md ${
            wasHelpful === false ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'
          }`}
        >
          No
        </button>
      </div>

      {wasHelpful === false && (
        <textarea
          rows={3}
          className="w-full mt-4 p-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-red-400"
          placeholder="Let us know how we can improve this..."
          value={userFeedback}
          onChange={(e) => setUserFeedback(e.target.value)}
        />
      )}

      <button
        onClick={submitFeedback}
        disabled={wasHelpful === null || feedbackSubmitted}
        className="mt-2 inline-flex items-center rounded-md bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-40"
      >
        {feedbackSubmitted ? 'Thanks!' : 'Submit Feedback'}
      </button>
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
