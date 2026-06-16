import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  GraduationCap,
  LockKeyhole,
  PlayCircle,
  ScanFace,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";

const SITE_URL = "https://snap-ortho.com";
const PAGE_URL = `${SITE_URL}/mycases/landing`;

// TODO: Replace with the confirmed MyCases App Store URL before launch.
const MYCASES_APP_STORE_URL = "#";

const description =
  "MyCases is a personal orthopaedic case tracking library for medical students, residents, fellows, and educators. Log cases, organize rotation playbooks, and learn from every experience on iOS.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MyCases | Orthopaedic Case Tracking for iOS",
  description,
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: "MyCases | Track. Learn. Grow.",
    description,
    url: PAGE_URL,
    siteName: "SnapOrtho",
    type: "website",
  },
};

const quickBenefits = [
  {
    title: "Track Cases",
    description: "Log and organize every case.",
    icon: ClipboardList,
  },
  {
    title: "Stay Secure",
    description: "Face ID protected and private.",
    icon: ShieldCheck,
  },
  {
    title: "Learn & Improve",
    description: "Build insights from your experience.",
    icon: TrendingUp,
  },
];

const features = [
  {
    title: "Capture Every Detail",
    description:
      "Track consults, procedures, notes, findings, and outcomes with each case.",
    icon: ClipboardList,
    accent: "from-sky-100 to-blue-50 text-blue-600",
  },
  {
    title: "Rotation Playbooks",
    description: "Build and share workflows, pearls, preferences, and more.",
    icon: BookOpen,
    accent: "from-violet-100 to-blue-50 text-violet-600",
  },
  {
    title: "Insights Over Time",
    description:
      "Review your progress and turn experience into better clinical judgment.",
    icon: BarChart3,
    accent: "from-teal-100 to-cyan-50 text-teal-600",
  },
  {
    title: "Secure & Private",
    description:
      "Face ID login and encrypted storage help keep your information private.",
    icon: LockKeyhole,
    accent: "from-orange-100 to-blue-50 text-orange-600",
  },
];

const audiences = [
  { label: "Medical Students", icon: GraduationCap },
  { label: "Residents", icon: Stethoscope },
  { label: "Fellows", icon: ShieldCheck },
  { label: "Educators", icon: Users },
];

function JsonLd() {
  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MyCases",
    applicationCategory: "MedicalApplication",
    operatingSystem: "iOS",
    description,
    url: PAGE_URL,
    publisher: {
      "@type": "Organization",
      name: "SnapOrtho",
      url: SITE_URL,
    },
    creator: {
      "@type": "Organization",
      name: "SnapOrtho",
      url: SITE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
    />
  );
}

export default function MyCasesLandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-midnight">
      <JsonLd />

      <MyCasesNav />
      <HeroSection />
      <QuickBenefitsRow />
      <FeaturesSection />
      <SecurityAudienceSection />
      <FinalCtaSection />
    </div>
  );
}

function MyCasesNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-blue-100/80 bg-white/85 shadow-sm shadow-blue-950/5 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-10">
        <a href="#top" className="flex items-center gap-3" aria-label="MyCases home">
          <Image
            src="/mycases/mycases-logo.png"
            alt=""
            width={38}
            height={38}
            className="rounded-xl shadow-sm"
            priority
          />
          <span className="text-xl font-extrabold tracking-tight text-navy">
            MyCases
          </span>
        </a>

        <div className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex">
          <a href="#features" className="transition hover:text-blue-700">
            Features
          </a>
          <a href="#security" className="transition hover:text-blue-700">
            Security
          </a>
          <a href="#audience" className="transition hover:text-blue-700">
            For Trainees
          </a>
        </div>

        <a
          href={MYCASES_APP_STORE_URL}
          className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#1B63D8] to-[#2C8FE8] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-blue-500/30 sm:px-5"
        >
          Download App
        </a>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-br from-white via-[#F6FBFF] to-[#DDF3FF] pt-20"
    >
      <DecorativeBubbles />
      <div className="pointer-events-none absolute -right-24 top-36 h-80 w-80 rounded-full bg-[#2C9DE8]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-80 w-80 rounded-full bg-[#34D4C3]/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-16 pt-10 md:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:pb-20 lg:pt-12">
        <div>
          <div className="inline-flex rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur">
            Designed for Training. Built for Success.
          </div>

          <h1 className="mt-6 max-w-xl text-5xl font-extrabold leading-[1.02] tracking-tight text-navy sm:text-6xl lg:text-7xl">
            Track. Learn.
            <span className="block bg-gradient-to-r from-[#2369D8] to-[#2DC5CC] bg-clip-text text-transparent">
              Grow.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700 md:text-xl">
            MyCases is your personal orthopaedic case tracking library built to
            help you log experiences, stay organized, and learn from every case.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={MYCASES_APP_STORE_URL}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1B63D8] to-[#2C8FE8] px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-blue-500/30 sm:min-w-56"
            >
              <Download className="h-5 w-5" />
              Download for iOS
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-300 bg-white/80 px-6 py-4 text-base font-bold text-blue-700 shadow-sm backdrop-blur transition hover:bg-white sm:min-w-44"
            >
              <PlayCircle className="h-5 w-5" />
              Learn More
            </a>
          </div>

          <p className="mt-5 text-sm font-semibold text-slate-500">
            Available on iOS.
          </p>
        </div>

        <div className="relative mx-auto flex w-full max-w-[620px] justify-center lg:max-w-none">
          <ProductShowcase />
        </div>
      </div>
    </section>
  );
}

