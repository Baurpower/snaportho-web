"use client";

import { useEffect } from "react";
import { Loader2, Smartphone, ArrowRight } from "lucide-react";

export default function MyCasesAuthCallbackPage() {
  useEffect(() => {
    const url = "https://snap-ortho.com/mycases/auth/callback";

    const timer = window.setTimeout(() => {
      window.location.href = url;
    }, 800);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 border border-white/10 shadow-lg">
          <Smartphone className="h-10 w-10" />
        </div>

        <p className="text-sm uppercase tracking-[0.25em] text-slate-300 mb-3">
          MyCases
        </p>

        <h1 className="text-3xl font-semibold tracking-tight mb-3">
          Returning to MyCases
        </h1>

        <p className="text-slate-300 text-base leading-relaxed mb-8">
          Your sign-in is finishing up. If the app does not open automatically,
          use the button below.
        </p>

        <div className="flex items-center justify-center gap-3 text-slate-200 mb-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Opening app...</span>
        </div>

        <a
          href="https://snap-ortho.com/mycases/auth/callback"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-slate-900 px-5 py-3 font-medium shadow-lg hover:bg-slate-100 transition"
        >
          Open MyCases
          <ArrowRight className="h-4 w-4" />
        </a>

        <p className="mt-6 text-xs text-slate-400 leading-relaxed">
          If nothing happens, return to the MyCases app manually and try signing
          in again.
        </p>
      </div>
    </main>
  );
}