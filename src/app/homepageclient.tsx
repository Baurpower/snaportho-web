'use client';

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Nav from "../components/Nav"; // adjust path if needed
import SmartDeepLink from "../components/smartdeeplink";

const APP_STORE_URL = "https://apps.apple.com/app/id6742800145";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.snaportho.app";

type SectionLink = { label: string; href: string };

type PortfolioSection = {
  key: string;
  label: string;
  accent: "sky" | "teal" | "green" | "navy" | "blue" | "bold-blue";
  icon?: string;
  logoSrc?: string;
  title: string;
  subtitle: string;
  bullets: string[];
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  deepLinks: SectionLink[];
};

function isDeepLink(href: string) {
  return href.startsWith("snaportho://");
}

function accentStyles(accent: PortfolioSection["accent"]) {
  switch (accent) {
    case "sky":
      return {
        pill: "bg-sky/15 text-sky hover:bg-sky/20",
        badge: "bg-sky/20 text-sky",
        grad: "from-[#7EB8FF18] to-white",
        dot: "bg-sky",
      };

    case "teal":
      return {
        pill: "bg-[#10B98112] text-[#0F766E] hover:bg-[#10B98118]",
        badge: "bg-[#10B98112] text-[#0F766E]",
        grad: "from-[#10B98112] to-white",
        dot: "bg-[#0F766E]",
      };

    case "green":
      return {
        pill: "bg-green-100 text-green-800 hover:bg-green-200",
        badge: "bg-green-100 text-green-800",
        grad: "from-green-50 to-white",
        dot: "bg-green-600",
      };

    case "blue":
      return {
        pill: "bg-[#1F6FB2]/15 text-[#174E7C] hover:bg-[#1F6FB2]/25",
        badge: "bg-[#1F6FB2]/15 text-[#174E7C]",
        grad: "from-[#1F6FB2]/20 to-white",
        dot: "bg-[#1F6FB2]",
      };

    case "bold-blue":
      return {
        pill: "bg-[#00B8D9]/15 text-[#007C91] hover:bg-[#00B8D9]/25",
        badge: "bg-[#00B8D9]/15 text-[#007C91]",
        grad: "from-[#00B8D9]/20 to-white",
        dot: "bg-[#00B8D9]",
      };

    case "navy":
    default:
      return {
        pill: "bg-slate-100 text-navy hover:bg-slate-200",
        badge: "bg-slate-100 text-navy",
        grad: "from-slate-50 to-white",
        dot: "bg-navy",
      };
  }
}

function clampIndex(i: number, n: number) {
  if (n <= 0) return 0;
  return ((i % n) + n) % n;
}

