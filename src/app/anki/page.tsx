import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  GraduationCap,
  MessageCircleQuestion,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRoundCheck,
} from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_URL = "https://snap-ortho.com/anki";

export const dynamic = "force-dynamic";

type DeckStats = {
  version: string;
  cardCount: number;
  publishedAt: string;
} | null;

async function loadCurrentDeckStats(): Promise<DeckStats> {
  try {
    const admin = createAdminClient();
    const { data: release, error: releaseError } = await admin
      .from("anki_deck_releases")
      .select("id,release_version,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (releaseError || !release) return null;

    const { count, error: countError } = await admin
      .from("anki_deck_release_cards")
      .select("canonical_card_id", { count: "exact", head: true })
      .eq("deck_release_id", release.id)
      .eq("inclusion_status", "included");

    if (countError) return null;

    return {
      version: release.release_version,
      cardCount: count ?? 0,
      publishedAt: release.published_at,
    };
  } catch (error) {
    console.error("Unable to load public Anki deck stats", error);
    return null;
  }
}

export const metadata: Metadata = {
  title: "SnapOrtho for Anki Beta",
  description:
    "A versioned orthopaedic master deck and intelligent Anki add on with BroBot built in.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    title: "SnapOrtho for Anki Beta",
    description:
      "Learn orthopaedics more effectively with a versioned master deck and BroBot inside Anki.",
    siteName: "SnapOrtho",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "SnapOrtho" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapOrtho for Anki Beta",
    description:
      "A smarter way to learn orthopaedics in Anki with BroBot built in.",
    images: ["/og-image.png"],
  },
};

