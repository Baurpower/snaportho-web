import type { ReactNode } from "react";
import {
  ClockIcon,
  AcademicCapIcon,
  BoltIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

import type {
  CasePrepPacketState,
  PacketCase,
  PacketHeader as PacketHeaderData,
} from "@/lib/caseprep-v1-1/stream-schema";

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
      <div
        className="h-4 w-40 animate-pulse rounded bg-slate-100"
        aria-hidden
      />
      <div
        className="mt-3 h-8 w-2/3 animate-pulse rounded bg-slate-100"
        aria-hidden
      />
      <div className="mt-4 flex gap-2" aria-hidden>
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

function coverageChip(coverage: CasePrepPacketState["coverage"] | undefined, certified: boolean) {
  if (!coverage) return null;
  if (coverage.quality_gate === "passed" && (coverage.coverage_status === "certified" || certified)) {
    return { label: "Certified prep", className: "border-emerald-200 bg-emerald-50 text-emerald-900" };
  }
  if (coverage.quality_gate === "passed") {
    return { label: "Grounded prep", className: "border-teal-200 bg-teal-50 text-teal-900" };
  }
  if (coverage.quality_gate === "withheld") {
    return { label: "Needs a clearer case", className: "border-slate-200 bg-slate-50 text-slate-700" };
  }
  return {
    label: "Limited prep — some sections are not verified yet",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  };
}

export function PacketHeader({
  caseIdentity,
  header,
  coverage,
}: {
  caseIdentity: PacketCase;
  header: PacketHeaderData;
  coverage?: CasePrepPacketState["coverage"];
}) {
  const coverageLabel = coverageChip(coverage, header.certified);
  return (
    <header className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-white to-emerald-50/50 px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Case Prep Packet
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {header.display_name || caseIdentity.requested_case}
          </h1>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {coverageLabel ? (
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${coverageLabel.className}`}
          >
            {coverageLabel.label}
          </span>
        ) : null}
        <Chip
          icon={<ClockIcon className="h-3.5 w-3.5" />}
          label={`~${header.est_prep_minutes} min prep`}
        />
        <Chip
          icon={<BoltIcon className="h-3.5 w-3.5" />}
          label={DIFFICULTY_LABELS[header.difficulty] ?? header.difficulty}
        />
        <Chip
          icon={<AcademicCapIcon className="h-3.5 w-3.5" />}
          label={header.pgy_level}
        />
        <Chip
          icon={<TagIcon className="h-3.5 w-3.5" />}
          label={header.procedure_type.replace(/_/g, " ")}
        />
      </div>
    </header>
  );
}
