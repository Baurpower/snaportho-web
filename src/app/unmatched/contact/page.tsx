"use client";

import { motion } from "framer-motion";
import { Heart, Mail, Phone } from "lucide-react";

export default function UnmatchedContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-50 text-slate-900">
      
      {/* HERO */}
      <section className="relative overflow-hidden px-6 pb-16 pt-20 md:px-10 md:pb-24 md:pt-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_20%)]" />

        <div className="relative mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200 backdrop-blur">
              <Heart className="h-4 w-4" />
              SnapOrtho
            </div>

            <h1 className="mt-8 text-6xl font-black tracking-tight text-white md:text-8xl">
              UNMATCHED
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              You are not alone in this moment.
            </p>
          </motion.div>
        </div>
      </section>

      {/* MESSAGE */}
      <section className="px-6 md:px-10">
        <div className="mx-auto -mt-8 max-w-4xl rounded-[2rem] border border-white/10 bg-white p-8 shadow-2xl md:p-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >

            <div className="mt-6 space-y-6 text-base leading-8 text-slate-700 md:text-lg">
              
              <div className="mt-6 space-y-6 text-base leading-8 text-slate-700 md:text-lg">
  <p>
    If you landed on this page after finding out you didn’t match, I just want
    you to know that someone out there genuinely cares about what you’re going
    through right now.
  </p>

  <p>
    This moment can feel incredibly heavy. There is a lot of uncertainty,
    pressure, and noise coming at you all at once. It’s easy to feel like
    everyone else has moved forward while you’re suddenly standing still.
  </p>

  <p>
    Please don’t go through this alone. If you want to talk through your
    situation, ask questions, or just get another perspective on your options,
    I’m happy to help however I can.
  </p>

  <p>
    I built these resources because I care deeply about applicants who end up
    in this position. Many incredibly talented people go unmatched every year,
    and it does not define your future as a physician.
  </p>

  <p className="font-semibold text-slate-900">
    If you need someone in your corner this week, reach out.
  </p>

  <p>
    Email me or text me. Seriously — don’t hesitate.
  </p>
</div>

            </div>

            {/* CONTACT */}
            <div className="mt-10 grid gap-4 md:grid-cols-2">

              <a
                href="mailto:alexbaur123@gmail.com"
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:bg-slate-100"
              >
                <Mail className="h-6 w-6 text-sky-700" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Email
                  </p>
                  <p className="text-sm text-slate-600">
                    alexbaur123@gmail.com
                  </p>
                </div>
              </a>

              <a
                href="sms:9165210352"
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:bg-slate-100"
              >
                <Phone className="h-6 w-6 text-sky-700" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Text
                  </p>
                  <p className="text-sm text-slate-600">
                    (916) 521-0352
                  </p>
                </div>
              </a>

            </div>

            <p className="mt-10 text-sm text-slate-500">
              I may not be able to respond instantly to everyone, but I promise
              I will try my best to help however I can.
            </p>
          </motion.div>
        </div>
      </section>

    </main>
  );
}