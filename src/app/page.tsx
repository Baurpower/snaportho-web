// src/app/page.tsx
import Image from "next/image";
import Link  from "next/link";
import Nav   from "../components/Nav";

const features = [
  {
    icon: "🖼️",
    title: "Image-based learning",
    desc:  "High-resolution X-rays with pinpoint annotations.",
  },
  {
    icon: "⏱️",
    title: "Spaced repetition",
    desc:  "Proven Anki-style intervals to cement knowledge.",
  },
  {
    icon: "👩‍⚕️",
    title: "Expert curated",
    desc:  "Content vetted by fellowship-trained surgeons.",
  },
];

export default function HomePage() {
  return (
    <div className="font-sans text-midnight bg-white flex flex-col min-h-screen">
      {/* NAVBAR */}
      <Nav />

      {/* HERO on cream */}
      <section className="bg-cream flex items-center justify-center py-10 px-12 mt-12">
        <div className="relative w-full max-w-2xl">
          {/* subtle overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-cream to-white/80 pointer-events-none" />

          {/* hero card */}
          <div className="relative bg-white rounded-3xl shadow-xl p-10 text-center">
            <Image
              src="/snaportho-logo.png"
              alt="SnapOrtho Logo"
              width={96}
              height={96}
              className="mx-auto mb-5"
              priority
            />
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-navy">
              SnapOrtho
            </h1>
            <p className="text-sm md:text-base text-midnight/80 mb-6">
              Memorize, master, excel in orthopaedics.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/learn"
                className="px-8 py-3 bg-sky text-white font-medium rounded-full shadow hover:shadow-lg transition"
              >
                Learn
              </Link>
              <Link
                href="/practice"
                className="px-8 py-3 border-2 border-sky text-sky font-medium rounded-full hover:bg-sky/10 transition"
              >
                Practice
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES (white background to bottom) */}
      <section className="w-full py-12 px-12">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-10 text-navy">
          Why SnapOrtho?
        </h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="p-6 bg-cream rounded-2xl shadow hover:shadow-md transition"
            >
              <div className="text-2xl mb-3">{icon}</div>
              <h3 className="text-lg font-semibold mb-1 text-navy">{title}</h3>
              <p className="text-sm text-midnight/75 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
