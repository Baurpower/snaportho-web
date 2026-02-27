// app/mobile-app/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const SITE_URL = "https://snap-ortho.com";
const PAGE_URL = `${SITE_URL}/mobile-app`;

const APP_STORE_URL = "https://apps.apple.com/app/id6742800145";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.snaportho.app";

const DEEP_LINK = "snaportho://home"; // you can change to snaportho://practice etc.

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SnapOrtho Mobile App | Memorize, Master, Excel)",
  description:
    "Download the SnapOrtho mobile app for image-first orthopaedic learning: high-resolution X-rays, spaced repetition practice, and BroBot case prep. Scan the QR code to install instantly.",
  alternates: {
    canonical: PAGE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    title: "SnapOrtho Mobile App",
    description:
      "Image-first orthopaedic learning on the go: X-rays, spaced repetition, and BroBot case prep. Scan the QR code to install.",
    siteName: "SnapOrtho",
    images: [
      {
        // Put a social preview image in /public/og-mobile-app.png
        url: "/og-mobile-app.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho mobile app preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapOrtho Mobile App",
    description:
      "X-rays + spaced repetition + case prep. Scan the QR code to install SnapOrtho.",
    images: ["/og-mobile-app.png"],
  },
  keywords: [
    "SnapOrtho",
    "orthopaedics app",
    "orthopedic learning",
    "x-ray interpretation",
    "fracture conference",
    "spaced repetition",
    "medical student",
    "orthopaedic resident",
    "case prep",
    "BroBot",
  ],
};

function JsonLd() {
  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SnapOrtho",
    applicationCategory: "EducationalApplication",
    operatingSystem: "iOS, Android",
    description:
      "SnapOrtho is a mobile learning platform for orthopaedics featuring image-first X-rays, spaced repetition practice, and case-prep tools like BroBot.",
    url: PAGE_URL,
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        category: "free",
        url: APP_STORE_URL,
      },
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        category: "free",
        url: PLAY_STORE_URL,
      },
    ],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is SnapOrtho?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "SnapOrtho is a mobile app built to help medical students and residents learn orthopaedics faster with image-first X-rays, spaced repetition practice, and case-prep tools.",
        },
      },
      {
        "@type": "Question",
        name: "How do I download the SnapOrtho app?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Scan the QR code on this page to open the correct store on your phone, or use the App Store / Google Play buttons.",
        },
      },
      {
        "@type": "Question",
        name: "Who is SnapOrtho for?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "SnapOrtho is designed for medical students, sub-interns, and early residents who want faster, more confident orthopaedic learning and stronger fracture conference performance.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}

