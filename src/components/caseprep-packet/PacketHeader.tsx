import type { ReactNode } from "react";
import { ClockIcon, AcademicCapIcon, BoltIcon, TagIcon } from "@heroicons/react/24/outline";

import type { PacketCase, PacketHeader as PacketHeaderData } from "@/lib/caseprep-v1-1/stream-schema";

function Chip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
      {icon}
      {label}
    </span>
  );
}

const DIFFICULTY_LABELS: Record<string, string> = {
  foundational: "Foundational",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function PacketHeaderSkeleton() {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-100" aria-hidden />
      <div className="mt-3 h-8 w-2/3 animate-pulse rounded bg-slate-100" aria-hidden />
      <div className="mt-4 flex gap-2" aria-hidden>
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

export function PacketHeader({
  caseIdentity,
  header,
}: {
  caseIdentity: PacketCase;
  header: PacketHeaderData;
}) {
  return (
    <header className="rounded-[1.75rem] border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Case Prep Packet
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {header.display_name || caseIdentity.requested_case}
          </h1>
        </div>
        {header.certified ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Certified content
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip
          icon={<ClockIcon className="h-3.5 w-3.5" />}
          label={`~${header.est_prep_minutes} min prep`}
        />
        <Chip
          icon={<BoltIcon className="h-3.5 w-3.5" />}
          label={DIFFICULTY_LABELS[header.difficulty] ?? header.difficulty}
        />
        <Chip icon={<AcademicCapIcon className="h-3.5 w-3.5" />} label={header.pgy_level} />
        <Chip
          icon={<TagIcon className="h-3.5 w-3.5" />}
          label={header.procedure_type.replace(/_/g, " ")}
        />
      </div>

      {header.common_attending_focus.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
            Common attending focus
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-sky-950">
            {header.common_attending_focus.join(" · ")}
          </p>
        </div>
      ) : null}
    </header>
  );
}
