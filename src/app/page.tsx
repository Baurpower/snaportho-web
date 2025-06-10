// src/app/page.tsx
import Image from "next/image";
import Link  from "next/link";
import Nav   from "../components/Nav";

const features = [
  { icon: "🖼️", title: "Image-based learning", desc: "High-resolution X-rays with pinpoint annotations." },
  { icon: "⏱️", title: "Spaced repetition",    desc: "Proven Anki-style intervals to cement knowledge." },
  { icon: "👩‍⚕️", title: "Expert-curated",       desc: "Curated by surgeons, for surgeons in training." },
];

export default function HomePage() {
  return (
    <div className="font-sans text-midnight flex flex-col min-h-screen bg-cream">
      {/* NAVBAR */}
      <Nav />

      {/* HERO on cream */}
      <section className="relative flex items-center justify-center py-16 px-6 md:px-12">
        {/* subtle gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-cream to-white/80 pointer-events-none" />

        {/* hero card moved down with mt */}
        <div className="relative bg-white rounded-3xl shadow-xl p-8 md:p-10 text-center mt-8 max-w-2xl w-full">
          <Image
            src="/snaportho-logo.png"
            alt="SnapOrtho Logo"
            width={96}
            height={96}
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
              href="/practice"
              className="px-6 md:px-8 py-2 md:py-3 border-2 border-sky text-sky rounded-full hover:bg-sky/10 transition"
            >
              Practice
            </Link>
          </div>
        </div>
      </section>

      {/* EVERYTHING BELOW ON WHITE */}
      <div className="flex-1 bg-white pt-12">
        <section className="max-w-5xl mx-auto px-6 md:px-12 pb-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-10 text-sky-500">
            Why SnapOrtho?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="p-6 rounded-2xl shadow hover:shadow-md transition"
                style={{ backgroundColor: "#7EB8FF20" }}
              >
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="text-lg font-semibold mb-1 text-navy">{title}</h3>
                <p className="text-sm text-midnight/75 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
