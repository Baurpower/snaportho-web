'use client';

import React, { useState, useRef, useEffect, useMemo, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MagnifyingGlassCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Bars3Icon,
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Nav from '@/components/Nav';
import AccountDropdown from '@/components/accountdropdown';
import BroBotProductTabs from '@/components/brobot/BroBotProductTabs';
import { trackCheckoutStartedConversion } from '@/lib/analytics/googleAds';
import { appendSafeReturnTo } from '@/lib/auth/redirects';
import { BROBOT_PRICING } from '@/lib/config/brobot-pricing';
import { createWebsiteBroBotCheckout } from '@/lib/brobot/checkout-client';

// Phase 1: All BroBot AI calls now go through our secure server proxy.
// Direct browser calls to the external CasePrep API have been eliminated.

const BROBOT_VERSION = 2.0;
const BROBOT_RETURN_TO = '/brobot';
const BROBOT_BILLING_HREF = appendSafeReturnTo('/account/billing?intent=brobot', BROBOT_RETURN_TO);

// ── Domain types (unchanged) ──────────────────────────────────────────────────

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
  meta?: { remaining?: number | null; isLimitReached?: boolean };
}

interface SessionRow {
  response_id: number;
  question: string;
  answer: BroBotPayload;
  created_at: string;
}

// ── Error / entitlement state types ──────────────────────────────────────────

/**
 * Discriminated union so every failure renders a distinct, appropriate card —
 * never the same red banner for "no internet" and "hit your daily cap".
 */
type BroBotError =
  | { type: 'quota_limit'; dailyCap: number | null }
  | { type: 'network' }
  | { type: 'upstream' }
  | { type: 'timeout' }
  | { type: 'generic'; message?: string };

type UsageMeta = {
  unlimited: boolean;
  dailyCap: number | null;
  remainingToday: number | null;
  source: string;
  // For canceling state display
  status?: string;
  cancelAtPeriodEnd?: boolean;
  expiresAt?: string | null;
};

// ── Main component ────────────────────────────────────────────────────────────