function QuickBenefitsRow() {
  return (
    <section className="relative bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 py-12 md:grid-cols-3 md:px-10">
        {quickBenefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <div
              key={benefit.title}
              className="rounded-3xl border border-blue-100 bg-white p-7 shadow-sm shadow-blue-950/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/10"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-blue-200 bg-blue-50 text-blue-600">
                <Icon className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-navy">{benefit.title}</h2>
              <p className="mt-2 text-base leading-7 text-slate-600">
                {benefit.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-white to-[#F2FAFF] py-16 md:py-24"
    >
      <div className="pointer-events-none absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:px-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            Built for real training
          </p>
          <h2 className="mt-4 max-w-lg text-4xl font-extrabold leading-tight text-navy md:text-5xl">
            Everything You Need, All in One Place
          </h2>
          <div className="mt-5 h-1.5 w-40 rounded-full bg-gradient-to-r from-[#2369D8] to-[#2DC5CC]" />

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-lg shadow-blue-950/5 backdrop-blur"
                >
                  <div
                    className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent}`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-bold leading-snug text-navy">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <FeaturePreviewPanel />
      </div>
    </section>
  );
}

function SecurityAudienceSection() {
  return (
    <section
      id="security"
      className="scroll-mt-24 bg-[#F2FAFF] px-6 pb-16 md:px-10 md:pb-24"
    >
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#174EAA] via-[#1F6FD2] to-[#2EA7E8] p-7 text-white shadow-2xl shadow-blue-950/20 md:p-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-[#35D7C7] to-[#7DF0D5] shadow-lg shadow-cyan-950/20">
              <ScanFace className="h-12 w-12" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Secure Access with Face ID</h2>
              <p className="mt-3 max-w-md text-base leading-7 text-white/85">
                Quick login. Maximum security. Your information stays yours.
              </p>
            </div>
          </div>

          <div
            id="audience"
            className="scroll-mt-24 border-t border-white/20 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
          >
            <h3 className="text-xl font-bold">Built for</h3>
            <div className="mt-7 grid grid-cols-2 gap-5 md:grid-cols-4">
              {audiences.map((audience) => {
                const Icon = audience.icon;
                return (
                  <div key={audience.label} className="text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                      <Icon className="h-7 w-7" />
                    </div>
                    <p className="text-sm font-semibold text-white/95">
                      {audience.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="bg-gradient-to-b from-[#F2FAFF] to-white px-6 pb-20 text-center md:px-10">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-extrabold text-navy md:text-4xl">
          Ready to Take Control of Your Case Log?
        </h2>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Join trainees using MyCases to organize experiences and learn from
          every case.
        </p>
        <div className="mt-8">
          <a
            href={MYCASES_APP_STORE_URL}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1B63D8] to-[#2C8FE8] px-7 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-blue-500/30 sm:w-auto"
          >
            <Download className="h-5 w-5" />
            Download MyCases
          </a>
          <p className="mt-4 text-sm font-medium text-slate-500">
            Available on iOS
          </p>
        </div>
      </div>
    </section>
  );
}

function ProductShowcase() {
  return (
    <div className="relative w-full max-w-[620px]">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-blue-200/35 via-cyan-100/25 to-white blur-2xl" />

      <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 p-4 shadow-2xl shadow-blue-950/12 backdrop-blur md:p-6">
        <div className="rounded-[1.5rem] border border-blue-100 bg-gradient-to-br from-[#F7FCFF] via-white to-[#E8F7FF] p-4 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/mycases/mycases-logo.png"
                alt=""
                width={46}
                height={46}
                className="rounded-2xl shadow-sm"
                priority
              />
              <div>
                <p className="text-lg font-extrabold text-navy">MyCases</p>
                <p className="text-xs font-semibold text-slate-500">
                  Case tracking built for training
                </p>
              </div>
            </div>
            <span className="hidden rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-blue-700 sm:inline-flex">
              iOS
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-navy">Today</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatPill value="12" label="Cases" />
                <StatPill value="4" label="Images" />
                <StatPill value="3" label="Notes" />
                <StatPill value="1" label="Playbook" />
              </div>
              <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#31C7C5] to-[#2769C8] px-4 py-3 text-center text-sm font-bold text-white">
                Add Case
              </div>
            </div>

            <div className="space-y-3">
              <PreviewRow
                icon={<ClipboardList className="h-4 w-4" />}
                title="Periprosthetic ORIF"
                detail="Apr 23, 2026 · Valley Hospital"
              />
              <PreviewRow
                icon={<BookOpen className="h-4 w-4" />}
                title="Rotation Playbook"
                detail="Daily workflows, pearls, and preferences"
              />
              <PreviewRow
                icon={<BarChart3 className="h-4 w-4" />}
                title="Experience trends"
                detail="Review growth across procedures and rotations"
              />
              <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-navy">Secure Access</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Face ID keeps your library private.
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                    <ScanFace className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-blue-50/80 p-3">
      <p className="text-xl font-extrabold text-blue-700">{value}</p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function PreviewRow({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-navy">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function FeaturePreviewPanel() {
  return (
    <div className="rounded-[2rem] border border-blue-100 bg-white/80 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-navy">Case Library</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Keep case details organized from evaluation through follow-up.
          </p>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-teal-50 to-white p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-navy">Guided Capture</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Structured sections make it easier to avoid missing key details.
          </p>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-white p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-navy">Shared Playbooks</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Save service workflows, attending preferences, and rotation pearls.
          </p>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-orange-50 to-white p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-navy">Private by Design</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Face ID and encrypted storage help keep your information private.
          </p>
        </div>
      </div>
    </div>
  );
}

function DecorativeBubbles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {[
        "left-[43%] top-28 h-7 w-7",
        "left-[46%] top-40 h-16 w-16",
        "left-[54%] top-72 h-10 w-10",
        "right-8 top-72 h-9 w-9",
        "right-4 top-[28rem] h-16 w-16",
        "right-10 top-[36rem] h-7 w-7",
      ].map((position) => (
        <span
          key={position}
          className={`absolute rounded-full border border-white/80 bg-white/20 shadow-inner shadow-white/80 ${position}`}
        />
      ))}
    </div>
  );
}
