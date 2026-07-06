'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Sparkles,
  BookOpen,
  Smartphone,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { safeRedirectPath } from '@/lib/auth/redirects';
import { trackCheckoutCompletedEvent, trackSubscriptionClaimedEvent } from '@/lib/analytics/googleAds';
import {
  fetchMeEntitlementsView,
  type WebEntitlementView,
} from '@/lib/brobot/billing-entitlement-state';
import { invalidateBroBotEntitlementCache } from '@/lib/brobot/brobot-entitlement-events';
import {
  buildCheckoutSuccessReturnPath,
  CHECKOUT_SUCCESS_BENEFITS,
  CHECKOUT_SUCCESS_MAX_POLL_ATTEMPTS,
  CHECKOUT_SUCCESS_POLL_INTERVAL_MS,
  getCheckoutSuccessCtas,
  getCheckoutSuccessHeadline,
  getCheckoutSuccessStatusBadge,
  getCheckoutSuccessStatusBadgeLabel,
  getCheckoutSuccessSubtext,
  logCheckoutSuccess,
  resolveCheckoutSuccessPhase,
  shouldShowCheckoutBenefitCards,
  shouldShowCheckoutFreeQuota,
  summarizeEntitlementPollResult,
  type CheckoutSuccessPhase,
} from '@/lib/brobot/checkout-success-state';

const BENEFIT_ICONS = [MessageSquare, BookOpen, Smartphone] as const;

