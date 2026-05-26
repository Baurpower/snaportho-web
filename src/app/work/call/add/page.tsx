"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { PhoneCall, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import AddProgramCall from "@/components/workspace/call/addprogramcall";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function AddCallPage() {
  const router = useRouter();
  const { loading, permissions, isAdmin } = useWorkspacePermissions();
  const canShowAdminCallActions =
    Boolean(permissions?.canEditCallAssignments) ||
    permissions?.mode === "admin" ||
    isAdmin;

  useEffect(() => {
    if (loading) return;
    if (!canShowAdminCallActions) {
      router.replace("/work/call");
    }
  }, [canShowAdminCallActions, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">Loading call workspace...</span>
        </div>
      </main>
    );
  }

  if (!canShowAdminCallActions) {
    return null;
  }

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
                  Add Program Call
                </h1>

                <button
                  type="button"
                  onClick={() => router.push("/work/call")}
                  className="group mt-5 inline-flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/20 ring-1 ring-white/20 backdrop-blur transition-all hover:bg-white/15 hover:ring-white/30"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  Back to Call
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pb-14 md:px-10 md:pb-16">
        <div className="mx-auto max-w-7xl">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <AddProgramCall />
          </motion.div>
        </div>
      </section>
    </main>
  );
}
