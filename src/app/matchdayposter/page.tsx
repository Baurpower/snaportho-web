'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const COLORS = {
  bg: '#f9f7f4',
  text: '#1f2937',
  heading: '#444444',
  accent: '#597498',
  border: 'rgba(148,163,184,0.6)',
} as const;

export default function MatchDayPosterPage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ background: COLORS.bg, color: COLORS.text }}
    >
      {/* Soft background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute left-1/2 top-[-10%] h-[45vh] w-[75vw] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(89,116,152,0.10), transparent 60%)',
          }}
        />
        <div
          className="absolute bottom-[-15%] right-[-10%] h-[35vh] w-[40vw] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(89,116,152,0.06), transparent 60%)',
          }}
        />
      </div>

      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full rounded-3xl border bg-white/90 p-8 text-center shadow-sm sm:p-12"
          style={{ borderColor: COLORS.border }}
        >
          <p
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] sm:text-xs"
            style={{ color: '#6b7280' }}
          >
            Match Day
          </p>

          <h1
            className="text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ color: COLORS.heading }}
          >
            Congratulations!!!
          </h1>

          <p
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
            style={{ color: '#4b5563' }}
          >
            Download our Match Day poster.
          </p>

          <p
            className="mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base"
            style={{ color: '#6b7280' }}
          >
            Remember to tag us on Instagram{' '}
            <span className="font-semibold" style={{ color: COLORS.accent }}>
              @snaportho
            </span>
          </p>

          <div className="mt-8">
            <Link
              href="/match-day-poster.pdf"
              target="_blank"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ background: COLORS.accent }}
            >
              Download Poster
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}