export default function CheckoutSuccessClient() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const sessionId = searchParams?.get('session_id') ?? null;
  const returnTo = safeRedirectPath(searchParams?.get('return_to'), '/brobot/chat');

  const [entitlementView, setEntitlementView] = useState<WebEntitlementView | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const syncAttemptedRef = useRef(false);
  const landedLoggedRef = useRef(false);

  const phase: CheckoutSuccessPhase = resolveCheckoutSuccessPhase({
    isAuthenticated: Boolean(user),
    isUnlimited: entitlementView?.isUnlimited === true,
    pollTimedOut,
  });

  const headline = getCheckoutSuccessHeadline(phase);
  const subtext = getCheckoutSuccessSubtext(phase);
  const statusBadge = getCheckoutSuccessStatusBadge(phase, entitlementView?.status ?? null);
  const statusBadgeLabel = getCheckoutSuccessStatusBadgeLabel(statusBadge);
  const showBenefitCards = shouldShowCheckoutBenefitCards(phase);
  const showFreeQuota = shouldShowCheckoutFreeQuota(phase);
  const ctas = getCheckoutSuccessCtas({
    phase,
    isUnlimited: entitlementView?.isUnlimited === true,
  });

  const signInRedirect = useMemo(
    () => buildCheckoutSuccessReturnPath(sessionId, returnTo),
    [returnTo, sessionId]
  );

  const fetchEntitlements = useCallback(async () => {
    const view = await fetchMeEntitlementsView({ source: 'checkout_success' });
    logCheckoutSuccess('entitlement_poll_result', summarizeEntitlementPollResult(view));
    return view;
  }, []);

  const runStripeSync = useCallback(async () => {
    const res = await fetch('/api/billing/sync', { method: 'POST' });
    if (!res.ok) return null;
    return res.json();
  }, []);

  const claimPendingSubscription = useCallback(async () => {
    if (!sessionId) return null;
    const res = await fetch('/api/billing/claim-pending-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutSessionId: sessionId }),
    });
    if (!res.ok) return null;
    return res.json();
  }, [sessionId]);

  const applyEntitlementView = useCallback((view: WebEntitlementView | null) => {
    if (!view) return;
    setEntitlementView(view);
    if (view.isUnlimited) {
      setPollTimedOut(false);
      invalidateBroBotEntitlementCache();
      logCheckoutSuccess('activation_resolved', summarizeEntitlementPollResult(view));
    }
  }, []);

  useEffect(() => {
    if (landedLoggedRef.current) return;
    landedLoggedRef.current = true;
    logCheckoutSuccess('landed', { sessionIdPresent: Boolean(sessionId) });
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      trackCheckoutCompletedEvent({
        source: 'brobot_checkout_success',
        checkout_session_id: sessionId,
      });
    }
  }, [sessionId]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setEntitlementView(null);
      setPollTimedOut(false);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function activate() {
      setPollTimedOut(false);

      if (sessionId) {
        try {
          const claimResult = await claimPendingSubscription();
          const claimStatus = claimResult?.result?.status as string | undefined;
          if (
            claimStatus === 'claimed' ||
            claimStatus === 'already_claimed_by_user' ||
            claimStatus === 'already_has_subscription'
          ) {
            trackSubscriptionClaimedEvent({
              source: 'checkout_success',
              status: claimStatus,
            });
          }
        } catch {
          // Best-effort claim; webhook may have already synced.
        }
      }

      let attempts = 0;

      const poll = async () => {
        attempts += 1;
        const view = await fetchEntitlements();
        if (cancelled) return;

        applyEntitlementView(view);

        if (view?.isUnlimited) {
          if (pollTimer) clearInterval(pollTimer);
          return;
        }

        if (attempts >= CHECKOUT_SUCCESS_MAX_POLL_ATTEMPTS) {
          if (pollTimer) clearInterval(pollTimer);

          if (!syncAttemptedRef.current) {
            syncAttemptedRef.current = true;
            try {
              await runStripeSync();
              const afterSync = await fetchEntitlements();
              if (!cancelled) {
                applyEntitlementView(afterSync);
                if (afterSync?.isUnlimited) return;
              }
            } catch {
              // Fall through to delayed state.
            }
          }

          if (!cancelled) {
            setPollTimedOut(true);
            logCheckoutSuccess('activation_delayed', {
              attempts,
              access: view?.access ?? null,
            });
          }
        }
      };

      await poll();
      pollTimer = setInterval(poll, CHECKOUT_SUCCESS_POLL_INTERVAL_MS);
    }

    void activate();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [
    applyEntitlementView,
    authLoading,
    claimPendingSubscription,
    fetchEntitlements,
    runStripeSync,
    sessionId,
    user,
  ]);

  const handleRestoreSubscription = async () => {
    logCheckoutSuccess('restore_clicked');
    setIsRestoring(true);
    setPollTimedOut(false);

    try {
      const syncResult = await runStripeSync();
      const view = await fetchEntitlements();
      applyEntitlementView(view);

      logCheckoutSuccess('restore_result', {
        syncOk: syncResult !== null,
        ...summarizeEntitlementPollResult(view),
      });

      if (!view?.isUnlimited) {
        setPollTimedOut(true);
        logCheckoutSuccess('activation_delayed', summarizeEntitlementPollResult(view));
      }
    } catch {
      setPollTimedOut(true);
      logCheckoutSuccess('restore_result', { syncOk: false, isUnlimited: false });
    } finally {
      setIsRestoring(false);
    }
  };

  const isLoading = authLoading || (Boolean(user) && phase === 'activating' && !pollTimedOut);

  return (
    <main className="min-h-screen bg-midnight text-white">
      <section className="relative isolate flex min-h-screen items-center px-5 py-16 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_16%,rgba(163,207,255,0.22),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(255,210,90,0.16),transparent_30%),linear-gradient(135deg,#0D0E1F_0%,#121430_52%,#18264a_100%)]" />

        <div className="mx-auto w-full max-w-2xl rounded-[2rem] border border-white/12 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/25">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : phase === 'active' ? (
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky">BroBot Unlimited</p>
            {statusBadgeLabel ? (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
                  statusBadge === 'trial'
                    ? 'bg-sky/20 text-sky ring-1 ring-sky/30'
                    : statusBadge === 'active'
                      ? 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25'
                      : statusBadge === 'processing'
                        ? 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/25 animate-pulse'
                        : 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/25'
                }`}
              >
                {statusBadgeLabel}
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{headline}</h1>
          <p className="mt-4 text-base leading-7 text-white/[0.72]">{subtext}</p>

          {showBenefitCards ? (
            <ul className="mt-8 grid gap-3">
              {CHECKOUT_SUCCESS_BENEFITS.map((benefit, index) => {
                const Icon = BENEFIT_ICONS[index] ?? Sparkles;
                return (
                  <li
                    key={benefit.title}
                    className="rounded-2xl border border-white/12 bg-white/[0.06] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{benefit.title}</p>
                        <p className="mt-1 text-sm leading-6 text-white/[0.68]">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {showFreeQuota ? (
            <div className="mt-6 rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-sm text-white/70">
              Free quota information
            </div>
          ) : null}

          {sessionId && user ? (
            <p className="mt-6 text-xs text-white/45">
              Checkout reference: {sessionId.slice(0, 20)}…
            </p>
          ) : null}

          {isLoading ? (
            <p className="mt-7 text-sm font-semibold text-white/60">Confirming unlimited access…</p>
          ) : phase === 'guest' ? (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={{
                  pathname: '/auth/sign-up',
                  query: { redirectTo: signInRedirect },
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-3 text-sm font-black text-midnight transition hover:-translate-y-0.5 hover:bg-[#ffe28a]"
              >
                Create Account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={{
                  pathname: '/auth/sign-in',
                  query: { redirectTo: signInRedirect },
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Sign In
              </Link>
            </div>
          ) : ctas.length > 0 ? (
            <div className="mt-7 flex flex-col gap-3">
              {ctas.map((cta) => {
                if (cta.action === 'restore') {
                  return (
                    <button
                      key={cta.label}
                      type="button"
                      disabled={isRestoring}
                      onClick={() => void handleRestoreSubscription()}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-3 text-sm font-black text-midnight transition hover:-translate-y-0.5 hover:bg-[#ffe28a] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          Restoring…
                        </>
                      ) : (
                        cta.label
                      )}
                    </button>
                  );
                }

                const className =
                  cta.kind === 'primary'
                    ? 'inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-3 text-sm font-black text-midnight transition hover:-translate-y-0.5 hover:bg-[#ffe28a]'
                    : cta.kind === 'secondary'
                      ? 'inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15'
                      : 'inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white/70 underline-offset-4 transition hover:text-white hover:underline';

                return (
                  <Link key={cta.label} href={cta.href ?? '#'} className={className}>
                    {cta.kind === 'primary' ? (
                      <>
                        {cta.label}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </>
                    ) : (
                      cta.label
                    )}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}