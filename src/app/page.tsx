'use client';

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Nav from "../components/Nav";

const features = [
  { icon: "🖼️", title: "Image-based learning", desc: "High-resolution X-rays with pinpoint annotations." },
  { icon: "⏱️", title: "Spaced repetition",    desc: "Proven Anki-style intervals to cement knowledge." },
  { icon: "👩‍⚕️", title: "Expert-curated",       desc: "Curated by surgeons, for surgeons in training." },
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
              📣 Our Trauma Learn Module is Live!
            </h2>
            <p className="text-base sm:text-lg text-midnight/80 mb-6">
              Dive into trauma training with our new animated video on open fractures.
              Built to learn complex ortho concepts faster.
            </p>
            <Link
              href="/learn/modules/trauma"
              className="inline-block bg-sky text-white text-lg font-medium px-6 py-3 rounded-full hover:bg-sky/90 transition"
            >
              ▶️ Watch the Trauma Module
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
              className="px-6 md:px-8 py-2 md:py-3 border-2 border-sky text-sky rounded-full hover:bg-sky/10 transition"
            >
              BroBot
            </Link>
          </div>
        </div>
      </section>

      {/* CONTENT BELOW */}
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

          {/* Call to Action */}
          <div className="mt-12 text-center">
            <Link
              href="/fundraising"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-100 text-green-800 font-semibold text-base hover:bg-green-200 transition-all shadow-sm hover:shadow-md"
            >
              <span className="text-xl">🌱</span> Support SnapOrtho
            </Link>
          </div>

        </section>

      </div>
    </div>
  );
}
