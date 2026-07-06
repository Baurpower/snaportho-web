'use client';

import { Suspense, useState } from 'react';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeRedirectPath } from '@/lib/auth/redirects';
import {
  deriveBillingActivationPhase,
  getBillingPlanLabel,
  getBillingStatusBadge,
  parseMeEntitlementsPayload,
  shouldShowFreeQuotaUsage,
  type BillingActivationPhase,
  type BillingEntitlementView,
  type MeEntitlementsPayload,
} from '@/lib/brobot/billing-entitlement-state';
import { BROBOT_PRICING } from '@/lib/config/brobot-pricing';
import {
  trackCheckoutStartedConversion,
  trackSubscriptionConversion,
} from '@/lib/analytics/googleAds';
import { createWebsiteBroBotCheckout } from '@/lib/brobot/checkout-client';
import { invalidateBroBotEntitlementCache } from '@/lib/brobot/brobot-entitlement-events';

// ─── Main content ─────────────────────────────────────────────────────────────

function BillingContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [billingView, setBillingView] = useState<BillingEntitlementView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const success = searchParams?.get('success') === 'true';
  const canceled = searchParams?.get('canceled') === 'true';
  const checkoutSessionId = searchParams?.get('session_id');
  const awaitingCheckoutConfirmation = success || Boolean(checkoutSessionId);
  const returnTo = safeRedirectPath(searchParams?.get('returnTo'), '');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      const currentFullPath = window.location.pathname + window.location.search;

      if (process.env.NODE_ENV !== 'production') {
        console.log('[billing] No user detected on mount, redirecting to sign-in with full path:', currentFullPath);
      }

      router.push(`/auth/sign-in?redirectTo=${encodeURIComponent(currentFullPath)}`);
      return;
    }

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const fetchEntitlement = async (): Promise<BillingEntitlementView | null> => {
      try {
        const res = await fetch('/api/me/entitlements?source=billing', {
          cache: 'no-store',
          credentials: 'include',
        });
        const payload = (await res.json()) as MeEntitlementsPayload;
        const view = parseMeEntitlementsPayload(payload);

        console.info('[billing] entitlement_poll_result', {
          access: view.access,
          isPaid: view.isPaid,
          isUnlimited: view.isUnlimited,
          status: view.status,
          provider: view.entitlement?.provider ?? null,
          selectedSubscriptionId: view.entitlement?.stripeSubscriptionId?.slice(0, 12) ?? null,
        });

        return view;
      } catch (e) {
        console.error('[billing] entitlement_poll_failed', e);
        return null;
      }
    };

    const applyEntitlementView = (view: BillingEntitlementView | null) => {
      if (!view) return;
      setBillingView(view);
      if (view.isPaid) {
        setPollTimedOut(false);
        invalidateBroBotEntitlementCache();
        console.info('[billing] activation_resolved', {
          access: view.access,
          status: view.status,
          phase: 'active',
        });
      }
    };

    const load = async () => {
      const view = await fetchEntitlement();
      if (!isMounted) return;
      applyEntitlementView(view);
      setLoading(false);

      if (awaitingCheckoutConfirmation && !view?.isPaid) {
        let attempts = 0;
        const maxAttempts = 25;

        pollInterval = setInterval(async () => {
          attempts++;
          const latest = await fetchEntitlement();
          if (!isMounted) return;

          if (latest) applyEntitlementView(latest);

          if (latest?.isPaid) {
            if (pollInterval) clearInterval(pollInterval);
            return;
          }

          if (attempts >= maxAttempts) {
            if (pollInterval) clearInterval(pollInterval);
            setPollTimedOut(true);
            console.warn('[billing] activation_poll_timed_out', { attempts });

            try {
              await fetch('/api/billing/sync', { method: 'POST' });
              const afterSync = await fetchEntitlement();
              if (isMounted && afterSync) {
                applyEntitlementView(afterSync);
                if (!afterSync.isPaid) {
                  console.warn('[billing] activation_sync_fallback_incomplete', {
                    access: afterSync.access,
                    status: afterSync.status,
                  });
                }
              }
            } catch (e) {
              console.error('[billing] manual sync fallback failed', e);
            }
          }
        }, 1000);
      }
    };

    load();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [authLoading, awaitingCheckoutConfirmation, user, router, searchParams]);

  useEffect(() => {
    const stripeSubscriptionId = billingView?.entitlement?.stripeSubscriptionId;
    if (!awaitingCheckoutConfirmation || !billingView?.isPaid || !stripeSubscriptionId) {
      return;
    }

    const storageKey = `google_ads_subscription_conversion:${stripeSubscriptionId}`;
    if (window.localStorage.getItem(storageKey)) {
      return;
    }

    trackSubscriptionConversion({
      currency: 'USD',
      transactionId: stripeSubscriptionId,
    });
    window.localStorage.setItem(storageKey, 'sent');
  }, [awaitingCheckoutConfirmation, billingView]);

  const handleRestoreSubscription = async () => {
    setPollTimedOut(false);
    setLoading(true);
    try {
      await fetch('/api/billing/sync', { method: 'POST' });
      const res = await fetch('/api/me/entitlements?source=billing', {
        cache: 'no-store',
        credentials: 'include',
      });
      const view = parseMeEntitlementsPayload((await res.json()) as MeEntitlementsPayload);
      setBillingView(view);
      if (!view.isPaid) {
        setPollTimedOut(true);
      }
    } catch (e) {
      console.error('[billing] restore_subscription_failed', e);
      setPollTimedOut(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (interval: 'month' | 'year') => {
    try {
      trackCheckoutStartedConversion({
        value:
          interval === 'year'
            ? BROBOT_PRICING.unlimited.yearlyPrice
            : BROBOT_PRICING.unlimited.monthlyPrice,
        currency: 'USD',
      });

      const { url, portalUrl } = await createWebsiteBroBotCheckout({
        interval,
        isAuthenticated: true,
        returnTo: returnTo || undefined,
        checkoutSource: 'account_billing_page',
      });
      const redirectUrl = url ?? portalUrl;
      if (redirectUrl) window.location.href = redirectUrl;
    } catch {
      alert('Failed to start checkout');
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTo: returnTo || undefined }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      alert('Failed to open billing portal');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading your plan...</div>
      </div>
    );
  }

  const isUnlimited = billingView?.isUnlimited === true;
  const isPaid = billingView?.isPaid === true;
  const activationPhase: BillingActivationPhase = deriveBillingActivationPhase({
    awaitingCheckoutConfirmation,
    isPaid,
    pollTimedOut,
  });
  const planLabel = getBillingPlanLabel({ isUnlimited, activationPhase });
  const statusBadge = getBillingStatusBadge({
    isUnlimited,
    activationPhase,
    status: billingView?.status ?? null,
    cancelAtPeriodEnd: billingView?.cancelAtPeriodEnd === true,
  });
  const showFreeQuota = shouldShowFreeQuotaUsage({ isUnlimited, activationPhase });
  const showUpgradePrompt = !isUnlimited && activationPhase === 'idle';
  const showTrialPromo = showUpgradePrompt;
  const expiresAt = billingView?.expiresAt;
  const remaining = billingView?.remainingToday ?? 0;
  const dailyCap = billingView?.dailyCap ?? null;
  const cancelAtPeriodEnd = billingView?.cancelAtPeriodEnd === true;
  const isCanceledAtPeriodEnd = isPaid && cancelAtPeriodEnd;

  return (
    <div className="min-h-screen bg-[#f8f7f2] text-[#1A1C2C]">
      {/* HERO */}
      <div className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium tracking-[1px] text-teal-700 shadow-sm border border-teal-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          PREMIUM AI
        </div>

        <h1 className="mt-6 text-6xl md:text-7xl font-semibold tracking-[-2.5px] leading-[0.95]">
          Unlimited BroBot.<br />Across every SnapOrtho product.
        </h1>

        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 border text-teal-700 text-xs font-medium">
            ✓ Web • Mobile • MyCases
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 border text-teal-700 text-xs font-medium">
            ✓ Future AI tools included
          </div>
        </div>

        {(awaitingCheckoutConfirmation || canceled) && (
          <div className="mt-8 max-w-2xl mx-auto">
            {awaitingCheckoutConfirmation && activationPhase === 'activating' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-amber-900">
                <div className="font-semibold">Payment received. Confirming BroBot Unlimited...</div>
                <div className="text-sm mt-0.5">
                  We are syncing your subscription now. This usually takes a few seconds.
                </div>
              </div>
            )}
            {awaitingCheckoutConfirmation && activationPhase === 'active' && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 px-6 py-4 text-teal-800">
                <div className="font-semibold">Subscription activated successfully.</div>
                <div className="text-sm mt-0.5">You now have unlimited BroBot access across SnapOrtho.</div>
              </div>
            )}
            {awaitingCheckoutConfirmation && activationPhase === 'delayed' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-amber-900">
                <div className="font-semibold">Payment received. Activation is taking longer than expected.</div>
                <div className="text-sm mt-0.5">
                  Use Restore Subscription below or contact support if access does not appear soon.
                </div>
              </div>
            )}
            {canceled && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-amber-800">
                <div className="font-semibold">Checkout was canceled.</div>
                <div className="text-sm mt-0.5">No changes were made to your plan.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CURRENT PLAN STRIP */}
      <div className="max-w-5xl mx-auto px-6 mb-10">
        <div className="rounded-3xl bg-white border shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="uppercase text-xs tracking-[1.5px] text-gray-500 font-medium">Your current plan</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-4xl font-semibold tracking-tight">{planLabel}</span>

              {statusBadge === 'processing' && (
                <span className="inline-block rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 animate-pulse">
                  PROCESSING
                </span>
              )}

              {statusBadge === 'delayed' && (
                <span className="inline-block rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1">
                  SYNC DELAYED
                </span>
              )}

              {statusBadge === 'trial' && (
                <span className="inline-block rounded-full bg-sky-100 text-sky-800 text-xs font-semibold px-3 py-1">
                  TRIAL ACTIVE
                </span>
              )}

              {statusBadge === 'active' && (
                <span className="inline-block rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1">
                  ACTIVE
                </span>
              )}

              {statusBadge === 'canceling' && (
                <span className="inline-block rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1">
                  CANCELING
                </span>
              )}
            </div>

            {/* Renewal / End date line */}
            {isPaid && expiresAt && (
              <div className="mt-1.5 text-sm text-gray-500">
                {isCanceledAtPeriodEnd ? (
                  <>Your unlimited access ends {new Date(expiresAt).toLocaleDateString('en-US', { 
                    month: 'long', day: 'numeric', year: 'numeric' 
                  })}</>
                ) : (
                  <>Renews {new Date(expiresAt).toLocaleDateString('en-US', { 
                    month: 'long', day: 'numeric', year: 'numeric' 
                  })}</>
                )}
              </div>
            )}

            {showFreeQuota && (
              <div className="mt-2 text-sm">
                <span className="font-medium text-gray-700">
                  {remaining} / {dailyCap}
                </span>{' '}
                <span className="text-gray-500">free preps used today</span>
              </div>
            )}

            {activationPhase === 'delayed' && (
              <div className="mt-2 text-sm text-amber-800">
                Your Stripe payment succeeded. We are still syncing your unlimited access.
              </div>
            )}
          </div>

          <div>
            {isUnlimited ? (
              <button
                onClick={handleManageBilling}
                className={`rounded-2xl px-8 py-3 text-sm font-semibold transition-colors ${
                  isCanceledAtPeriodEnd
                    ? 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                {isCanceledAtPeriodEnd ? 'Manage or Reactivate Subscription' : 'Manage Billing & Subscription'}
              </button>
            ) : activationPhase === 'delayed' ? (
              <button
                onClick={handleRestoreSubscription}
                className="rounded-2xl border border-amber-300 bg-amber-50 px-8 py-3 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
              >
                Restore Subscription
              </button>
            ) : showUpgradePrompt ? (
              <div className="text-sm text-gray-500 max-w-[260px]">
                Upgrade to remove daily limits and unlock BroBot across the entire SnapOrtho platform.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* VALUE PROPOSITION */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <div className="text-center mb-8">
          <div className="text-sm font-semibold tracking-widest text-teal-600">WHY ORTHOPAEDIC LEARNERS UPGRADE</div>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight">One plan. Every AI tool.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: "Unlimited BroBot Case Prep",
              desc: "No daily caps. Prepare for any case, any time — web or mobile."
            },
            {
              title: "Works Across SnapOrtho",
              desc: "Web, MyCases mobile app, and every future AI feature included."
            },
            {
              title: "Always Getting Better",
              desc: "Priority access to new orthopaedic AI tools as we release them."
            }
          ].map((item, i) => (
            <div key={i} className="rounded-3xl border bg-white p-6">
              <div className="text-lg font-semibold mb-2">{item.title}</div>
              <p className="text-gray-600 text-[15px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PRICING */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-semibold tracking-tight">
            {isUnlimited ? 'Your BroBot Unlimited Plan' : 'Start Your 1-month Free Trial'}
          </h2>
          <p className="mt-2 text-gray-600">
            {isUnlimited
              ? 'Manage your current subscription or compare billing options.'
              : 'Unlimited BroBot access for 1 month. Then choose monthly or yearly billing.'}
          </p>
        </div>

        {showTrialPromo && (
          <div className="mx-auto mb-6 max-w-4xl rounded-3xl border border-teal-200 bg-white/80 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold tracking-widest text-teal-700">
                  FREE 1-MONTH TRIAL
                </div>
                <p className="mt-1 text-lg font-semibold text-[#1A1C2C]">
                  Try BroBot Unlimited with no daily caps.
                </p>
              </div>
              <p className="max-w-md text-sm leading-6 text-gray-600">
                Cancel anytime during the trial. Your paid plan starts only after the trial ends.
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* MONTHLY */}
          <div className="rounded-3xl border bg-white p-8 flex flex-col">
            <div>
              <div className="text-sm font-semibold tracking-widest text-gray-500">MONTHLY</div>
              <div className="mt-4 text-4xl font-semibold tracking-tight">
                {isUnlimited
                  ? BROBOT_PRICING.unlimited.monthlyPriceLabel
                  : BROBOT_PRICING.unlimited.trialLabel}
              </div>
              <p className="mt-2 text-lg font-medium text-gray-600">
                {isUnlimited ? 'Monthly billing option' : BROBOT_PRICING.unlimited.monthlyAfterTrialLabel}
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                {(isUnlimited
                  ? [
                      'Unlimited BroBot Case Prep',
                      'Unlimited AI questions',
                      'No daily caps',
                      'Manage billing anytime',
                    ]
                  : [
                      'Unlimited BroBot Case Prep',
                      'Unlimited AI questions',
                      'No daily caps',
                      'Cancel anytime during trial',
                    ]).map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="mt-0.5 text-teal-600">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-8">
              <button
                onClick={() => handleUpgrade('month')}
                disabled={isUnlimited}
                className="w-full rounded-2xl border border-gray-300 py-3.5 text-base font-semibold hover:bg-gray-50 disabled:opacity-60 transition-all active:scale-[0.985]"
              >
                {isUnlimited ? 'Current Plan' : 'Start 1-month free trial'}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                {isUnlimited ? 'Billed monthly · Cancel anytime' : 'Then billed monthly · Cancel anytime'}
              </p>
            </div>
          </div>

          {/* YEARLY — BEST VALUE */}
          <div className="rounded-3xl border-2 border-teal-600 bg-white p-8 flex flex-col relative shadow-lg shadow-teal-900/5">
            <div className="absolute -top-3 right-6">
              <div className="inline-flex items-center rounded-full bg-teal-600 px-4 py-1 text-xs font-semibold tracking-wider text-white shadow">
                BEST VALUE
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold tracking-widest text-teal-600">YEARLY</div>
              <div className="mt-4 text-4xl font-semibold tracking-tight">
                {isUnlimited
                  ? BROBOT_PRICING.unlimited.yearlyPriceLabel
                  : BROBOT_PRICING.unlimited.trialLabel}
              </div>
              <p className="mt-2 text-lg font-medium text-gray-600">
                {isUnlimited ? 'Annual billing option' : BROBOT_PRICING.unlimited.yearlyAfterTrialLabel}
              </p>
              <div className="mt-1 text-sm">
                <span className="line-through text-gray-400">$35.88</span>
                <span className="ml-2 font-medium text-emerald-600">
                  {BROBOT_PRICING.unlimited.yearlySavingsLabel}
                </span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                {(isUnlimited
                  ? [
                      'Unlimited BroBot access',
                      'Best long-term value',
                      'Priority access to new AI tools',
                      'Manage billing anytime',
                    ]
                  : [
                      'Unlimited BroBot access',
                      'Best long-term value',
                      'Priority access to new AI tools',
                      'Cancel anytime during trial',
                    ]).map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="mt-0.5 text-teal-600">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-8">
              <button
                onClick={() => handleUpgrade('year')}
                disabled={isUnlimited}
                className="w-full rounded-2xl bg-[#0f766e] hover:bg-[#115e59] py-3.5 text-base font-semibold text-white shadow-sm transition-all active:scale-[0.985] disabled:opacity-70"
              >
                {isUnlimited ? 'Current Plan' : 'Start 1-month free trial — Yearly'}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                {isUnlimited ? 'Billed annually · Best price' : 'Then billed annually · Best price'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TRUST / FINAL CTA */}
      <div className="border-t bg-white py-10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            <div>Cancel anytime</div>
            <div>Secure Stripe billing</div>
            <div>Instant trial activation</div>
            <div>Private &amp; secure</div>
          </div>
          <div className="mt-4 text-xs text-gray-400">
            Questions? <a href="mailto:support@snap-ortho.com" className="underline hover:text-gray-600">support@snap-ortho.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page export — Suspense required around useSearchParams consumer ──────────

export default function BroBotBillingPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <BillingContent />
    </Suspense>
  );
}