export default function BroBotMember() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  // Redirect guests
  useEffect(() => {
    if (!authLoading && !user) router.replace('/brobot');
  }, [authLoading, user, router]);

  // Form & response state
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<BroBotPayload | null>(null);
  const [loading, setLoading] = useState(false);

  // Error state — replaces the old "data-as-error" hack
  const [brobotError, setBrobotError] = useState<BroBotError | null>(null);

  // Entitlement / usage context for the usage badge
  const [usageMeta, setUsageMeta] = useState<UsageMeta | null>(null);

  // Loading state for the Stripe checkout redirect
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Feedback
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Sessions menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  // Fetch entitlements on mount so we can display the usage badge immediately
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch('/api/me/entitlements', {
          cache: 'no-store',
          credentials: 'include',
        });
        const body = await res.json();
        if (body.data) {
          const d = body.data;
          setUsageMeta({
            unlimited: d.aiAccess.unlimited,
            dailyCap: d.aiAccess.dailyCap,
            remainingToday: d.aiAccess.remainingToday,
            source: d.source,
            status: d.status,
            cancelAtPeriodEnd: d.cancelAtPeriodEnd,
            expiresAt: d.expiresAt,
          });
        }
      } catch {
        // Non-critical — quota badge just won't show until first successful call
      }
    })();
  }, [user]);

  // Auto-scroll to result / error card whenever it appears
  useEffect(() => {
    if ((data || brobotError) && resultRef.current) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [data, brobotError]);

  // Load recent sessions when the history menu opens
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
  }, [menuOpen, supabase, user]);

  // ── Submit handler ──────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !prompt.trim()) return;

    setLoading(true);
    setData(null);
    setBrobotError(null);
    setWasHelpful(null);
    setUserFeedback('');
    setFeedbackSubmitted(false);

    try {
      // Check for a cached answer first — cache hits never consume quota
      const { data: existing } = await supabase
        .from('brobot_user_responses')
        .select('answer')
        .eq('user_id', user.id)
        .eq('question', prompt)
        .limit(1)
        .single();

      if (existing?.answer) {
        setData(existing.answer as BroBotPayload);
        return; // useEffect handles scroll
      }

      // Phase 1: Call the secure server proxy
      const start = Date.now();
      let res: Response;

      try {
        res = await fetch('/api/brobot/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
      } catch {
        // True network failure — browser couldn't reach the server at all
        setBrobotError({ type: 'network' });
        return;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));

        // 429: quota hit — show the premium upgrade card
        if (res.status === 429 || errBody.isLimitReached) {
          setBrobotError({
            type: 'quota_limit',
            dailyCap: errBody.dailyCap ?? usageMeta?.dailyCap ?? null,
          });
          // Reflect 0 remaining in the usage badge immediately
          setUsageMeta(prev => (prev ? { ...prev, remainingToday: 0 } : null));
          return;
        }

        // 408 / 504: timeout
        if (res.status === 408 || res.status === 504) {
          setBrobotError({ type: 'timeout' });
          return;
        }

        // 5xx: upstream / AI service failure
        if (res.status >= 500) {
          setBrobotError({ type: 'upstream' });
          return;
        }

        // Everything else (400, 401, …)
        setBrobotError({ type: 'generic', message: errBody.error });
        return;
      }

      const parsed = await res.json();
      const latency = Date.now() - start;

      setData(parsed);

      // Keep the usage badge in sync with what the API just told us
      if (parsed.meta && typeof parsed.meta.remaining === 'number') {
        setUsageMeta(prev =>
          prev ? { ...prev, remainingToday: parsed.meta!.remaining! } : null
        );
      }

      // Save to cache for next time
      const { error: insertErr } = await supabase
        .from('brobot_user_responses')
        .insert({
          user_id: user.id,
          question: prompt,
          answer: parsed,
          latency,
          brobot_version: BROBOT_VERSION,
        });

      if (insertErr && insertErr.code !== '23505') {
        console.error('[BroBot] insert error:', insertErr);
      }
    } catch (err) {
      console.error('[BroBot] unexpected error:', err);
      // Never leak fake data again — use the error state instead
      setBrobotError({ type: 'generic' });
    } finally {
      setLoading(false);
    }
  }

  // ── Stripe upgrade handler ──────────────────────────────────────────────────

  async function handleUpgrade() {
    setUpgradeLoading(true);
    try {
      trackCheckoutStartedConversion({
        value: BROBOT_PRICING.unlimited.monthlyPrice,
        currency: 'USD',
      });

      const body = await createWebsiteBroBotCheckout({
        interval: 'month',
        isAuthenticated: true,
        returnTo: BROBOT_RETURN_TO,
        checkoutSource: 'brobot_member_upgrade',
      });
      const redirectUrl = body.url ?? body.portalUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        // Fallback: billing page
        router.push(BROBOT_BILLING_HREF);
      }
    } catch {
      router.push(BROBOT_BILLING_HREF);
    } finally {
      setUpgradeLoading(false);
    }
  }

  // ── Feedback handler ────────────────────────────────────────────────────────

  async function submitFeedback() {
    if (!data || feedbackSubmitted) return;
    setFeedbackSubmitted(true);
    try {
      // TODO (Phase 2): Move to /api/brobot/feedback
      await fetch('/api/case-prep-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, data, wasHelpful, userFeedback }),
      });
    } catch (err) {
      console.error('[BroBot] feedback error:', err);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#fefcf7] text-[#1A1C2C]">
        <Nav />
        <main className="flex min-h-[60vh] items-center justify-center px-6 pt-24">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm">
            Loading BroBot...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fefcf7] text-[#1A1C2C]">
      <Nav />

      {/* Toolbar: history burger + account */}
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
            {sessionsLoading ? (
              <p className="p-4 text-sm text-gray-500">Loading…</p>
            ) : sessions.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No recent prompts</p>
            ) : (
              sessions.map(s => (
                <button
                  key={s.response_id}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={() => {
                    setPrompt(s.question);
                    setData(s.answer);
                    setBrobotError(null);
                    setMenuOpen(false);
                  }}
                >
                  <p className="truncate font-medium text-[#1A1C2C]">{s.question}</p>
                  <time className="block text-xs text-gray-500">
                    {new Date(s.created_at).toLocaleString()}
                  </time>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="px-6 pb-6 text-center">
        <BroBotProductTabs />
      </div>

      <BroBotHeader />

      <main className="flex-1 px-6 pt-6 pb-12 relative max-w-3xl mx-auto w-full">
        {loading && <LoadingOverlay />}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card title="Describe Your Case">
            <textarea
              rows={3}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. 90 y/o femoral neck fracture"
              className="w-full rounded-md border border-gray-300 p-3 shadow-sm focus:ring-2 focus:ring-teal-600"
            />
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={loading || !prompt.trim() || usageMeta?.remainingToday === 0 && !usageMeta?.unlimited}
                className="inline-flex items-center rounded-md bg-teal-600 px-5 py-2 text-white shadow hover:bg-teal-700 disabled:opacity-40 transition-colors"
              >
                <MagnifyingGlassCircleIcon className="h-5 w-5 mr-2" />
                Get Prep
              </button>

              {/* Usage badge — shown once entitlements are loaded */}
              {usageMeta && <UsageBadge meta={usageMeta} />}
            </div>

            {/* Persistent BroBot subscription status / action (Phase 1 discoverability) */}
            {usageMeta && (
              <div className="mt-3 text-sm flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-600">
                {usageMeta.unlimited ? (
                  <>
                    <span className="font-medium text-emerald-700">Unlimited Access</span>
                    {usageMeta.cancelAtPeriodEnd && usageMeta.expiresAt ? (
                      <span className="text-amber-700">
                        • ends {new Date(usageMeta.expiresAt).toLocaleDateString()}
                      </span>
                    ) : null}
                    <Link
                      href={BROBOT_BILLING_HREF}
                      className="text-teal-600 hover:underline font-medium"
                    >
                      {usageMeta.cancelAtPeriodEnd ? 'Manage / Reactivate' : 'Manage Subscription'}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href={BROBOT_BILLING_HREF}
                      className="text-teal-600 hover:underline font-medium"
                    >
                      Start Free Trial
                    </Link>
                  </>
                )}
              </div>
            )}
          </Card>
        </form>

        {/* Proactive upgrade card for logged-in free users at daily limit */}
        {usageMeta && !usageMeta.unlimited && usageMeta.remainingToday === 0 && !loading && (
          <div className="mt-6">
            <QuotaHitCard
              dailyCap={usageMeta.dailyCap}
              onUpgrade={handleUpgrade}
              upgradeLoading={upgradeLoading}
              onTryTomorrow={() => { /* no-op for proactive case; user can just wait */ }}
            />
          </div>
        )}

        {/* Result / error area */}
        <div ref={resultRef}>
          {/* Error card — shown instead of data when something goes wrong */}
          {brobotError && !loading && (
            <div className="mt-8">
              {brobotError.type === 'quota_limit' ? (
                <QuotaHitCard
                  dailyCap={brobotError.dailyCap}
                  onUpgrade={handleUpgrade}
                  upgradeLoading={upgradeLoading}
                  onTryTomorrow={() => setBrobotError(null)}
                />
              ) : (
                <NonQuotaErrorCard
                  errorType={brobotError.type}
                  message={brobotError.type === 'generic' ? brobotError.message : undefined}
                  onRetry={() => setBrobotError(null)}
                />
              )}
            </div>
          )}

          {/* Response data */}
          {data && !brobotError && !loading && (
            <div className="mt-8 space-y-6">
              <Card title="Prep Summary">
                <Section label="Common Pimp Questions" bullets={data.pimpQuestions ?? []} />
                <Section label="Other Useful Facts" bullets={data.otherUsefulFacts ?? []} />
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
                        q => `Q: ${q.q} A: ${q.answer}`
                      )}
                    />
                  ) : null}

                  {data.anatomy.highYieldAnatomy?.structures?.length ? (
                    <Section
                      label="High-Yield Structures: Identification & Function"
                      bullets={data.anatomy.highYieldAnatomy.structures.map(
                        s => `${s.name} — ${s.why_high_yield}`
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
        </div>
      </main>
    </div>
  );
}

// ── Usage badge ───────────────────────────────────────────────────────────────

function UsageBadge({ meta }: { meta: UsageMeta }) {
  if (meta.unlimited) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-medium text-teal-700">
        <CheckCircleIcon className="h-3.5 w-3.5" />
        Unlimited Access
      </span>
    );
  }

  const remaining = meta.remainingToday ?? 0;
  const cap = meta.dailyCap ?? 0;

  if (remaining === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
        0 / {cap} free preps remaining today
      </span>
    );
  }

  if (remaining === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">
        <ExclamationCircleIcon className="h-3.5 w-3.5" />
        1 prep remaining today
      </span>
    );
  }

  return (
    <span className="text-xs text-gray-400">
      {remaining} of {cap} preps remaining today
    </span>
  );
}

