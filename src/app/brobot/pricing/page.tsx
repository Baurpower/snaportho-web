import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Check,
  ClipboardList,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "BroBot Pricing | SnapOrtho",
  description:
    "Start free with BroBot, the orthopaedic AI assistant for case prep, consults, anatomy review, classifications, implants, and OITE-style studying.",
  alternates: {
    canonical: "/pricing",
  },
};

const freeFeatures = [
  "Limited daily BroBot questions",
  "Orthopaedic question answering",
  "Case prep support",
  "Anatomy and classification review",
  "OITE-style learning prompts",
];

const unlimitedFeatures = [
  "Unlimited BroBot questions",
  "Faster case preparation",
  "Consult and clinic support",
  "OITE and board-style review",
  "Follow-up questions and guided learning",
  "Access across desktop and mobile",
  "New BroBot features as they launch",
];

const comparisonRows = [
  ["Daily BroBot questions", "Limited", "Unlimited"],
  ["Orthopaedic Q&A", "Yes", "Yes"],
  ["Case preparation", "Yes", "Yes"],
  ["Anatomy at risk", "Yes", "Yes"],
  ["OITE-style review", "Yes", "Yes"],
  ["Consult workflow support", "Limited", "Unlimited"],
  ["Follow-up learning", "Limited", "Unlimited"],
  ["Best for", "Trying BroBot", "Daily workflow"],
];

const valueCards = [
  {
    title: "Prep faster",
    copy: "Move from vague case topic to focused anatomy, approach, implant, complication, and postop review.",
    icon: ClipboardList,
  },
  {
    title: "Study smarter",
    copy: "Use follow-up questions, high-yield explanations, and OITE-style review to close knowledge gaps.",
    icon: GraduationCap,
  },
  {
    title: "Use it in the workflow",
    copy: "Keep BroBot available for consults, clinic questions, surgical preparation, and quick orthopaedic review.",
    icon: Stethoscope,
  },
];

const faqs = [
  {
    question: "Is there a free version?",
    answer: "Yes. You can start with limited daily BroBot questions.",
  },
  {
    question: "What does Unlimited include?",
    answer: "Unlimited BroBot usage and access to the core orthopaedic AI workflows.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. Subscription management is handled through the billing page.",
  },
  {
    question: "Is BroBot medical advice?",
    answer: "No. BroBot is for education and workflow support.",
  },
  {
    question: "Who is BroBot for?",
    answer:
      "Orthopaedic residents, medical students, fellows, surgeons, and anyone learning orthopaedics.",
  },
  {
    question: "Does BroBot replace Orthobullets or textbooks?",
    answer:
      "No. It is an interactive companion that helps users prep, study, and navigate topics faster.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-midnight text-white">
      <HeroSection />
      <PricingCards />
      <ComparisonSection />
      <ValueSection />
      <EducationSection />
      <FaqSection />
      <FinalCta />
    </div>
  );
}

