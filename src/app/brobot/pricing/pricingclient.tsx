'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Check,
  Clock,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

import TrackedLink from '@/components/analytics/TrackedLink';
import { useAuth } from '@/context/AuthContext';
import { BROBOT_PRICING } from '@/lib/config/brobot-pricing';
import {
  trackBroBotPricingPageView,
  trackCheckoutStartEvent,
} from '@/lib/analytics/googleAds';

const BILLING_RETURN_TO = '/brobot/chat';

const freeFeatures = [
  'Free daily questions',
  'Try BroBot before subscribing',
  'Core orthopaedic AI access',
];

const unlimitedFeatures = [
  'Unlimited questions',
  'OR prep',
  'Consult framework',
  'OITE study mode',
  'Anatomy review',
  'Classification review',
  'Personalized study guidance',
];

const faqs = [
  {
    question: 'Is BroBot really free?',
    answer:
      'Yes. Every user receives free daily access. BroBot Unlimited removes daily limits and unlocks unlimited use.',
  },
  {
    question: 'What happens after the free trial?',
    answer: `Your subscription continues at ${BROBOT_PRICING.unlimited.monthlyPriceLabel} unless canceled.`,
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. You can cancel anytime through Stripe billing.',
  },
  {
    question: 'Do I need to be an orthopaedic resident?',
    answer:
      'No. Medical students, residents, fellows, and attendings all use BroBot.',
  },
  {
    question: 'Is BroBot medical advice?',
    answer:
      'No. BroBot is educational support and does not replace clinical judgment, attending guidance, institutional protocols, or validated references.',
  },
];

export default function BroBotPricingClient() {
  const { user, loading: authLoading } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState<'month' | 'year' | null>(null);
  const subscribeCta = user ? 'Subscribe Now' : 'Start Free Trial';

  useEffect(() => {
    trackBroBotPricingPageView();
  }, []);

  const startCheckout = async (interval: 'month' | 'year') => {
    const value =
      interval === 'year'
        ? BROBOT_PRICING.unlimited.yearlyPrice
        : BROBOT_PRICING.unlimited.monthlyPrice;

    if (authLoading) return;

    try {
      setCheckoutLoading(interval);
      trackCheckoutStartEvent({
        value,
        currency: 'USD',
        source: 'brobot_public_pricing',
        interval,
      });

      const checkoutEndpoint = user
        ? '/api/billing/checkout'
        : '/api/billing/checkout/guest';

      const res = await fetch(checkoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          user
            ? { interval, returnTo: BILLING_RETURN_TO }
            : {
                interval,
                source: 'brobot_public_pricing',
              }
        ),
      });

      const { url, portalUrl, error } = await res.json();
      if (!res.ok && error) {
        throw new Error(error);
      }
      if (url || portalUrl) {
        window.location.href = url || portalUrl;
      }
    } catch (error) {
      console.error('[brobot/pricing] checkout failed', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-midnight text-white">
      <HeroSection
        startCheckout={startCheckout}
        checkoutLoading={checkoutLoading}
        subscribeCta={subscribeCta}
      />
      <PricingCards
        startCheckout={startCheckout}
        checkoutLoading={checkoutLoading}
        subscribeCta={subscribeCta}
      />
      <KnowledgeGapSection />
      <ComparisonSection />
      <TrustSection />
      <FaqSection />
      <FinalCta
        startCheckout={startCheckout}
        checkoutLoading={checkoutLoading}
        subscribeCta={subscribeCta}
      />
    </div>
  );
}