// ── Quota-hit card (premium upgrade UX) ──────────────────────────────────────

function QuotaHitCard({
  dailyCap,
  onUpgrade,
  upgradeLoading,
  onTryTomorrow,
}: {
  dailyCap: number | null;
  onUpgrade: () => void;
  upgradeLoading: boolean;
  onTryTomorrow: () => void;
}) {
  const capLabel = dailyCap !== null ? `all ${dailyCap} free` : 'your free';

  return (
    <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
      {/* Amber header strip */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-start gap-3">
        <ExclamationCircleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-900 text-sm leading-snug">
            Daily limit reached
          </p>
          <p className="text-amber-700 text-xs mt-0.5 leading-snug">
            You&apos;ve used {capLabel} BroBot case preps for today.
            Free access resets at midnight&nbsp;UTC.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6 space-y-5">
        {/* Premium upgrade card */}
        <div className="rounded-xl bg-gradient-to-br from-[#0d4a3d] to-[#0a6b55] p-5 text-white">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-teal-300 shrink-0" />
              <span className="font-semibold text-lg leading-tight">Unlimited BroBot</span>
            </div>
            <span className="shrink-0 rounded-full bg-teal-400/20 border border-teal-300/30 px-2.5 py-0.5 text-xs font-semibold text-teal-200 tracking-wide uppercase">
              Unlimited
            </span>
          </div>

          <p className="text-teal-100 text-sm leading-relaxed mb-4">
            Start with a free 1-month trial, then keep BroBot ready for every orthopaedic case.
          </p>

          <ul className="space-y-2">
            {[
              'Unlimited AI-powered case preps',
              'Full anatomy & high-yield question libraries',
              'Cancel anytime during trial',
            ].map(feature => (
              <li key={feature} className="flex items-center gap-2 text-sm text-teal-100">
                <CheckCircleIcon className="h-4 w-4 text-teal-300 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onUpgrade}
            disabled={upgradeLoading}
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-60 transition-colors"
          >
            {upgradeLoading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Redirecting…
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                Start Free Trial
              </>
            )}
          </button>

          <button
            onClick={onTryTomorrow}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Try Again Tomorrow
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Have questions?{' '}
          <a
            href="mailto:support@snap-ortho.com"
            className="underline hover:text-gray-600 transition-colors"
          >
            support@snap-ortho.com
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Non-quota error card ──────────────────────────────────────────────────────

const ERROR_CONTENT: Record<
  Exclude<BroBotError['type'], 'quota_limit'>,
  { icon: string; title: string; message: string }
> = {
  network: {
    icon: '🔌',
    title: 'Connection issue',
    message:
      "BroBot couldn't reach the server. Check your internet connection and try again.",
  },
  upstream: {
    icon: '⚙️',
    title: 'Service temporarily unavailable',
    message:
      "BroBot's AI service is temporarily down. Please try again in a few minutes.",
  },
  timeout: {
    icon: '⏱',
    title: 'Request timed out',
    message: 'BroBot took too long to respond. Please try again.',
  },
  generic: {
    icon: '⚠️',
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
  },
};

function NonQuotaErrorCard({
  errorType,
  message,
  onRetry,
}: {
  errorType: Exclude<BroBotError['type'], 'quota_limit'>;
  message?: string;
  onRetry: () => void;
}) {
  const content = ERROR_CONTENT[errorType];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5" aria-hidden="true">
          {content.icon}
        </span>
        <div>
          <p className="font-semibold text-gray-800 leading-snug">{content.title}</p>
          <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
            {message ?? content.message}
          </p>
        </div>
      </div>

      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <ArrowPathIcon className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}

// ── Static sub-components (unchanged) ────────────────────────────────────────

function BroBotHeader() {
  return (
    <header className="px-6 pb-12 text-center">
      <div className="mx-auto flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-4">
          <Image
            src="/brologo.png"
            alt="Bro Logo"
            width={80}
            height={80}
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full"
          />
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-midnight">
            Meet <span className="text-teal-600">Bro</span>
          </h1>
        </div>
        <p className="max-w-xl text-lg text-gray-800">
          Prepare for ortho cases faster and smarter
        </p>
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

  const lower = label.toLowerCase();
  const isQA = lower.includes('pimp') || lower.includes('quiz');

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed(prev => !prev)}
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
            <li className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-400 italic">
              No data available for this section.
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
          onClick={() => setShow(s => !s)}
          className="ml-4 text-sm text-teal-600 hover:underline shrink-0"
        >
          {show ? 'Hide' : 'Show'} Answer
        </button>
      </div>
      {show && answer && (
        <p className="mt-2 rounded bg-teal-50 px-3 py-2 text-teal-900 shadow-inner">
          {answer}
        </p>
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
          onChange={e => setUserFeedback(e.target.value)}
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
  const [collapsed, setCollapsed] = useState(true);
  const isOpen = !collapsed;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed(p => !p)}
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
          {approaches.map(a => (
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
          onClick={() => setShow(s => !s)}
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
  return id
    .replace(/^approach_/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}
