'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import {
  trackCheckoutCompletedEvent,
  trackSubscriptionClaimedEvent,
} from '@/lib/analytics/googleAds';

type ClaimStatus =
  | 'idle'
  | 'claiming'
  | 'claimed'
  | 'already_has_subscription'
  | 'already_claimed_by_user'
  | 'email_mismatch'
  | 'not_found'
  | 'not_claimable'
  | 'error';

export default function WelcomeClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutSessionId = searchParams?.get('checkout_session_id') ?? null;
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const suffix = checkoutSessionId
      ? `?checkout_session_id=${encodeURIComponent(checkoutSessionId)}`
      : '';
    return `/welcome${suffix}`;
  }, [checkoutSessionId]);

  useEffect(() => {
    if (checkoutSessionId) {
      trackCheckoutCompletedEvent({
        source: 'brobot_public_pricing',
        checkout_session_id: checkoutSessionId,
      });
    }
  }, [checkoutSessionId]);

  useEffect(() => {
    if (loading || !user || claimStatus !== 'idle') return;

    let cancelled = false;

    async function claim() {
      setClaimStatus('claiming');

      try {
        const response = await fetch('/api/billing/claim-pending-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutSessionId }),
        });
        const payload = await response.json();
        const status = payload?.result?.status as ClaimStatus | undefined;

        if (cancelled) return;

        if (
          status === 'claimed' ||
          status === 'already_has_subscription' ||
          status === 'already_claimed_by_user'
        ) {
          setClaimStatus(status === 'claimed' ? 'claimed' : 'already_has_subscription');
          trackSubscriptionClaimedEvent({
            source: 'brobot_welcome',
            status,
          });
          router.replace('/brobot/chat?subscription=active');
          return;
        }

        if (status === 'email_mismatch') {
          setClaimStatus('email_mismatch');
          setMessage(
            'This checkout was completed with a different email. Sign in with the checkout email to activate BroBot automatically.'
          );
          return;
        }

        if (status === 'not_claimable') {
          setClaimStatus('not_claimable');
          setMessage('We found your checkout, but the subscription is not active yet.');
          return;
        }

        setClaimStatus('not_found');
        setMessage('We could not find a pending BroBot subscription for this account.');
      } catch (error) {
        if (cancelled) return;
        console.error('[welcome] pending subscription claim failed', error);
        setClaimStatus('error');
        setMessage('We could not activate your subscription automatically. Please try signing in again.');
      }
    }

    void claim();

    return () => {
      cancelled = true;
    };
  }, [checkoutSessionId, claimStatus, loading, router, user]);

  return (
    <main className="min-h-screen bg-midnight text-white">
      <section className="relative isolate flex min-h-screen items-center px-5 py-16 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_16%,rgba(163,207,255,0.22),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(255,210,90,0.16),transparent_30%),linear-gradient(135deg,#0D0E1F_0%,#121430_52%,#18264a_100%)]" />
        <div className="mx-auto w-full max-w-2xl rounded-[2rem] border border-white/12 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/25">
            {claimStatus === 'claiming' ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            )}
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-sky">
            BroBot Subscription
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Welcome to BroBot
          </h1>
          <p className="mt-4 text-base leading-7 text-white/[0.72]">
            Your subscription is active. Create your account to start using BroBot.
          </p>

          {message ? (
            <p className="mt-5 rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-sm leading-6 text-white/[0.72]">
              {message}
            </p>
          ) : null}

          {loading || claimStatus === 'claiming' ? (
            <p className="mt-7 text-sm font-semibold text-white/60">
              Checking your BroBot access...
            </p>
          ) : user ? (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/brobot/chat"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-3 text-sm font-black text-midnight transition hover:-translate-y-0.5 hover:bg-[#ffe28a]"
              >
                Open BroBot
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/brobot/pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                View Pricing
              </Link>
            </div>
          ) : (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={{
                  pathname: '/auth/sign-up',
                  query: { redirectTo },
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-3 text-sm font-black text-midnight transition hover:-translate-y-0.5 hover:bg-[#ffe28a]"
              >
                Create Account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={{
                  pathname: '/auth/sign-in',
                  query: { redirectTo },
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