export default function MobileAppPage() {
  return (
    <div className="min-h-screen bg-cream text-midnight">
      <JsonLd />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cream to-white/80 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 md:px-12 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-10">
              <div className="flex items-center gap-4">
                <Image
                  src="/snaportho-logo.png"
                  alt="SnapOrtho logo"
                  width={64}
                  height={64}
                  className="rounded-2xl"
                  priority
                />
                <div>
                  <p className="text-sm font-semibold text-midnight/60">SnapOrtho Mobile App</p>
                  <h1 className="text-3xl md:text-5xl font-extrabold text-navy leading-tight">
                    <span className="block">Memoirze</span>
                    <span className="block">Master</span>
                    <span className="block">Excel</span>
                  </h1>
                </div>
              </div>

              <p className="mt-5 text-base md:text-lg text-midnight/75 leading-relaxed">
                SnapOrtho is built to learn important orthopaedic concepts faster and more confidently.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={APP_STORE_URL}
                  className="px-6 py-3 rounded-full bg-navy text-white font-semibold hover:bg-navy/90 transition shadow-sm hover:shadow-md"
                  aria-label="Download SnapOrtho on the App Store"
                >
                  Download on iPhone
                </a>
                <a
                  href={PLAY_STORE_URL}
                  className="px-6 py-3 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800 transition shadow-sm hover:shadow-md"
                  aria-label="Get SnapOrtho on Google Play"
                >
                  Get it on Android
                </a>
                <a
                  href={DEEP_LINK}
                  className="px-6 py-3 rounded-full border border-slate-200 bg-white text-navy font-semibold hover:bg-slate-50 transition"
                  aria-label="Open SnapOrtho if installed"
                >
                  Open the app
                </a>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5">
                  <div className="text-sm font-semibold text-navy">What you get</div>
                  <ul className="mt-3 space-y-2 text-sm text-midnight/75">
                    <li className="flex gap-2"><span className="font-semibold text-sky">•</span> High-resolution X-rays</li>
                    <li className="flex gap-2"><span className="font-semibold text-sky">•</span> Spaced repetition practice</li>
                    <li className="flex gap-2"><span className="font-semibold text-sky">•</span> Case prep with BroBot</li>
                    <li className="flex gap-2"><span className="font-semibold text-sky">•</span> Quick reference when you’re busy</li>
                  </ul>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5">
                  <div className="text-sm font-semibold text-navy">Best for</div>
                  <ul className="mt-3 space-y-2 text-sm text-midnight/75">
                    <li className="flex gap-2"><span className="font-semibold text-[#0F766E]">•</span> Pre-rotation momentum</li>
                    <li className="flex gap-2"><span className="font-semibold text-[#0F766E]">•</span> Sub-I performance</li>
                    <li className="flex gap-2"><span className="font-semibold text-[#0F766E]">•</span> Fracture conference reps</li>
                    <li className="flex gap-2"><span className="font-semibold text-[#0F766E]">•</span> Night-before case prep</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* QR + Social proof */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-10">
              <h2 className="text-2xl md:text-3xl font-bold text-navy">
                Scan to install
              </h2>
              <p className="mt-2 text-midnight/70">
                Open your camera, scan the QR code, and you’ll be taken to the correct store on your phone.
              </p>

              {/* ✅ Put your QR image in /public/qr-snaportho.png */}
              <div className="mt-6 flex items-center justify-center">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <Image
                    src="/SnapOrtho_QR-code.png"
                    alt="SnapOrtho app download QR code"
                    width={520}
                    height={520}
                    className="w-[280px] sm:w-[360px] md:w-[420px] lg:w-[460px] h-auto"
                    priority
                  />
                </div>
              </div>

              <div className="mt-6 rounded-3xl bg-gradient-to-br from-[#7EB8FF18] to-[#10B98112] border border-slate-100 p-6">
                <div className="text-sm font-semibold text-navy">Why people stick with it</div>
                <ul className="mt-3 space-y-2 text-sm text-midnight/75">
                  <li className="flex gap-2"><span className="font-semibold text-sky">•</span> Short daily reps that actually add up</li>
                  <li className="flex gap-2"><span className="font-semibold text-sky">•</span> Built for students and junior residents</li>
                  <li className="flex gap-2"><span className="font-semibold text-sky">•</span> Designed for recall under pressure</li>
                  <li className="flex gap-2"><span className="font-semibold text-sky">•</span> Clear, practical, and fast to use</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Optional: screenshots row (great for SEO + conversions) */}
          <div className="mt-12">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-navy">A faster workflow</h2>
                <p className="mt-2 text-midnight/70 max-w-2xl">
                  SnapOrtho is built to fit real training — quick reps between cases, targeted practice, and
                  less guesswork before the OR.
                </p>
              </div>
            </div>

            {/* Put images in /public/app-screens/ if you want these live */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { src: "/app-screens/screen1.png", alt: "SnapOrtho practice dashboard" },
                { src: "/app-screens/screen2.png", alt: "SnapOrtho X-ray practice" },
                { src: "/app-screens/screen3.png", alt: "SnapOrtho spaced repetition" },
                { src: "/app-screens/screen4.png", alt: "SnapOrtho BroBot case prep" },
              ].map((s) => (
                <div key={s.src} className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <div className="p-3">
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden">
                      <Image
                        src={s.src}
                        alt={s.alt}
                        width={600}
                        height={1200}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <p className="text-sm text-midnight/70">{s.alt}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-10">
              <h3 className="text-xl md:text-2xl font-bold text-navy">Ready to level up?</h3>
              <p className="mt-2 text-midnight/70">
                Install SnapOrtho, scan the QR code above, and start building consistency with short daily reps.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={APP_STORE_URL}
                  className="px-6 py-3 rounded-full bg-navy text-white font-semibold hover:bg-navy/90 transition shadow-sm hover:shadow-md"
                >
                  Download on iPhone
                </a>
                <a
                  href={PLAY_STORE_URL}
                  className="px-6 py-3 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800 transition shadow-sm hover:shadow-md"
                >
                  Get it on Android
                </a>
                <a
                  href={DEEP_LINK}
                  className="px-6 py-3 rounded-full border border-slate-200 bg-white text-navy font-semibold hover:bg-slate-50 transition"
                >
                  Open the app
                </a>
              </div>
            </div>

            {/* Minimal footer links for internal SEO */}
            <div className="mt-10 text-center text-sm text-midnight/60">
              <Link href="/learn" className="font-semibold text-navy hover:underline">Learn</Link>
              <span className="mx-2">•</span>
              <Link href="/brobot" className="font-semibold text-navy hover:underline">BroBot</Link>
              <span className="mx-2">•</span>
              <Link href="/reference" className="font-semibold text-navy hover:underline">Reference</Link>
              <span className="mx-2">•</span>
              <Link href="/fundraising" className="font-semibold text-navy hover:underline">Support</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}