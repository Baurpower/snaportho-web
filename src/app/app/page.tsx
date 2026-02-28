// app/app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const SITE_URL = "https://snap-ortho.com";
const PAGE_URL = `${SITE_URL}/app`;

const APP_STORE_URL = "https://apps.apple.com/app/id6742800145";
// If your Android package id is different, swap it here:
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.snaportho.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Open SnapOrtho | App Links",
  description:
    "Open SnapOrtho in the mobile app. If you don’t have the app installed, download it from the App Store or Google Play.",
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
};

const links = [
  { label: "🏠 Home", href: "/app/home", desc: "Open the app home screen." },
  { label: "🦴 Practice", href: "/app/practice", desc: "Jump into spaced repetition practice." },
  { label: "🤖 BroBot", href: "/app/brobot", desc: "Open BroBot case prep." },
  { label: "📚 Learn", href: "/app/learn", desc: "Open the learning library." },
  { label: "📓 Learn", href: "/app/reference", desc: "Open the reference section." },
];

export default function AppLandingPage() {
  return (
    <main className="min-h-[calc(100vh-0px)] bg-[#0B1220] text-white">
      {/* Top */}
      <div className="mx-auto max-w-5xl px-4 md:px-6 pt-10 md:pt-14 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
          <span className="h-2 w-2 rounded-full bg-teal-400/90" />
          Universal link hub
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
  <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
    Open SnapOrtho in the app
  </h1>

  <div className="shrink-0">
    <Image
      src="/snaportho-logoBG.png" 
      alt="SnapOrtho App Logo"
      width={150}
      height={150}
      className="rounded-2xl shadow-lg"
      priority
    />
  </div>
</div>
        <p className="mt-3 max-w-2xl text-base md:text-lg text-white/75">
          If you have SnapOrtho installed, these links should open the app automatically.
          If not, you’ll land here and can download it in one tap.
        </p>

        {/* Primary CTAs */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href={APP_STORE_URL}
            className="inline-flex items-center justify-center rounded-full bg-teal-400/90 px-6 py-3 font-medium text-[#06101B] hover:bg-teal-300 transition"
          >
            Download on the App Store
          </a>
          <a
            href={PLAY_STORE_URL}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 font-medium text-white hover:bg-white/10 transition"
          >
            Get it on Google Play
          </a>
        </div>
      </div>

      {/* Links grid */}
      <div className="mx-auto max-w-5xl px-4 md:px-6 pb-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/8 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{item.label}</div>
                  <div className="mt-1 text-sm text-white/70">{item.desc}</div>
                  <div className="mt-3 text-xs text-white/50">
                    {SITE_URL}
                    {item.href}
                  </div>
                </div>

                <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 group-hover:text-white transition">
                  Open →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}