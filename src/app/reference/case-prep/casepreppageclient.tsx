'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
import {
  ClipboardDocumentIcon,
  CheckIcon,
  MagnifyingGlassCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { getCasePrepResponse } from '@/lib/api';

const Markdown = dynamic(() => import('react-markdown').then((m) => m.default), { ssr: false });

interface CasePrepPayload {
  pimpQuestions: string[];
  otherUsefulFacts: string[];
}

export default function CasePrepPage() {
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<CasePrepPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  async function handleSubmit() {
    try {
      setLoading(true);
      setData(null);

      const parsed = await getCasePrepResponse(prompt);
      setData(parsed);

      // Auto-scroll to summary
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fefcf7] to-[#f5f2e8] text-[#1A1C2C]">
      {loading && <LoadingOverlay />}

      <header className="px-6 pt-24 pb-14 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-midnight">Ortho&nbsp;Case-Prep Helper</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-midnight">
          Paste a case description → get pearls, anatomy, and questions.
        </p>
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


function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-2 rounded-md border border-teal-500 px-3 py-2 text-sm text-teal-700 shadow-sm hover:bg-teal-50"
    >
      {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
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
