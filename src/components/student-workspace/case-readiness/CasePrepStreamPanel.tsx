"use client";

import { BoltIcon } from "@heroicons/react/24/outline";

import { CasePrepPacket } from "@/components/caseprep-packet/CasePrepPacket";
import { useCasePrepStream } from "@/lib/caseprep-v1-1/useCasePrepStream";

/**
 * Streamed CasePrep v1.1 packet for the case-readiness surface.
 *
 * The stream is started by an explicit click (it consumes one BroBot use);
 * it never auto-fires on page load.
 */
export function CasePrepStreamPanel({ prompt }: { prompt: string }) {
  const { state, start } = useCasePrepStream();

  if (state.status === "idle") {
    return (
      <section className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/40 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Case Prep Packet
        </p>
        <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-950">{prompt}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Build a streamed, attending-style preparation packet: ranked pimp questions,
          structures at risk, operative flow, and decision points.
        </p>
        <button
          type="button"
          onClick={() => void start(prompt)}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-teal-700"
        >
          <BoltIcon className="h-4 w-4" />
          Build packet
        </button>
      </section>
    );
  }

  if (state.status === "denied") {
    return (
      <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-bold">Daily BroBot limit reached.</p>
        <p className="mt-1">Come back tomorrow or upgrade for unlimited case prep.</p>
      </section>
    );
  }

  return (
    <CasePrepPacket
      state={state}
      onClarify={(clarifiedPrompt) => void start(clarifiedPrompt)}
    />
  );
}