function PortfolioCarousel({
  sections,
  intervalMs = 5000,
}: {
  sections: PortfolioSection[];
  intervalMs?: number;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Stop auto-rotate permanently after first user interaction
  const hasInteractedRef = useRef(false);

  const count = sections.length;
  const current = sections[clampIndex(active, count)];
  const styles = accentStyles(current?.accent ?? "navy");

  // ---- Auto-rotate (only if user has NOT interacted)
  useEffect(() => {
    if (count <= 1) return;
    if (paused) return;
    if (hasInteractedRef.current) return;

    const id = window.setInterval(() => {
      setActive((a) => clampIndex(a + 1, count));
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [paused, count, intervalMs]);

  const markInteracted = () => {
    hasInteractedRef.current = true;
  };

  const onPick = (idx: number) => {
    markInteracted();
    setActive(idx);
  };

  const goPrev = () => {
    markInteracted();
    setActive((a) => clampIndex(a - 1, count));
  };

  const goNext = () => {
    markInteracted();
    setActive((a) => clampIndex(a + 1, count));
  };

  // ---- Swipe support (touch + pointer)
  const swipeRef = useRef<{
    startX: number;
    startY: number;
    active: boolean;
    pointerId: number | null;
    moved: boolean;
  }>({ startX: 0, startY: 0, active: false, pointerId: null, moved: false });

  const SWIPE_MIN_PX = 45;
  const SWIPE_MAX_Y = 60;

  const shouldIgnoreStart = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("a,button,input,textarea,select,[data-no-swipe]"));
  };

  const onTouchStart = (e: React.TouchEvent) => {
  if (shouldIgnoreStart(e.target)) return;

  markInteracted(); // ✅ STOP auto-rotate permanently on mobile touch

  const t = e.touches[0];
  swipeRef.current = {
    startX: t.clientX,
    startY: t.clientY,
    active: true,
    pointerId: null,
    moved: false,
  };
};

  const onTouchMove = (e: React.TouchEvent) => {
    if (!swipeRef.current.active) return;
    const t = e.touches[0];
    const dx = t.clientX - swipeRef.current.startX;
    const dy = t.clientY - swipeRef.current.startY;

    if (Math.abs(dx) > 10) swipeRef.current.moved = true;

    if (Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault?.();
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!swipeRef.current.active) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeRef.current.startX;
    const dy = t.clientY - swipeRef.current.startY;

    swipeRef.current.active = false;

    if (Math.abs(dy) > SWIPE_MAX_Y) return;
    if (Math.abs(dx) < SWIPE_MIN_PX) return;

    if (dx < 0) goNext();
    else goPrev();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (shouldIgnoreStart(e.target)) return;
    if (e.pointerType === "mouse") return;

    markInteracted();
    swipeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      active: true,
      pointerId: e.pointerId,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!swipeRef.current.active) return;
    if (swipeRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - swipeRef.current.startX;
    if (Math.abs(dx) > 10) swipeRef.current.moved = true;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!swipeRef.current.active) return;
    if (swipeRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;

    swipeRef.current.active = false;
    swipeRef.current.pointerId = null;

    if (Math.abs(dy) > SWIPE_MAX_Y) return;
    if (Math.abs(dx) < SWIPE_MIN_PX) return;

    if (dx < 0) goNext();
    else goPrev();
  };

  if (!current) return null;

  return (
    // ✅ no tinted background behind this section
    <section className="bg-transparent">
      {/* ✅ minimal horizontal padding */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-10">
        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {/* ✅ Pills row: pills only */}
          <div className="px-4 sm:px-5 md:px-6 py-4 border-b border-slate-100 bg-white">
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {sections.map((s, idx) => {
                const sStyles = accentStyles(s.accent);
                const isActive = idx === clampIndex(active, count);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => onPick(idx)}
                    className={[
                      "px-4 py-2 rounded-full font-semibold text-sm transition border",
                      isActive
                        ? `${sStyles.pill} border-transparent shadow-sm`
                        : "bg-white border-slate-200 text-midnight/70 hover:bg-slate-50",
                    ].join(" ")}
                    aria-current={isActive ? "true" : "false"}
                    aria-label={`Show ${s.label}`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slide wrapper (swipe surface) */}
          <div
            className="px-4 sm:px-5 md:px-6 py-8"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ touchAction: "pan-y" }}
          >
            <div className={`rounded-3xl border border-slate-100 bg-gradient-to-br ${styles.grad} p-6 md:p-8`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Left */}
                <div>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${styles.badge} flex items-center justify-center overflow-hidden`}>
                      {current.logoSrc ? (
                        <Image
                          src={current.logoSrc}
                          alt={`${current.label} logo`}
                          width={40}
                          height={40}
                          className="rounded-xl"
                        />
                      ) : (
                        <span className="text-xl">{current.icon ?? "✨"}</span>
                      )}
                    </div>

                    <h3 className="text-2xl md:text-3xl font-bold text-navy">
                      {current.title}
                    </h3>
                  </div>

                  <p className="mt-3 text-midnight/75 leading-relaxed">
                    {current.subtitle}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {isDeepLink(current.primaryCta.href) ? (
  <SmartDeepLink
    deepLink={current.primaryCta.href}
    className={
      current.accent === "teal"
        ? "px-6 py-3 rounded-full bg-[#0F766E] text-white font-semibold hover:bg-[#0B5E58] transition shadow-sm hover:shadow-md"
        : current.accent === "green"
        ? "px-6 py-3 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition shadow-sm hover:shadow-md"
        : current.accent === "navy"
        ? "px-6 py-3 rounded-full bg-navy text-white font-semibold hover:bg-navy/90 transition shadow-sm hover:shadow-md"
        : "px-6 py-3 rounded-full bg-sky text-white font-semibold hover:bg-sky/90 transition shadow-sm hover:shadow-md"
    }
  >
    {current.primaryCta.label}
  </SmartDeepLink>
) : (
  <Link
    href={current.primaryCta.href}
    onClick={markInteracted}
    className={
      current.accent === "teal"
        ? "px-6 py-3 rounded-full bg-[#0F766E] text-white font-semibold hover:bg-[#0B5E58] transition shadow-sm hover:shadow-md"
        : current.accent === "green"
        ? "px-6 py-3 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition shadow-sm hover:shadow-md"
        : current.accent === "navy"
        ? "px-6 py-3 rounded-full bg-navy text-white font-semibold hover:bg-navy/90 transition shadow-sm hover:shadow-md"
        : "px-6 py-3 rounded-full bg-sky text-white font-semibold hover:bg-sky/90 transition shadow-sm hover:shadow-md"
    }
  >
    {current.primaryCta.label}
  </Link>
)}

                    {current.secondaryCta &&
  (isDeepLink(current.secondaryCta.href) ? (
    <SmartDeepLink
      deepLink={current.secondaryCta.href}
      className="px-6 py-3 rounded-full border border-slate-200 bg-white text-navy font-semibold hover:bg-slate-50 transition"
    >
      {current.secondaryCta.label}
    </SmartDeepLink>
  ) : (
    <Link
      href={current.secondaryCta.href}
      onClick={markInteracted}
      className="px-6 py-3 rounded-full border border-slate-200 bg-white text-navy font-semibold hover:bg-slate-50 transition"
    >
      {current.secondaryCta.label}
    </Link>
  ))}
                  </div>

                  {/* Deep links */}
                  <div className="mt-6">
                    <div className="text-sm font-semibold text-navy">Explore</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {current.deepLinks.map((l) =>
  isDeepLink(l.href) ? (
    <SmartDeepLink
      key={l.href}
      deepLink={l.href}
      className="text-sm font-semibold text-midnight/70 hover:text-navy hover:underline"
    >
      {l.label} →
    </SmartDeepLink>
  ) : (
    <Link
      key={l.href}
      href={l.href}
      onClick={markInteracted}
      className="text-sm font-semibold text-midnight/70 hover:text-navy hover:underline"
    >
      {l.label} →
    </Link>
  )
)}
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="rounded-3xl bg-white/80 border border-slate-100 p-6 md:p-7 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-navy">Best for</div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={goPrev}
                        className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition"
                        aria-label="Previous"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition"
                        aria-label="Next"
                      >
                        →
                      </button>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-midnight/75">
                    {current.bullets.map((b) => (
                      <li key={b} className="flex gap-2">
                        <span className={`mt-2 w-2 h-2 rounded-full ${styles.dot}`} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex items-center gap-2">
                    {sections.map((_, idx) => {
                      const on = idx === clampIndex(active, count);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onPick(idx)}
                          className={[
                            "h-2.5 rounded-full transition",
                            on ? "w-8 bg-navy" : "w-2.5 bg-slate-200 hover:bg-slate-300",
                          ].join(" ")}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

const goalCards = [
  {
    key: "education",
    title: "Education",
    kicker: "Learn orthopaedics faster",
    icon: "📚",
    // light / sky
    top: "from-[#7EB8FF] via-[#A7D0FF] to-[#D7EBFF]",
    ring: "ring-[#7EB8FF33]",
    badge: "bg-[#7EB8FF22] text-[#1E4E8C]",
    bullets: [
      "Image-first modules with high-yield visuals",
      "Fracture-conference style reps (spaced repetition)",
      "Expert-curated content built for recall",
      "Fast refreshers when you’re on the move (Reference)",
    ],
  },
  {
    key: "mentorship",
    title: "Mentorship",
    kicker: "Navigate the path to ortho smarter",
    icon: "🧭",
    // darker / navy
    top: "from-[#0B1F3A] via-[#163B6B] to-[#2B5B9B]",
    ring: "ring-[#0B1F3A22]",
    badge: "bg-white/15 text-white",
    bullets: [
      "Path to Ortho timelines + stage-based milestones",
      "Hidden-curriculum strategy (sub-Is, signals, networking)",
      "Research 101: idea → IRB → analysis → manuscript",
      "BroBot case-prep frameworks to reduce guesswork",
    ],
  },
];

const portfolioSections: PortfolioSection[] = [
  {
    key: "brobot",
    label: "BroBot",
    accent: "teal",
    logoSrc: "/brologo.png",
    title: "Meet Bro",
    subtitle:
      "Prepare for ortho cases faster and smarter.",
    bullets: [
      "Understand the most common pimp questions",
      "Case prep the night before",
      "Quiz yourself before the case",
      "Such a powerful tool!",
    ],
    primaryCta: { label: "Try BroBot", href: "/brobot" },
    deepLinks: [
      { label: "BroBot in our App", href: "snaportho://brobot" }
    ],
  },
  {
    key: "learn",
    label: "Learn",
    accent: "sky",
    icon: "📚",
    title: "Learn",
    subtitle: "Sketchy style visual learning modules to learn orthopaedics fast.",
    bullets: [
      "Structured modules to learn what matters most",
      "High-yield visuals designed for recall",
      "Perfect for pre-rotation + sub-I momentum",
      "Pairs naturally with practice",
    ],
    primaryCta: { label: "Start Learning", href: "/learn" },
    secondaryCta: { label: "Trauma Module", href: "/learn/modules/trauma" },
    deepLinks: [
      { label: "All Modules", href: "/learn" },
      { label: "Trauma", href: "/learn/modules/trauma" },
    ],
  },
  {
    key: "practice",
    label: "Practice",
    accent: "sky",
    icon: "🩻",
    title: "Practice",
    subtitle: "Practice fracture conference with spaced repetition.",
    bullets: [
      "Practice reading X-Rays",
      "Practice classifying injury patterns",
      "Practice deciding best management",
      "Everything you need to excel in fracture conference!",
    ],
    primaryCta: { label: "Only available in our App", href: "snaportho://practice" },
    deepLinks: [
      { label: "Practice in our App", href: "snaportho://practice" },
    ],
  },
  {
    key: "path",
    label: "Path to Ortho",
    accent: "blue",
    icon: "👣",
    title: "Path to Ortho",
    subtitle:
      "Mentorship and strategy for the Match.",
    bullets: [
      "What matters most at each stage",
      "How to build a competitive application",
      "Signals, networking, and sub-I strategy",
      "Designed to reduce guesswork",
    ],
    primaryCta: { label: "View Path to Ortho", href: "/pathtoortho" },
    secondaryCta: { label: "IMG Path", href: "/imgpathtoortho" },
    deepLinks: [
      { label: "Away Rotations", href: "/pathtoortho/awayrotations" },
      { label: "ERAS Applications", href: "/pathtoortho/eras" },
      { label: "Ortho Interviews", href: "/pathtoortho/interviews" },
    ],
  },
  {
    key: "research",
    label: "Research 101",
    accent: "bold-blue",
    icon: "🧪",
    title: "Research 101",
    subtitle:
      "Learn the basics of orthopaedic research with practical modules and guidance.",
    bullets: [
      "Build a research CV efficiently",
      "How to find ortho research projects",
      "Avoid common pitfalls",
      "Learn what it takes to be a strong research student",
      
    ],
    primaryCta: { label: "Explore Research 101", href: "/research" },
    secondaryCta: { label: "Research Playbook", href: "/research/playbook" },
    deepLinks: [
      { label: "Start Here", href: "/research" },
      { label: "Find Ortho Projects", href: "/research/projects" },
    ],
  },
  {
    key: "reference",
    label: "Reference",
    accent: "navy",
    icon: "📌",
    title: "Reference",
    subtitle:
      "Quick reference for common ortho concepts.",
    bullets: [
      "Quick, clean, and practical",
      "Important concepts for ortho rotations",
      "Pairs with Practice for clarity",
    ],
    primaryCta: { label: "Open Reference", href: "/reference" },
    deepLinks: [
      { label: "How to Read XRays", href: "/reference/read-xray" },
    ],
  },
  {
    key: "fundraising",
    label: "Fundraising",
    accent: "green",
    icon: "🌱",
    title: "Support SnapOrtho",
    subtitle:
      "Help keep SnapOrtho accessible while we build new modules, mentorship resources, and app improvements.",
    bullets: [
      "Keeps SnapOrtho growing",
      "Supports new content + hosting costs",
      "Expands mentorship resources",
      "Funds new Learn + app features",
    ],
    primaryCta: { label: "Support SnapOrtho", href: "/fundraising" },
    deepLinks: [
      
    ],
  },
];

export default function HomePage() {
  const [showPopup, setShowPopup] = useState(true);

  return (
    <div className="font-sans text-midnight flex flex-col min-h-screen bg-cream relative overflow-x-hidden">
      {/* POPUP */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 max-w-xl w-full text-center relative animate-fade-in-down">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">
              📣 Contribute to the Countdown to Match Fundraiser!
            </h2>
            <p className="text-base sm:text-lg text-midnight/80 mb-6">
              Support the next generation of orthopaedic surgeons by donating to our fundraiser. Every donation, big or small, makes a difference!
            </p>
            <Link
              href="/fundraising"
              className="inline-block bg-sky text-white text-lg font-medium px-6 py-3 rounded-full hover:bg-sky/90 transition"
            >
              🙏 Donate
            </Link>
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <Nav />

      {/* HERO */}
      <section className="relative flex items-center justify-center py-16 px-6 md:px-12">
        <div className="absolute inset-0 bg-gradient-to-br from-cream to-white/80 pointer-events-none" />
        <div className="relative bg-white rounded-3xl shadow-xl p-8 md:p-10 text-center mt-8 max-w-2xl w-full">
          <Image
            src="/snaportho-logo.png"
            alt="SnapOrtho Logo"
            width={150}
            height={150}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-3xl md:text-5xl font-extrabold mb-2 text-navy">
            SnapOrtho
          </h1>
          <p className="text-base md:text-lg text-midnight/80 mb-6">
            Memorize, master, excel in orthopaedics.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/learn"
              className="px-6 md:px-8 py-2 md:py-3 bg-sky text-white rounded-full shadow hover:shadow-lg transition"
            >
              Learn
            </Link>
            <Link
  href="/brobot"
  className="px-6 md:px-8 py-2 md:py-3 bg-[#0F766E] text-white rounded-full shadow hover:shadow-lg hover:bg-[#0B5E58] transition"
>
  BroBot
</Link>
          </div>
        </div>
      </section>

      {/* CONTENT BELOW */}
<div className="flex-1 bg-white">
  {/* 2 goals / one mission */}
  <section className="relative">
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-14">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-4xl font-extrabold text-navy">
          2 goals. One mission.
        </h2>
        <p className="mt-3 text-midnight/75 max-w-2xl mx-auto text-base md:text-lg">
          SnapOrtho is built to help you{" "}
          <span className="font-semibold text-midnight">learn orthopaedics faster</span>{" "}
          and{" "}
          <span className="font-semibold text-midnight">navigate the path to ortho smarter</span>.
        </p>

        {/* Goal cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {goalCards.map((c) => (
            <div
              key={c.key}
              className={[
                "group rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden",
                "hover:shadow-md transition",
                "ring-1",
                c.ring,
              ].join(" ")}
            >
              <div className={`px-6 py-5 bg-gradient-to-r ${c.top}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl ${c.badge} flex items-center justify-center text-xl`}>
                    {c.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white/85">{c.kicker}</div>
                    <div className="text-2xl font-extrabold text-white leading-tight">
                      {c.title}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6 bg-gradient-to-b from-white to-slate-50/70">
                <div className="text-sm font-semibold text-navy mb-3">
                  Features that get you there
                </div>
                <ul className="space-y-2 text-sm text-midnight/75">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-2 w-2 h-2 rounded-full bg-slate-300 group-hover:bg-slate-400 transition" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PortfolioCarousel sections={portfolioSections} intervalMs={4000} />
    </div>
  </section>


        {/* App promo (no cream, full navy, punchy + store badges) */}
<section className="bg-white">
  <div className="max-w-6xl mx-auto px-6 md:px-12 py-14">
    <div className="rounded-3xl bg-navy text-white border border-white/10 shadow-sm p-7 md:p-10 relative overflow-hidden">
      {/* glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#00B8D9]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#7EB8FF]/18 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/6 via-transparent to-[#00B8D9]/12" />

      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* LEFT */}
        <div>
          {/* FREE pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-[#00B8D9]" />
            <span className="text-sm font-semibold tracking-wide">100% FREE</span>
            <span className="text-sm text-white/70">for students + residents</span>
          </div>

          <h2 className="mt-5 text-3xl md:text-4xl font-extrabold leading-tight">
            Download SnapOrtho
            <span className="block text-white/80 text-xl md:text-2xl font-semibold mt-2">
              Learn faster. Prep smarter. Crush fracture conference.
            </span>
          </h2>

          {/* Store badges */}
          <div className="mt-7 flex flex-wrap items-center gap-4">
  <a
    href={APP_STORE_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition px-3 py-2"
    aria-label="Download on the App Store"
  >
    <Image
      src="/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg"
      alt="Download on the App Store"
      width={180}
      height={60}
      className="h-12 w-auto"
      priority
    />
  </a>

  <a
    href={PLAY_STORE_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition px-3 py-2"
    aria-label="Get it on Google Play"
  >
    <Image
      src="/GetItOnGooglePlay_Badge_Web_color_English.svg"
      alt="Get it on Google Play"
      width={200}
      height={60}
      className="h-12 w-auto"
    />
  </a>
</div>

          {/* tiny trust line */}
          <div className="mt-4 text-sm text-white/65">
            No paywall. No fluff. Built for real ortho training.
          </div>
        </div>

        {/* RIGHT: aesthetic feature panel */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-7">
          <div className="flex items-center justify-between gap-4">

            
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "Practice", desc: "X-rays → classify → manage", icon: "🩻" },
              { title: "Learn", desc: "Visual modules built for recall", icon: "📚" },
              { title: "BroBot", desc: "Case prep + pimp questions", logoSrc: "/brologo.png" },
              { title: "Reference", desc: "Quick Reference", icon: "📌" },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/8 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
  {f.logoSrc ? (
    <Image
      src={f.logoSrc}
      alt={`${f.title} logo`}
      width={40}
      height={40}
      className="h-8 w-8 object-contain"
    />
  ) : (
    <span className="text-lg">{f.icon ?? "✨"}</span>
  )}
</div>
                  <div className="min-w-0">
                    <div className="font-bold">{f.title}</div>
                    <div className="text-sm text-white/70">{f.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div className="mt-6 flex flex-wrap gap-3">
            <SmartDeepLink
  deepLink="snaportho://"
  className="px-6 py-3 rounded-full bg-white text-navy font-semibold hover:bg-white/90 transition shadow-sm hover:shadow-md"
>
  Download Free
</SmartDeepLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

        <div className="h-10" />
      </div>
    </div>
  );
}