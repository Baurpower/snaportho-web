import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Download, ExternalLink, ShieldCheck } from "lucide-react";

import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Download SnapOrtho for Anki Beta",
  description: "Download the SnapOrtho add on and get started with the versioned Master Deck.",
  robots: { index: false, follow: false },
};

export default async function AnkiDownloadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?redirectTo=%2Fanki%2Fdownload");
  }

  return (
    <div className="min-h-screen bg-[#f7f2e9] px-5 pb-20 pt-28 text-[#11162f] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/anki" className="text-sm font-bold text-[#426b9b] hover:underline">
          Back to SnapOrtho for Anki
        </Link>

        <div className="mt-6 overflow-hidden rounded-[2.2rem] border border-[#11162f]/10 bg-white shadow-[0_28px_80px_rgba(17,22,47,0.13)]">
          <div className="bg-[#11162f] px-7 py-9 text-white sm:px-10 sm:py-11">
            <div className="flex items-center gap-3 text-[#a3cfff]">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-bold">Signed in and ready</span>
            </div>
            <h1 className="mt-5 text-balance text-4xl font-black tracking-[-0.035em] sm:text-5xl">
              Download SnapOrtho for Anki Beta
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/68">
              Your account is connected. Download the add on, install it in Anki Desktop, and let the guided setup help you import the Master Deck.
            </p>
            <a
              href="/api/anki/addon/download"
              className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#a3cfff] px-7 py-4 text-base font-black text-[#11162f] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-white/30"
            >
              <Download className="h-5 w-5" />
              Download Version 1.0.3
            </a>
            <p className="mt-4 text-xs text-white/48">SnapOrtho Beta for Anki Desktop</p>
          </div>

          <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <h2 className="text-2xl font-black">Install in three steps</h2>
              <ol className="mt-6 space-y-5">
                {[
                  "Open Anki Desktop and choose Add Ons from the Tools menu",
                  "Choose Install from file and select the downloaded SnapOrtho package",
                  "Restart Anki and open Tools, SnapOrtho, then Get Started",
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#11162f] text-sm font-black text-white">
                      {index + 1}
                    </span>
                    <span className="pt-1 text-sm font-semibold leading-6 text-[#414960]">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl bg-[#eef6ff] p-6">
              <ShieldCheck className="h-7 w-7 text-[#0f766e]" />
              <h2 className="mt-5 text-xl font-black">The add on guides the rest</h2>
              <p className="mt-3 text-sm leading-7 text-[#596078]">
                After installation, SnapOrtho helps you connect your account, download the current Master Deck, and confirm your version.
              </p>
              <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#426b9b] hover:underline">
                Get installation help <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
