'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FlaskConical, ArrowRight } from 'lucide-react';
import InDevelopmentPlaybookPage from './indevelopmentplaybookpage';

const COLORS = {
  bg: '#fbfaf7',
  heading: '#2b2b2b',
  text: '#4b5563',
  accent: '#3f6f67',
  border: 'rgba(148,163,184,0.55)',
} as const;

export default function PlaybookPreviewWithOverlay() {
  return (
    <div className="relative min-h-screen" style={{ background: COLORS.bg }}>
      {/* ===== PREVIEW LAYER (your real page) ===== */}
      <div className="relative">
        {/* Optional: make the preview feel “behind glass” */}
        <div className="pointer-events-none select-none opacity-60 blur-[1px] scale-[0.995] origin-top">
          <InDevelopmentPlaybookPage />
        </div>

        {/* subtle vignette/scrim so overlay reads well */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(251,250,247,0.15), rgba(251,250,247,0.55) 65%, rgba(251,250,247,0.72))',
          }}
        />
      </div>

      {/* ===== OVERLAY CARD (FIXED = always centered in viewport) ===== */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-auto w-full max-w-2xl"
        >
          <div
            className="rounded-3xl border shadow-lg overflow-hidden"
            style={{
              borderColor: COLORS.border,
              background: 'rgba(255,255,255,0.86)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div className="p-8 sm:p-10 text-center">
              <div className="flex justify-center mb-4">
                <div
                  className="h-12 w-12 rounded-2xl border flex items-center justify-center"
                  style={{ borderColor: COLORS.border, background: 'rgba(63,111,103,0.08)' }}
                >
                  <FlaskConical className="h-6 w-6" style={{ color: COLORS.accent }} />
                </div>
              </div>

              <p className="text-xs font-semibold tracking-[0.18em] uppercase" style={{ color: COLORS.text }}>
                Research Playbook
              </p>

              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: COLORS.heading }}>
                Still in Development
              </h1>

              <p className="mt-4 text-sm sm:text-base" style={{ color: COLORS.text }}>
                This section is actively being built and refined. We’re working on making it structured, practical, and truly useful.
              </p>

              <div className="mt-8">
                <Link
                  href="/research"
                  className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03]"
                  style={{ borderColor: COLORS.border, color: COLORS.heading }}
                >
                  Back to Research 101
                  <ArrowRight className="h-4 w-4 opacity-60" />
                </Link>
              </div>
            </div>

            <div
              className="h-1 w-full"
              style={{
                background: 'linear-gradient(90deg, rgba(63,111,103,0.9), rgba(124,91,134,0.7))',
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}