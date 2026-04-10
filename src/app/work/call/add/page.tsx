"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { PhoneCall, UserRound, Users, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import AddIndividualCall from "@/components/workspace/call/addindividualcall";
import AddProgramCall from "@/components/workspace/call/addprogramcall";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

type AddMode = "individual" | "program";

function ModeToggle({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function AddCallPage() {
  const [mode, setMode] = useState<AddMode>("individual");
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-100 text-slate-900">
      <section className="relative overflow-hidden px-6 pb-8 pt-10 md:px-10 md:pb-10 md:pt-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_16%)]" />

        <div className="relative mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur md:p-8"
          >
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                  <PhoneCall className="h-4 w-4" />
                  SnapOrtho
                </div>

                <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-6xl">
                  Add Call
                </h1>

                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                  Choose between a fast individual entry workflow or a full
                  program upload.
                </p>

                {/* ── Back button ── */}
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="group mt-5 inline-flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/20 ring-1 ring-white/20 backdrop-blur transition-all hover:bg-white/15 hover:ring-white/30"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  Back to Call
                </button>
              </div>

              <div className="w-full xl:w-auto">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-2 backdrop-blur">
                  <div className="mb-3 px-2 pt-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Workflow Mode
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Switch between personal entry and chief upload.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <ModeToggle
                      active={mode === "individual"}
                      label="Individual Add"
                      icon={<UserRound className="h-4 w-4" />}
                      onClick={() => setMode("individual")}
                    />
                    <ModeToggle
                      active={mode === "program"}
                      label="Program Upload"
                      icon={<Users className="h-4 w-4" />}
                      onClick={() => setMode("program")}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pb-14 md:px-10 md:pb-16">
        <div className="mx-auto max-w-7xl">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            {mode === "individual" ? <AddIndividualCall /> : <AddProgramCall />}
          </motion.div>
        </div>
      </section>
    </main>
  );
}