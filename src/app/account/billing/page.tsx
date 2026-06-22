'use client';

import { Suspense, useState } from 'react';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import type { BroBotEntitlement } from '@/lib/brobot/entitlements';
import { safeRedirectPath } from '@/lib/auth/redirects';
import { BROBOT_PRICING } from '@/lib/config/brobot-pricing';
import {
  trackCheckoutStartedConversion,
  trackSubscriptionConversion,
} from '@/lib/analytics/googleAds';

// ─── Main content ─────────────────────────────────────────────────────────────

function BillingContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [entitlement, setEntitlement] = useState<BroBotEntitlement | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle success/cancel feedback from Stripe redirects
  const success = searchParams?.get('success') === 'true';
  const canceled = searchParams?.get('canceled') === 'true';
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

    const fetchEntitlement = async (): Promise<BroBotEntitlement | null> => {
      try {
        const res = await fetch('/api/me/entitlements', {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await res.json();
        return data.data || null;
      } catch (e) {
        console.error(e);
        return null;
      }
    };

    const load = async () => {
      const data = await fetchEntitlement();
      if (!isMounted) return;
      setEntitlement(data);
      setLoading(false);

      // If we have success=true (either directly or after auth redirect), poll for the subscription to appear
      const hasSuccessParam = searchParams?.get('success') === 'true';
      if (hasSuccessParam && data?.source !== 'subscription') {
        let attempts = 0;
        const maxAttempts = 15; // ~15 seconds to allow for webhook + session hydration

        pollInterval = setInterval(async () => {
          attempts++;
          const latest = await fetchEntitlement();
          if (!isMounted) return;

          setEntitlement(latest);

          if (latest?.source === 'subscription' || attempts >= maxAttempts) {
            if (pollInterval) clearInterval(pollInterval);

            // Final fallback: if still not active after polling but we have success param,
            // trigger a safe server-side sync from Stripe (webhook may have been delayed/missed)
            if (attempts >= maxAttempts && hasSuccessParam && latest?.source !== 'subscription') {
              try {
                await fetch('/api/billing/sync', { method: 'POST' });
                const afterSync = await fetchEntitlement();
                if (isMounted && afterSync) {
                  setEntitlement(afterSync);
                }
              } catch (e) {
                console.error('[billing] manual sync fallback failed', e);
              }
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
  }, [authLoading, user, router, searchParams]);

  useEffect(() => {
    if (!success || entitlement?.source !== 'subscription' || !entitlement.stripeSubscriptionId) {
      return;
    }

    const storageKey = `google_ads_subscription_conversion:${entitlement.stripeSubscriptionId}`;
    if (window.localStorage.getItem(storageKey)) {
      return;
    }

    trackSubscriptionConversion({
      currency: 'USD',
      transactionId: entitlement.stripeSubscriptionId,
    });
    window.localStorage.setItem(storageKey, 'sent');
  }, [success, entitlement]);

  const handleUpgrade = async (interval: 'month' | 'year') => {
    try {
      trackCheckoutStartedConversion({
        value:
          interval === 'year'
            ? BROBOT_PRICING.unlimited.yearlyPrice
            : BROBOT_PRICING.unlimited.monthlyPrice,
        currency: 'USD',
      });

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval, returnTo: returnTo || undefined }),
      });
      const { url, portalUrl } = await res.json();
      if (url || portalUrl) window.location.href = url || portalUrl;
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

  const isUnlimited = entitlement?.aiAccess?.unlimited === true;
  const isPaid = entitlement?.source === 'subscription';
  const isActivating = success && !isPaid && !loading;
  const expiresAt = entitlement?.expiresAt;
  const remaining = entitlement?.aiAccess?.remainingToday ?? 0;
  const dailyCap = entitlement?.aiAccess?.dailyCap ?? null;

  // New cancellation-aware state
  const cancelAtPeriodEnd = entitlement?.cancelAtPeriodEnd === true;
  const subStatus = entitlement?.status;
  const isCanceledAtPeriodEnd = isPaid && cancelAtPeriodEnd;

  if (process.env.NODE_ENV !== 'production' && isPaid) {
    console.log('[billing] Subscription state', { subStatus, cancelAtPeriodEnd, expiresAt, isUnlimited });
  }

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

        {/* Stripe Redirect Feedback Banners */}
        {(success || canceled) && (
          <div className="mt-8 max-w-2xl mx-auto">
            {success && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 px-6 py-4 text-teal-800">
                <div className="font-semibold">Subscription activated successfully.</div>
                <div className="text-sm mt-0.5">You now have unlimited BroBot access across SnapOrtho.</div>
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
              <span className="text-4xl font-semibold tracking-tight">
                {isActivating ? 'Activating...' : isUnlimited ? 'Unlimited BroBot' : 'Free'}
              </span>

              {/* Status badges */}
              {isActivating && (
                <span className="inline-block rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 animate-pulse">
                  PROCESSING
                </span>
              )}

              {isPaid && !isActivating && !isCanceledAtPeriodEnd && (
                <span className="inline-block rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1">
                  ACTIVE
                </span>
              )}

              {isCanceledAtPeriodEnd && (
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

            {!isUnlimited && (
              <div className="mt-2 text-sm">
                <span className="font-medium text-gray-700">
                  {remaining} / {dailyCap}
                </span>{' '}
                <span className="text-gray-500">free preps used today</span>
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
                {isCanceledAtPeriodEnd ? 'Manage or Reactivate Subscription' : 'Manage Billing &amp; Subscription'}
              </button>
            ) : (
              <div className="text-sm text-gray-500 max-w-[260px]">
                Upgrade to remove daily limits and unlock BroBot across the entire SnapOrtho platform.
              </div>
            )}
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
            {isUnlimited ? 'Your BroBot Unlimited Plan' : 'Start Your Free Trial'}
          </h2>
          <p className="mt-2 text-gray-600">
            {isUnlimited
              ? 'Manage your current subscription or compare billing options.'
              : 'Unlimited BroBot access for 1 month. Then choose monthly or yearly billing.'}
          </p>
        </div>

        {!isUnlimited && (
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
                {isUnlimited ? 'Current Plan' : 'Start Free Trial'}
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
                {isUnlimited ? 'Current Plan' : 'Start Free Trial — Yearly'}
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
