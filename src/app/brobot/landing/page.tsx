import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

const SITE_URL = 'https://snap-ortho.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'BroBot | Orthopaedic AI Assistant',
  description:
    'BroBot is an orthopaedic AI assistant for case preparation, clinical questions, classifications, anatomy, surgical approaches, implants, complications, and orthopaedic education.',
  keywords: [
    'orthopaedic AI',
    'orthopedic AI',
    'orthopaedic chatbot',
    'orthopedic chatbot',
    'orthopaedic assistant',
    'orthopedic education',
    'orthopaedic residents',
    'orthopaedic case prep',
    'fracture classification',
    'orthopaedic clinical questions',
  ],
  alternates: {
    canonical: '/brobot/landing',
  },
  openGraph: {
    title: 'BroBot | Orthopaedic AI Assistant',
    description:
      'Ask orthopaedic questions about fractures, classifications, approaches, implants, anatomy, complications, and treatment decisions.',
    url: '/brobot/landing',
    siteName: 'SnapOrtho',
    images: [
      {
        url: '/og-image-brobot.png',
        width: 1200,
        height: 630,
        alt: 'BroBot orthopaedic AI assistant',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BroBot | Orthopaedic AI Assistant',
    description:
      'Orthopaedic AI built for clinical questions, case preparation, and education.',
    images: ['/og-image-brobot.png'],
  },
};

const useCases = [
  {
    title: 'Case Prep',
    body: 'Review surgical approaches, anatomy at risk, implants, complications, and key operative steps before the OR.',
  },
  {
    title: 'Call Questions',
    body: 'Think through imaging, urgency, reductions, splinting, antibiotics, temporizing care, and presentations.',
  },
  {
    title: 'Classifications',
    body: 'Break down fracture and pathology classification systems into practical, clinically useful language.',
  },
  {
    title: 'OITE-Style Learning',
    body: 'Turn broad topics into high-yield teaching points, differentials, decision trees, and next questions.',
  },
];

const topics = [
  'Fractures',
  'Trauma',
  'Sports',
  'Spine',
  'Hand',
  'Joints',
  'Pediatrics',
  'Foot & Ankle',
  'Oncology',
  'Anatomy',
  'Implants',
  'Rehab',
];

const exampleChats = [
  {
    user: 'How should I think through a Schatzker II tibial plateau fracture?',
    bot: [
      'Lateral split-depression pattern.',
      'Use CT to assess depression, widening, comminution, and meniscus entrapment.',
      'Treatment often involves elevation, bone void support, and lateral buttress fixation.',
    ],
  },
  {
    user: 'What structures are at risk during a direct anterior total hip?',
    bot: [
      'Lateral femoral cutaneous nerve during superficial exposure.',
      'Ascending branch of the lateral femoral circumflex vessels.',
      'Femoral nerve and vessels medially if retractors drift.',
    ],
  },
  {
    user: 'Compare humeral shaft nail versus plate fixation.',
    bot: [
      'Plates allow direct reduction and radial nerve visualization.',
      'Nails are less invasive and load-sharing but may have shoulder morbidity.',
      'Decision depends on fracture pattern, soft tissues, and patient factors.',
    ],
  },
];

const levels = [
  {
    title: 'Medical Students',
    body: 'Learn orthopaedic language: anatomy, classifications, indications, and basic management.',
  },
  {
    title: 'Residents',
    body: 'Prepare for cases, call, conferences, and teaching moments with faster orthopaedic answers.',
  },
  {
    title: 'Fellows & Attendings',
    body: 'Use BroBot as a fast refresher for surgical concepts, decision frameworks, and teaching points.',
  },
];

const comparisonRows = [
  ['Orthopaedic terminology', 'Built around it', 'Often generic'],
  ['Case preparation', 'Approach, anatomy, implants, complications', 'Variable structure'],
  ['Training level', 'Adapts to learner level', 'Usually not ortho-specific'],
  ['Workflow fit', 'Built for ortho questions', 'Built for everything'],
];

export default function BroBotLandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f1e7] text-midnight">
      <HeroSection />
      <UseCaseSection />
      <TopicSection />
      <ConversationSection />
      <TrainingSection />
      <ComparisonSection />
      <FinalCtaSection />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-[#090b1a] text-white">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.28),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(255,210,90,0.16),transparent_28%),linear-gradient(135deg,#090b1a_0%,#10142b_48%,#17284a_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-b from-transparent to-[#f6f1e7]" />

      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="relative z-10">
            <div className="mb-5 inline-flex rounded-full border border-teal-300/40 bg-teal-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-teal-200">
              Orthopaedic AI Assistant
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.96] tracking-tight sm:text-6xl lg:text-7xl">
              Ask better ortho questions.
              <span className="block text-teal-200">Prep faster.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/76">
              BroBot helps you think through fractures, classifications, approaches,
              anatomy, implants, complications, rehab, and real clinical decision-making.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/brobot/chat"
                className="rounded-2xl bg-gold px-6 py-3 text-center text-base font-black text-midnight shadow-[0_22px_50px_rgba(255,210,90,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ffe08a]"
              >
                Try BroBot Free
              </Link>

              <a
                href="#examples"
                className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-center text-base font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                See Examples
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {['Case prep', 'Call', 'Classifications', 'Anatomy', 'OITE'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-sm font-semibold text-white/75"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 -z-10 rounded-full bg-teal-300/10 blur-3xl" />

            <div className="relative mx-auto max-w-xl rounded-[2rem] border border-white/14 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl">
              <Image
                src="/brologo.png"
                alt=""
                width={560}
                height={560}
                priority
                className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 opacity-[0.06]"
              />

              <div className="relative rounded-[1.5rem] border border-white/10 bg-[#0f1228]/95 p-4">
                <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
                  <Image
                    src="/brologo.png"
                    alt="BroBot logo"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-xl"
                  />
                  <div>
                    <p className="text-sm font-black text-white">BroBot</p>
                    <p className="text-xs font-semibold text-teal-200">
                      Orthopaedic assistant online
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md bg-teal-500 px-4 py-3 text-sm font-bold leading-6 text-white">
                    What should I know before assisting on a posterior approach to the hip?
                  </div>

                  <div className="max-w-[94%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.08] px-4 py-3 text-sm leading-6 text-white/82">
                    <p className="font-black text-white">Direct Answer</p>
                    <p className="mt-1">
                      Focus on patient positioning, internervous plane, short external
                      rotators, sciatic nerve protection, and posterior instability risk.
                    </p>

                    <div className="mt-3 rounded-xl bg-white/[0.07] p-3">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-200">
                        What to review next
                      </p>
                      <p className="mt-1 text-white/75">
                        Piriformis, obturator internus, quadratus femoris, capsule repair,
                        and dislocation precautions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                    Try asking
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      'Classify this ankle fracture',
                      'Cervical myelopathy workup',
                      'Kocher approach anatomy',
                      'Reverse TSA indications',
                    ].map((question) => (
                      <div
                        key={question}
                        className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-xs font-semibold leading-5 text-white/72"
                      >
                        {question}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-5 grid max-w-xl grid-cols-3 gap-3">
              {[
                ['Fast', 'answers'],
                ['Ortho', 'focused'],
                ['Case', 'ready'],
              ].map(([top, bottom]) => (
                <div
                  key={top}
                  className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-center backdrop-blur"
                >
                  <p className="text-lg font-black text-white">{top}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200/80">
                    {bottom}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCaseSection() {
  return (
    <section className="px-5 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-700">
            Why BroBot
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-navy sm:text-5xl">
            Built around the way orthopaedic questions actually come up.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {useCases.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-xl font-black text-teal-700 ring-8 ring-teal-50">
                +
              </div>
              <h3 className="text-xl font-black text-navy">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TopicSection() {
  return (
    <section id="examples" className="bg-white px-5 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-700">
              Breadth of orthopaedics
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-navy sm:text-5xl">
              From quick refreshers to deeper clinical reasoning.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Ask about a topic, procedure, classification, approach, complication,
              or clinical decision. BroBot helps organize the answer so you know what
              matters next.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {topics.map((topic) => (
              <div
                key={topic}
                className="rounded-2xl border border-slate-200 bg-[#f6f1e7] px-4 py-4 text-center text-sm font-black text-navy transition hover:-translate-y-1 hover:border-gold hover:bg-white hover:shadow-lg"
              >
                {topic}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ConversationSection() {
  return (
    <section className="relative overflow-hidden bg-[#090b1a] px-5 py-20 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(20,184,166,0.16),transparent_34%),radial-gradient(circle_at_85%_25%,rgba(255,210,90,0.08),transparent_28%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-200">
            Example conversations
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Ask like you would ask a senior resident.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {exampleChats.map((chat) => (
            <article
              key={chat.user}
              className="rounded-3xl border border-white/12 bg-white/[0.08] p-5 shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:border-teal-300/40 hover:bg-white/[0.11]"
            >
              <div className="rounded-2xl bg-teal-500 px-4 py-3 text-sm font-black leading-6 text-white shadow-lg">
                {chat.user}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-[#11162d] px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-200">
                  BroBot
                </p>

                <ul className="mt-4 space-y-3">
                  {chat.bot.map((line) => (
                    <li key={line} className="flex gap-3 text-sm leading-6 text-white/72">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrainingSection() {
  return (
    <section className="px-5 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-700">
            Built for learners
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-navy sm:text-5xl">
            Useful at every level of training.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {levels.map((level) => (
            <article
              key={level.title}
              className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <h3 className="text-2xl font-black text-navy">{level.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{level.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="bg-white px-5 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-700">
            BroBot vs generic AI
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-navy sm:text-5xl">
            Orthopaedic structure matters.
          </h2>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-3 bg-midnight px-5 py-4 text-sm font-black text-white">
            <div>Feature</div>
            <div className="text-teal-200">BroBot</div>
            <div className="text-white/60">Generic AI</div>
          </div>

          {comparisonRows.map(([feature, brobot, generic]) => (
            <div
              key={feature}
              className="grid grid-cols-3 gap-3 border-t border-slate-200 bg-white px-5 py-5 text-sm"
            >
              <div className="font-black text-navy">{feature}</div>
              <div className="font-semibold text-slate-700">{brobot}</div>
              <div className="font-semibold text-slate-500">{generic}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="px-5 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-midnight px-6 py-16 text-center text-white shadow-2xl sm:px-10">
        <Image
          src="/brologo.png"
          alt="BroBot logo"
          width={112}
          height={112}
          className="mx-auto mb-6 h-24 w-24 rounded-3xl"
        />

        <h2 className="mx-auto max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
          Bring BroBot into your orthopaedic workflow.
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/70">
          Ask your next fracture, anatomy, approach, implant, complication,
          or case-prep question.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/brobot/chat"
            className="rounded-2xl bg-gold px-7 py-3 text-base font-black text-midnight transition hover:-translate-y-0.5 hover:bg-[#ffe08a]"
          >
            Try BroBot Free
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-white/20 bg-white/10 px-7 py-3 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            Back to SnapOrtho
          </Link>
        </div>
      </div>
    </section>
  );
}