function HeroSection() {
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
            Start free. Upgrade when BroBot becomes part of your workflow.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/[0.72] sm:text-lg">
            Use BroBot for orthopaedic questions, case preparation, consults,
            anatomy review, classifications, implants, and OITE-style studying.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/brobot/chat"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-3 text-base font-black text-midnight shadow-[0_22px_60px_rgba(255,210,90,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ffe28a]"
            >
              Try BroBot Free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/account/billing"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-base font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              Upgrade to Unlimited
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-sky/10 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/12 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0b0d20]/[0.92] p-5">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-black text-white">BroBot Unlimited</p>
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
                  ["Case prep", "Approach, implants, complications"],
                  ["Consults", "Fast frameworks on call"],
                  ["Anatomy", "Structures at risk"],
                  ["OITE", "High-yield review prompts"],
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
                  Built for ortho flow
                </p>
                <p className="mt-2 text-sm leading-6 text-white/[0.76]">
                  Ask, refine, prep, review, and keep moving without leaving the
                  orthopaedic context.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingCards() {
  return (
    <section className="px-5 py-12 sm:px-6 lg:px-8" aria-labelledby="plans-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="plans-heading" className="text-3xl font-black tracking-tight sm:text-4xl">
            Choose your BroBot plan
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Start with daily questions. Upgrade when BroBot becomes a regular part
            of case prep, studying, and clinical review.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <PlanCard
            name="Free"
            price="$0"
            subtitle="For trying BroBot and quick daily questions."
            features={freeFeatures}
            cta="Try Free"
            href="/brobot/chat"
          />
          <PlanCard
            name="BroBot Unlimited"
            price="Simple monthly access"
            subtitle="For users who want BroBot available throughout the day."
            features={unlimitedFeatures}
            cta="Upgrade Now"
            href="/account/billing"
            featured
            badge="Best for residents"
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
  featured = false,
  badge,
}: {
  name: string;
  price: string;
  subtitle: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  badge?: string;
}) {
  return (
    <article
      className={`relative flex min-h-[520px] flex-col rounded-[1.75rem] border p-6 shadow-2xl backdrop-blur-xl sm:p-8 ${
        featured
          ? "border-gold/40 bg-[linear-gradient(145deg,rgba(255,210,90,0.14),rgba(163,207,255,0.08)_38%,rgba(255,255,255,0.07))] shadow-gold/10"
          : "border-white/12 bg-white/[0.065]"
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

      <Link
        href={href}
        className={`mt-auto inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 ${
          featured
            ? "bg-gold text-midnight shadow-[0_18px_45px_rgba(255,210,90,0.18)] hover:bg-[#ffe28a]"
            : "border border-white/15 bg-white/10 text-white hover:bg-white/15"
        }`}
      >
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

function ComparisonSection() {
  return (
    <section className="px-5 py-12 sm:px-6 lg:px-8" aria-labelledby="comparison-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky">
              Compare plans
            </p>
            <h2 id="comparison-heading" className="mt-3 text-3xl font-black tracking-tight">
              What you get
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/[0.58]">
            Free is enough to feel the workflow. Unlimited removes the daily ceiling.
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-white/12 bg-white/[0.06] shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">BroBot Free and Unlimited feature comparison</caption>
              <thead className="border-b border-white/10 bg-white/[0.06] text-xs uppercase tracking-[0.16em] text-white/50">
                <tr>
                  <th scope="col" className="px-5 py-4 font-black">
                    Feature
                  </th>
                  <th scope="col" className="px-5 py-4 font-black">
                    Free
                  </th>
                  <th scope="col" className="px-5 py-4 font-black text-gold">
                    Unlimited
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {comparisonRows.map(([feature, free, unlimited]) => (
                  <tr key={feature}>
                    <th scope="row" className="px-5 py-4 font-semibold text-white">
                      {feature}
                    </th>
                    <td className="px-5 py-4 text-white/[0.62]">{free}</td>
                    <td className="px-5 py-4 font-bold text-white">{unlimited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function ValueSection() {
  return (
    <section className="px-5 py-12 sm:px-6 lg:px-8" aria-labelledby="value-heading">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky">
            Why upgrade?
          </p>
          <h2 id="value-heading" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Built for the moments when quick ortho context matters.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {valueCards.map(({ title, copy, icon: Icon }) => (
            <article
              key={title}
              className="rounded-[1.5rem] border border-white/12 bg-white/[0.06] p-6 shadow-xl backdrop-blur-xl"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky/10 text-sky ring-1 ring-sky/20">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-black text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/[0.62]">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EducationSection() {
  return (
    <section className="px-5 py-12 sm:px-6 lg:px-8" aria-labelledby="education-heading">
      <div className="mx-auto max-w-6xl rounded-[1.75rem] border border-sky/20 bg-sky/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky/15 text-sky ring-1 ring-sky/25">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="education-heading" className="text-2xl font-black tracking-tight">
              Built for orthopaedic education
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/[0.68]">
              BroBot is designed for education and workflow support. It does not
              replace clinical judgment, attending guidance, institutional
              protocols, or gold-standard references.
            </p>
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

function FinalCta() {
  return (
    <section className="px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/12 bg-[linear-gradient(135deg,rgba(255,210,90,0.16),rgba(163,207,255,0.11)_48%,rgba(255,255,255,0.06))] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Zap className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">
          Try BroBot today.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/[0.64]">
          Start free for quick daily questions, or unlock BroBot for your full
          orthopaedic workflow.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/brobot/chat"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-3 text-sm font-black text-midnight transition hover:-translate-y-0.5 hover:bg-[#ffe28a]"
          >
            Try BroBot Free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/account/billing"
            className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            Upgrade to Unlimited
          </Link>
        </div>
      </div>
    </section>
  );
}