function HeroSection({
  startCheckout,
  checkoutLoading,
  subscribeCta,
}: {
  startCheckout: (interval: 'month' | 'year') => void;
  checkoutLoading: 'month' | 'year' | null;
  subscribeCta: string;
}) {
  return (
    <section className="relative isolate">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_16%,rgba(163,207,255,0.22),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(255,210,90,0.17),transparent_30%),linear-gradient(135deg,#0D0E1F_0%,#121430_52%,#18264a_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-midnight" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
        <div>
          <p className="inline-flex rounded-full border border-sky/25 bg-sky/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-sky">
            BroBot Pricing
          </p>

          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
            One Month Free. Unlimited BroBot.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/[0.72] sm:text-lg">
            BroBot helps you prepare for cases, answer call questions, review anatomy,
            master classifications, and identify what to learn next.
          </p>

          <div className="mt-6 rounded-[1.5rem] border border-gold/30 bg-gold/12 p-5 shadow-[0_18px_55px_rgba(255,210,90,0.14)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">
              Free for 1 month
            </p>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-white/[0.82] sm:grid-cols-2">
              {[
                'Unlimited questions',
                'Case prep',
                'Consults',
                'OITE mode',
                'Study recommendations',
                'Cancel anytime',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => startCheckout('month')}
              disabled={checkoutLoading !== null}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-8 py-4 text-base font-black text-midnight shadow-[0_24px_70px_rgba(255,210,90,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ffe28a] disabled:cursor-wait disabled:opacity-65"
            >
              {checkoutLoading === 'month' ? 'Starting...' : subscribeCta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <a
              href="#plans"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-base font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              View Pricing Details
            </a>
          </div>
          <p className="mt-3 text-sm font-semibold text-white/[0.58]">
            Start your first month free. No charge today.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-sky/10 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/12 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0b0d20]/[0.92] p-5">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-black text-white">{BROBOT_PRICING.unlimited.name}</p>
                  <p className="mt-1 text-xs font-semibold text-sky">
                    Orthopaedic AI command center
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/20">
                  <Brain className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ['Case prep', 'Approach, implants, complications'],
                  ['Consults', 'Fast frameworks on call'],
                  ['Anatomy', 'Structures at risk'],
                  ['OITE', 'High-yield review prompts'],
                ].map(([title, body]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <p className="text-sm font-black text-white">{title}</p>
                    <p className="mt-2 text-xs leading-5 text-white/[0.58]">{body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-sky/20 bg-sky/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky">
                  First month
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  Free
                </p>
                <p className="mt-2 text-sm leading-6 text-white/[0.68]">
                  Then {BROBOT_PRICING.unlimited.monthlyPriceLabel}. Cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingCards({
  startCheckout,
  checkoutLoading,
  subscribeCta,
}: {
  startCheckout: (interval: 'month' | 'year') => void;
  checkoutLoading: 'month' | 'year' | null;
  subscribeCta: string;
}) {
  return (
    <section id="plans" className="px-5 py-12 sm:px-6 lg:px-8" aria-labelledby="plans-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="plans-heading" className="text-3xl font-black tracking-tight sm:text-4xl">
            Simple Pricing
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Free daily access is always available. Unlimited removes the ceiling.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <PlanCard
            name={BROBOT_PRICING.free.name}
            price={BROBOT_PRICING.free.priceLabel}
            subtitle="For trying BroBot and quick daily questions."
            features={freeFeatures}
            cta="Try Free"
            href="/brobot/chat"
          />
          <PlanCard
            name={BROBOT_PRICING.unlimited.name}
            price={BROBOT_PRICING.unlimited.monthlyPriceLabel}
            subtitle={`${BROBOT_PRICING.unlimited.trialLabel}. Then ${BROBOT_PRICING.unlimited.monthlyPriceLabel}. Cancel anytime.`}
            features={unlimitedFeatures}
            cta={checkoutLoading === 'month' ? 'Starting...' : subscribeCta}
            onClick={() => startCheckout('month')}
            featured
            badge="Best for residents"
            disabled={checkoutLoading !== null}
          />
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  price,
  subtitle,
  features,
  cta,
  href,
  onClick,
  featured = false,
  badge,
  disabled = false,
}: {
  name: string;
  price: string;
  subtitle: string;
  features: string[];
  cta: string;
  href?: string;
  onClick?: () => void;
  featured?: boolean;
  badge?: string;
  disabled?: boolean;
}) {
  const buttonClass = `mt-auto inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-65 ${
    featured
      ? 'bg-gold text-midnight shadow-[0_18px_45px_rgba(255,210,90,0.18)] hover:bg-[#ffe28a]'
      : 'border border-white/15 bg-white/10 text-white hover:bg-white/15'
  }`;

  return (
    <article
      className={`relative flex min-h-[520px] flex-col rounded-[1.75rem] border p-6 shadow-2xl backdrop-blur-xl sm:p-8 ${
        featured
          ? 'border-gold/40 bg-[linear-gradient(145deg,rgba(255,210,90,0.14),rgba(163,207,255,0.08)_38%,rgba(255,255,255,0.07))] shadow-gold/10'
          : 'border-white/12 bg-white/[0.065]'
      }`}
    >
      {badge ? (
        <div className="absolute right-5 top-5 rounded-full border border-gold/30 bg-gold/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-gold">
          {badge}
        </div>
      ) : null}

      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-sky">
        {featured ? (
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        ) : (
          <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-2xl font-black text-white">{name}</h3>
        <p className="mt-4 text-4xl font-black tracking-tight text-white">{price}</p>
        <p className="mt-4 max-w-md text-sm leading-6 text-white/[0.62]">{subtitle}</p>
      </div>

      <ul className="mt-7 space-y-3 text-sm text-white/[0.76]">
        {features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {href ? (
        <TrackedLink href={href} trackingEvent="try_brobot_free_click" className={buttonClass}>
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </TrackedLink>
      ) : (
        <button type="button" onClick={onClick} disabled={disabled} className={buttonClass}>
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </article>
  );
}

function ComparisonSection() {
  return (
    <section className="px-5 py-12 sm:px-6 lg:px-8" aria-labelledby="answer-comparison-heading">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky">
            Why BroBot
          </p>
          <h2 id="answer-comparison-heading" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            More Than An Answer Engine
          </h2>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <ComparisonCard
            title="Traditional Search"
            tone="muted"
            items={[
              'Answers one question',
              'Requires knowing what to ask',
              'No learning roadmap',
            ]}
          />
          <ComparisonCard
            title="BroBot"
            tone="highlight"
            items={[
              'Answers the question',
              'Identifies missing concepts',
              'Suggests what to study next',
              'Builds connections between topics',
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function ComparisonCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'muted' | 'highlight';
}) {
  return (
    <article
      className={`rounded-[1.5rem] border p-6 shadow-2xl backdrop-blur-xl sm:p-7 ${
        tone === 'highlight'
          ? 'border-gold/35 bg-[linear-gradient(145deg,rgba(255,210,90,0.14),rgba(163,207,255,0.08)_48%,rgba(255,255,255,0.06))]'
          : 'border-white/12 bg-white/[0.055]'
      }`}
    >
      <h3 className="text-xl font-black text-white">{title}</h3>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-white/[0.72]">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                tone === 'highlight' ? 'text-gold' : 'text-white/35'
              }`}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function KnowledgeGapSection() {
  return (
    <section className="px-5 py-12 sm:px-6 lg:px-8" aria-labelledby="study-next-heading">
      <div className="mx-auto max-w-6xl rounded-[1.75rem] border border-sky/20 bg-sky/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky/15 text-sky ring-1 ring-sky/25">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-sky">
              Guided learning
            </p>
            <h2 id="study-next-heading" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Know What To Study Next
            </h2>
          </div>

          <div>
            <p className="text-lg font-black text-white">
              Most resources answer questions.
            </p>
            <p className="mt-3 text-sm leading-7 text-white/[0.68]">
              BroBot identifies what you do not know yet. Every conversation
              generates follow-up concepts, related topics, and high-yield next
              steps so you can build a structured understanding instead of
              memorizing isolated facts.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Knowledge gaps', 'Related topics', 'OITE prep', 'Clinical reasoning'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1 text-xs font-bold text-white/[0.72]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="px-5 py-12 sm:px-6 lg:px-8" aria-labelledby="trust-heading">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[1.75rem] border border-white/12 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/25">
                <Clock className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 id="trust-heading" className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
                Start In Less Than A Minute
              </h2>
            </div>
            <div className="grid gap-3 text-sm font-semibold text-white/[0.76] sm:grid-cols-2 md:min-w-[460px]">
              {[
                'Start free trial',
                'Ask your first question immediately',
                'Cancel anytime',
                'No commitment',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="px-5 py-12 sm:px-6 lg:px-8" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky">
            FAQ
          </p>
          <h2 id="faq-heading" className="mt-3 text-3xl font-black tracking-tight">
            Questions before you upgrade
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-[1.25rem] border border-white/12 bg-white/[0.055] p-5"
            >
              <h3 className="text-base font-black text-white">{faq.question}</h3>
              <p className="mt-3 text-sm leading-6 text-white/[0.62]">{faq.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({
  startCheckout,
  checkoutLoading,
  subscribeCta,
}: {
  startCheckout: (interval: 'month' | 'year') => void;
  checkoutLoading: 'month' | 'year' | null;
  subscribeCta: string;
}) {
  return (
    <section className="px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/12 bg-[linear-gradient(135deg,rgba(255,210,90,0.16),rgba(163,207,255,0.11)_48%,rgba(255,255,255,0.06))] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">
          Try BroBot today.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/[0.64]">
          Start free today. Remove daily limits when BroBot becomes part of your study workflow.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => startCheckout('month')}
            disabled={checkoutLoading !== null}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-7 py-3 text-sm font-black text-midnight transition hover:-translate-y-0.5 hover:bg-[#ffe28a] disabled:cursor-wait disabled:opacity-65"
          >
            {checkoutLoading === 'month' ? 'Starting...' : subscribeCta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <TrackedLink
            href="/brobot/chat"
            trackingEvent="try_brobot_free_click"
            className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            Use Free Daily Access
          </TrackedLink>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold text-white/[0.58]">
          Start your first month free. No charge today.
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-xs leading-5 text-white/45">
          Educational tool only. Do not use BroBot as the sole basis for diagnosis,
          treatment, operative planning, or patient care decisions.
        </p>
      </div>
    </section>
  );
}