export default async function AnkiLandingPage() {
  const supabase = await createClient();
  const [authResult, deckStats] = await Promise.all([
    supabase.auth.getUser(),
    loadCurrentDeckStats(),
  ]);
  const user = authResult.data.user;

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f2e9] pt-14 text-[#11162f]">
      <section className="relative isolate border-b border-[#11162f]/10 px-5 pb-20 pt-14 sm:px-8 lg:pb-28 lg:pt-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_18%,rgba(163,207,255,0.5),transparent_30%),radial-gradient(circle_at_18%_82%,rgba(255,210,90,0.28),transparent_26%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#11162f]/15 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#11162f] shadow-sm backdrop-blur">
                <Image src="/snaportho-logo.png" alt="" width={24} height={24} className="rounded-md" />
                SnapOrtho for Anki
              </span>
              <span className="rounded-full bg-[#ffd25a] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#11162f]">
                Beta
              </span>
            </div>

            <h1 className="max-w-3xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.045em] text-[#11162f] sm:text-6xl lg:text-7xl">
              Always improving.
              <span className="mt-2 block text-[#426b9b]">Built for every level of training.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#313750] sm:text-xl">
              A versioned orthopaedic master deck and intelligent Anki add on with BroBot built in. Learn more effectively, prepare for the questions that matter, and stay current throughout training.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={user ? "/anki/download" : "/auth/sign-in?redirectTo=%2Fanki%2Fdownload"}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#11162f] px-7 py-4 text-base font-bold text-white shadow-[0_16px_40px_rgba(17,22,47,0.2)] transition hover:-translate-y-0.5 hover:bg-[#22325a] focus:outline-none focus:ring-4 focus:ring-[#a3cfff]"
              >
                Download the Beta
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#11162f]/15 bg-white/70 px-7 py-4 text-base font-bold text-[#11162f] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#a3cfff]"
              >
                See how it works
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-[#525970]">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#0f766e]" /> Free SnapOrtho account required</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#0f766e]" /> Built for Anki Desktop</span>
            </div>

            <div className="mt-9 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#11162f]/10 bg-white/65 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#667085]">Current version</p>
                <p className="mt-2 text-2xl font-black text-[#11162f]">{deckStats ? deckStats.version : "Preparing"}</p>
              </div>
              <div className="rounded-2xl border border-[#11162f]/10 bg-white/65 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#667085]">Cards</p>
                <p className="mt-2 text-2xl font-black text-[#11162f]">{deckStats ? deckStats.cardCount.toLocaleString() : "Coming soon"}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-[#11162f]/10 bg-white/65 p-4 backdrop-blur sm:col-span-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#667085]">Release status</p>
                <p className="mt-2 text-2xl font-black text-[#0f766e]">{deckStats ? "Live" : "In review"}</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl">
            <div className="absolute -inset-7 -z-10 rotate-2 rounded-[2.5rem] bg-[#a3cfff]/55" />
            <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_32px_90px_rgba(17,22,47,0.2)]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#f7f8fb] px-5 py-4">
                <div className="flex gap-2" aria-hidden="true">
                  <span className="h-3 w-3 rounded-full bg-[#ff8a7a]" />
                  <span className="h-3 w-3 rounded-full bg-[#ffd25a]" />
                  <span className="h-3 w-3 rounded-full bg-[#57c7a2]" />
                </div>
                <span className="text-xs font-bold tracking-wide text-slate-500">SNAPORTHO MASTER</span>
                <span className="text-xs font-semibold text-[#0f766e]">Current</span>
              </div>
              <div className="grid min-h-[430px] md:grid-cols-[1.12fr_0.88fr]">
                <div className="flex flex-col justify-between border-b border-slate-200 p-6 md:border-b-0 md:border-r">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#426b9b]">Trauma</p>
                    <p className="mt-7 text-2xl font-bold leading-snug text-[#11162f]">
                      What structure is most at risk with a posterior hip dislocation?
                    </p>
                    <div className="mt-8 rounded-2xl bg-[#eff6ff] p-5 text-sm leading-7 text-[#31466c]">
                      The sciatic nerve is the key neurologic structure to assess before and after reduction.
                    </div>
                  </div>
                  <div className="mt-10 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>SnapOrtho Master</span>
                    <span>Card 18 of 30</span>
                  </div>
                </div>
                <div className="bg-[#11162f] p-6 text-white">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#a3cfff] text-[#11162f]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black">Ask BroBot</p>
                      <p className="text-xs text-white/55">Teaching for this card</p>
                    </div>
                  </div>
                  <div className="mt-8 space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80">
                      What would an attending ask about this?
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80">
                      What is the common OITE trap?
                    </div>
                  </div>
                  <div className="mt-8 rounded-2xl bg-[#a3cfff] p-4 text-sm font-semibold leading-6 text-[#11162f]">
                    Always document the neurologic exam before reduction. The peroneal division is more commonly affected.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#426b9b]">One connected learning system</p>
            <h2 className="mt-4 text-balance text-4xl font-black tracking-[-0.035em] text-[#11162f] sm:text-5xl">
              Your deck remembers the facts. BroBot helps you understand them.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#596078]">
              SnapOrtho combines structured orthopaedic knowledge with teaching that responds to the card in front of you.
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <div className="rounded-[2rem] border border-[#d9e7f7] bg-[#f2f7fd] p-7 sm:p-9">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#426b9b] text-white"><BookOpen className="h-6 w-6" /></div>
              <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-[#426b9b]">SnapOrtho Master Deck</p>
              <h3 className="mt-3 text-3xl font-black tracking-tight">A foundation that keeps growing</h3>
              <p className="mt-4 text-base leading-7 text-[#525970]">
                Study from a versioned orthopaedic deck designed to improve as the content is reviewed, refined, and expanded.
              </p>
            </div>
            <div className="hidden items-center justify-center lg:flex">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#ffd25a] text-2xl font-black text-[#11162f]">+</div>
            </div>
            <div className="rounded-[2rem] border border-[#11162f] bg-[#11162f] p-7 text-white sm:p-9">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#a3cfff] text-[#11162f]"><Brain className="h-6 w-6" /></div>
              <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-[#a3cfff]">Intelligent Anki Add On</p>
              <h3 className="mt-3 text-3xl font-black tracking-tight">BroBot teaching inside every review</h3>
              <p className="mt-4 text-base leading-7 text-white/70">
                Ask better questions, uncover common traps, and turn memorized facts into useful clinical understanding.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#11162f] px-5 py-20 text-white sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#a3cfff]/10 px-4 py-2 text-sm font-bold text-[#a3cfff]">
              <Sparkles className="h-4 w-4" /> BroBot integration
            </div>
            <h2 className="mt-6 text-balance text-4xl font-black tracking-[-0.035em] sm:text-5xl">Turn every card into a teaching moment.</h2>
            <p className="mt-6 text-lg leading-8 text-white/68">
              BroBot follows the card you are reviewing, so each answer starts with the right context and helps you go beyond recall.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Prepare for questions an attending may ask",
                "Recognize common OITE and board traps",
                "Continue a conversation about the current card",
                "Connect the fact to practical clinical reasoning",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-base text-white/85">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#a3cfff]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-white/[0.06] p-4 shadow-2xl sm:p-6">
            <div className="rounded-[1.4rem] bg-[#f8fafc] p-4 text-[#11162f] sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#11162f] text-[#a3cfff]"><Sparkles className="h-5 w-5" /></div>
                  <div><p className="font-black">BroBot</p><p className="text-xs text-slate-500">Learning with your current card</p></div>
                </div>
                <span className="rounded-full bg-[#dff6ef] px-3 py-1 text-xs font-bold text-[#0f766e]">Ready</span>
              </div>
              <div className="mt-5 flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#dcecff] px-4 py-3 text-sm leading-6">
                  What would an attending ask about a posterior hip dislocation?
                </div>
              </div>
              <div className="mt-4 max-w-[92%] rounded-2xl rounded-bl-md bg-white px-4 py-4 text-sm leading-6 shadow-sm ring-1 ring-slate-200">
                They may ask which nerve division is more vulnerable, what must be documented before reduction, and why reduction is urgent. The peroneal division of the sciatic nerve is affected more often.
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600">Show me the OITE trap</div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600">Connect this to management</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f2e9] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0f766e]">Versioned by design</p>
              <h2 className="mt-4 text-balance text-4xl font-black tracking-[-0.035em] sm:text-5xl">A deck that gets better without making you start over.</h2>
              <p className="mt-6 text-lg leading-8 text-[#596078]">
                See what version you have, know when a release is ready, and bring improvements into the deck while keeping your learning history yours.
              </p>
            </div>
            <div className="rounded-[2rem] border border-[#11162f]/10 bg-white p-6 shadow-[0_24px_70px_rgba(17,22,47,0.09)] sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div><p className="text-sm font-bold text-slate-500">SnapOrtho Master</p><p className="mt-1 text-2xl font-black">Version status</p></div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dff6ef] text-[#0f766e]"><RefreshCw className="h-6 w-6" /></div>
              </div>
              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-bold text-slate-500">Installed</p><p className="mt-1 text-xl font-black">1.0</p></div>
                <ChevronRight className="h-6 w-6 text-slate-400" />
                <div className="rounded-2xl bg-[#dcecff] p-4"><p className="text-xs font-bold text-[#426b9b]">Available</p><p className="mt-1 text-xl font-black">1.1</p></div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-2xl border border-slate-200 p-4"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0f766e]" /><div><p className="font-bold">Your schedule</p><p className="mt-1 text-sm text-slate-500">Review progress stays intact</p></div></div>
                <div className="flex gap-3 rounded-2xl border border-slate-200 p-4"><MessageCircleQuestion className="h-5 w-5 shrink-0 text-[#0f766e]" /><div><p className="font-bold">Your notes</p><p className="mt-1 text-sm text-slate-500">Personal fields stay yours</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#426b9b]">Meet learners where they are</p>
            <h2 className="mt-4 text-balance text-4xl font-black tracking-[-0.035em] sm:text-5xl">One deck for the full journey through training.</h2>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: GraduationCap, title: "Medical Student", text: "Build a clear and durable orthopaedic foundation." },
              { icon: Stethoscope, title: "Subintern", text: "Prepare for cases and the questions that come with them." },
              { icon: UserRoundCheck, title: "Resident", text: "Reinforce high yield knowledge and board concepts." },
              { icon: Brain, title: "Educator", text: "Help improve the resource for the next learner." },
            ].map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="rounded-[1.7rem] border border-slate-200 bg-[#fbfcfe] p-6 transition hover:-translate-y-1 hover:border-[#a3cfff] hover:shadow-lg">
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${index === 3 ? "bg-[#ffd25a]" : "bg-[#dcecff]"}`}><Icon className="h-5 w-5" /></div>
                <h3 className="mt-6 text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#626980]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="download" className="scroll-mt-20 bg-[#dcecff] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full bg-[#ffd25a] px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">Beta access</span>
            <h2 className="mt-5 text-balance text-4xl font-black tracking-[-0.035em] sm:text-5xl">Start learning with SnapOrtho for Anki.</h2>
            <p className="mt-5 text-lg leading-8 text-[#4d5870]">
              A free SnapOrtho account securely connects your add on, gives you access to deck releases, and keeps you informed when updates are ready.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-6xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] bg-[#11162f] p-7 text-white shadow-[0_24px_70px_rgba(17,22,47,0.2)] sm:p-9">
              {user ? (
                <>
                  <div className="flex items-center gap-3 text-[#a3cfff]"><CheckCircle2 className="h-5 w-5" /><span className="text-sm font-bold">SnapOrtho account connected</span></div>
                  <h3 className="mt-6 text-3xl font-black">Your beta download is ready.</h3>
                  <p className="mt-3 text-base leading-7 text-white/65">Install the add on in Anki Desktop, restart Anki, then open the SnapOrtho setup guide from the Tools menu.</p>
                  <Link href="/anki/download" className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#a3cfff] px-7 py-4 font-black text-[#11162f] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-white/30">
                    <Download className="h-5 w-5" /> Open the Download Page
                  </Link>
                  <p className="mt-4 text-xs text-white/45">Version 1.0.3 for Anki Desktop</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#a3cfff]">First step</p>
                  <h3 className="mt-5 text-3xl font-black">Create your free SnapOrtho account.</h3>
                  <p className="mt-4 text-base leading-7 text-white/65">Your account unlocks the beta download and connects Anki to current SnapOrtho deck releases.</p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link href="/auth/sign-in?redirectTo=%2Fanki%2Fdownload" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#a3cfff] px-7 py-4 font-black text-[#11162f] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-white/30">Download the Beta <ArrowRight className="h-5 w-5" /></Link>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/80 bg-white/80 p-7 backdrop-blur sm:p-9">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#426b9b]">Setup takes five steps</p>
              <ol className="mt-6 space-y-5">
                {[
                  "Create or sign in to your SnapOrtho account",
                  "Download and install the Anki add on",
                  "Restart Anki and connect SnapOrtho",
                  "Download and import the Master Deck",
                  "Confirm your installed deck version",
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#11162f] text-sm font-black text-white">{index + 1}</span>
                    <span className="pt-1 text-sm font-semibold leading-6 text-[#343b52]">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f2e9] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0f766e]">Beta questions</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.035em]">Good to know before you begin.</h2>
            <p className="mt-5 leading-7 text-[#626980]">The beta will continue to improve as learners use it and share feedback.</p>
          </div>
          <div className="space-y-3">
            {[
              ["Why do I need a SnapOrtho account?", "Your account securely connects the add on to SnapOrtho, unlocks current deck releases, and lets the add on check for updates."],
              ["Does SnapOrtho replace Anki?", "No. SnapOrtho works inside Anki Desktop and adds an evolving orthopaedic deck, version awareness, and BroBot teaching."],
              ["Will an update erase my review progress?", "SnapOrtho updates are designed to preserve Anki scheduling and designated personal fields while improving central deck content."],
              ["Which devices are supported?", "The add on is built for Anki Desktop. After setup, your normal Anki sync workflow can continue across the devices you use."],
              ["What does beta mean?", "Beta means the core experience is ready for early learners while the team continues to refine setup, content, and update workflows."],
            ].map(([question, answer]) => (
              <details key={question} className="group rounded-2xl border border-[#11162f]/10 bg-white p-5 open:shadow-md">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-black text-[#11162f] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a3cfff]">
                  {question}<span className="text-2xl font-light text-[#426b9b] transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 max-w-3xl pr-10 text-sm leading-7 text-[#626980]">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-[#426b9b] px-7 py-14 text-center text-white shadow-[0_24px_70px_rgba(66,107,155,0.25)] sm:px-12">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ffd25a] text-[#11162f]"><MessageCircleQuestion className="h-7 w-7" /></div>
          <h2 className="mt-7 text-balance text-4xl font-black tracking-[-0.035em]">Help shape the future of orthopaedic learning.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/75">Use the beta, share what helps, and tell us what would make every review more effective.</p>
          <Link href="/contact" className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-7 py-4 font-black text-[#11162f] transition hover:bg-[#ffd25a] focus:outline-none focus:ring-4 focus:ring-white/30">Share Beta Feedback <ArrowRight className="h-5 w-5" /></Link>
        </div>
      </section>
    </div>
  );
}
